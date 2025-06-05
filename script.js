document.addEventListener('DOMContentLoaded', () => {
    const player1ProgressEl = document.getElementById('player1-progress');
    const player2ProgressEl = document.getElementById('player2-progress');
    const player1ValueEl = document.getElementById('player1-value');
    const player2ValueEl = document.getElementById('player2-value');
    const winnerAnnouncementEl = document.getElementById('winner-announcement');
    const resetButton = document.getElementById('reset-button');
    const modeToggleButton = document.getElementById('mode-toggle');

    let player1Progress = 0;
    let player2Progress = 0;
    const maxProgress = 100;
    const increment = 6; // How much progress per key press
    const drainRate = 0.6; // How much progress drains per interval
    const drainIntervalTime = 70; // Milliseconds for drain check (more frequent = smoother drain)
    const pressCooldown = 100; // Milliseconds before another press registers (anti-spam, optional)

    let gameActive = true;
    let drainInterval;
    let lastPressTimeP1 = 0;
    let lastPressTimeP2 = 0;

    // --- Dark/Light Mode ---
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            modeToggleButton.textContent = '☀️'; // Sun icon for dark mode
        } else {
            document.body.classList.remove('dark-mode');
            modeToggleButton.textContent = '🌙'; // Moon icon for light mode
        }
    }

    modeToggleButton.addEventListener('click', () => {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        const newTheme = isDarkMode ? 'dark' : 'light';
        applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Load saved theme
    const savedTheme = localStorage.getItem('theme') || 'light'; // Default to light
    applyTheme(savedTheme);


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
            player1Progress = maxProgress; // Cap at max
        }
        if (player2Progress >= maxProgress) {
            winner = winner === 'Player 1' ? 'It\'s a Tie!' : 'Player 2';
            player2Progress = maxProgress; // Cap at max
        }
        
        if (winner) {
            gameActive = false;
            clearInterval(drainInterval);
            winnerAnnouncementEl.textContent = winner === "It's a Tie!" ? winner : `${winner} Wins!`;
            winnerAnnouncementEl.style.display = 'block';
            if (winner === 'Player 1') {
                winnerAnnouncementEl.className = 'winner-announcement player1-win';
            } else if (winner === 'Player 2') {
                winnerAnnouncementEl.className = 'winner-announcement player2-win';
            } else {
                winnerAnnouncementEl.className = 'winner-announcement'; // Neutral for tie
            }
            updateProgressUI(); // Final update
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
            event.preventDefault(); // Prevent page scrolling
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
        player1Progress = 0;
        player2Progress = 0;
        gameActive = true;
        winnerAnnouncementEl.style.display = 'none';
        winnerAnnouncementEl.textContent = '';
        winnerAnnouncementEl.className = 'winner-announcement'; // Reset class
        updateProgressUI();
        clearInterval(drainInterval); // Clear existing interval
        drainInterval = setInterval(drainProgress, drainIntervalTime); // Restart drain
        lastPressTimeP1 = 0;
        lastPressTimeP2 = 0;
    }

    // --- Event Listeners ---
    document.addEventListener('keydown', handleKeyPress);
    resetButton.addEventListener('click', resetGame);

    // --- Initial Setup ---
    resetGame(); // Initialize game state and start drain
});
