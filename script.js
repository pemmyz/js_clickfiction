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
    let player1Progress = 0;
    let player2Progress = 0;
    const maxProgress = 100;
    let increment = 6; // Default, will be updated by difficulty/manual settings
    let drainRate = 0.6; // Default, will be updated
    const pressCooldown = 100; // ms
    const autoRestartDelay = 3000; // 3 seconds
    const drainIntervalTime = 70; // Milliseconds for drain check

    let gameActive = true;
    let drainInterval;
    let autoRestartTimeout = null;
    let lastPressTimeP1 = 0;
    let lastPressTimeP2 = 0;
    let currentDifficulty = 'medium'; // Default difficulty

    // Scores
    let player1Score = 0;
    let player2Score = 0;

    const difficultySettings = {
        easy: { increment: 10, drainRate: 0.3, drainSlider: 3 }, // drainSlider = drainRate * 10
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


    // --- Difficulty and Manual Settings ---
    function updateGameParameters() {
        if (currentDifficulty === 'manual') {
            increment = parseInt(incrementSlider.value);
            drainRate = parseFloat(drainRateSlider.value) / 10; // Convert slider value (1-20) to drainRate (0.1-2.0)
        } else {
            const settings = difficultySettings[currentDifficulty];
            increment = settings.increment;
            drainRate = settings.drainRate;
            // Update sliders to reflect preset difficulty when not in manual mode
            incrementSlider.value = increment;
            drainRateSlider.value = settings.drainSlider;
        }
        // Update display values for sliders
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
        // resetGame(); // Optional: uncomment to reset game immediately if desired
    }

    difficultyRadios.forEach(radio => {
        radio.addEventListener('change', handleDifficultyChange);
    });

    incrementSlider.addEventListener('input', () => {
        incrementValueDisplay.textContent = incrementSlider.value;
        if (currentDifficulty === 'manual') {
            updateGameParameters();
        }
    });
    drainRateSlider.addEventListener('input', () => {
        drainRateValueDisplay.textContent = (parseFloat(drainRateSlider.value) / 10).toFixed(1);
        if (currentDifficulty === 'manual') {
            updateGameParameters();
        }
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
        player1ProgressEl.style.height = `${player1Progress}%`;
        player1ValueEl.textContent = `${Math.round(player1Progress)}%`;
        player2ProgressEl.style.height = `${player2Progress}%`;
        player2ValueEl.textContent = `${Math.round(player2Progress)}%`;
    }

    function checkWinner() {
        if (!gameActive) return;
        let winner = null;
        if (player1Progress >= maxProgress) {
            winner = 'Player 1';
            player1Progress = maxProgress;
        }
        if (player2Progress >= maxProgress) {
            if (winner === 'Player 1' && player1Progress >= maxProgress) {
                winner = 'It\'s a Tie!';
            } else if (!winner) {
                winner = 'Player 2';
            }
            player2Progress = maxProgress;
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

        if (player1Progress > 0) {
            player1Progress -= drainRate; // drainRate is updated by updateGameParameters
            if (player1Progress < 0) player1Progress = 0;
        }
        if (player2Progress > 0) {
            player2Progress -= drainRate; // drainRate is updated by updateGameParameters
            if (player2Progress < 0) player2Progress = 0;
        }
        updateProgressUI();
    }

    function handleKeyPress(event) {
        if (!gameActive) return;
        const currentTime = Date.now();
        
        if (event.key === 'w' || event.key === 'W') {
            if (currentTime - lastPressTimeP1 > pressCooldown) {
                player1Progress += increment; // increment is updated by updateGameParameters
                if (player1Progress > maxProgress) player1Progress = maxProgress;
                lastPressTimeP1 = currentTime;
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (currentTime - lastPressTimeP2 > pressCooldown) {
                player2Progress += increment; // increment is updated by updateGameParameters
                if (player2Progress > maxProgress) player2Progress = maxProgress;
                lastPressTimeP2 = currentTime;
            }
        }
        updateProgressUI();
        checkWinner();
    }

    function resetGame() {
        if (autoRestartTimeout) {
            clearTimeout(autoRestartTimeout);
            autoRestartTimeout = null;
        }
        updateGameParameters(); // Apply current difficulty/manual settings on reset

        player1Progress = 0;
        player2Progress = 0;
        gameActive = true;
        winnerAnnouncementEl.style.display = 'none';
        winnerAnnouncementEl.textContent = '';
        winnerAnnouncementEl.className = 'winner-announcement';
        updateProgressUI();

        clearInterval(drainInterval);
        drainInterval = setInterval(drainProgress, drainIntervalTime);

        lastPressTimeP1 = 0;
        lastPressTimeP2 = 0;
    }

    // --- Event Listeners ---
    document.addEventListener('keydown', handleKeyPress);
    resetButton.addEventListener('click', resetGame);

    // --- Initial Setup ---
    updateScoreUI();
    const initialDifficultyRadio = document.querySelector('input[name="difficulty"]:checked');
    if (initialDifficultyRadio) {
        currentDifficulty = initialDifficultyRadio.value;
    }
    if (currentDifficulty === 'manual') {
        manualControlsArea.style.display = 'block';
    } else {
        manualControlsArea.style.display = 'none';
    }
    updateGameParameters(); 
    resetGame(); 
});
