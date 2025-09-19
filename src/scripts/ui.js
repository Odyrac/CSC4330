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

    global.UI = { renderFacedown, renderCurrent, renderDiscard };
})(window);