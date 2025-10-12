(function (global) {
    let overlay = null;
    let modal = null;
    let confettiContainer = null;
    let isOpen = false;
    let victoryShown = false;

    function createModal(winner) {
        if (modal) return modal;

        overlay = document.createElement('div');
        overlay.className = 'victory-overlay';

        confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.animationDelay = Math.random() * 3 + 's';
            confetti.style.backgroundColor = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe'][Math.floor(Math.random() * 6)];
            confettiContainer.appendChild(confetti);
        }

        modal = document.createElement('div');
        modal.className = 'victory-modal';

        const displayName = winner === 'player' ? 'Player' : 'Opponent';

        const modalHTML = `
            <div class="victory-trophy">🏆</div>
            <div class="victory-text">
                <h1>${displayName} wins</h1>
                <p>Congratulations on your victory!</p>
            </div>
            <div class="victory-buttons" id="victoryButtons"></div>
        `;

        modal.innerHTML = modalHTML;

        document.body.appendChild(overlay);
        document.body.appendChild(confettiContainer);
        document.body.appendChild(modal);

        setupButtons();
        return modal;
    }

    function setupButtons() {
        const buttonsContainer = document.getElementById('victoryButtons');
        if (!buttonsContainer) return;

        if (typeof createButton === 'function') {
            createButton('Home', 'home', () => {
                window.location.href = 'index.html';
            }, buttonsContainer);

            createButton('Restart', 'restart', () => {
                window.location.reload();
            }, buttonsContainer);
        } else {
            const homeBtn = document.createElement('button');
            homeBtn.className = 'multiplayer-button multiplayer-button-primary';
            homeBtn.textContent = 'Home';
            homeBtn.onclick = () => window.location.href = 'index.html';

            const restartBtn = document.createElement('button');
            restartBtn.className = 'multiplayer-button multiplayer-button-primary';
            restartBtn.textContent = 'Restart';
            restartBtn.onclick = () => window.location.reload();

            buttonsContainer.appendChild(homeBtn);
            buttonsContainer.appendChild(restartBtn);
        }
    }

    function open(winner) {
        if (victoryShown || isOpen) return;
        victoryShown = true;
        isOpen = true;

        requestAnimationFrame(() => {
            createModal(winner);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (overlay) overlay.classList.add('show');
                    if (modal) modal.classList.add('show');
                });
            });
        });
    }

    function close() {
        if (modal && overlay) {
            modal.classList.remove('show');
            overlay.classList.remove('show');

            isOpen = false;

            setTimeout(() => {
                if (modal && modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
                if (overlay && overlay.parentNode) {
                    overlay.parentNode.removeChild(overlay);
                }
                if (confettiContainer && confettiContainer.parentNode) {
                    confettiContainer.parentNode.removeChild(confettiContainer);
                }

                modal = null;
                overlay = null;
                confettiContainer = null;
            }, 600);
        }
    }

    function reset() {
        victoryShown = false;
        if (isOpen) {
            close();
        }
    }

    global.VictoryModal = {
        open,
        close,
        reset,
        isOpen: () => isOpen,
        hasBeenShown: () => victoryShown
    };
})(window);