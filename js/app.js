/*-------------------------------- Constants --------------------------------*/

/*
  These are rules of the game.
  They never change while the game is running.
*/

const CODE_LENGTH = 4; // The secret code has 4 slots
const MAX_TURNS = 10;  // The player gets 10 guesses

/*---------------------------- Variables (state) ----------------------------*/

/*
  These values CAN change while the game runs.
  This is the "memory" of the game.
*/

let secretCode;    // The hidden code the player is trying to guess
let currentGuess; // What the player is currently building
let turn;          // Which turn the player is on
let gameStatus;    // "playing", "won", or "lost"
let isSoundOn;     // Whether sound effects are on

/*------------------------ Cached Element References ------------------------*/

/*
  We grab HTML elements ONCE and store them here.
  This makes the code faster and easier to read.
*/

const messageEl = document.querySelector("#message");
/*
  This element shows messages like:
  "Turn 1 of 10" or "You won!"
*/

const guessSlotsEl = document.querySelector("#guess-slots");
/*
  This is the container where the empty guess circles will appear.
*/

const paletteEl = document.querySelector("#palette");
/*
  This is the container where the color buttons will appear.
  We draw buttons here using JavaScript.
*/

/*-------------------------------- Functions --------------------------------*/

/*
  This function ONLY updates the message text.
  It reads the game state and shows the correct message.
  It does NOT change the game.
*/
function renderMessage() {
    if (gameStatus === "playing") {
        messageEl.textContent = `Turn ${turn + 1} of ${MAX_TURNS}: build your guess`;
        return;
    }

    if (gameStatus === "won") {
        messageEl.textContent = "You cracked the code! 🎉";
        return;
    }

    if (gameStatus === "lost") {
        messageEl.textContent = "Out of turns. Better luck next time!";
    }
}

/*
  This function draws empty guess slots on the screen.

  IMPORTANT:
  - It does NOT change the game state
  - It ONLY looks at the rules (CODE_LENGTH)
  - Then it draws that many empty circles
*/
function renderGuessSlots() {
    /*
      First, we clear anything that was there before.
      This prevents duplicates if we re-render.
    */
    guessSlotsEl.innerHTML = "";

    /*
      We repeat this loop CODE_LENGTH times.
      If CODE_LENGTH is 4, this runs 4 times.
    */
    for (let i = 0; i < CODE_LENGTH; i++) {
        /*
          Create one empty slot
        */
        const slotEl = document.createElement("div");

        /*
          Give it a class so CSS can style it
        */
        slotEl.classList.add("guess-slot");

        /*
          Add the slot to the page
        */
        guessSlotsEl.appendChild(slotEl);
    }
}

function renderPalette() {
    /*
      This function draws the color buttons.
  
      It reads the COLORS array and creates one button per color.
      This is called "data-driven UI" because data decides what we draw.
    */

    paletteEl.innerHTML = "";
    /* We clear old buttons first so we don’t duplicate them */

    for (let i = 0; i < COLORS.length; i++) {
        const color = COLORS[i];
        /* Pick one color from the list */

        const buttonEl = document.createElement("button");
        /* Create a new button element */

        buttonEl.classList.add("color-btn");
        /* Add a class so CSS can style it */

        buttonEl.setAttribute("type", "button");
        /* This prevents the button from trying to submit a form */

        buttonEl.setAttribute("aria-label", `Choose ${color}`);
        /* Accessibility: screen readers can describe the button */

        buttonEl.style.backgroundColor = color;
        /* Visually make the button the color */

        paletteEl.appendChild(buttonEl);
        /* Put the button on the screen */
    }
}


/*-------------------------------- Initialization ----------------------------*/

/*
  This function resets the entire game.
  Calling init() always gives us a fresh start.
*/
function init() {
    // Reset game memory
    secretCode = [];      // Will be generated later
    currentGuess = [];    // Start with no guess
    turn = 0;             // Start at turn 0
    gameStatus = "playing";
    isSoundOn = true;

    // Draw the UI based on the state
    renderMessage();     // Show correct message
    renderGuessSlots();  // Draw empty guess circles

    console.log("Game initialized");

    renderPalette(); /* draw color buttons based on COLORS data */

}

/*----------------------------- Start the Game -----------------------------*/

/*
  This runs as soon as the page loads.
  Because of `defer` in index.html, the HTML is ready.
*/
init();
