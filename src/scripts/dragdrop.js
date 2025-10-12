(function (global) {
    let dragState = null;
    let playerDiscardEl = null;
    let opponentDiscardEl = null;
    let boardSlotEls = null;
    let trumpPileEls = null;
    let foundationPileEls = null;
    let excusePileEl = null;

    function createCloneImage(img) {
        const clone = img.cloneNode(true);
        clone.style.position = 'fixed';
        clone.style.pointerEvents = 'none';
        clone.style.zIndex = '9999';
        clone.classList.add('dragging-image');
        document.body.appendChild(clone);
        return clone;
    }

    function createStackClone(stack) {
        const dims = window.UI && window.UI.getCardDimensions ? window.UI.getCardDimensions() : { width: 100, height: 140 };
        const offsetY = window.UI && window.UI.getCardOffsetY ? window.UI.getCardOffsetY() : 40;
        const width = dims.width;
        const height = dims.height + (Math.max(0, stack.length - 1) * offsetY);
        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.pointerEvents = 'none';
        wrapper.classList.add('dragging-image-stack');
        wrapper.style.width = width + 'px';
        wrapper.style.height = height + 'px';
        wrapper.style.zIndex = '9999';
        for (let i = 0; i < stack.length; i++) {
            const card = stack[i];
            const img = document.createElement('img');
            img.src = `src/assets/cards/${card.id}.png`;
            img.alt = card.id || 'card';
            img.style.position = 'absolute';
            img.style.left = '0';
            img.style.top = (i * offsetY) + 'px';
            img.style.width = width + 'px';
            img.style.height = dims.height + 'px';
            img.style.objectFit = 'cover';
            wrapper.appendChild(img);
        }
        document.body.appendChild(wrapper);
        return wrapper;
    }

    function createCloneFromCards(cards) {
        if (!cards || !cards.length) return null;

        if (cards.length > 1) {
            return createStackClone(cards);
        } else {
            const dims = window.UI && window.UI.getCardDimensions ? window.UI.getCardDimensions() : { width: 100, height: 140 };
            const img = document.createElement('img');
            img.src = `src/assets/cards/${cards[0].id}.png`;
            img.alt = cards[0].id || 'card';
            img.style.position = 'fixed';
            img.style.pointerEvents = 'none';
            img.style.width = dims.width + 'px';
            img.style.height = dims.height + 'px';
            img.style.zIndex = '9999';
            img.classList.add('dragging-image');
            document.body.appendChild(img);
            return img;
        }
    }

    function moveClone(pageX, pageY) {
        if (!dragState || !dragState.cloneEl) return;
        const clone = dragState.cloneEl;
        const dims = window.UI && window.UI.getCardDimensions ? window.UI.getCardDimensions() : { width: 100, height: 140 };
        const rect = clone.getBoundingClientRect ? clone.getBoundingClientRect() : { width: dims.width, height: dims.height };
        const w = rect.width || dims.width;
        const h = rect.height || dims.height;
        const clientX = (typeof pageX === 'number') ? pageX - (window.pageXOffset || document.documentElement.scrollLeft || 0) : 0;
        const clientY = (typeof pageY === 'number') ? pageY - (window.pageYOffset || document.documentElement.scrollTop || 0) : 0;
        clone.style.left = Math.max(0, clientX - w / 2) + 'px';
        clone.style.top = Math.max(0, clientY - h / 2) + 'px';
        clone.style.zIndex = 9999;
    }

    function getEventCoords(e) {
        let clientX = 0, clientY = 0, pageX = 0, pageY = 0;
        if (!e) return { clientX, clientY, pageX, pageY };
        const t = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
        if (t) {
            clientX = typeof t.clientX === 'number' ? t.clientX : 0;
            clientY = typeof t.clientY === 'number' ? t.clientY : 0;
            pageX = typeof t.pageX === 'number' ? t.pageX : (clientX + (window.pageXOffset || document.documentElement.scrollLeft || 0));
            pageY = typeof t.pageY === 'number' ? t.pageY : (clientY + (window.pageYOffset || document.documentElement.scrollTop || 0));
            return { clientX, clientY, pageX, pageY };
        }
        clientX = typeof e.clientX === 'number' ? e.clientX : 0;
        clientY = typeof e.clientY === 'number' ? e.clientY : 0;
        pageX = typeof e.pageX === 'number' ? e.pageX : (clientX + (window.pageXOffset || document.documentElement.scrollLeft || 0));
        pageY = typeof e.pageY === 'number' ? e.pageY : (clientY + (window.pageYOffset || document.documentElement.scrollTop || 0));
        return { clientX, clientY, pageX, pageY };
    }

    function getDropTargetAt(x, y) {
        if (boardSlotEls && boardSlotEls.length) {
            for (let i = 0; i < boardSlotEls.length; i++) {
                const slotEl = boardSlotEls[i];
                if (!slotEl) continue;
                try {
                    const cards = slotEl.querySelectorAll && slotEl.querySelectorAll('.board-card');
                    if (cards && cards.length) {
                        const last = cards[cards.length - 1];
                        const r = last.getBoundingClientRect();
                        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { type: 'board', el: slotEl, slotEl: slotEl, cardEl: last, index: i };
                        continue;
                    }
                } catch (err) { }
                const rSlot = slotEl.getBoundingClientRect();
                if (x >= rSlot.left && x <= rSlot.right && y >= rSlot.top && y <= rSlot.bottom) return { type: 'board', el: slotEl, slotEl: slotEl, index: i };
            }
        }
        if (!playerDiscardEl || !opponentDiscardEl) return null;
        const pD = playerDiscardEl.getBoundingClientRect();
        const oD = opponentDiscardEl.getBoundingClientRect();
        if (x >= pD.left && x <= pD.right && y >= pD.top && y <= pD.bottom) return { type: 'player', el: playerDiscardEl };
        if (x >= oD.left && x <= oD.right && y >= oD.top && y <= oD.bottom) return { type: 'opponent', el: opponentDiscardEl };

        if (trumpPileEls && trumpPileEls.length) {
            for (let i = 0; i < trumpPileEls.length; i++) {
                const el = trumpPileEls[i];
                if (!el) continue;
                const r = el.getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { type: 'trump', el: el, index: i };
            }
        }

        if (foundationPileEls && foundationPileEls.length) {
            for (let i = 0; i < foundationPileEls.length; i++) {
                const el = foundationPileEls[i];
                if (!el) continue;
                const r = el.getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { type: 'foundation', el: el, index: i };
            }
        }
        if (excusePileEl) {
            try {
                const r = excusePileEl.getBoundingClientRect();
                if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { type: 'excuse', el: excusePileEl };
            } catch (err) { }
        }
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
                if (cards && cards.length) cards.forEach(c => c.classList && c.classList.remove('drop-highlight'));
            });
        }
        if (trumpPileEls && trumpPileEls.length) trumpPileEls.forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
        if (foundationPileEls && foundationPileEls.length) foundationPileEls.forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
        if (excusePileEl && excusePileEl.classList) excusePileEl.classList.remove('drop-highlight');
        if (target && target.cardEl) {
            if (target.cardEl.classList) target.cardEl.classList.add('drop-highlight');
        } else if (target && target.el && target.el.classList) {
            target.el.classList.add('drop-highlight');
        }
    }

    function clearHighlight() {
        [playerDiscardEl, opponentDiscardEl].forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
        if (boardSlotEls && boardSlotEls.length) {
            boardSlotEls.forEach(slotEl => {
                if (!slotEl) return;
                slotEl.classList && slotEl.classList.remove('drop-highlight');
                try {
                    const cards = slotEl.querySelectorAll && slotEl.querySelectorAll('.board-card');
                    if (cards && cards.length) cards.forEach(c => c.classList && c.classList.remove('drop-highlight'));
                } catch (err) { }
            });
        }
        if (trumpPileEls && trumpPileEls.length) trumpPileEls.forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
        if (foundationPileEls && foundationPileEls.length) foundationPileEls.forEach(el => el && el.classList && el.classList.remove('drop-highlight'));
        if (excusePileEl && excusePileEl.classList) excusePileEl.classList.remove('drop-highlight');
    }

    function _moveHandlersRemoveAll() {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', onTouchEnd);
    }

    function onMouseMove(e) {
        if (!dragState) return;
        const coords = getEventCoords(e);
        moveClone(coords.pageX, coords.pageY);
        highlightDropTarget(coords.clientX, coords.clientY);
    }

    function onPointerMove(e) {
        if (!dragState) return;
        const coords = getEventCoords(e);
        moveClone(coords.pageX, coords.pageY);
        highlightDropTarget(coords.clientX, coords.clientY);
    }

    function onTouchMove(e) {
        if (!dragState) return;
        try { e.preventDefault && e.preventDefault(); } catch (err) { }
        const coords = getEventCoords(e);
        moveClone(coords.pageX, coords.pageY);
        highlightDropTarget(coords.clientX, coords.clientY);
    }

    function finishDragAt(clientX, clientY) {
        const target = getDropTargetAt(clientX, clientY);
        const fromSide = dragState && dragState.side;

        function topOf(el) {
            try { return Array.isArray(el && el.__cards) && el.__cards.length ? el.__cards[el.__cards.length - 1] : null; } catch (err) { return null; }
        }

        if (target && target.type === 'board' && dragState && dragState.fromBoardSlot !== undefined) {
            const targetSlotIndex = target.index;
            if (dragState.fromBoardSlot === targetSlotIndex) {
                if (dragState && dragState.cloneEl && dragState.cloneEl.parentNode) {
                    dragState.cloneEl.parentNode.removeChild(dragState.cloneEl);
                }
                dragState = null;
                clearHighlight();
                return;
            }
        }

        if (target && fromSide && target.type !== 'excuse') {
            if (fromSide.stack && Array.isArray(fromSide.stack) && fromSide.stack.length > 0) {
                const cardsToMove = fromSide.stack.slice();
                let movedCountLocal = 0;
                const isMultiple = Array.isArray(cardsToMove) && cardsToMove.length > 1;
                if (target.type === 'board') {
                    const slotTarget = target.slotEl || target.el;
                    let topCard = topOf(slotTarget);
                    for (let i = 0; i < cardsToMove.length; i++) {
                        const c = cardsToMove[i];
                        const res = window.Rules && window.Rules.checkMove ? window.Rules.checkMove({ cardFrom: c, cardTo: topCard, destinationType: 'board', moveType: isMultiple ? 'multiple' : 'unique' }) : { allowed: true };
                        if (!res.allowed) { clearHighlight(); movedCountLocal = 0; break; }
                        slotTarget && slotTarget.__appendCardFor && slotTarget.__appendCardFor(null, c);
                        movedCountLocal++;
                        topCard = c;
                    }
                } else {
                    let top = topOf(target.el);
                    for (let i = 0; i < cardsToMove.length; i++) {
                        const c = cardsToMove[i];
                        const res = window.Rules && window.Rules.checkMove ? window.Rules.checkMove({ cardFrom: c, cardTo: top, destinationType: target.type, moveType: isMultiple ? 'multiple' : 'unique' }) : { allowed: true };
                        if (!res.allowed) { clearHighlight(); movedCountLocal = 0; break; }
                        const ownerArg = (target.type === 'player' || target.type === 'opponent') ? target.type : null;
                        target.el.__appendCardFor && target.el.__appendCardFor(ownerArg, c);
                        movedCountLocal++;
                        top = c;
                    }
                }
                fromSide.movedCount = movedCountLocal;
                dragState.onMoved && dragState.onMoved(fromSide);
                try {
                    if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled()) {
                        window.MultiplayerSync.sendGameStateUpdate && window.MultiplayerSync.sendGameStateUpdate({ midTurn: true });
                    }
                } catch (e) { }

                try {
                    if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled() &&
                        window.MultiplayerSync.isMyTurn && window.MultiplayerSync.isMyTurn()) {
                        let src;
                        if (dragState.fromBoardSlot !== undefined) {
                            src = { type: 'board', index: dragState.fromBoardSlot };
                        } else if (dragState.currentEl === playerDiscardEl || dragState.currentEl === opponentDiscardEl) {
                            const side = (dragState.currentEl === playerDiscardEl) ? 'player' : 'opponent';
                            src = { type: 'discard', side };
                        } else {
                            src = (fromSide.current ? { type: 'current' } : { type: 'stack' });
                        }

                        const action = {
                            type: 'move',
                            actor: (function () {
                                try { const gs = window.GameState; return (fromSide === gs.players.player || fromSide.owner === 'player') ? 'player' : 'opponent'; } catch (e) { return 'player'; }
                            })(),
                            cards: cardsToMove.map(c => c && c.id).filter(Boolean),
                            dest: target.type,
                            destIndex: (typeof target.index === 'number') ? target.index : undefined,
                            source: src
                        };
                        window.MultiplayerSync.sendGameAction && window.MultiplayerSync.sendGameAction(action);
                    }
                } catch (e) { }
            } else if (fromSide.current) {
                const card = fromSide.current;
                let moved = false;
                if (target.type === 'board') {
                    const slotTarget = target.slotEl || target.el;
                    const topCard = topOf(slotTarget);
                    const res = window.Rules && window.Rules.checkMove ? window.Rules.checkMove({ cardFrom: card, cardTo: topCard, destinationType: 'board', moveType: 'unique' }) : { allowed: true };
                    if (!res.allowed) { clearHighlight(); }
                    else { slotTarget && slotTarget.__appendCardFor && slotTarget.__appendCardFor(null, card); moved = true; }
                } else {
                    const top = topOf(target.el);
                    const res = window.Rules && window.Rules.checkMove ? window.Rules.checkMove({ cardFrom: card, cardTo: top, destinationType: target.type, moveType: 'unique' }) : { allowed: true };
                    if (!res.allowed) { clearHighlight(); }
                    else { const ownerArg = (target.type === 'player' || target.type === 'opponent') ? target.type : null; target.el.__appendCardFor && target.el.__appendCardFor(ownerArg, card); moved = true; }
                }

                if (moved) {
                    fromSide.current = null;
                }
                dragState.onMoved && dragState.onMoved(fromSide);
                try {
                    if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled()) {
                        window.MultiplayerSync.sendGameStateUpdate && window.MultiplayerSync.sendGameStateUpdate({ midTurn: true });
                    }
                } catch (e) { }

                try {
                    if (moved && window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled() &&
                        window.MultiplayerSync.isMyTurn && window.MultiplayerSync.isMyTurn()) {
                        let src;
                        if (dragState.fromBoardSlot !== undefined) {
                            src = { type: 'board', index: dragState.fromBoardSlot };
                        } else if (dragState.currentEl === playerDiscardEl || dragState.currentEl === opponentDiscardEl) {
                            const side = (dragState.currentEl === playerDiscardEl) ? 'player' : 'opponent';
                            src = { type: 'discard', side };
                        } else {
                            src = { type: 'current' };
                        }

                        const action = {
                            type: 'move',
                            actor: (function () {
                                try { const gs = window.GameState; return (fromSide === gs.players.player || fromSide.owner === 'player') ? 'player' : 'opponent'; } catch (e) { return 'player'; }
                            })(),
                            cards: [card && card.id].filter(Boolean),
                            dest: target.type,
                            destIndex: (typeof target.index === 'number') ? target.index : undefined,
                            source: src
                        };
                        window.MultiplayerSync.sendGameAction && window.MultiplayerSync.sendGameAction(action);
                    }
                } catch (e) { }
            }
        }

        if (target && target.type === 'excuse' && fromSide) {
            function findExcuseLocation() {
                try {
                    const gs = (typeof window !== 'undefined' && window.GameState) ? window.GameState : null;
                    if (!gs) return null;
                    // Board
                    for (let i = 0; i < gs.board.length; i++) {
                        const pile = gs.board[i];
                        const idx = pile.findIndex(c => c && c.id === 'excuse');
                        if (idx !== -1) return { type: 'board', pileIndex: i, pileRef: pile, index: idx };
                    }
                    // Trump
                    for (let i = 0; i < gs.trumpPiles.length; i++) {
                        const pile = gs.trumpPiles[i];
                        const idx = pile.findIndex(c => c && c.id === 'excuse');
                        if (idx !== -1) return { type: 'trump', pileIndex: i, pileRef: pile, index: idx };
                    }
                    // Foundation
                    for (let i = 0; i < gs.foundationPiles.length; i++) {
                        const pile = gs.foundationPiles[i];
                        const idx = pile.findIndex(c => c && c.id === 'excuse');
                        if (idx !== -1) return { type: 'foundation', pileIndex: i, pileRef: pile, index: idx };
                    }
                } catch (err) { }
                return null;
            }

            const loc = findExcuseLocation();
            if (!loc) {
                clearHighlight();
                const msg = "The excuse card cannot be replaced right now."
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
            } else {
                const cardsToMove = fromSide.stack && Array.isArray(fromSide.stack) && fromSide.stack.length > 0 ? fromSide.stack.slice() : (fromSide.current ? [fromSide.current] : []);
                const isMultiple = cardsToMove.length > 1;
                const excuseCard = loc.pileRef[loc.index];
                let allowedAll = true;
                for (let i = 0; i < cardsToMove.length; i++) {
                    const c = cardsToMove[i];
                    const res = window.Rules && window.Rules.checkMove ? window.Rules.checkMove({ cardFrom: c, cardTo: null, destinationType: 'excuse', moveType: isMultiple ? 'multiple' : 'unique' }) : { allowed: true };
                    if (!res.allowed) { allowedAll = false; break; }
                }
                if (!allowedAll) {
                    clearHighlight();
                } else {
                    try {
                        const movedCard = cardsToMove[0];

                        function findCardLocation(card) {
                            try {
                                const gs = (typeof window !== 'undefined' && window.GameState) ? window.GameState : null;
                                if (!gs) return null;
                                // Board
                                for (let i = 0; i < gs.board.length; i++) {
                                    const pile = gs.board[i];
                                    const idx = pile.findIndex(c => c === card);
                                    if (idx !== -1) return { type: 'board', pileIndex: i, pileRef: pile, index: idx };
                                }
                                // Trump
                                for (let i = 0; i < gs.trumpPiles.length; i++) {
                                    const pile = gs.trumpPiles[i];
                                    const idx = pile.findIndex(c => c === card);
                                    if (idx !== -1) return { type: 'trump', pileIndex: i, pileRef: pile, index: idx };
                                }
                                // Foundation
                                for (let i = 0; i < gs.foundationPiles.length; i++) {
                                    const pile = gs.foundationPiles[i];
                                    const idx = pile.findIndex(c => c === card);
                                    if (idx !== -1) return { type: 'foundation', pileIndex: i, pileRef: pile, index: idx };
                                }
                            } catch (err) { }
                            return null;
                        }

                        const origin = findCardLocation(movedCard);

                        // Remove the moved card from its origin
                        try {
                            if (origin) {
                                if (origin.type === 'board' || origin.type === 'trump' || origin.type === 'foundation') {
                                    try { origin.pileRef.splice(origin.index, 1); } catch (err) { }
                                } else if (origin.type === 'current') {
                                    try {
                                        if (window.GameState && window.GameState.players && typeof origin.owner === 'string') {
                                            const gs = window.GameState;
                                            const currentId = gs && gs.currentPlayerId;
                                            if (origin.owner !== currentId) {
                                                window.GameState.players[origin.owner].current = null;
                                                try {
                                                    const id = (origin.owner === 'player') ? 'playerCurrent' : (origin.owner === 'opponent' ? 'opponentCurrent' : null);
                                                    if (id && window.UI && window.UI.renderCurrent) {
                                                        const el = document.getElementById(id);
                                                        el && window.UI.renderCurrent(el, null);
                                                    }
                                                } catch (err) { }
                                            }
                                        }
                                    } catch (err) { }
                                }
                            }
                        } catch (err) { }

                        // Place the moved card into the location previously occupied by the excuse
                        try { loc.pileRef[loc.index] = movedCard; } catch (err) { }

                        // Render the origin pile if needed
                        try {
                            if (origin && origin.type === 'board') {
                                const slotEl = (boardSlotEls && boardSlotEls[origin.pileIndex]) ? boardSlotEls[origin.pileIndex] : null;
                                slotEl && window.UI && window.UI.renderBoardSlot && window.UI.renderBoardSlot(slotEl, origin.pileRef);
                            } else if (origin && origin.type === 'trump') {
                                const el = (trumpPileEls && trumpPileEls[origin.pileIndex]) ? trumpPileEls[origin.pileIndex] : null;
                                el && window.UI && window.UI.renderSmallPile && window.UI.renderSmallPile(el, origin.pileRef);
                            } else if (origin && origin.type === 'foundation') {
                                const el = (foundationPileEls && foundationPileEls[origin.pileIndex]) ? foundationPileEls[origin.pileIndex] : null;
                                el && window.UI && window.UI.renderSmallPile && window.UI.renderSmallPile(el, origin.pileRef);
                            }
                        } catch (err) { }

                        // Make the excuse the current card of the player whose turn it is
                        try {
                            const gs = (typeof window !== 'undefined' && window.GameState) ? window.GameState : null;
                            if (gs && gs.currentPlayerId && gs.players && gs.players[gs.currentPlayerId]) {
                                gs.players[gs.currentPlayerId].current = excuseCard;
                                try {
                                    const elId = (gs.currentPlayerId === 'player') ? 'playerCurrent' : (gs.currentPlayerId === 'opponent' ? 'opponentCurrent' : null);
                                    if (elId && window.UI && window.UI.renderCurrent) {
                                        const el = document.getElementById(elId);
                                        el && window.UI.renderCurrent(el, gs.players[gs.currentPlayerId].current);
                                    }
                                } catch (err) { }
                            }
                        } catch (err) { }

                        // Render the pile where the excuse was
                        try {
                            if (loc.type === 'board') {
                                const slotEl = (boardSlotEls && boardSlotEls[loc.pileIndex]) ? boardSlotEls[loc.pileIndex] : null;
                                slotEl && window.UI && window.UI.renderBoardSlot && window.UI.renderBoardSlot(slotEl, loc.pileRef);
                            } else if (loc.type === 'trump') {
                                const el = (trumpPileEls && trumpPileEls[loc.pileIndex]) ? trumpPileEls[loc.pileIndex] : null;
                                el && window.UI && window.UI.renderSmallPile && window.UI.renderSmallPile(el, loc.pileRef);
                            } else if (loc.type === 'foundation') {
                                const el = (foundationPileEls && foundationPileEls[loc.pileIndex]) ? foundationPileEls[loc.pileIndex] : null;
                                el && window.UI && window.UI.renderSmallPile && window.UI.renderSmallPile(el, loc.pileRef);
                            }
                        } catch (err) { }

                        if (fromSide && fromSide.current !== undefined) {
                            try {
                                const gs = (typeof window !== 'undefined' && window.GameState) ? window.GameState : null;
                                const currentId = gs && gs.currentPlayerId;
                                if (gs && gs.players) {
                                    if (fromSide === gs.players.player) {
                                        if (currentId !== 'player') {
                                            gs.players.player.current = null;
                                            try { const el = document.getElementById('playerCurrent'); el && window.UI && window.UI.renderCurrent && window.UI.renderCurrent(el, null); } catch (e) { }
                                        }
                                    } else if (fromSide === gs.players.opponent) {
                                        if (currentId !== 'opponent') {
                                            gs.players.opponent.current = null;
                                            try { const el = document.getElementById('opponentCurrent'); el && window.UI && window.UI.renderCurrent && window.UI.renderCurrent(el, null); } catch (e) { }
                                        }
                                    } else {
                                        try { fromSide.current = null; } catch (e) { }
                                    }
                                }
                            } catch (err) { }
                        }

                        if (dragState && dragState.onMoved) {
                            dragState.onMoved(fromSide);
                        }

                        if (dragState && dragState.cloneEl && dragState.cloneEl.parentNode) dragState.cloneEl.parentNode.removeChild(dragState.cloneEl);
                        dragState = null;
                        clearHighlight();

                        try {
                            if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled()) {
                                let actor = 'player';
                                try { const gs2 = window.GameState; if (gs2 && gs2.currentPlayerId) actor = gs2.currentPlayerId; } catch (e) { }

                                let src;
                                if (origin && (origin.type === 'board' || origin.type === 'trump' || origin.type === 'foundation')) {
                                    src = { type: origin.type, index: origin.pileIndex };
                                } else if (fromSide && fromSide.current !== undefined) {
                                    try {
                                        const gs3 = window.GameState;
                                        const side = (fromSide === gs3.players.player) ? 'player' : (fromSide === gs3.players.opponent ? 'opponent' : actor);
                                        src = { type: 'current', side };
                                    } catch (e) { src = { type: 'current', side: actor }; }
                                } else {
                                    src = { type: 'stack' };
                                }

                                const action = {
                                    type: 'excuse_replace',
                                    actor,
                                    source: src,
                                    dest: { type: loc.type, index: loc.pileIndex },
                                    cards: cardsToMove.map(c => c && c.id).filter(Boolean)
                                };
                                window.MultiplayerSync.sendGameAction && window.MultiplayerSync.sendGameAction(action);
                                window.MultiplayerSync.sendGameStateUpdate && window.MultiplayerSync.sendGameStateUpdate({ midTurn: true });
                            }
                        } catch (e) { }
                    } catch (err) {
                        clearHighlight();
                    }
                }
            }
        }

        if (dragState && dragState.cloneEl && dragState.cloneEl.parentNode) dragState.cloneEl.parentNode.removeChild(dragState.cloneEl);
        dragState = null;
        clearHighlight();
    }

    function onMouseUp(e) {
        if (!dragState) return;
        _moveHandlersRemoveAll();
        const coords = getEventCoords(e);
        finishDragAt(coords.clientX, coords.clientY);
    }

    function onPointerUp(e) {
        if (!dragState) return;
        _moveHandlersRemoveAll();
        const coords = getEventCoords(e);
        finishDragAt(coords.clientX, coords.clientY);
    }

    function onTouchEnd(e) {
        if (!dragState) return;
        _moveHandlersRemoveAll();
        const coords = getEventCoords(e);
        finishDragAt(coords.clientX, coords.clientY);
    }

    function onMouseDown(e, side, currentEl, onMoved, fromBoardSlot) {
        // If the bot is currently playing, ignore user drag attempts
        try { if (window.Bot && window.Bot.isPlaying && !(window.Bot._internalAction === true)) return; } catch (err) { }

        try {
            if (window.MultiplayerSync && window.MultiplayerSync.isEnabled && window.MultiplayerSync.isEnabled()) {
                if (window.MultiplayerSync.isMyTurn && !window.MultiplayerSync.isMyTurn()) {
                    return;
                }
            }
        } catch (err) {
        }

        if (dragState) return;
        if (!side.current && !(side.stack && side.stack.length)) return;
        e.preventDefault();
        let sourceImg = null;
        try {
            const imgs = currentEl.querySelectorAll && currentEl.querySelectorAll('img');
            if (imgs && imgs.length) {
                for (let i = imgs.length - 1; i >= 0; i--) {
                    const el = imgs[i];
                    if (side.current && side.current.id && el.src && el.src.indexOf(side.current.id) !== -1) {
                        sourceImg = el; break;
                    }
                }
                if (!sourceImg) sourceImg = imgs[imgs.length - 1];
            }
        } catch (err) { }

        if (side.stack && Array.isArray(side.stack) && side.stack.length > 0) {
            const clone = createStackClone(side.stack);
            dragState = { side, currentEl, stack: side.stack.slice(), cloneEl: clone, onMoved, fromBoardSlot };
            const coords = getEventCoords(e);
            moveClone(coords.pageX, coords.pageY);
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('pointermove', onPointerMove);
            window.addEventListener('pointerup', onPointerUp);
            window.addEventListener('pointercancel', onPointerUp);
            window.addEventListener('touchmove', onTouchMove, { passive: false });
            window.addEventListener('touchend', onTouchEnd);
            window.addEventListener('touchcancel', onTouchEnd);
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
        dragState = { side, currentEl, card: side.current, cloneEl: clone, onMoved, fromBoardSlot };
        const coords = getEventCoords(e);
        moveClone(coords.pageX, coords.pageY);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchcancel', onTouchEnd);
    }

    function init(opts) {
        playerDiscardEl = opts.playerDiscardEl;
        opponentDiscardEl = opts.opponentDiscardEl;
        boardSlotEls = Array.isArray(opts.boardSlotEls) ? opts.boardSlotEls : null;
        trumpPileEls = Array.isArray(opts.trumpPileEls) ? opts.trumpPileEls : null;
        foundationPileEls = Array.isArray(opts.foundationPileEls) ? opts.foundationPileEls : null;
        excusePileEl = opts.excusePileEl || null;
    }

    global.DragDrop = { init, onMouseDown, createCloneImage, createStackClone, createCloneFromCards };
})(window);