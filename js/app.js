/*-------------------------------- Constants --------------------------------*/

const CODE_LENGTH = 4;
const MAX_TURNS = 10;

/*---------------------------- Variables (state) ----------------------------*/
/*
  These variables are the “truth” of the game.
  The UI is drawn from these values.
*/

let secretCode;   // the hidden 4-color code the player tries to guess
let currentGuess; // the colors the player is choosing right now
let turn;         // how many guesses have been used (0-based)
let gameStatus;   // "playing" | "won" | "lost"
let isSoundOn;    // sound toggle
let guesses;      // history of submitted guesses (array of arrays)
let feedbacks;    // feedback for each submitted guess (array of objects)

/*------------------------ Cached Element References ------------------------*/

const messageEl = document.querySelector("#message");
const guessSlotsEl = document.querySelector("#guess-slots");
const paletteEl = document.querySelector("#palette");
const submitBtnEl = document.querySelector("#submit-guess");
const boardEl = document.querySelector("#board");
const resetBtnEl = document.querySelector("#reset");
const soundToggleEl = document.querySelector("#sound-toggle");

/*-------------------------------- Audio Helpers ----------------------------*/
/*
  We generate small beeps so we don’t need audio files.
  This uses the browser’s Web Audio API.
*/

let audioCtx = null;

function playTone(freq, ms) {
    if (!isSoundOn) return;

    // Create the audio engine once (lazy setup)
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const osc = audioCtx.createOscillator(); // makes a tone
    const gain = audioCtx.createGain();      // controls volume

    osc.type = "sine";
    osc.frequency.value = freq;

    gain.gain.value = 0.05; // quiet volume (so it’s not annoying)

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    setTimeout(() => osc.stop(), ms);
}

function playClickSound() { playTone(520, 60); }
function playSubmitSound() { playTone(360, 90); }

function playWinSound() {
    playTone(660, 120);
    setTimeout(() => playTone(880, 140), 140);
}

function playLoseSound() {
    playTone(220, 180);
}

/*-------------------------------- Helper Functions --------------------------*/

/*
  Create the secret code:
  - It’s an array of 4 colors
  - Each color is randomly chosen from COLORS
*/
function getRandomCode() {
    const code = [];
    /*
      This array will hold the hidden secret code.
      It will contain exactly 4 color objects.
    */

    for (let i = 0; i < CODE_LENGTH; i += 1) {
        const randomIndex = Math.floor(Math.random() * COLORS.length);
        /*
          Each position picks a random color independently.
          This means the SAME color can be picked more than once.
        */

        const randomColor = COLORS[randomIndex];
        /*
          Duplicate colors ARE allowed.
          This matches classic Mastermind rules and increases difficulty.
        */

        code.push(randomColor);
        /*
          We add the color to the secret code.
          Example possible code: [Teal, Teal, Plum, Teal]
        */
    }

    return code;
    /*
      We return the completed secret code.
      It stays hidden from the player during the game.
    */
}


/*
  Score a guess vs the secret code.

  exact:
  - right color AND right position

  colorOnly:
  - right color but wrong position

  Important rule:
  - We must NOT double-count colors
  - So we "mark used" items after matching them
*/
function scoreGuess(guess, code) {
    let exact = 0;
    let colorOnly = 0;

    // Track which positions have already been matched
    const usedGuess = Array(CODE_LENGTH).fill(false);
    const usedCode = Array(CODE_LENGTH).fill(false);

    /* pass 1: count exact matches */
    for (let i = 0; i < CODE_LENGTH; i += 1) {
        if (guess[i].hex === code[i].hex) {
            exact += 1;
            usedGuess[i] = true; // this guess slot is already matched
            usedCode[i] = true;  // this code slot is already matched
        }
    }

    /* pass 2: count color-only matches */
    for (let i = 0; i < CODE_LENGTH; i += 1) {
        if (usedGuess[i]) continue; // skip positions already matched exactly

        for (let j = 0; j < CODE_LENGTH; j += 1) {
            if (usedCode[j]) continue; // skip code colors already matched

            if (guess[i].hex === code[j].hex) {
                colorOnly += 1;
                usedGuess[i] = true; // mark both as used so we don’t count again
                usedCode[j] = true;
                break; // stop searching after one match
            }
        }
    }

    return { exact, colorOnly };
}

/*-------------------------------- Render Functions --------------------------*/

/*
  This draws the message at the top.
  It changes based on gameStatus and turn.
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
  This draws the 4 circles for the current guess.
  If the player chose a color, that circle gets filled.
*/
function renderGuessSlots() {
    guessSlotsEl.innerHTML = "";

    for (let i = 0; i < CODE_LENGTH; i += 1) {
        const slotEl = document.createElement("div");
        slotEl.classList.add("guess-slot");

        const selectedColor = currentGuess[i];
        if (selectedColor) {
            slotEl.style.backgroundColor = selectedColor.hex;
        }

        guessSlotsEl.appendChild(slotEl);
    }
}

/*
  This draws the clickable color palette.
  Each button stores its color in dataset.hex so clicks can read it.
*/
function renderPalette() {
    paletteEl.innerHTML = "";

    for (let i = 0; i < COLORS.length; i += 1) {
        const color = COLORS[i];

        const buttonEl = document.createElement("button");
        buttonEl.classList.add("color-btn");
        buttonEl.setAttribute("type", "button");
        buttonEl.style.backgroundColor = color.hex;

        buttonEl.dataset.hex = color.hex;
        buttonEl.setAttribute("aria-label", `Choose ${color.name}`);

        paletteEl.appendChild(buttonEl);
    }
}

