(function (global) {
    function getCardDimensions() {
        const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-width')) || 100;
        const height = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-height')) || 140;
        return { width, height };
    }

    function getCardOffsetY() {
        return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--board-offset-y')) || 40;
    }

    function clear(container) {
        if (!container) return;
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }

    function renderFacedown(container, cards) {
        clear(container);
        const img = document.createElement('img');
        img.src = 'src/assets/cards/faceDown.png';
        img.alt = 'Facedown card';
        container.appendChild(img);

        const counter = document.createElement('div');
        counter.className = 'pile-count';
        counter.textContent = Array.isArray(cards) ? cards.length : 0;
        container.appendChild(counter);
    }

    function renderCurrent(container, card) {
        clear(container);
        if (!card) return;
        const img = document.createElement('img');
        img.src = `src/assets/cards/${card.id}.png`;
        img.alt = 'Current card';
        container.appendChild(img);
    }

    function renderDiscard(container, discard) {
        clear(container);
        const cards = Array.isArray(discard) ? discard : [];
        if (cards.length === 0) return;
        const img = document.createElement('img');
        img.src = `src/assets/cards/${cards[cards.length - 1].id}.png`;
        img.alt = 'Discard card';
        container.appendChild(img);
        const counter = document.createElement('div');
        counter.className = 'pile-count';
        counter.textContent = cards.length;
        container.appendChild(counter);
    }

    function renderBoardSlot(slotEl, cards) {
        if (!slotEl) return;

        while (slotEl.firstChild) {
            slotEl.removeChild(slotEl.firstChild);
        }

        const stack = Array.isArray(cards) ? cards : [];
        const offsetY = getCardOffsetY();

        const seenIds = new Set();

        for (let i = 0; i < stack.length; i++) {
            const card = stack[i];
            if (!card || !card.id) continue;

            const uniqueKey = `${card.id}_${i}`;
            if (seenIds.has(uniqueKey)) {
                continue;
            }
            seenIds.add(uniqueKey);

            const wrapper = document.createElement('div');
            wrapper.className = 'board-card';
            const y = i * offsetY;
            wrapper.style.transform = `translateY(${y}px)`;
            wrapper.style.zIndex = 100 + i;
            wrapper.setAttribute('data-card-id', card.id);
            wrapper.setAttribute('data-position', i);

            const img = document.createElement('img');
            img.src = `src/assets/cards/${card.id}.png`;
            img.alt = 'Board card';

            wrapper.appendChild(img);
            slotEl.appendChild(wrapper);
        }
    }

    function renderSmallPile(container, cards) {
        clear(container);
        const stack = Array.isArray(cards) ? cards : [];
        if (stack.length === 0) return;
        const img = document.createElement('img');
        img.src = `src/assets/cards/${stack[stack.length - 1].id}.png`;
        img.alt = 'Small pile card';
        container.appendChild(img);
    }

    function renderTurnIndicator(container, turn) {
        let el = container;
        if (typeof container === 'string') el = document.getElementById(container);
        if (!el) return;
        let label = turn === 'opponent' ? "Opponent's turn" : "Player's turn";

        try {
            const pin = (window.MultiplayerModal && typeof window.MultiplayerModal.getCurrentRoomPin === 'function' && window.MultiplayerModal.getCurrentRoomPin())
                || (window.RoomManager && typeof window.RoomManager.getCurrentRoomId === 'function' && window.RoomManager.getCurrentRoomId());
            if (pin) {
                label += ` (#${pin})`;
            }
        } catch (_) { }

        el.textContent = label;
        el.setAttribute('data-turn', turn);
    }

    global.UI = {
        renderFacedown,
        renderCurrent,
        renderDiscard,
        renderBoardSlot,
        renderSmallPile,
        renderTurnIndicator,
        getCardDimensions,
        getCardOffsetY
    };
})(window);