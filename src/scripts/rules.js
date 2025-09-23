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
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'C', 'Q', 'K'];
        const i1 = ranks.indexOf(r1);
        const i2 = ranks.indexOf(r2);
        if (i1 === -1 || i2 === -1) return null;
        return i1 - i2;
    }

    function checkMove({ cardFrom, cardTo, destinationType, moveType }) {

        const gs = (typeof window !== 'undefined' && window.GameState) ? window.GameState : null;

        // Don't show a message if the card hasn't moved
        if (cardFrom === cardTo) {
            return { allowed: false };
        }

        // Current card can always be moved to player's own discard
        if (gs.players[gs.currentPlayerId].current === cardFrom && destinationType === gs.currentPlayerId) {
            return { allowed: true };
        }

        // If player has a current card, they can only move that card
        if (gs.players[gs.currentPlayerId].current && gs.players[gs.currentPlayerId].current !== cardFrom) {
            const msg = "You can only move your current card.";
            if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
            else alert(msg);
            return { allowed: false };
        }

        // If the card to be moved is in opponent's discard, disallow
        if (gs.players[gs.currentPlayerId === 'player' ? 'opponent' : 'player'].discard.includes(cardFrom)) {
            const msg = "You cannot move your opponent's discard card.";
            if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
            else alert(msg);
            return { allowed: false };
        }

        // Disallow moving a card to your discard if it's not your current card
        if (destinationType === gs.currentPlayerId && gs.players[destinationType].current !== cardFrom) {
            const msg = "You cannot move this card to your discard.";
            if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
            else alert(msg);
            return { allowed: false };
        }

        // If the opponent discard is empty and the player is trying to move a card there, disallow
        if (!cardTo && destinationType !== 'board' && destinationType !== 'trump' && destinationType !== 'foundation') {
            const msg = "You cannot move a card here.";
            if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
            else alert(msg);
            return { allowed: false };
        }

        // Disallow moving a card from a pile if it's not the top card, unless moving to trump/foundation
        if (destinationType !== 'trump' && destinationType !== 'foundation' && moveType !== 'multiple') {
            let foundOnBoard = false;
            for (let pile of gs.board) {
                if (pile.includes(cardFrom) && pile.length > 1) {
                    foundOnBoard = true;
                    break;
                }
            }
            if (foundOnBoard) {
                const msg = "You can only move the entire pile.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            }
        }

        // Trump piles
        if (destinationType === 'trump') {
            if (!isTrump(cardFrom)) {
                const msg = "Only trump cards can be moved to trump piles.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            }

            if (!cardTo && cardFrom.rank !== 1 && cardFrom.rank !== 21) {
                const msg = "Only 1 or 21 can be placed on an empty trump pile.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            }

            if ((cardTo && cardFrom.rank !== cardTo.rank - 1) && (cardTo && cardFrom.rank !== cardTo.rank + 1)) {
                const msg = "Trump cards must be placed in ascending or descending order here.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            }

            return { allowed: true };
        }

        // Foundation piles
        if (destinationType === 'foundation') {
            if (moveType === 'multiple') {
                const msg = "You can only move one card at a time to foundation piles.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            }

            if (isTrump(cardFrom)) {
                const msg = "Only non-trump cards can be moved to foundation piles.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            }

            if (!cardTo && cardFrom.rank !== 'A') {
                const msg = "Only an Ace can be placed on an empty foundation pile.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            }

            if (cardTo && rankDifference(cardFrom.rank, cardTo.rank) !== 1) {
                const msg = "Cards must be placed in ascending order here.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            }

            if (cardTo && cardFrom.suit !== cardTo.suit) {
                const msg = "Cards must be of the same suit in foundation piles.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            }

            return { allowed: true };
        }

        if (cardTo) {
            if (isTrump(cardFrom) && !isTrump(cardTo)) {
                const msg = "A trump card can only be placed on another trump card.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            } else if (isTrump(cardFrom) && isTrump(cardTo)) {
                if (cardFrom.rank + 1 !== cardTo.rank) {
                    const msg = "Trump cards must be placed in descending order.";
                    if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                    else alert(msg);
                    return { allowed: false };
                } else {
                    return { allowed: true };
                }
            } else if (!isTrump(cardFrom) && isTrump(cardTo)) {
                const msg = "A non-trump card cannot be placed on a trump card.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            }
        }

        if (cardTo) {
            const cFrom = colorOf(cardFrom);
            const cTo = colorOf(cardTo);

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
        }

        return { allowed: true };
    }

    global.Rules = { checkMove };
})(window);