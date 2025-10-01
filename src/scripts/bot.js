(function (global) {
    const DEFAULT_CONFIG = {
        weights: {
            foundation: 100,
            trump: 80,
            board: 60,
            opponent: 40,
            player: 30
        },
        emptyBoardBonus: 50,
        safety: { inner: 100, outer: 50 },
        useDragDrop: false,
        attemptDelay: 600,
        afterMoveDelay: 800
    };

    function applyMove(gameState, from, sourceType, dest, destType, moveType) {
        const gs = gameState;

        function extractCards() {
            if (sourceType === 'current') {
                const owner = from.side;
                const card = gs.players[owner].current;
                if (!card) return [];
                gs.players[owner].current = null;
                return [card];
            }
            if (sourceType === 'discard') {
                const owner = from.side;
                const arr = gs.players[owner].discard;
                if (!arr || arr.length === 0) return [];
                const card = arr.pop();
                return [card];
            }
            if (sourceType === 'board') {
                const slot = gs.board[from.index];
                if (!Array.isArray(slot) || slot.length === 0) return [];
                if (moveType === 'multiple' && from.count && from.count > 1) {
                    const moved = slot.splice(slot.length - from.count, from.count);
                    return moved;
                }
                return [slot.pop()];
            }
            return [];
        }

        const cards = extractCards();
        if (!cards || cards.length === 0) return false;

        if (destType === 'board') {
            gs.board[dest.index] = gs.board[dest.index] || [];
            for (let c of cards) gs.board[dest.index].push(c);
            return true;
        }
        if (destType === 'trump') {
            gs.trumpPiles[dest.index] = gs.trumpPiles[dest.index] || [];
            for (let c of cards) gs.trumpPiles[dest.index].push(c);
            return true;
        }
        if (destType === 'foundation') {
            gs.foundationPiles[dest.index] = gs.foundationPiles[dest.index] || [];
            for (let c of cards) gs.foundationPiles[dest.index].push(c);
            return true;
        }
        if (destType === 'player' || destType === 'opponent') {
            const owner = destType;
            for (let c of cards) gs.players[owner].discard.push(c);
            if (gs.currentPlayerId === owner) gs.currentPlayerId = (owner === 'player') ? 'opponent' : 'player';
            return true;
        }

        return false;
    }

    function playBot(gameState, config) {
        const gs = gameState;
        if (!gs) return gs;

        const botId = 'opponent';

        const cfg = Object.assign({}, DEFAULT_CONFIG, config || {}, (window.Bot && window.Bot.config) || {});
        cfg.weights = Object.assign({}, DEFAULT_CONFIG.weights, (config && config.weights) || (window.Bot && window.Bot.config && window.Bot.config.weights) || {});
        cfg.safety = Object.assign({}, DEFAULT_CONFIG.safety, (config && config.safety) || (window.Bot && window.Bot.config && window.Bot.config.safety) || {});

        function showBotLoader() {
            try {
                let el = document.getElementById('botLoader');
                if (!el) {
                    el = document.createElement('div');
                    el.id = 'botLoader';
                    el.style.position = 'fixed';
                    const opp = document.getElementById('opponentDiscard') || document.getElementById('opponentFacedown') || document.getElementById('opponentCurrent');
                    if (opp && opp.getBoundingClientRect) {
                        const r = opp.getBoundingClientRect();
                        el.style.left = (r.left) + 'px';
                        el.style.top = (r.bottom + 12) + 'px';
                    } else {
                        el.style.left = '10px';
                        el.style.top = '10px';
                    }
                    el.style.zIndex = 9999;
                    el.style.background = 'rgba(0, 0, 0, 0.5)';
                    el.style.color = '#F2F2F2';
                    el.style.padding = '6px 10px';
                    el.style.borderRadius = '12px';
                    el.style.fontSize = '14px';
                    el.innerText = 'Thinking...';
                    document.body.appendChild(el);
                } else {
                    el.style.display = 'block';
                }
            } catch (e) { }
        }

        function hideBotLoader() {
            try {
                const el = document.getElementById('botLoader');
                if (el) el.style.display = 'none';
            } catch (e) { }
        }

        function showBotBlocker() {
            try {
                let b = document.getElementById('botBlocker');
                if (!b) {
                    b = document.createElement('div');
                    b.id = 'botBlocker';
                    b.style.position = 'fixed';
                    b.style.left = '0';
                    b.style.top = '0';
                    b.style.width = '100%';
                    b.style.height = '100%';
                    b.style.zIndex = 9998;
                    b.style.background = 'transparent';
                    b.style.cursor = 'wait';
                    document.body.appendChild(b);
                }
                b.style.display = 'block';
            } catch (e) { }
        }

        function hideBotBlocker() {
            try {
                const b = document.getElementById('botBlocker');
                if (b) b.style.display = 'none';
            } catch (e) { }
        }

        function postMoveCleanup() {
            try {
                const clones = document.querySelectorAll && document.querySelectorAll('.dragging-image, .dragging-image-stack');
                if (clones && clones.length) clones.forEach(c => c.parentNode && c.parentNode.removeChild(c));
            } catch (e) { }
            try {
                if (window.UI) {
                    if (gs.board && gs.board.length) {
                        for (let i = 0; i < gs.board.length; i++) {
                            const el = document.getElementById('boardSlot' + i);
                            if (el) try { UI.renderBoardSlot(el, gs.board[i]); } catch (e) { }
                        }
                    }
                    const pD = document.getElementById('playerDiscard');
                    const oD = document.getElementById('opponentDiscard');
                    const pC = document.getElementById('playerCurrent');
                    const oC = document.getElementById('opponentCurrent');
                    try { if (pD) UI.renderDiscard(pD, gs.players.player.discard); } catch (e) { }
                    try { if (oD) UI.renderDiscard(oD, gs.players.opponent.discard); } catch (e) { }
                    try { if (pC) UI.renderCurrent(pC, gs.players.player.current); } catch (e) { }
                    try { if (oC) UI.renderCurrent(oC, gs.players.opponent.current); } catch (e) { }
                    try {
                        const trumpEls = [document.getElementById('trumpPile0'), document.getElementById('trumpPile1')];
                        if (trumpEls && trumpEls.length && gs.trumpPiles) {
                            trumpEls.forEach((el, idx) => { if (el) try { UI.renderSmallPile(el, gs.trumpPiles[idx]); } catch (e) { } });
                        }
                    } catch (e) { }
                    try {
                        const foundationEls = [
                            document.getElementById('foundationPile0'),
                            document.getElementById('foundationPile1'),
                            document.getElementById('foundationPile2'),
                            document.getElementById('foundationPile3')
                        ];
                        if (foundationEls && foundationEls.length && gs.foundationPiles) {
                            foundationEls.forEach((el, idx) => { if (el) try { UI.renderSmallPile(el, gs.foundationPiles[idx]); } catch (e) { } });
                        }
                    } catch (e) { }
                }
            } catch (e) { }
        }

        async function tryStrategyOnce() {
            const boardLen = gs.board ? gs.board.length : 0;
            for (let i = 0; i < boardLen; i++) {
                const slot = gs.board[i] || [];
                if (!slot || slot.length === 0) continue;
                const lastCard = slot[slot.length - 1];
                if (await tryMoveFromSource({ type: 'board', index: i, card: lastCard, count: 1 })) return true;
                if (slot.length > 1) {
                    const firstCard = slot[0];
                    if (await tryMoveFromSource({ type: 'board', index: i, card: firstCard, count: slot.length })) return true;
                }
            }

            const botDisc = gs.players[botId].discard || [];
            if (botDisc.length > 0) {
                const top = botDisc[botDisc.length - 1];
                if (await tryMoveFromSource({ type: 'discard', side: botId, card: top })) return true;
            }

            return false;
        }

        async function tryMoveFromSource(s) {
            const cardsToMove = (s.type === 'board' && s.count && s.count > 1) ? (gs.board[s.index].slice(gs.board[s.index].length - s.count)) : [s.card];
            const boardNonEmpty = [];
            const boardEmpty = [];
            for (let j = 0; j < (gs.board ? gs.board.length : 0); j++) {
                const slot = gs.board[j] || [];
                if (slot.length) boardNonEmpty.push({ type: 'board', index: j });
                else boardEmpty.push({ type: 'board', index: j });
            }
            const trumpDests = [];
            for (let j = 0; j < (gs.trumpPiles ? gs.trumpPiles.length : 0); j++) trumpDests.push({ type: 'trump', index: j });
            const foundationDests = [];
            for (let j = 0; j < (gs.foundationPiles ? gs.foundationPiles.length : 0); j++) foundationDests.push({ type: 'foundation', index: j });
            const discardDests = [{ type: 'player' }, { type: 'opponent' }];
            let dests = [];
            const isCurrent = s.type === 'current';
            if (isCurrent) {
                dests = dests.concat(boardEmpty, boardNonEmpty, trumpDests, foundationDests, discardDests);
            } else {
                dests = dests.concat(boardNonEmpty, trumpDests, foundationDests, discardDests);
            }

            const moveType = (cardsToMove.length > 1) ? 'multiple' : 'unique';

            for (let d of dests) {
                let topCard = null;
                if (d.type === 'board') {
                    const slot = gs.board[d.index] || [];
                    topCard = slot.length ? slot[slot.length - 1] : null;
                } else if (d.type === 'trump') {
                    const pile = gs.trumpPiles[d.index] || [];
                    topCard = pile.length ? pile[pile.length - 1] : null;
                } else if (d.type === 'foundation') {
                    const pile = gs.foundationPiles[d.index] || [];
                    topCard = pile.length ? pile[pile.length - 1] : null;
                } else if (d.type === 'player') {
                    const arr = gs.players.player.discard || [];
                    topCard = arr.length ? arr[arr.length - 1] : null;
                } else if (d.type === 'opponent') {
                    const arr = gs.players.opponent.discard || [];
                    topCard = arr.length ? arr[arr.length - 1] : null;
                }

                let allowed = true;
                let previewTop = topCard;
                for (let k = 0; k < cardsToMove.length; k++) {
                    const c = cardsToMove[k];
                    try {
                        const res = window.Rules.checkMove({ cardFrom: c, cardTo: previewTop, destinationType: d.type, moveType });
                        if (!res || !res.allowed) { allowed = false; break; }
                        previewTop = c;
                    } catch (e) { allowed = false; break; }
                }
                if (!allowed) continue;

                const applied = applyMove(gs, s, s.type, d, d.type, moveType);
                if (applied) {
                    try { window.GameState = gs; } catch (e) { }
                    try { postMoveCleanup(); } catch (e) { }
                    return true;
                }
            }

            if (isCurrent && boardEmpty && boardEmpty.length) {
                for (let be of boardEmpty) {
                    try {
                        const c = cardsToMove[0];
                        const res = window.Rules && window.Rules.checkMove ? window.Rules.checkMove({ cardFrom: c, cardTo: null, destinationType: 'board', moveType: 'unique' }) : { allowed: true };
                        if (!res || !res.allowed) continue;
                        const applied2 = applyMove(gs, s, s.type, be, be.type, 'unique');
                        if (applied2) {
                            try { window.GameState = gs; } catch (e) { }
                            try { postMoveCleanup(); } catch (e) { }
                            return true;
                        }
                    } catch (e) { }
                }
            }

            return false;
        }

        async function orchestrate() {
            try { window.Bot = window.Bot || {}; window.Bot.suppressToasts = true; window.Bot.isPlaying = true; } catch (e) { }
            showBotLoader();
            showBotBlocker();
            let outerSafety = 0;
            try {
                while (gs.currentPlayerId === botId && outerSafety < cfg.safety.outer) {
                    outerSafety++;
                    const anyEmpty = (gs.board && gs.board.some(s => !s || s.length === 0));
                    if (anyEmpty && !gs.players[botId].current) {
                        try {
                            const facedownEl = document.getElementById(botId + 'Facedown');
                            if (facedownEl) {
                                try { if (window.Bot) window.Bot._internalAction = true; } catch (e) { }
                                try { facedownEl.click && facedownEl.click(); } catch (e) { }
                                try { if (window.Bot) window.Bot._internalAction = false; } catch (e) { }
                            }
                        } catch (e) { }
                        await new Promise(r => setTimeout(r, cfg.attemptDelay));
                        continue;
                    }

                    let drained = false;
                    let innerCount = 0;
                    while (true) {
                        innerCount++;
                        if (innerCount > cfg.safety.inner) break;
                        const movedInner = await tryStrategyOnce();
                        if (movedInner) {
                            drained = true;
                            await new Promise(r => setTimeout(r, cfg.afterMoveDelay));
                            continue;
                        }
                        break;
                    }

                    if (drained) continue;

                    if (!gs.players[botId].current) {
                        try {
                            const facedownEl = document.getElementById(botId + 'Facedown');
                            if (facedownEl) {
                                try { if (window.Bot) window.Bot._internalAction = true; } catch (e) { }
                                try { facedownEl.click && facedownEl.click(); } catch (e) { }
                                try { if (window.Bot) window.Bot._internalAction = false; } catch (e) { }
                            }
                        } catch (e) { }
                        await new Promise(r => setTimeout(r, cfg.attemptDelay));
                    }

                    if (gs.players[botId].current) {
                        const src = { type: 'current', side: botId, card: gs.players[botId].current };
                        const placed = await tryMoveFromSource(src);
                        if (placed) {
                            await new Promise(r => setTimeout(r, cfg.afterMoveDelay));
                            continue;
                        }
                        try {
                            const srcObj = { type: 'current', side: botId, card: gs.players[botId].current };
                            const applied = applyMove(gs, srcObj, 'current', { type: 'opponent' }, 'opponent', 'unique');
                            if (applied) {
                                try { window.GameState = gs; } catch (e) { }
                                try { postMoveCleanup(); } catch (e) { }
                            }
                        } catch (e) { }
                        await new Promise(r => setTimeout(r, cfg.afterMoveDelay));
                        continue;
                    }
                    break;
                }
            } finally {
                hideBotLoader();
                hideBotBlocker();
                try { if (window.Bot) { window.Bot.suppressToasts = false; window.Bot.isPlaying = false; window.Bot._internalAction = false; } } catch (e) { }
            }
            return gs;
        }

        return orchestrate();
    }

    global.Bot = global.Bot || {};
    global.Bot.playBot = playBot;
    global.Bot.config = global.Bot.config || DEFAULT_CONFIG;
})(window);