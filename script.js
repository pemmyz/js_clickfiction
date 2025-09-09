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
    
    // NEW: Gamepad ID display elements
    const player1GamepadIdEl = document.getElementById('player1-gamepad-id');
    const player2GamepadIdEl = document.getElementById('player2-gamepad-id');

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
    const pressCooldown = 100; // ms
    const autoRestartDelay = 3000; // 3 seconds
    const drainIntervalTime = 70; // Milliseconds for drain check

    // Player State object to manage both players
    const players = {
        p1: {
            id: 'Player 1',
            progress: 0,
            lastPressTime: 0,
            gamepadIndex: null,
            gamepadButtonPressedLastFrame: false
        },
        p2: {
            id: 'Player 2',
            progress: 0,
            lastPressTime: 0,
            gamepadIndex: null,
            gamepadButtonPressedLastFrame: false
        }
    };

    let gameActive = true;
    let drainInterval;
    let autoRestartTimeout = null;
    let currentDifficulty = 'medium';

    // Gamepad State
    let gamepads = {};
    let assignedGamepadIndices = new Set();

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
    // NEW: Central function to update player titles with gamepad info
    function updatePlayerUITitles() {
        if (players.p1.gamepadIndex !== null) {
            player1GamepadIdEl.textContent = `[GP ${players.p1.gamepadIndex}]`;
        } else {
            player1GamepadIdEl.textContent = '';
        }
        if (players.p2.gamepadIndex !== null) {
            player2GamepadIdEl.textContent = `[GP ${players.p2.gamepadIndex}]`;
        } else {
            player2GamepadIdEl.textContent = '';
        }
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
        if (currentDifficulty === 'manual') {
            manualControlsArea.style.display = 'block';
        } else {
            manualControlsArea.style.display = 'none';
        }
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
        player1ProgressEl.style.height = `${players.p1.progress}%`;
        player1ValueEl.textContent = `${Math.round(players.p1.progress)}%`;
        player2ProgressEl.style.height = `${players.p2.progress}%`;
        player2ValueEl.textContent = `${Math.round(players.p2.progress)}%`;
    }

    function checkWinner() {
        if (!gameActive) return;
        let winner = null;
        if (players.p1.progress >= maxProgress) {
            winner = 'Player 1';
            players.p1.progress = maxProgress;
        }
        if (players.p2.progress >= maxProgress) {
            if (winner === 'Player 1' && players.p1.progress >= maxProgress) {
                winner = 'It\'s a Tie!';
            } else if (!winner) {
                winner = 'Player 2';
            }
            players.p2.progress = maxProgress;
        }
        
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
        if (players.p1.progress > 0) {
            players.p1.progress -= drainRate;
            if (players.p1.progress < 0) players.p1.progress = 0;
        }
        if (players.p2.progress > 0) {
            players.p2.progress -= drainRate;
            if (players.p2.progress < 0) players.p2.progress = 0;
        }
        updateProgressUI();
    }

    function handleKeyPress(event) {
        if (!gameActive) return;
        const currentTime = Date.now();
        
        if (event.key === 'w' || event.key === 'W') {
            if (currentTime - players.p1.lastPressTime > pressCooldown) {
                players.p1.progress += increment;
                if (players.p1.progress > maxProgress) players.p1.progress = maxProgress;
                players.p1.lastPressTime = currentTime;
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (currentTime - players.p2.lastPressTime > pressCooldown) {
                players.p2.progress += increment;
                if (players.p2.progress > maxProgress) players.p2.progress = maxProgress;
                players.p2.lastPressTime = currentTime;
            }
        }
        updateProgressUI();
        checkWinner();
    }
    
    // --- Gamepad Logic ---
    function pollGamepads() {
        const polledPads = navigator.getGamepads ? navigator.getGamepads() : [];
        const currentTime = Date.now();
    
        for (let i = 0; i < polledPads.length; i++) {
            const pad = polledPads[i];
            if (!pad || assignedGamepadIndices.has(i)) continue;
            const anyFaceButtonPressed = pad.buttons.some((b, index) => index <= 3 && b.pressed);
            if (anyFaceButtonPressed) {
                let playerToAssignKey = null;
                if (players.p1.gamepadIndex === null) playerToAssignKey = 'p1';
                else if (players.p2.gamepadIndex === null) playerToAssignKey = 'p2';
    
                if (playerToAssignKey) {
                    const player = players[playerToAssignKey];
                    player.gamepadIndex = i;
                    assignedGamepadIndices.add(i);
                    console.log(`🎮 Gamepad ${i} connected to ${player.id}.`);
                    player.gamepadButtonPressedLastFrame = false;
                    updatePlayerUITitles(); // UPDATE UI
                }
            }
        }
    
        Object.values(players).forEach(player => {
            if (player.gamepadIndex === null) {
                player.gamepadButtonPressedLastFrame = false;
                return;
            }
            const pad = polledPads[player.gamepadIndex];
            if (!pad) return; 
            const anyFaceButtonPressed = pad.buttons.some((b, index) => index <= 3 && b.pressed);
            if (anyFaceButtonPressed && !player.gamepadButtonPressedLastFrame) {
                if (gameActive && currentTime - player.lastPressTime > pressCooldown) {
                    player.progress += increment;
                    if (player.progress > maxProgress) player.progress = maxProgress;
                    player.lastPressTime = currentTime;
                    updateProgressUI();
                    checkWinner();
                }
            }
            player.gamepadButtonPressedLastFrame = anyFaceButtonPressed;
        });
        requestAnimationFrame(pollGamepads);
    }

    function resetGame() {
        if (autoRestartTimeout) {
            clearTimeout(autoRestartTimeout);
            autoRestartTimeout = null;
        }
        updateGameParameters(); 

        players.p1.progress = 0;
        players.p2.progress = 0;
        players.p1.lastPressTime = 0;
        players.p2.lastPressTime = 0;
        players.p1.gamepadButtonPressedLastFrame = false;
        players.p2.gamepadButtonPressedLastFrame = false;

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
    
    window.addEventListener("gamepadconnected", (e) => {
        console.log(`Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}. Press a button to join.`);
        gamepads[e.gamepad.index] = e.gamepad;
    });

    window.addEventListener("gamepaddisconnected", (e) => {
        const disconnectedIndex = e.gamepad.index;
        console.log(`Gamepad disconnected from index ${disconnectedIndex}.`);
        delete gamepads[disconnectedIndex];

        if (players.p1.gamepadIndex === disconnectedIndex) {
            players.p1.gamepadIndex = null;
            console.log(`${players.p1.id}'s gamepad disconnected.`);
        }
        if (players.p2.gamepadIndex === disconnectedIndex) {
            players.p2.gamepadIndex = null;
            console.log(`${players.p2.id}'s gamepad disconnected.`);
        }
        
        assignedGamepadIndices.delete(disconnectedIndex);
        updatePlayerUITitles(); // UPDATE UI
    });

    // --- Initial Setup ---
    updateScoreUI();
    const initialDifficultyRadio = document.querySelector('input[name="difficulty"]:checked');
    if (initialDifficultyRadio) currentDifficulty = initialDifficultyRadio.value;
    if (currentDifficulty === 'manual') manualControlsArea.style.display = 'block';
    else manualControlsArea.style.display = 'none';
    
    updateGameParameters(); 
    updatePlayerUITitles(); // Set initial UI state
    resetGame(); 
    pollGamepads();
});
