(function (global) {
    let dragState = null;
    let playerDiscardEl = null;
    let opponentDiscardEl = null;
    let boardSlotEls = null;
    let leftFoundationEls = null;
    let rightFoundationEls = null;

    function createCloneImage(img) {
        const clone = img.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.pointerEvents = 'none';
        clone.classList.add('dragging-image');
        document.body.appendChild(clone);
        return clone;
    }

    function createStackClone(stack) {
        const offsetY = 40;
        const width = 100;
        const height = 140 + (Math.max(0, stack.length - 1) * offsetY);
        const wrapper = document.createElement('div');
        wrapper.style.position = 'absolute';
        wrapper.style.pointerEvents = 'none';
        wrapper.classList.add('dragging-image-stack');
        wrapper.style.width = width + 'px';
        wrapper.style.height = height + 'px';
        wrapper.style.pointerEvents = 'none';
        for (let i = 0; i < stack.length; i++) {
            const card = stack[i];
            const img = document.createElement('img');
            img.src = `src/assets/cards/${card.id}.png`;
            img.alt = card.id || 'card';
            img.style.position = 'absolute';
            img.style.left = '0';
            img.style.top = (i * offsetY) + 'px';
            img.style.width = width + 'px';
            img.style.height = '140px';
            img.style.objectFit = 'cover';
            wrapper.appendChild(img);
        }
        document.body.appendChild(wrapper);
        return wrapper;
    }

    function moveClone(pageX, pageY) {
        if (!dragState || !dragState.cloneEl) return;
        const clone = dragState.cloneEl;
        const rect = clone.getBoundingClientRect ? clone.getBoundingClientRect() : { width: 100, height: 140 };
        const w = rect.width || 100;
        const h = rect.height || 140;
        clone.style.left = (pageX - w / 2) + 'px';
        clone.style.top = (pageY - h / 2) + 'px';
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
        
        if (leftFoundationEls && leftFoundationEls.length) {
            for (let i = 0; i < leftFoundationEls.length; i++) {
                const el = leftFoundationEls[i];
                if (!el) continue;
                const r = el.getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { type: 'leftFoundation', el: el, index: i };
            }
        }
        
        if (rightFoundationEls && rightFoundationEls.length) {
            for (let i = 0; i < rightFoundationEls.length; i++) {
                const el = rightFoundationEls[i];
                if (!el) continue;
                const r = el.getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { type: 'rightFoundation', el: el, index: i };
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
        if (boardSlotEls && boardSlotEls.length) {
            boardSlotEls.forEach(slotEl => {
                if (!slotEl) return;
                slotEl.classList && slotEl.classList.remove('drop-highlight');
                const cards = slotEl.querySelectorAll && slotEl.querySelectorAll('.board-card');
                if (cards && cards.length) {
                    cards.forEach(c => c.classList && c.classList.remove('drop-highlight'));
                }
            });
        }
        if (leftFoundationEls && leftFoundationEls.length) leftFoundationEls.forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
        if (rightFoundationEls && rightFoundationEls.length) rightFoundationEls.forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
        if (target && target.cardEl) {
            if (target.cardEl.classList) target.cardEl.classList.add('drop-highlight');
        } else if (target && target.el && target.el.classList) {
            target.el.classList.add('drop-highlight');
        }
    }

    function clearHighlight() {
        [playerDiscardEl, opponentDiscardEl].forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
        if (boardSlotEls && boardSlotEls.length) boardSlotEls.forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
        if (leftFoundationEls && leftFoundationEls.length) leftFoundationEls.forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
        if (rightFoundationEls && rightFoundationEls.length) rightFoundationEls.forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
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

        if (target && fromSide) {
            if (fromSide.stack && Array.isArray(fromSide.stack) && fromSide.stack.length > 0) {
                const cardsToMove = fromSide.stack.slice();
                fromSide.movedCount = cardsToMove.length;
                if (target.type === 'player') {
                    cardsToMove.forEach(c => target.el.__appendCardFor && target.el.__appendCardFor('player', c));
                } else if (target.type === 'opponent') {
                    cardsToMove.forEach(c => target.el.__appendCardFor && target.el.__appendCardFor('opponent', c));
                } else if (target.type === 'board') {
                    const slotTarget = target.slotEl || target.el;
                    cardsToMove.forEach(c => slotTarget && slotTarget.__appendCardFor && slotTarget.__appendCardFor(null, c));
                } else if (target.type === 'leftFoundation' || target.type === 'rightFoundation') {
                    cardsToMove.forEach(c => target.el.__appendCardFor && target.el.__appendCardFor(null, c));
                }
                dragState.onMoved && dragState.onMoved(fromSide);
            } else if (fromSide.current) {
                const card = fromSide.current;
                fromSide.current = null;
                if (target.type === 'player') {
                    target.el.__appendCardFor && target.el.__appendCardFor('player', card);
                } else if (target.type === 'opponent') {
                    target.el.__appendCardFor && target.el.__appendCardFor('opponent', card);
                } else if (target.type === 'board') {
                    const slotTarget = target.slotEl || target.el;
                    slotTarget && slotTarget.__appendCardFor && slotTarget.__appendCardFor(null, card);
                } else if (target.type === 'leftFoundation' || target.type === 'rightFoundation') {
                    target.el.__appendCardFor && target.el.__appendCardFor(null, card);
                }
                dragState.onMoved && dragState.onMoved(fromSide);
            }
        }

        if (dragState.cloneEl && dragState.cloneEl.parentNode) dragState.cloneEl.parentNode.removeChild(dragState.cloneEl);
        dragState = null;
        clearHighlight();
    }

    function onMouseDown(e, side, currentEl, onMoved) {
        if (!side.current && !(side.stack && side.stack.length)) return;
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

        if (side.stack && Array.isArray(side.stack) && side.stack.length > 0) {
            const clone = createStackClone(side.stack);
            dragState = { side, currentEl, stack: side.stack.slice(), cloneEl: clone, onMoved };
            moveClone(e.pageX, e.pageY);
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            return;
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
        leftFoundationEls = Array.isArray(opts.leftFoundationEls) ? opts.leftFoundationEls : null;
        rightFoundationEls = Array.isArray(opts.rightFoundationEls) ? opts.rightFoundationEls : null;
    }

    global.DragDrop = { init, onMouseDown };
})(window);