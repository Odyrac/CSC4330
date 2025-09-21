(function (global) {
    let dragState = null;
    let playerDiscardEl = null;
    let opponentDiscardEl = null;
    let boardSlotEls = null;

    function createCloneImage(img) {
        const clone = img.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.pointerEvents = 'none';
        clone.classList.add('dragging-image');
        document.body.appendChild(clone);
        return clone;
    }

    function moveClone(pageX, pageY) {
        if (!dragState || !dragState.cloneEl) return;
        const clone = dragState.cloneEl;
        const w = clone.width || 100;
        const h = clone.height || 140;
        clone.style.left = (pageX - w / 2) + 'px';
        clone.style.top = (pageY - h / 2) + 'px';
        clone.style.width = w + 'px';
        clone.style.height = h + 'px';
        clone.style.zIndex = 9999;
    }

    function getDropTargetAt(x, y) {
        if (boardSlotEls && boardSlotEls.length) {
            for (let i = 0; i < boardSlotEls.length; i++) {
                const el = boardSlotEls[i];
                if (!el) continue;
                const r = el.getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { type: 'board', el: el, index: i };
            }
        }
        if (!playerDiscardEl || !opponentDiscardEl) return null;
        const pD = playerDiscardEl.getBoundingClientRect();
        const oD = opponentDiscardEl.getBoundingClientRect();
        if (x >= pD.left && x <= pD.right && y >= pD.top && y <= pD.bottom) return { type: 'player', el: playerDiscardEl };
        if (x >= oD.left && x <= oD.right && y >= oD.top && y <= oD.bottom) return { type: 'opponent', el: opponentDiscardEl };
        return null;
    }

    function highlightDropTarget(clientX, clientY) {
        const target = getDropTargetAt(clientX, clientY);
        [playerDiscardEl, opponentDiscardEl].forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
        if (boardSlotEls && boardSlotEls.length) boardSlotEls.forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
        if (target && target.el && target.el.classList) target.el.classList.add('drop-highlight');
    }

    function clearHighlight() {
        [playerDiscardEl, opponentDiscardEl].forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
        if (boardSlotEls && boardSlotEls.length) boardSlotEls.forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
    }

    function onMouseMove(e) {
        if (!dragState) return;
        moveClone(e.pageX, e.pageY);
        highlightDropTarget(e.clientX, e.clientY);
    }

    function onMouseUp(e) {
        if (!dragState) return;
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);

        const target = getDropTargetAt(e.clientX, e.clientY);
        const fromSide = dragState.side;

        if (target && fromSide && fromSide.current) {
            const card = fromSide.current;
            fromSide.current = null;
            if (target.type === 'player') {
                target.el.__appendCardFor && target.el.__appendCardFor('player', card);
            } else if (target.type === 'opponent') {
                target.el.__appendCardFor && target.el.__appendCardFor('opponent', card);
            } else if (target.type === 'board') {
                target.el.__appendCardFor && target.el.__appendCardFor(null, card);
            }
            dragState.onMoved && dragState.onMoved(fromSide);
        }

        if (dragState.cloneEl && dragState.cloneEl.parentNode) dragState.cloneEl.parentNode.removeChild(dragState.cloneEl);
        dragState = null;
        clearHighlight();
    }

    function onMouseDown(e, side, currentEl, onMoved) {
        if (!side.current) return;
        e.preventDefault();
        let sourceImg = null;
        try {
            const imgs = currentEl.querySelectorAll && currentEl.querySelectorAll('img');
            if (imgs && imgs.length) {
                for (let i = imgs.length - 1; i >= 0; i--) {
                    const el = imgs[i];
                    if (side.current && side.current.id && el.src && el.src.indexOf(side.current.id) !== -1) {
                        sourceImg = el;
                        break;
                    }
                }
                if (!sourceImg) sourceImg = imgs[imgs.length - 1];
            }
        } catch (err) {
        }

        if (!sourceImg && side.current && side.current.id) {
            const tmp = new Image();
            tmp.src = `src/assets/cards/${side.current.id}.png`;
            tmp.alt = side.current.id || 'card';
            sourceImg = tmp;
        }

        if (!sourceImg) return;
        const clone = createCloneImage(sourceImg);
        dragState = { side, currentEl, card: side.current, cloneEl: clone, onMoved };
        moveClone(e.pageX, e.pageY);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }

    function init(opts) {
        playerDiscardEl = opts.playerDiscardEl;
        opponentDiscardEl = opts.opponentDiscardEl;
        boardSlotEls = Array.isArray(opts.boardSlotEls) ? opts.boardSlotEls : null;
    }

    global.DragDrop = { init, onMouseDown };
})(window);