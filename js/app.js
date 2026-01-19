/*-------------------------------- Constants --------------------------------*/

const CODE_LENGTH = 4; /* number of slots in the secret code */
const MAX_TURNS = 10; /* number of guesses the player gets */

/*---------------------------- Variables (state) ----------------------------*/

let secretCode; /* array of colors like ["red","blue","green","yellow"] */
let currentGuess; /* array of colors the player is building */
let turn; /* number of guesses used so far */
let gameStatus; /* "playing" | "won" | "lost" */
let isSoundOn; /* true or false */

/*------------------------ Cached Element References ------------------------*/

/* This file is loaded with `defer` in index.html,
   so the DOM is fully loaded before this code runs */

const messageEl = document.querySelector("#message"); /* where messages appear */

/*-------------------------------- Functions --------------------------------*/

function renderMessage() {
    /* Principle: State-Driven UI (Single Source of Truth)
       The UI reads from state and does not decide anything itself. */

    if (gameStatus === "playing") {
        messageEl.textContent = `Turn ${turn + 1} of ${MAX_TURNS}: build your guess`;
        return; /* Guard Clause: exit early */
    }

    if (gameStatus === "won") {
        messageEl.textContent = "You cracked the code! 🎉";
        return; /* Guard Clause: exit early */
    }

    if (gameStatus === "lost") {
        messageEl.textContent = "Out of turns. Better luck next time!";
    }
}

function init() {
    /* Principle: Idempotent Initialization
       Calling init() multiple times safely resets the game. */

    secretCode = []; /* will be generated later */
    currentGuess = []; /* empty guess */
    turn = 0; /* start at turn 0 */
    gameStatus = "playing"; /* game is active */
    isSoundOn = true; /* sound starts on */

    renderMessage(); /* Event -> Update State -> Render UI (state -> UI) */
}

/*----------------------------- Event Listeners -----------------------------*/

/* Run once when the page loads */
init();
