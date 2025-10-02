(function (global) {
    function animateCardDraw(fromEl, toEl, card, onComplete) {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        const animCard = document.createElement('div');
        animCard.className = 'card-drawing';
        animCard.style.left = fromRect.left + 'px';
        animCard.style.top = fromRect.top + 'px';

        const backImg = document.createElement('img');
        backImg.src = 'src/assets/cards/faceDown.png';
        backImg.className = 'card-back';
        backImg.alt = 'Card back';

        const frontImg = document.createElement('img');
        frontImg.src = `src/assets/cards/${card.id}.png`;
        frontImg.className = 'card-front';
        frontImg.alt = card.id || 'Card';

        animCard.appendChild(backImg);
        animCard.appendChild(frontImg);
        document.body.appendChild(animCard);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                animCard.classList.add('animating');
                animCard.style.transform = 'rotateY(180deg)';
                animCard.style.left = toRect.left + 'px';
                animCard.style.top = toRect.top + 'px';

                setTimeout(() => {
                    animCard.remove();
                    onComplete();
                }, 900);
            });
        });
    }

    async function animateBotMove(fromEl, toEl, cards, destType, sourceType, animationDelay) {
        if (!fromEl || !toEl || !cards || !cards.length) return;

        try {
            const clone = window.DragDrop && window.DragDrop.createCloneFromCards
                ? window.DragDrop.createCloneFromCards(cards)
                : null;

            if (!clone) return;
            clone.classList.add('bot-dragging');

            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();

            const offsetY = 40;

            let startX = fromRect.left + fromRect.width / 2;
            let startY = fromRect.top + fromRect.height / 2;

            if (sourceType === 'board') {
                const existingCards = fromEl.querySelectorAll && fromEl.querySelectorAll('.board-card');
                if (existingCards && existingCards.length > 0) {
                    const totalCards = existingCards.length;
                    const movedCount = cards.length;
                    const firstMovedCardIndex = totalCards - movedCount;
                    startY = fromRect.top + (firstMovedCardIndex * offsetY) + 70;
                }
            }

            let endX = toRect.left + toRect.width / 2;
            let endY = toRect.top + toRect.height / 2;

            if (destType === 'board') {
                const existingCards = toEl.querySelectorAll && toEl.querySelectorAll('.board-card');
                const cardCount = existingCards ? existingCards.length : 0;
                endY = toRect.top + (cardCount * offsetY) + 70;
            }

            const cloneRect = clone.getBoundingClientRect();
            clone.style.left = (startX - cloneRect.width / 2) + 'px';
            clone.style.top = (startY - cloneRect.height / 2) + 'px';

            if (toEl.classList) toEl.classList.add('drop-highlight');

            await new Promise(resolve => {
                const duration = animationDelay || 600;
                const startTime = Date.now();

                function animate() {
                    const elapsed = Date.now() - startTime;
                    const progress = Math.min(elapsed / duration, 1);

                    const eased = progress < 0.5
                        ? 2 * progress * progress
                        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

                    const currentX = startX + (endX - startX) * eased;
                    const currentY = startY + (endY - startY) * eased;

                    clone.style.left = (currentX - cloneRect.width / 2) + 'px';
                    clone.style.top = (currentY - cloneRect.height / 2) + 'px';

                    if (progress < 1) {
                        requestAnimationFrame(animate);
                    } else {
                        resolve();
                    }
                }

                requestAnimationFrame(animate);
            });

            if (toEl.classList) toEl.classList.remove('drop-highlight');
            if (clone && clone.parentNode) clone.parentNode.removeChild(clone);

        } catch (e) { }
    }

    let victoryShown = false;

    function animateVictory(winner) {
        if (victoryShown) return;
        victoryShown = true;

        requestAnimationFrame(() => {
            const overlay = document.createElement('div');
            overlay.className = 'victory-overlay';
            document.body.appendChild(overlay);

            const modal = document.createElement('div');
            modal.className = 'victory-modal';

            const confettiContainer = document.createElement('div');
            confettiContainer.className = 'confetti-container';

            for (let i = 0; i < 50; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.animationDelay = Math.random() * 3 + 's';
                confetti.style.backgroundColor = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#a29bfe'][Math.floor(Math.random() * 6)];
                confettiContainer.appendChild(confetti);
            }

            const trophy = document.createElement('div');
            trophy.className = 'victory-trophy';
            trophy.innerHTML = '🏆';

            const winnerText = document.createElement('div');
            winnerText.className = 'victory-text';
            const displayName = winner === 'player' ? 'Player' : 'Opponent';
            winnerText.innerHTML = `<h1>${displayName} wins!</h1><p>Congratulations on your victory!</p>`;

            const buttonsContainer = document.createElement('div');
            buttonsContainer.className = 'victory-buttons';

            if (typeof createButton === 'function') {
                createButton('Home', 'home', () => {
                    window.location.href = 'index.html';
                }, buttonsContainer);

                createButton('Restart', 'restart', () => {
                    window.location.reload();
                }, buttonsContainer);
            }

            modal.appendChild(trophy);
            modal.appendChild(winnerText);
            modal.appendChild(buttonsContainer);

            document.body.appendChild(confettiContainer);
            document.body.appendChild(modal);

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    overlay.classList.add('show');
                    modal.classList.add('show');
                });
            });
        });
    }

    async function animateBoardReveal(boardSlots, initialBoard) {
        if (!boardSlots || boardSlots.length === 0) return;

        const imagesToLoad = [
            'src/assets/cards/faceDown.png',
            ...initialBoard.map(card => `src/assets/cards/${card.id}.png`)
        ];

        await Promise.all(imagesToLoad.map(src => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = resolve;
                img.onerror = resolve;
                img.src = src;
            });
        }));

        const cardContainers = [];
        for (let i = 0; i < boardSlots.length; i++) {
            const slot = boardSlots[i];
            const card = initialBoard[i];

            if (!slot || !card) continue;

            const cardContainer = document.createElement('div');
            cardContainer.className = 'board-card board-card-reveal';
            cardContainer.style.width = '100%';
            cardContainer.style.height = '100%';

            const backFace = document.createElement('img');
            backFace.src = 'src/assets/cards/faceDown.png';
            backFace.className = 'card-face card-back-face';
            backFace.alt = 'Card back';

            const frontFace = document.createElement('img');
            frontFace.src = `src/assets/cards/${card.id}.png`;
            frontFace.className = 'card-face card-front-face';
            frontFace.alt = card.id || 'Card';

            cardContainer.appendChild(backFace);
            cardContainer.appendChild(frontFace);

            slot.innerHTML = '';
            slot.appendChild(cardContainer);

            cardContainers.push({ container: cardContainer, slot: slot, card: card });
        }

        await new Promise(resolve => setTimeout(resolve, 200));

        for (let i = 0; i < cardContainers.length; i++) {
            const { container: cardContainer, slot, card } = cardContainers[i];
            cardContainer.classList.add('flipping');
            await new Promise(resolve => setTimeout(resolve, 250));
        }

        await new Promise(resolve => setTimeout(resolve, 100));
        for (let i = 0; i < cardContainers.length; i++) {
            const { slot, card } = cardContainers[i];

            const wrapper = document.createElement('div');
            wrapper.className = 'board-card';
            wrapper.style.transform = 'translateY(0px)';
            wrapper.style.zIndex = 100;

            const img = document.createElement('img');
            img.src = `src/assets/cards/${card.id}.png`;
            img.alt = 'Board card';

            wrapper.appendChild(img);
            slot.innerHTML = '';
            slot.appendChild(wrapper);
        }
    }

    global.Animations = {
        animateCardDraw,
        animateBotMove,
        animateVictory,
        animateBoardReveal
    };
})(window);