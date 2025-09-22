(function (global) {
    const suits = ['heart', 'diamond', 'club', 'spade'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'C', 'Q', 'K', 'A'];
    const trumps = Array.from({ length: 21 }, (_, i) => i + 1);

    function buildDeck() {
        const deck = [];
        suits.forEach(suit => {
            ranks.forEach(rank => {
                deck.push({
                    id: `${suit.charAt(0)}${rank}`,
                    suit: suit,
                    rank: rank,
                    color: (suit === 'heart' || suit === 'diamond') ? 'red' : 'black',
                    type: 'normal'
                });
            });
        });
        trumps.forEach(rank => {
            deck.push({
                id: `t${rank}`,
                suit: 'trump',
                rank: rank,
                color: 'trump',
                type: 'trump'
            });
        });
        return deck;
    }

    function shuffleDeck(deck) {
        const a = deck.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function replenishFromDiscard(side) {
        if (!side) return;
        if (Array.isArray(side.facedown) && side.facedown.length > 0) return;
        if (!Array.isArray(side.discard) || side.discard.length <= 1) return;

        const lastCard = side.discard.pop();

        const newFacedown = shuffleDeck(side.discard.slice());
        side.facedown = newFacedown.slice();

        side.discard = [lastCard];
    }

    function dealDeck(deck) {
        const hand1 = [];
        const hand2 = [];
        const initialBoard = [];
        const boardSize = 6;
        initialBoard.push(...deck.splice(deck.length - boardSize, boardSize));
        for (let i = 0; i < deck.length; i++) {
            if (i % 2 === 0) hand1.push(deck[i]);
            else hand2.push(deck[i]);
        }
        return { hand1, hand2, initialBoard };
    }

    global.Deck = { buildDeck, shuffleDeck, replenishFromDiscard, dealDeck };
})(window);