(function (global) {
    /*
    constant variables to particulate cards of diferent suits and value (tarot cards by value)
    */
    const suits = ['heart', 'diamond', 'club', 'spade']; //suits define the shape associated with a card 
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'C', 'Q', 'K', 'A']; //ranks define hierarchy of card (each rank apears in each suit)
    const trumps = Array.from({ length: 21 }, (_, i) => i + 1); //numeric card that counts 1 to 21 inclusive

    /**
     * This function defines the four suits and the associated values, as well as tarot cards (Suit cards = 56, Trumps = 21, Fool??)
     * 
     * @returns {Array} ?77 cards?
     */
    function buildDeck() {
        const deck = [];
        //embeded loop to assign each suit to one of every rank
        suits.forEach(suit => {
            ranks.forEach(rank => {
                //function stores the id, suit, rank, color, and type of a card
                deck.push({
                    id: `${suit.charAt(0)}${rank}`,
                    suit: suit,
                    rank: rank,
                    color: (suit === 'heart' || suit === 'diamond') ? 'red' : 'black', //if suit = 'heart' or 'diamond', color = red, else black
                    type: 'normal' //normal type differentiates from trump cards
                });
            });
        });
        //single loop that iterates through the array of values of the trump cards
        trumps.forEach(rank => {
            //function stores the id, suit, rank, color, and type of a card
            deck.push({
                id: `t${rank}`,
                suit: 'trump',
                rank: rank,
                color: 'trump', //no color
                type: 'trump' //differentiates from normal cards
            });
        });
        return deck;
    }

    /**
     * This function randomizes the order of cards within the deck. The shuffle starts with access...
     * to all elements and will pick a random card in the whole list and swap with the last card, then the...
     * process iterates with the last card excluded
     * 
     * @param {Array} deck takes a deck as a value
     * @returns new deck that has been shuffled
     */
    function shuffleDeck(deck) {
        const a = deck.slice(); //slice creates copy of deck
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1)); //random value indexable to a
            [a[i], a[j]] = [a[j], a[i]]; //funct to swap rand card with the last indexed card -=1
        }
        return a;
    }


    /**
     * 
     * @param {*} side  
     */
    function replenishFromDiscard(side) {
        if (!side) return;
        if (Array.isArray(side.facedown) && side.facedown.length > 0) return;
        if (!Array.isArray(side.discard) || side.discard.length <= 1) return;

        const lastCard = side.discard.pop();

        const newFacedown = shuffleDeck(side.discard.slice());
        side.facedown = newFacedown.slice();

        side.discard = [lastCard];
    }

    /**
     * This function saves six starting cards for the board, and deals the rest of the cards, alternating from player1 to player2...etc
     * until all cards are dealt
     * 
     * @param {Array} deck //should take a deck after func shuffleDeck() is used
     * @returns {hand1, hand2, initialBoard} // rreturns a two hands for each player, and leaves 6 cards for the board stacks
     */
    function dealDeck(deck) {
        const hand1 = [];
        const hand2 = [];
        const initialBoard = [];
        const boardSize = 6; //number of stacks on board
        initialBoard.push(...deck.splice(deck.length - boardSize, boardSize));
        //for loop iterates throught the deck and alternates dealing cards (player1 first)
        for (let i = 0; i < deck.length; i++) {
            if (i % 2 === 0) hand1.push(deck[i]);
            else hand2.push(deck[i]);
        }
        return { hand1, hand2, initialBoard };
    }

    global.Deck = { buildDeck, shuffleDeck, replenishFromDiscard, dealDeck };
    })(window);