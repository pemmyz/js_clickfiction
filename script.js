document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const player1ProgressEl = document.getElementById('player1-progress');
    const player2ProgressEl = document.getElementById('player2-progress');
    const player1ValueEl = document.getElementById('player1-value');
    const player2ValueEl = document.getElementById('player2-value');
    const winnerAnnouncementEl = document.getElementById('winner-announcement');
    const resetButton = document.getElementById('reset-button');
    const resetScoresButton = document.getElementById('reset-scores-button');
    const modeToggleButton = document.getElementById('mode-toggle');
    
    // Gamepad ID display elements
    const player1GamepadIdEl = document.getElementById('player1-gamepad-id');
    const player2GamepadIdEl = document.getElementById('player2-gamepad-id');
    const player1TitleEl = document.querySelector('.player-section:nth-child(1) h2');
    const player2TitleEl = document.querySelector('.player-section:nth-child(2) h2');

    const player1ScoreEl = document.getElementById('player1-score');
    const player2ScoreEl = document.getElementById('player2-score');

    // Difficulty and Manual Controls Elements
    const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
    const manualControlsArea = document.getElementById('manual-controls');
    const incrementSlider = document.getElementById('increment-slider');
    const incrementValueDisplay = document.getElementById('increment-value-display');
    const drainRateSlider = document.getElementById('drain-rate-slider');
    const drainRateValueDisplay = document.getElementById('drain-rate-value-display');

    // Game State & Settings
    const maxProgress = 100;
    let increment = 6;
    let drainRate = 0.6;
    const autoRestartDelay = 3000;
    const drainIntervalTime = 70;

    // [MERGED] Player State object updated for dynamic controller assignment
    const players = {
        p1: {
            id: 'Player 1',
            progress: 0,
            key: 'w',
            keyDisplay: 'W key',
            controllerType: 'keyboard', // 'keyboard', 'gamepad', or 'none'
            gamepadIndex: null,
            element: player1ProgressEl,
            valueElement: player1ValueEl,
            titleElement: player1TitleEl,
            gamepadIdElement: player1GamepadIdEl
        },
        p2: {
            id: 'Player 2',
            progress: 0,
            key: 'arrowup',
            keyDisplay: 'Up Arrow',
            controllerType: 'keyboard',
            gamepadIndex: null,
            element: player2ProgressEl,
            valueElement: player2ValueEl,
            titleElement: player2TitleEl,
            gamepadIdElement: player2GamepadIdEl
        }
    };

    let gameActive = true;
    let drainInterval;
    let autoRestartTimeout = null;
    let currentDifficulty = 'medium';

    // [MERGED] New state variables for advanced gamepad handling
    let gamepads = {};
    let assignedInputs = new Set();
    let lastGamepadButtonStates = {};

    // Scores
    let player1Score = 0;
    let player2Score = 0;

    const difficultySettings = {
        easy: { increment: 10, drainRate: 0.3, drainSlider: 3 },
        medium: { increment: 6, drainRate: 0.6, drainSlider: 6 },
        hard: { increment: 4, drainRate: 1.0, drainSlider: 10 }
    };

    // --- Dark/Light Mode ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            modeToggleButton.textContent = '☀️';
        } else {
            document.body.classList.remove('dark-mode');
            modeToggleButton.textContent = '🌙';
        }
    }
    modeToggleButton.addEventListener('click', () => {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        const newTheme = isDarkMode ? 'dark' : 'light';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });
    const savedTheme = localStorage.getItem('theme') || 'dark';
    applyTheme(savedTheme);

    // --- UI Update Function ---
    // [MERGED] Updated function to show detailed controller info
    function updatePlayerUITitles() {
        Object.values(players).forEach(player => {
            let controlInfo = '';
            if (player.controllerType === 'keyboard') {
                controlInfo = `(${player.keyDisplay})`;
            } else if (player.controllerType === 'gamepad') {
                controlInfo = `(GP ${player.gamepadIndex})`;
            }
            player.gamepadIdElement.textContent = controlInfo;
        });
    }

    // --- Difficulty and Manual Settings ---
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

    difficultyRadios.forEach(radio => radio.addEventListener('change', handleDifficultyChange));
    incrementSlider.addEventListener('input', () => {
        incrementValueDisplay.textContent = incrementSlider.value;
        if (currentDifficulty === 'manual') updateGameParameters();
    });
    drainRateSlider.addEventListener('input', () => {
        drainRateValueDisplay.textContent = (parseFloat(drainRateSlider.value) / 10).toFixed(1);
        if (currentDifficulty === 'manual') updateGameParameters();
    });

    // --- Score Management ---
    function updateScoreUI() {
        player1ScoreEl.textContent = player1Score;
        player2ScoreEl.textContent = player2Score;
    }
    function handleResetScores() {
        player1Score = 0;
        player2Score = 0;
        updateScoreUI();
    }
    resetScoresButton.addEventListener('click', handleResetScores);

    // --- Game Logic ---
    function updateProgressUI() {
        players.p1.element.style.height = `${players.p1.progress}%`;
        players.p1.valueElement.textContent = `${Math.round(players.p1.progress)}%`;
        players.p2.element.style.height = `${players.p2.progress}%`;
        players.p2.valueElement.textContent = `${Math.round(players.p2.progress)}%`;
    }
    
    // [MERGED] A single function to trigger a player's action
    function triggerPlayerAction(player) {
        if (!gameActive) return;
        player.progress += increment;
        if (player.progress > maxProgress) player.progress = maxProgress;
        updateProgressUI();
        checkWinner();
    }

    function checkWinner() {
        if (!gameActive) return;
        let winner = null;
        if (players.p1.progress >= maxProgress) winner = 'Player 1';
        if (players.p2.progress >= maxProgress) winner = winner ? "It's a Tie!" : 'Player 2';
        
        if (winner) {
            gameActive = false;
            clearInterval(drainInterval);
            winnerAnnouncementEl.textContent = winner === "It's a Tie!" ? winner : `${winner} Wins!`;
            winnerAnnouncementEl.style.display = 'block';

            if (winner === 'Player 1') {
                winnerAnnouncementEl.className = 'winner-announcement player1-win';
                player1Score++;
            } else if (winner === 'Player 2') {
                winnerAnnouncementEl.className = 'winner-announcement player2-win';
                player2Score++;
            } else {
                winnerAnnouncementEl.className = 'winner-announcement';
            }
            updateScoreUI();
            updateProgressUI();

            if (autoRestartTimeout) clearTimeout(autoRestartTimeout);
            autoRestartTimeout = setTimeout(resetGame, autoRestartDelay);
        }
    }

    function drainProgress() {
        if (!gameActive) return;
        Object.values(players).forEach(player => {
            if (player.progress > 0) {
                player.progress -= drainRate;
                if (player.progress < 0) player.progress = 0;
            }
        });
        updateProgressUI();
    }

    function handleKeyPress(event) {
        if (!gameActive) return;
        const key = event.key.toLowerCase();
        
        const player = Object.values(players).find(p => p.controllerType === 'keyboard' && p.key === key);
        if (player) {
            if (key === 'arrowup') event.preventDefault();
            triggerPlayerAction(player);
        }
    }

    // [MERGED] New function to handle joining attempts
    function handleJoinAttempt(inputType, details) {
        if (inputType === 'gamepad') {
            const gamepadId = `gamepad_${details.index}`;
            if (assignedInputs.has(gamepadId)) return; // Already assigned.
    
            // Find the first player slot not currently controlled by a gamepad.
            let playerToAssign = null;
            if (players.p1.controllerType !== 'gamepad') {
                playerToAssign = players.p1;
            } else if (players.p2.controllerType !== 'gamepad') {
                playerToAssign = players.p2;
            }
    
            if (playerToAssign) {
                // Free up the keyboard input if it was assigned to this player
                if (playerToAssign.controllerType === 'keyboard') {
                    assignedInputs.delete(`keyboard_${playerToAssign.key}`);
                }
                
                playerToAssign.controllerType = 'gamepad';
                playerToAssign.gamepadIndex = details.index;
                assignedInputs.add(gamepadId);
                console.log(`🎮 Gamepad ${details.index} assigned to ${playerToAssign.id}.`);
                updatePlayerUITitles();
            }
        }
    }
    
    // [MERGED] Replaced old simple polling with the robust version from Hevoskisat
    function pollGamepads() {
        const polledPads = navigator.getGamepads ? navigator.getGamepads() : [];
    
        for (let i = 0; i < polledPads.length; i++) {
            const pad = polledPads[i];
            if (!pad) continue;
    
            const inputId = `gamepad_${i}`;
    
            if (assignedInputs.has(inputId)) {
                // Gamepad is ASSIGNED
                const player = Object.values(players).find(p => p.gamepadIndex === i);
                if (!player) continue;

                // Iterate through face buttons (A,B,X,Y) to detect a NEW press (rising edge)
                for (let j = 0; j < 4; j++) {
                    const buttonIsPressed = pad.buttons[j]?.pressed;
                    const buttonWasPressed = lastGamepadButtonStates[i]?.[j];

                    if (buttonIsPressed && !buttonWasPressed) {
                        triggerPlayerAction(player);
                    }
                }
            } else {
                // Gamepad is UNASSIGNED - Check for join attempt
                const anyFaceButtonPressed = pad.buttons.some((b, index) => index <= 3 && b.pressed);
                const wasPressedLastFrame = lastGamepadButtonStates[i] && lastGamepadButtonStates[i].slice(0, 4).some(p => p);

                if (anyFaceButtonPressed && !wasPressedLastFrame) {
                    handleJoinAttempt('gamepad', { index: i });
                }
            }
            // Store the current state of all buttons for the next frame
            lastGamepadButtonStates[i] = pad.buttons.map(b => b.pressed);
        }
        requestAnimationFrame(pollGamepads);
    }

    function resetGame() {
        if (autoRestartTimeout) {
            clearTimeout(autoRestartTimeout);
            autoRestartTimeout = null;
        }
        updateGameParameters(); 
        
        Object.values(players).forEach(p => {
            p.progress = 0;
        });

        gameActive = true;
        winnerAnnouncementEl.style.display = 'none';
        winnerAnnouncementEl.textContent = '';
        winnerAnnouncementEl.className = 'winner-announcement';
        updateProgressUI();

        clearInterval(drainInterval);
        drainInterval = setInterval(drainProgress, drainIntervalTime);
    }

    // --- Event Listeners ---
    document.addEventListener('keydown', handleKeyPress);
    resetButton.addEventListener('click', resetGame);
    
    // [MERGED] More robust gamepad connection/disconnection listeners
    window.addEventListener("gamepadconnected", (e) => {
        console.log(`Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}. Press a button to join.`);
        gamepads[e.gamepad.index] = e.gamepad;
    });

    window.addEventListener("gamepaddisconnected", (e) => {
        const disconnectedIndex = e.gamepad.index;
        console.log(`Gamepad disconnected from index ${disconnectedIndex}.`);
        delete gamepads[disconnectedIndex];
        
        const player = Object.values(players).find(p => p.gamepadIndex === disconnectedIndex);

        if (player) {
            console.log(`${player.id}'s gamepad disconnected. Reverting to keyboard control.`);
            player.gamepadIndex = null;
            // Revert player to their default keyboard control
            player.controllerType = 'keyboard';
            assignedInputs.add(`keyboard_${player.key}`);
        }
        
        assignedInputs.delete(`gamepad_${disconnectedIndex}`);
        updatePlayerUITitles();
    });

    // --- Initial Setup ---
    function initializeGame() {
        // [MERGED] Set up initial assigned inputs based on default player config
        assignedInputs.clear();
        Object.values(players).forEach(player => {
            if(player.controllerType === 'keyboard') {
                assignedInputs.add(`keyboard_${player.key}`);
            }
        });

        updateScoreUI();
        const initialDifficultyRadio = document.querySelector('input[name="difficulty"]:checked');
        if (initialDifficultyRadio) currentDifficulty = initialDifficultyRadio.value;
        manualControlsArea.style.display = currentDifficulty === 'manual' ? 'block' : 'none';
        
        updateGameParameters(); 
        updatePlayerUITitles();
        resetGame(); 
        pollGamepads();
    }

    initializeGame();
});
