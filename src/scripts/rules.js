(function (global) {
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'C', 'Q', 'K'];

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
        if (!cardTo && destinationType !== 'board' && destinationType !== 'trump' && destinationType !== 'foundation' && destinationType !== 'excuse') {
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

        // Excuse card
        // Disallow moving the excuse card to any empty pile
        if (!cardTo && cardFrom.id === 'excuse') {
            let msg = "";
            if (destinationType === 'excuse') {
                msg = "The excuse card cannot be moved to the excuse pile.";
            } else {
                msg = "The excuse card cannot be placed on an empty pile.";
            }
            if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
            else alert(msg);
            return { allowed: false };
        }

        // Disallow moving the excuse at the bottom of a pile
        if (destinationType === 'board' && cardTo && cardFrom.id === 'excuse') {
            if ((cardTo.type === 'trump' && (cardTo.rank === 2 || cardTo.rank === 1)) || (cardTo.type === 'normal' && (cardTo.rank === '2' || cardTo.rank === 'A'))) {
                const msg = "The excuse card cannot be placed under this card.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            }
        }

        // Disallow moving multiple cards to the excuse pile
        if (destinationType === 'excuse' && moveType === 'multiple') {
            const msg = "You can only move one card at a time to the excuse pile.";
            if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
            else alert(msg);
            return { allowed: false };
        }

        // Disallow moving the excuse card onto a card that is not available anymore
        // But we should check if a card that could replace the excuse is being moved
        /*if (cardTo && cardFrom.id === 'excuse') {
        }*/

        // Disallow moving the excuse to trump or foundation piles if it's on the board and not the top card or the right card to be played
        let excuseOnBoard = false;
        if ((destinationType === 'trump' || destinationType === 'foundation') && cardFrom.id === 'excuse') {
            for (let pile of gs.board) {
                if (pile.includes(cardFrom) && pile.length > 1) {
                    excuseOnBoard = true;
                    break;
                }
            }

            if (excuseOnBoard) {
                cardFrom = getExcuseState();

                if (!cardFrom) {
                    const msg = "Cannot determine the state of the excuse card.";
                    if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                    else alert(msg);
                    return { allowed: false };
                }

                if (cardFrom.allowed === false) {
                    return { allowed: false };
                }
            }
        }

        // Allow moving the excuse card anywhere else
        if (cardFrom.id === 'excuse' && excuseOnBoard === false) {
            return { allowed: true };
        }

        function getExcuseState() {
            const colorInverse = (color) => {
                if (color === 'red') return 'black';
                if (color === 'black') return 'red';
                return undefined;
            }

            const rankBelow = (type, rank) => {
                if (type === 'trump' && rank > 1) return rank - 1;
                if (type === 'trump' && rank === 1) return undefined;
                const index = ranks.indexOf(rank);
                if (index > 0) return ranks[index - 1];
                return undefined;
            }

            // Check board piles
            for (let pile of gs.board) {
                const index = pile.findIndex(card => card.id === 'excuse');
                if (index !== -1) {
                    if (index !== 0) {
                        const aboveCard = pile[index - 1];
                        return {
                            id: 'excuse',
                            suit: undefined,
                            rank: rankBelow(aboveCard.type, aboveCard.rank),
                            color: colorInverse(aboveCard.color),
                            type: aboveCard.type
                        };
                    } else {
                        const msg = "You cannot play on the excuse card if it's at the top of a pile, please move it first.";
                        if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                        else alert(msg);
                        return { allowed: false };
                    }
                }
            }

            // Check trump piles
            for (let pile of gs.trumpPiles) {
                const index = pile.findIndex(card => card.id === 'excuse');
                if (index !== -1) {
                    return {
                        id: 'excuse',
                        suit: undefined,
                        rank: pile[0].rank === 1 ? pile[index - 1].rank + 1 : pile[index - 1].rank - 1,
                        color: undefined,
                        type: 'trump'
                    };
                }
            }

            // Check foundation piles
            for (let pile of gs.foundationPiles) {
                const index = pile.findIndex(card => card.id === 'excuse');
                if (index !== -1) {
                    return {
                        id: 'excuse',
                        suit: pile[0].suit,
                        rank: ranks[ranks.indexOf(pile[index - 1].rank) + 1],
                        color: pile[0].color,
                        type: 'normal'
                    };
                }
            }

            // Check discard piles
            for (let playerId of ['player', 'opponent']) {
                const pile = gs.players[playerId].discard;
                const index = pile.findIndex(card => card.id === 'excuse');
                if (index !== -1) {
                    if (index !== 0) {
                        const aboveCard = pile[index - 1];
                        return {
                            id: 'excuse',
                            suit: undefined,
                            rank: rankBelow(aboveCard.type, aboveCard.rank),
                            color: colorInverse(aboveCard.color),
                            type: aboveCard.type
                        };
                    } else {
                        const msg = "You cannot play on the excuse card if it's the first discarded card.";
                        if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                        else alert(msg);
                        return { allowed: false };
                    }
                }
            }

            return null;
        }

        // If moving onto the excuse pile, check if the card can replace the excuse card
        if (destinationType === 'excuse') {
            const excuseState = getExcuseState();
            let msg = null;

            if (!excuseState) msg = "Cannot determine the state of the excuse card.";
            else if (excuseState.allowed === false) return { allowed: false };

            if (excuseState && excuseState.suit) {
                if (cardFrom.suit !== excuseState.suit || cardFrom.rank !== excuseState.rank || cardFrom.type !== excuseState.type) {
                    msg = "This card cannot replace the excuse card.";
                }
            } else {
                if (cardFrom.color !== excuseState.color || cardFrom.rank !== excuseState.rank || cardFrom.type !== excuseState.type) {
                    msg = "This card cannot replace the excuse card.";
                }
            }
            if (msg) {
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            }
        }

        // Replace cardTo with the excuse state if moving onto the excuse card
        if (cardTo && cardTo.id === 'excuse') {
            cardTo = getExcuseState();

            if (!cardTo) {
                const msg = "Cannot determine the state of the excuse card.";
                if (window.Toast && window.Toast.show) window.Toast.show(msg, 3000);
                else alert(msg);
                return { allowed: false };
            }

            if (cardTo.allowed === false) {
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