(function (global) {
    function clear(container) {
        container.innerHTML = '';
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
        clear(slotEl);
        const stack = Array.isArray(cards) ? cards : [];
        const offsetY = 40;
        for (let i = 0; i < stack.length; i++) {
            const card = stack[i];
            const wrapper = document.createElement('div');
            wrapper.className = 'board-card';
            const y = i * offsetY;
            wrapper.style.transform = `translateY(${y}px)`;
            wrapper.style.zIndex = 100 + i;

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

    global.UI = { renderFacedown, renderCurrent, renderDiscard, renderBoardSlot, renderSmallPile };
})(window);