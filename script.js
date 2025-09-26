document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const winnerAnnouncementEl = document.getElementById('winner-announcement');
    const resetButton = document.getElementById('reset-button');
    const resetScoresButton = document.getElementById('reset-scores-button');
    const addPlayerButton = document.getElementById('add-player-button');
    const modeToggleButton = document.getElementById('mode-toggle');
    const scoreBoardEl = document.querySelector('.score-board');
    const gameAreaEl = document.querySelector('.game-area');
    const joinPromptEl = document.getElementById('join-prompt');
    const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
    const manualControlsArea = document.getElementById('manual-controls');
    const incrementSlider = document.getElementById('increment-slider');
    const incrementValueDisplay = document.getElementById('increment-value-display');
    const drainRateSlider = document.getElementById('drain-rate-slider');
    const drainRateValueDisplay = document.getElementById('drain-rate-value-display');

    // --- Game Settings & Configs ---
    const MAX_PLAYERS = 4;
    const maxProgress = 100;
    let increment = 6;
    let drainRate = 0.6;
    const autoRestartDelay = 3000;
    const drainIntervalTime = 70;

    const availablePlayers = [
        { id: 'p1', name: 'Player 1', key: 'w', keyDisplay: 'W Key', className: 'p1' },
        { id: 'p2', name: 'Player 2', key: 'arrowup', keyDisplay: 'Up Arrow', className: 'p2' },
        { id: 'p3', name: 'Player 3', key: 'i', keyDisplay: 'I Key', className: 'p3' },
        { id: 'p4', name: 'Player 4', key: 'l', keyDisplay: 'L Key', className: 'p4' }
    ];

    const difficultySettings = {
        easy: { increment: 10, drainRate: 0.3, drainSlider: 3 },
        medium: { increment: 6, drainRate: 0.6, drainSlider: 6 },
        hard: { increment: 4, drainRate: 1.0, drainSlider: 10 }
    };

    // --- Game State ---
    let activePlayers = [];
    let gameActive = true;
    let drainInterval;
    let autoRestartTimeout = null;
    let currentDifficulty = 'medium';
    let gamepads = {};
    let assignedInputs = new Set();
    let lastGamepadButtonStates = {};

    // --- Dark/Light Mode ---
    function applyTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
        modeToggleButton.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
    modeToggleButton.addEventListener('click', () => {
        const newTheme = document.body.classList.toggle('dark-mode') ? 'dark' : 'light';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    // --- Player Management ---
    function createPlayer(playerData, options = {}) {
        if (activePlayers.length >= MAX_PLAYERS) return null;

        const playerSection = document.createElement('div');
        playerSection.className = `player-section ${playerData.className}`;
        
        // [FIX] Changed innerHTML to make progress-bar and progress-value siblings.
        // This allows for proper z-index layering. The container is the relative
        // parent, and these two are absolutely positioned inside it.
        playerSection.innerHTML = `
            <h2>${playerData.name} <span class="gamepad-id"></span></h2>
            <div class="progress-container">
                <div class="progress-bar ${playerData.className}"></div>
                <span class="progress-value">0%</span>
            </div>
        `;
        gameAreaEl.appendChild(playerSection);

        const scoreItem = document.createElement('div');
        scoreItem.className = 'score-item';
        scoreItem.id = `${playerData.id}-score-item`;
        scoreItem.innerHTML = `${playerData.name} Wins: <span id="${playerData.id}-score">0</span>`;
        scoreBoardEl.appendChild(scoreItem);

        const playerObject = {
            ...playerData,
            progress: 0,
            score: 0,
            controllerType: options.controllerType || 'none',
            gamepadIndex: options.gamepadIndex || null,
            sectionEl: playerSection,
            // [FIX] Update element references to match new structure
            progressEl: playerSection.querySelector('.progress-bar'),
            valueEl: playerSection.querySelector('.progress-value'),
            gamepadIdEl: playerSection.querySelector('.gamepad-id'),
            scoreDisplayEl: scoreBoardEl.querySelector(`#${playerData.id}-score`),
        };

        activePlayers.push(playerObject);
        updatePlayerUITitle(playerObject);
        updateUIState();
        return playerObject;
    }

    function addPlayerFromButton() {
        if (gameActive && activePlayers.length >= MAX_PLAYERS) return;
        
        const nextPlayerData = availablePlayers.find(p => !activePlayers.some(ap => ap.id === p.id));
        if (nextPlayerData) {
            createPlayer(nextPlayerData, { controllerType: 'none' });
        }
    }

    function handleJoinAttempt(inputType, details) {
        if (activePlayers.length >= MAX_PLAYERS) return;

        if (inputType === 'keyboard') {
            const key = details.key;
            if (activePlayers.some(p => p.controllerType === 'keyboard' && p.key === key)) return;

            const uncontrolledPlayer = activePlayers.find(p => p.controllerType === 'none');
            if (uncontrolledPlayer) {
                const configForKey = availablePlayers.find(p => p.id === uncontrolledPlayer.id);
                uncontrolledPlayer.key = configForKey.key;
                uncontrolledPlayer.keyDisplay = configForKey.keyDisplay;
                uncontrolledPlayer.controllerType = 'keyboard';
                assignedInputs.add(`keyboard_${key}`);
                updatePlayerUITitle(uncontrolledPlayer);
                console.log(`⌨️ ${configForKey.keyDisplay} assigned to ${uncontrolledPlayer.name}.`);
                return;
            }

            const playerData = availablePlayers.find(p => p.key === key && !activePlayers.some(ap => ap.id === p.id));
            if (playerData) {
                const newPlayer = createPlayer(playerData, { controllerType: 'keyboard' });
                assignedInputs.add(`keyboard_${key}`);
                console.log(`⌨️ ${newPlayer.name} joined with ${newPlayer.keyDisplay}.`);
            }
        } else if (inputType === 'gamepad') {
            const gamepadId = `gamepad_${details.index}`;
            if (assignedInputs.has(gamepadId)) return;

            let playerToAssign = activePlayers.find(p => p.controllerType === 'none');
            
            if (!playerToAssign) {
                const nextPlayerData = availablePlayers.find(p => !activePlayers.some(ap => ap.id === p.id));
                if (nextPlayerData) {
                    playerToAssign = createPlayer(nextPlayerData, { controllerType: 'none' });
                }
            }

            if (playerToAssign) {
                playerToAssign.controllerType = 'gamepad';
                playerToAssign.gamepadIndex = details.index;
                assignedInputs.add(gamepadId);
                updatePlayerUITitle(playerToAssign);
                console.log(`🎮 Gamepad ${details.index} assigned to ${playerToAssign.name}.`);
            }
        }
    }
    
    function updatePlayerUITitle(player) {
        let controlInfo = '(unassigned)';
        if (player.controllerType === 'keyboard') {
            controlInfo = `(${player.keyDisplay})`;
        } else if (player.controllerType === 'gamepad') {
            controlInfo = `(GP ${player.gamepadIndex})`;
        }
        player.gamepadIdEl.textContent = controlInfo;
    }

    function updateUIState() {
        if (activePlayers.length === 0) {
            joinPromptEl.textContent = "Press W, Up Arrow, I, L or a Gamepad button (A,B,X,Y) to join!";
        } else if (activePlayers.length < MAX_PLAYERS) {
            joinPromptEl.textContent = "Waiting for more players...";
        } else {
            joinPromptEl.textContent = "All players have joined!";
        }
        addPlayerButton.disabled = activePlayers.length >= MAX_PLAYERS;
    }

    function triggerPlayerAction(player) {
        if (!gameActive) return;
        player.progress += increment;
        if (player.progress > maxProgress) player.progress = maxProgress;
        updateProgressUI();
        checkWinner();
    }
    
    function updateProgressUI() {
        activePlayers.forEach(p => {
            p.progressEl.style.height = `${p.progress}%`;
            p.valueEl.textContent = `${Math.round(p.progress)}%`;
        });
    }

    function checkWinner() {
        if (!gameActive) return;
        const potentialWinners = activePlayers.filter(p => p.progress >= maxProgress);
        
        if (potentialWinners.length > 0) {
            gameActive = false;
            clearInterval(drainInterval);

            if (potentialWinners.length > 1) {
                winnerAnnouncementEl.textContent = "It's a Tie!";
                winnerAnnouncementEl.className = 'winner-announcement';
            } else {
                const winner = potentialWinners[0];
                winnerAnnouncementEl.textContent = `${winner.name} Wins!`;
                winnerAnnouncementEl.className = `winner-announcement ${winner.className}`;
                winner.score++;
                winner.scoreDisplayEl.textContent = winner.score;
            }
            
            winnerAnnouncementEl.style.display = 'block';
            updateProgressUI();

            if (autoRestartTimeout) clearTimeout(autoRestartTimeout);
            autoRestartTimeout = setTimeout(resetGame, autoRestartDelay);
        }
    }

    function drainProgress() {
        if (!gameActive) return;
        activePlayers.forEach(player => {
            if (player.progress > 0) {
                player.progress = Math.max(0, player.progress - drainRate);
            }
        });
        updateProgressUI();
    }

    function handleKeyPress(event) {
        const key = event.key.toLowerCase();
        const player = activePlayers.find(p => p.controllerType === 'keyboard' && p.key === key);
        
        if (player) {
            if (key === 'arrowup') event.preventDefault();
            triggerPlayerAction(player);
        } else {
            handleJoinAttempt('keyboard', { key });
        }
    }

    function pollGamepads() {
        const polledPads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let i = 0; i < polledPads.length; i++) {
            const pad = polledPads[i];
            if (!pad) continue;
            const inputId = `gamepad_${i}`;
            if (assignedInputs.has(inputId)) {
                const player = activePlayers.find(p => p.gamepadIndex === i);
                if (!player) continue;
                for (let j = 0; j < 4; j++) {
                    const buttonIsPressed = pad.buttons[j]?.pressed;
                    const buttonWasPressed = lastGamepadButtonStates[i]?.[j];
                    if (buttonIsPressed && !buttonWasPressed) triggerPlayerAction(player);
                }
            } else {
                const anyFaceButtonPressed = pad.buttons.some((b, idx) => idx < 4 && b.pressed);
                const wasPressedLastFrame = lastGamepadButtonStates[i]?.slice(0, 4).some(p => p);
                if (anyFaceButtonPressed && !wasPressedLastFrame) handleJoinAttempt('gamepad', { index: i });
            }
            lastGamepadButtonStates[i] = pad.buttons.map(b => b.pressed);
        }
        requestAnimationFrame(pollGamepads);
    }
    
    function resetGame() {
        if (autoRestartTimeout) clearTimeout(autoRestartTimeout);
        updateGameParameters(); 
        activePlayers.forEach(p => p.progress = 0);
        gameActive = true;
        winnerAnnouncementEl.style.display = 'none';
        updateProgressUI();
        clearInterval(drainInterval);
        drainInterval = setInterval(drainProgress, drainIntervalTime);
    }

    function handleResetScores() {
        activePlayers.forEach(p => {
            p.score = 0;
            p.scoreDisplayEl.textContent = 0;
        });
    }

    function updateGameParameters() {
        if (currentDifficulty === 'manual') {
            increment = parseInt(incrementSlider.value);
            drainRate = parseFloat(drainRateSlider.value) / 10;
        } else {
            const settings = difficultySettings[currentDifficulty];
            increment = settings.increment;
            drainRate = settings.drainRate;
            incrementSlider.value = increment;
            drainRateSlider.value = settings.drainSlider;
        }
        incrementValueDisplay.textContent = incrementSlider.value;
        drainRateValueDisplay.textContent = (parseFloat(drainRateSlider.value) / 10).toFixed(1);
    }

    function handleDifficultyChange(event) {
        currentDifficulty = event.target.value;
        manualControlsArea.style.display = currentDifficulty === 'manual' ? 'block' : 'none';
        updateGameParameters();
    }
    
    document.addEventListener('keydown', handleKeyPress);
    resetButton.addEventListener('click', resetGame);
    resetScoresButton.addEventListener('click', handleResetScores);
    addPlayerButton.addEventListener('click', addPlayerFromButton);
    difficultyRadios.forEach(radio => radio.addEventListener('change', handleDifficultyChange));
    incrementSlider.addEventListener('input', () => { incrementValueDisplay.textContent = incrementSlider.value; if (currentDifficulty === 'manual') updateGameParameters(); });
    drainRateSlider.addEventListener('input', () => { drainRateValueDisplay.textContent = (parseFloat(drainRateSlider.value) / 10).toFixed(1); if (currentDifficulty === 'manual') updateGameParameters(); });
    
    window.addEventListener("gamepadconnected", e => { console.log(`Gamepad connected: ${e.gamepad.id}`); gamepads[e.gamepad.index] = e.gamepad; });
    window.addEventListener("gamepaddisconnected", e => {
        const disconnectedIndex = e.gamepad.index;
        delete gamepads[disconnectedIndex];
        const player = activePlayers.find(p => p.gamepadIndex === disconnectedIndex);
        if (player) {
            console.log(`${player.name}'s gamepad disconnected.`);
            player.gamepadIndex = null;
            player.controllerType = 'none';
            updatePlayerUITitle(player);
        }
        assignedInputs.delete(`gamepad_${disconnectedIndex}`);
    });

    function initializeGame() {
        const initialDifficultyRadio = document.querySelector('input[name="difficulty"]:checked');
        if (initialDifficultyRadio) currentDifficulty = initialDifficultyRadio.value;
        manualControlsArea.style.display = currentDifficulty === 'manual' ? 'block' : 'none';
        
        updateGameParameters();
        updateUIState();
        resetGame();
        pollGamepads();
    }
    
    initializeGame();
});
