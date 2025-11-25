(function (global) {
    /**
     * Gets the dimensions of a card from CSS variables.
     * 
     * @returns {Object} An object containing the width and height of a card.
     */
    function getCardDimensions() {
        const width = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-width')) || 100;
        const height = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-height')) || 140;
        return { width, height };
    }

    /**
     * Gets the vertical offset for stacking cards on the board from CSS variables.
     * 
     * @returns {number} The vertical offset in pixels.
     */
    function getCardOffsetY() {
        return parseInt(getComputedStyle(document.documentElement).getPropertyValue('--board-offset-y')) || 40;
    }

    /**
     * Clears all child elements from a container.
     * 
     * @param {HTMLElement} container - The container element to clear.
     */
    function clear(container) {
        if (!container) return;
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
    }
    /**
     * Renders a facedown card pile with a count.
     * 
     * @param {HTMLElement} container - The container element to render into.
     * @param {Array} cards - The array of cards in the pile.
     */
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
    /**
     * Renders the current card.
     * 
     * @param {HTMLElement} container - The container element to render into.
     * @param {Object} card - The current card object.
     */
    function renderCurrent(container, card) {
        clear(container);
        if (!card) return;
        const img = document.createElement('img');
        img.src = `src/assets/cards/${card.id}.png`;
        img.alt = 'Current card';
        container.appendChild(img);
    }
    /**
     * Renders the discard pile with the top card and count.
     * 
     * @param {HTMLElement} container - The container element to render into.
     * @param {Array} discard - The array of discarded cards.
     */
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

    /**
     * Renders a stack of cards in a board slot if present.
     * 
     * @param {HTMLElement} slotEl - The board slot element to render into.
     * @param {Array} cards - The array of cards in the slot.
     */
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
    /**
     * Renders a small pile of cards showing only the top card.
     * 
     * @param {HTMLElement} container - The container element to render into.
     * @param {Array} cards - The array of cards in the pile.
     */
    function renderSmallPile(container, cards) {
        clear(container);
        const stack = Array.isArray(cards) ? cards : [];
        if (stack.length === 0) return;
        const img = document.createElement('img');
        img.src = `src/assets/cards/${stack[stack.length - 1].id}.png`;
        img.alt = 'Small pile card';
        container.appendChild(img);
    }

    /**
     * Renders the turn indicator.
     * 
     * @param {HTMLElement|string} container - The container element or its ID to render into.
     * @param {string} turn - The current turn ('player' or 'opponent').
     * @throws Will throw an error if the container is not found or invalid.
     */
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
    // Expose functions globally
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