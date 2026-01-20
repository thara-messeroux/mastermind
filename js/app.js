/*-------------------------------- Constants --------------------------------*/

/*
  These are game rules (they do not change during a game).
*/
const CODE_LENGTH = 4; /* the secret code has 4 slots */
const MAX_TURNS = 10;  /* the player gets 10 guesses */

/*---------------------------- Variables (state) ----------------------------*/

/*
  These are the game’s memory (they WILL change while playing).
  Principle: Single Source of Truth
  - The state is the truth
  - The UI will read from state
*/
let secretCode;    /* the hidden code the player is trying to guess (later) */
let currentGuess;  /* the colors the player is building right now */
let turn;          /* which turn the player is on (0-based) */
let gameStatus; /* "playing" |"won" | "lost" */
let isSoundOn;     /* sound on/off (later) */
let guesses; /* all past guesses, one row per turn */


/*------------------------ Cached Element References ------------------------*/

/*
  We grab the HTML elements once and store them here.
  This keeps code simple and avoids repeating querySelector.
  Note: This works because app.js is loaded with `defer` in index.html.
*/
const messageEl = document.querySelector("#message");
/* where we show messages like "Turn 1 of 10" or "You won!" */

const guessSlotsEl = document.querySelector("#guess-slots");
/* where we draw the 4 guess circles */

const paletteEl = document.querySelector("#palette");
/* where we draw the color buttons (the palette) */

const submitBtnEl = document.querySelector("#submit-guess");
/* the button the user clicks to submit their guess */


/*-------------------------------- Functions --------------------------------*/

/*
  Render = "draw the screen".
  Principle: State → Render
  - This function reads state
  - It does NOT change state
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
  Draw the guess slots.
  - If currentGuess has a color for a slot, we fill it
  - If not, the slot stays empty
  Principle: State → Render (UI reads currentGuess)
*/
function renderGuessSlots() {
    guessSlotsEl.innerHTML = "";
    /* clear old circles first so we don’t duplicate them */

    for (let i = 0; i < CODE_LENGTH; i += 1) {
        const slotEl = document.createElement("div");
        slotEl.classList.add("guess-slot");

        const selectedColor = currentGuess[i];
        /* this may be undefined if the player hasn’t picked this slot yet */

        if (selectedColor) {
            slotEl.style.backgroundColor = selectedColor.hex;
            /* fill the circle using the color’s hex value */
        }

        guessSlotsEl.appendChild(slotEl);
    }
}

/*
  Draw the color palette buttons.
  Principle: Data-Driven UI
  - COLORS decides how many buttons exist and what they look like
*/
function renderPalette() {
    paletteEl.innerHTML = "";
    /* clear old buttons first so we don’t duplicate them */

    for (let i = 0; i < COLORS.length; i += 1) {
        const color = COLORS[i];
        /* color is an object like: { name: "Teal", hex: "#30C0B7" } */

        const buttonEl = document.createElement("button");
        buttonEl.classList.add("color-btn");
        buttonEl.setAttribute("type", "button");

        /* Visual: paint the button */
        buttonEl.style.backgroundColor = color.hex;

        /* Memory on the button (so clicks can read it later) */
        buttonEl.dataset.hex = color.hex;
        buttonEl.dataset.name = color.name;

        /* Accessibility: screen readers get a friendly name */
        buttonEl.setAttribute("aria-label", `Choose ${color.name}`);

        paletteEl.appendChild(buttonEl);
    }
}

/*
  Handle palette clicks.
  Principle: Event → (Update State) → Render
  User clicks a color → we save it in currentGuess → we redraw the slots
*/

function handlePaletteClick(event) {
    if (gameStatus !== "playing") {
        return;
        /* Safety check: only accept color clicks when the game is in "playing" mode */
    }

    const clickedEl = event.target;
    /* the exact element the user clicked */

    if (!clickedEl.classList.contains("color-btn")) {
        return;
        /* guard clause: ignore clicks that are not on a color button */
    }

    if (currentGuess.length >= CODE_LENGTH) {
        return;
        /* Safety check: stop adding colors once all 4 slots are filled */
    }

    /* User clicked a color → we remember it → we update the circles on screen */

    const hex = clickedEl.dataset.hex;
    /* get the hex value saved on the button */

    let selectedColor = null;
    /* we will store the matching color object here */

    /* We are checking each color until we find the one the user clicked, then we stop the loop */
    for (let i = 0; i < COLORS.length; i++) {
        if (COLORS[i].hex === hex) {
            selectedColor = COLORS[i];
            break;
        }
    }

    /* add the selected color to the current guess */
    currentGuess.push(selectedColor);

    /* redraw the guess slots so the color appears */
    renderGuessSlots();
}

/* 
When the player clicks Submit, this function saves the finished guess, 
moves the game to the next turn, clears the circles, 
and lets the player start a new guess. 
*/
function handleSubmitGuess() {
    if (currentGuess.length < CODE_LENGTH) {
        return;
        /* cannot submit until all slots are filled */
    }

    /* save this finished guess */
    guesses.push(currentGuess);

    /* move to next turn */
    turn += 1;

    /* reset for the next row */
    currentGuess = [];
    gameStatus = "playing";

    /* redraw UI */
    renderMessage();
    renderGuessSlots();
}


/*
  Draw the empty game board.
  This creates all rows and slots BEFORE the game starts.
  Draw the empty game board (all turns, no guesses yet).
  This is just the visual skeleton of the game.
*/
function renderBoard() {
    const boardEl = document.querySelector("#board");
    boardEl.innerHTML = "";

    /* create one row per turn */
    for (let row = 0; row < MAX_TURNS; row += 1) {
        const rowEl = document.createElement("div");
        rowEl.classList.add("board-row");

        /* create one slot per color */
        for (let col = 0; col < CODE_LENGTH; col += 1) {
            const slotEl = document.createElement("div");
            slotEl.classList.add("board-slot");
            rowEl.appendChild(slotEl);
        }

        boardEl.appendChild(rowEl);
    }
}

/*-------------------------------- Initialization ----------------------------*/

/*
  Reset the entire game.
  Principle: Idempotent Initialization
  - Calling init() always creates a fresh, correct starting state
*/
function init() {
    secretCode = [];   /* will be generated later */
    currentGuess = []; /* empty guess at start */
    turn = 0;
    gameStatus = "playing";
    isSoundOn = true;
    guesses = []; /* start with no submitted guesses */

    /* Draw the UI from the state (State → Render) */
    renderMessage();
    renderGuessSlots();
    renderPalette();
    renderBoard();

}

/*----------------------------- Event Listeners -----------------------------*/

/*
  One listener for the whole palette (clean + simple).
  When any color button is clicked, handlePaletteClick runs.
*/
paletteEl.addEventListener("click", handlePaletteClick);

submitBtnEl.addEventListener("click", handleSubmitGuess);
/* connect Submit button to its handler */


/*----------------------------- Start the Game ------------------------------*/

/*
  Start once when the page loads.
  Because of `defer` in index.html, the HTML is ready.
*/
init();