/*
  This draws the history board.
  For each row:
  - show the guess colors (if that row exists)
  - show the feedback pegs (if feedback exists)
*/
function renderBoard() {
    boardEl.innerHTML = "";

    for (let row = 0; row < MAX_TURNS; row += 1) {
        const rowEl = document.createElement("div");
        rowEl.classList.add("board-row");

        // Left side: the 4 guess circles for this row
        const slotsWrapEl = document.createElement("div");
        slotsWrapEl.classList.add("board-slots");

        for (let col = 0; col < CODE_LENGTH; col += 1) {
            const slotEl = document.createElement("div");
            slotEl.classList.add("board-slot");

            const guessForRow = guesses[row];
            const selectedColor = guessForRow ? guessForRow[col] : null;

            if (selectedColor) {
                slotEl.style.backgroundColor = selectedColor.hex;
            }

            slotsWrapEl.appendChild(slotEl);
        }

        // Right side: the feedback peg box (2x2)
        const pegBoxEl = document.createElement("div");
        pegBoxEl.classList.add("peg-box");

        const fb = feedbacks[row];
        if (fb) {
            // black pegs = exact matches
            for (let i = 0; i < fb.exact; i += 1) {
                const peg = document.createElement("div");
                peg.classList.add("peg", "exact");
                pegBoxEl.appendChild(peg);
            }

            // white pegs = correct color, wrong position
            for (let i = 0; i < fb.colorOnly; i += 1) {
                const peg = document.createElement("div");
                peg.classList.add("peg", "color-only");
                pegBoxEl.appendChild(peg);
            }
        }

        rowEl.appendChild(slotsWrapEl);
        rowEl.appendChild(pegBoxEl);
        boardEl.appendChild(rowEl);
    }
}

/*
  Submit is enabled only when:
  - the game is still playing
  - the current guess has 4 colors
*/
function renderSubmitButton() {
    submitBtnEl.disabled =
        currentGuess.length !== CODE_LENGTH || gameStatus !== "playing";
}

function renderSoundToggle() {
    soundToggleEl.textContent = isSoundOn ? "Sound: On" : "Sound: Off";
}

/*-------------------------------- Event Handlers ----------------------------*/

/*
  Clicking a palette color:
  - add that color to currentGuess (up to 4)
  - redraw the current guess circles
  - update submit enabled/disabled
*/
function handlePaletteClick(event) {
    if (gameStatus !== "playing") return;

    const clickedEl = event.target;
    if (!clickedEl.classList.contains("color-btn")) return;

    if (currentGuess.length >= CODE_LENGTH) return;

    const hex = clickedEl.dataset.hex;

    let selectedColor = null;
    for (let i = 0; i < COLORS.length; i += 1) {
        if (COLORS[i].hex === hex) {
            selectedColor = COLORS[i];
            break;
        }
    }

    if (!selectedColor) return;

    currentGuess.push(selectedColor);

    playClickSound();
    renderGuessSlots();
    renderSubmitButton();
}

/*
  Submitting a guess:
  1) score it vs secretCode
  2) store guess + feedback in history arrays
  3) check win/lose
  4) reset currentGuess for next turn
  5) redraw everything
*/
function handleSubmitGuess() {
    if (gameStatus !== "playing") return;
    if (currentGuess.length < CODE_LENGTH) return;

    // Score this guess before we clear it
    const feedback = scoreGuess(currentGuess, secretCode);

    // Store history so the board can show it later
    guesses.push([...currentGuess]);
    feedbacks.push(feedback);

    // Win happens when all 4 positions are exact matches
    if (feedback.exact === CODE_LENGTH) {
        gameStatus = "won";
        playWinSound();
    } else {
        playSubmitSound();
        turn += 1;

        // Lose happens when we used all turns and didn’t win
        if (turn >= MAX_TURNS) {
            gameStatus = "lost";
            playLoseSound();
        }
    }

    // Clear current guess for next turn (or end state)
    currentGuess = [];

    renderMessage();
    renderGuessSlots();
    renderBoard();
    renderSubmitButton();
}

function handleReset() {
    init();
}

function handleSoundToggle() {
    isSoundOn = !isSoundOn;
    renderSoundToggle();

    // Small confirmation sound when turning on
    if (isSoundOn) playTone(600, 80);
}

/*-------------------------------- Initialization ----------------------------*/

/*
  Reset the entire game to a clean starting state.
  This is called:
  - once when the page loads
  - anytime the player clicks Reset
*/
function init() {
    // Create a new secret code each game and keep it fixed during play
    secretCode = Object.freeze(getRandomCode());

    currentGuess = [];
    turn = 0;
    gameStatus = "playing";
    isSoundOn = true;

    guesses = [];
    feedbacks = [];

    renderMessage();
    renderGuessSlots();
    renderPalette();
    renderBoard();
    renderSubmitButton();
    renderSoundToggle();
}

/*----------------------------- Event Listeners -----------------------------*/

paletteEl.addEventListener("click", handlePaletteClick);
submitBtnEl.addEventListener("click", handleSubmitGuess);
resetBtnEl.addEventListener("click", handleReset);
soundToggleEl.addEventListener("click", handleSoundToggle);

/*----------------------------- Start the Game ------------------------------*/

init();
