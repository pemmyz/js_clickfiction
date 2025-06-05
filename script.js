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
    const incrementSlider = document.getElementById('increment-slider');
    const incrementValueDisplay = document.getElementById('increment-value');
    const player1ScoreEl = document.getElementById('player1-score');
    const player2ScoreEl = document.getElementById('player2-score');

    // Game State & Settings
    let player1Progress = 0;
    let player2Progress = 0;
    const maxProgress = 100;
    let increment = parseInt(incrementSlider.value);
    const drainRate = 0.6;
    const drainIntervalTime = 70;
    const pressCooldown = 100; // ms
    const autoRestartDelay = 3000; // 3 seconds

    let gameActive = true;
    let drainInterval;
    let autoRestartTimeout = null;
    let lastPressTimeP1 = 0;
    let lastPressTimeP2 = 0;

    // Scores
    let player1Score = 0;
    let player2Score = 0;


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

    const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to dark
    applyTheme(savedTheme);


    // --- Increment Slider ---
    incrementValueDisplay.textContent = incrementSlider.value;
    incrementSlider.addEventListener('input', (event) => {
        increment = parseInt(event.target.value);
        incrementValueDisplay.textContent = increment;
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
            if (winner === 'Player 1' && player1Progress >= maxProgress) { // Both reach at same check
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
            } else { // Tie
                winnerAnnouncementEl.className = 'winner-announcement';
            }
            updateScoreUI();
            updateProgressUI(); // Final update to show 100%

            // Clear any existing restart timeout and set a new one
            if (autoRestartTimeout) clearTimeout(autoRestartTimeout);
            autoRestartTimeout = setTimeout(resetGame, autoRestartDelay);
        }
    }

    function drainProgress() {
        if (!gameActive) return;

        if (player1Progress > 0) {
            player1Progress -= drainRate;
            if (player1Progress < 0) player1Progress = 0;
        }
        if (player2Progress > 0) {
            player2Progress -= drainRate;
            if (player2Progress < 0) player2Progress = 0;
        }
        updateProgressUI();
    }

    function handleKeyPress(event) {
        if (!gameActive) return;

        const currentTime = Date.now();

        if (event.key === 'w' || event.key === 'W') {
            if (currentTime - lastPressTimeP1 > pressCooldown) {
                player1Progress += increment;
                if (player1Progress > maxProgress) player1Progress = maxProgress;
                lastPressTimeP1 = currentTime;
            }
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            if (currentTime - lastPressTimeP2 > pressCooldown) {
                player2Progress += increment;
                if (player2Progress > maxProgress) player2Progress = maxProgress;
                lastPressTimeP2 = currentTime;
            }
        }
        updateProgressUI();
        checkWinner();
    }

    function resetGame() {
        if (autoRestartTimeout) {
            clearTimeout(autoRestartTimeout); // Clear if manually reset during countdown
            autoRestartTimeout = null;
        }

        player1Progress = 0;
        player2Progress = 0;
        gameActive = true;
        winnerAnnouncementEl.style.display = 'none';
        winnerAnnouncementEl.textContent = ''; // Clear text
        winnerAnnouncementEl.className = 'winner-announcement';
        updateProgressUI();

        clearInterval(drainInterval); // Clear existing interval
        drainInterval = setInterval(drainProgress, drainIntervalTime);

        lastPressTimeP1 = 0;
        lastPressTimeP2 = 0;
        // Scores are not reset here, only game state
    }

    // --- Event Listeners ---
    document.addEventListener('keydown', handleKeyPress);
    resetButton.addEventListener('click', resetGame);


    // --- Initial Setup ---
    updateScoreUI(); // Display initial scores (0-0)
    resetGame(); // Initialize game state and start
});
