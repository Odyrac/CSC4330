(function (global) {
    function isTrump(card) {
        return card && card.type === 'trump';
    }

    function colorOf(card) {
        if (!card) return null;
        return card.color || null;
    }

    function oppositeColor(c1, c2) {
        if (!c1 || !c2) return false;
        if (c1 === 'trump' || c2 === 'trump') return false;
        return (c1 === 'red' && c2 === 'black') || (c1 === 'black' && c2 === 'red');
    }

    function rankDifference(r1, r2) {
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'C', 'Q', 'K', 'A'];
        const i1 = ranks.indexOf(r1);
        const i2 = ranks.indexOf(r2);
        if (i1 === -1 || i2 === -1) return null;
        return i1 - i2;
    }

    function checkMove({ cardFrom, cardTo, destinationType }) {

        const gs = (typeof window !== 'undefined' && window.GameState) ? window.GameState : null;

        if (gs.players[gs.currentPlayerId].current === cardFrom && destinationType === gs.currentPlayerId) {
            return { allowed: true };
        }

        if (gs.players[gs.currentPlayerId].current && gs.players[gs.currentPlayerId].current !== cardFrom) {
            const msg = "You can only move your current card.";
            if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
            else alert(msg);
            return { allowed: false };
        }

        if (gs.players[gs.currentPlayerId === 'player' ? 'opponent' : 'player'].discard.includes(cardFrom)) {
            const msg = "You cannot move your opponent's discard card.";
            if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
            else alert(msg);
            return { allowed: false };
        }

        if (destinationType === gs.currentPlayerId && gs.players[destinationType].current !== cardFrom) {
            const msg = "You cannot move this card to your discard.";
            if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
            else alert(msg);
            return { allowed: false };
        }

        if (!cardTo && destinationType !== 'board' && destinationType !== 'trump' && destinationType !== 'foundation') {
            const msg = "You cannot move a card here.";
            if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
            else alert(msg);
            return { allowed: false };
        }

        if (cardTo && isTrump(cardFrom)) {
            if (!isTrump(cardTo)) {
                const msg = "A trump card can only be placed on another trump card.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            } else {
                if (cardFrom.rank + 1 !== cardTo.rank) {
                    const msg = "Trump cards must be placed in descending order.";
                    if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                    else alert(msg);
                    return { allowed: false };
                }
            }
            return { allowed: true };
        }

        if (cardTo && isTrump(cardTo) && !isTrump(cardFrom)) {
            {
                const msg = "A non-trump card cannot be placed on a trump card.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
            }
            return { allowed: false };
        }

        const cFrom = colorOf(cardFrom);
        const cTo = colorOf(cardTo);

        if (!cardTo) return { allowed: true };

        if (!oppositeColor(cFrom, cTo)) {
            const msg = "Cards must be placed on opposite colors.";
            if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
            else alert(msg);
            return { allowed: false };
        }

        const diff = rankDifference(cardFrom.rank, cardTo.rank);

        if (diff !== -1) {
            const msg = "Cards must be placed in descending order.";
            if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
            else alert(msg);
            return { allowed: false };
        }

        return { allowed: true };
    }

    global.Rules = { checkMove };
})(window);