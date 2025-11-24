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

        let timeoutId = null;
        let cancelled = false;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (cancelled) return;
                animCard.classList.add('animating');
                animCard.style.transform = 'rotateY(180deg)';
                animCard.style.left = toRect.left + 'px';
                animCard.style.top = toRect.top + 'px';

                timeoutId = setTimeout(() => {
                    if (!cancelled) {
                        animCard.remove();
                        onComplete();
                    }
                }, 900);
            });
        });

        return function cleanup() {
            cancelled = true;
            if (timeoutId) clearTimeout(timeoutId);
            if (animCard && animCard.parentNode) {
                animCard.remove();
            }
        };
    }

    async function animateBotMove(fromEl, toEl, cards, destType, sourceType, animationDelay) {
        if (!fromEl || !toEl || !cards || !cards.length) return;

        try {
            const clone = window.DragDrop && window.DragDrop.createCloneFromCards
                ? window.DragDrop.createCloneFromCards(cards)
                : null;

            if (!clone) return;
            clone.classList.add('bot-dragging');

            const dims = window.UI && window.UI.getCardDimensions ? window.UI.getCardDimensions() : { width: 100, height: 140 };
            const offsetY = window.UI && window.UI.getCardOffsetY ? window.UI.getCardOffsetY() : 40;

            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();

            let startX = fromRect.left + fromRect.width / 2;
            let startY = fromRect.top + fromRect.height / 2;

            if (sourceType === 'board') {
                const existingCards = fromEl.querySelectorAll && fromEl.querySelectorAll('.board-card');
                if (existingCards && existingCards.length > 0) {
                    const totalCards = existingCards.length;
                    const movedCount = cards.length;
                    const firstMovedCardIndex = totalCards - movedCount;
                    startY = fromRect.top + (firstMovedCardIndex * offsetY) + (dims.height / 2);
                }
            }

            let endX = toRect.left + toRect.width / 2;
            let endY = toRect.top + toRect.height / 2;

            const opts = (typeof animationDelay === 'object' && animationDelay) ? animationDelay : null;
            const duration = opts && typeof opts.duration === 'number' ? opts.duration : (typeof animationDelay === 'number' ? animationDelay : 600);

            if (destType === 'board') {
                const existingCards = toEl.querySelectorAll && toEl.querySelectorAll('.board-card');
                const cardCount = existingCards ? existingCards.length : 0;
                let displayCount = cardCount;
                if (opts && opts.compensateBoardOverlap) {
                    displayCount = Math.max(0, cardCount - (cards.length || 1));
                }
                endY = toRect.top + (displayCount * offsetY) + (dims.height / 2);
            }

            const cloneRect = clone.getBoundingClientRect();
            clone.style.left = (startX - cloneRect.width / 2) + 'px';
            clone.style.top = (startY - cloneRect.height / 2) + 'px';

            if (toEl.classList) toEl.classList.add('drop-highlight');

            await new Promise(resolve => {
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

    function animateVictory(winner) {
        if (global.VictoryModal) {
            global.VictoryModal.open(winner);
        } else {
        }
    }

    async function animateBoardReveal(boardSlots, initialBoard) {
        if (!boardSlots || boardSlots.length === 0) return;

        const imagesToLoad = [
            'src/assets/cards/faceDown.png',
            ...initialBoard
                .filter(card => card && card.id)
                .map(card => `src/assets/cards/${card.id}.png`)
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

    async function animateShuffleReplenish(discardEl, facedownEl, onComplete) {
        if (!discardEl || !facedownEl) {
            if (onComplete) onComplete();
            return;
        }

        try { window._shuffleAnimationInProgress = true; } catch (e) { }

        const dims = window.UI && window.UI.getCardDimensions ? window.UI.getCardDimensions() : { width: 100, height: 140 };
        const facedownRect = facedownEl.getBoundingClientRect();

        const animContainer = document.createElement('div');
        animContainer.className = 'shuffle-animation-container';
        animContainer.style.position = 'fixed';
        animContainer.style.top = '0';
        animContainer.style.left = '0';
        animContainer.style.width = '100%';
        animContainer.style.height = '100%';
        animContainer.style.pointerEvents = 'none';
        animContainer.style.zIndex = '10000';
        document.body.appendChild(animContainer);

        const centerX = facedownRect.left + facedownRect.width / 2;
        const centerY = facedownRect.top + facedownRect.height / 2;

        const largeWidth = dims.width;
        const largeHeight = dims.height;
        const smallWidth = dims.width * 0.6;
        const smallHeight = dims.height * 0.6;

        const numCards = 8;
        const cards = [];

        for (let i = 0; i < numCards; i++) {
            const card = document.createElement('div');
            card.className = 'shuffle-card';
            card.style.position = 'absolute';
            card.style.width = largeWidth + 'px';
            card.style.height = largeHeight + 'px';
            card.style.left = (centerX - largeWidth / 2) + 'px';
            card.style.top = (centerY - largeHeight / 2) + 'px';
            card.style.transition = 'all 0.7s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
            card.style.transformOrigin = 'center';
            card.style.opacity = i === 0 ? '1' : '0';

            const img = document.createElement('img');
            img.src = 'src/assets/cards/faceDown.png';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '6px';
            img.alt = 'Card';

            card.appendChild(img);
            animContainer.appendChild(card);
            cards.push(card);
        }

        await new Promise(resolve => setTimeout(resolve, 100));

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                cards.forEach((card, i) => {
                    card.style.opacity = '1';
                    card.style.width = smallWidth + 'px';
                    card.style.height = smallHeight + 'px';

                    const angle = (360 / numCards) * i;
                    const radius = 90;
                    const offsetX = Math.cos(angle * Math.PI / 180) * radius;
                    const offsetY = Math.sin(angle * Math.PI / 180) * radius;

                    card.style.left = (centerX + offsetX - smallWidth / 2) + 'px';
                    card.style.top = (centerY + offsetY - smallHeight / 2) + 'px';
                    card.style.transform = `rotate(${angle}deg)`;
                });
            });
        });

        await new Promise(resolve => setTimeout(resolve, 750));

        cards.forEach((card, i) => {
            const stagger = i * 40;
            setTimeout(() => {
                card.style.left = (centerX - smallWidth / 2) + 'px';
                card.style.top = (centerY - smallHeight / 2) + 'px';
                card.style.transform = 'rotate(0deg)';

                setTimeout(() => {
                    card.style.width = largeWidth + 'px';
                    card.style.height = largeHeight + 'px';
                    card.style.left = (centerX - largeWidth / 2) + 'px';
                    card.style.top = (centerY - largeHeight / 2) + 'px';
                    card.style.opacity = i === numCards - 1 ? '1' : '0';
                }, 200);
            }, stagger);
        });

        await new Promise(resolve => setTimeout(resolve, 1100));

        if (animContainer && animContainer.parentNode) {
            animContainer.parentNode.removeChild(animContainer);
        }

        if (onComplete) onComplete();

        try { window._shuffleAnimationInProgress = false; } catch (e) { }
    }

    global.Animations = {
        animateCardDraw,
        animateBotMove,
        animateVictory,
        animateBoardReveal,
        animateShuffleReplenish
    };
})(window);