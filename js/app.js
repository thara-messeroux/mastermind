/* app logic will live here */
console.log("Mastermind loaded");

/* =========================================
   Mastermind - Game State + Initialization
   Principle: Separation of Concerns (SoC)
   - State lives here
   - UI rendering will come later
   ========================================= */

/* -----------------------------------------
   Constants (do not change during a game)
   ----------------------------------------- */

const CODE_LENGTH = 4; /* how many slots in the secret code */
const MAX_TURNS = 10; /* how many guesses the player gets */

/* -----------------------------------------
   State (changes during the game)
   Principle: Single Source of Truth
   ----------------------------------------- */

let secretCode; /* array of colors like ["red","blue","green","yellow"] */
let currentGuess; /* array of colors the player is building */
let turn; /* number of guesses used so far */
let gameStatus; /* "playing" | "won" | "lost" */
let isSoundOn; /* true or false */

/* -----------------------------------------
   init()
   Principle: Idempotent Initialization
   - calling init() always resets the game safely
   ----------------------------------------- */

function init() {
    /* reset game state */
    secretCode = []; /* will be generated later */
    currentGuess = []; /* empty guess */
    turn = 0; /* start at turn 0 */
    gameStatus = "playing"; /* game is active */
    isSoundOn = true; /* sound starts on */

    /* temporary message so we can test init() works */
    console.log("init ran: game reset"); /* incremental testing */
}

/* -----------------------------------------
   Run once when the page loads
   ----------------------------------------- */

init();
