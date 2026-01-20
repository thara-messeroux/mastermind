/*-------------------------------- Constants --------------------------------*/

/*
  Game rules (do not change during a game).
*/
const CODE_LENGTH = 4;
const MAX_TURNS = 10;

/*---------------------------- Variables (state) ----------------------------*/

/*
  Single Source of Truth:
  - These variables represent the entire game state.
  - The UI is drawn from state.
  - Events update state, then we re-render.
*/
let secretCode;
let currentGuess;
let turn;
let gameStatus;   /* "playing" | "won" | "lost" */
let isSoundOn;
let guesses;
let feedbacks;

/*------------------------ Cached Element References ------------------------*/

/*
  Cache DOM references once:
  - Keeps code faster and cleaner
  - Avoids repeating querySelector
*/
const messageEl = document.querySelector("#message");
const guessSlotsEl = document.querySelector("#guess-slots");
const paletteEl = document.querySelector("#palette");
const submitBtnEl = document.querySelector("#submit-guess");
const boardEl = document.querySelector("#board");
const resetBtnEl = document.querySelector("#reset");
const soundToggleEl = document.querySelector("#sound-toggle");

/*-------------------------------- Audio Helpers ----------------------------*/

/*
  Small sound effects without external audio files:
  - Uses Web Audio API oscillator + gain
  - Different tones for click/submit/win/lose
*/
let audioCtx = null;

function playTone(freq, ms) {
    if (!isSoundOn) return;

    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.06;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    setTimeout(() => osc.stop(), ms);
}

function playClickSound() { playTone(560, 55); }
function playSubmitSound() { playTone(380, 90); }

function playWinSound() {
    playTone(660, 120);
    setTimeout(() => playTone(880, 140), 140);
}

function playLoseSound() {
    playTone(260, 140);
    setTimeout(() => playTone(180, 180), 160);
}

/*-------------------------------- Helper Functions --------------------------*/

/*
  Create a new secret code:
  - 4 positions
  - each position randomly picks from COLORS
  - duplicates are allowed (classic Mastermind rules)
*/
function getRandomCode() {
    const code = [];

    for (let i = 0; i < CODE_LENGTH; i += 1) {
        const randomIndex = Math.floor(Math.random() * COLORS.length);
        code.push(COLORS[randomIndex]);
    }

    return code;
}

/*
  Scoring function (feedback pegs):

  exact:
  - correct color AND correct position

  colorOnly:
  - correct color but wrong position

  Key idea:
  - We avoid double-counting by marking used positions.
*/
function scoreGuess(guess, code) {
    let exact = 0;
    let colorOnly = 0;

    const usedGuess = Array(CODE_LENGTH).fill(false);
    const usedCode = Array(CODE_LENGTH).fill(false);

    /* Pass 1: exact matches */
    for (let i = 0; i < CODE_LENGTH; i += 1) {
        if (guess[i].hex === code[i].hex) {
            exact += 1;
            usedGuess[i] = true;
            usedCode[i] = true;
        }
    }

    /* Pass 2: color-only matches */
    for (let i = 0; i < CODE_LENGTH; i += 1) {
        if (usedGuess[i]) continue;

        for (let j = 0; j < CODE_LENGTH; j += 1) {
            if (usedCode[j]) continue;

            if (guess[i].hex === code[j].hex) {
                colorOnly += 1;
                usedGuess[i] = true;
                usedCode[j] = true;
                break;
            }
        }
    }

    return { exact, colorOnly };
}

/*-------------------------------- Render Functions --------------------------*/

/*
  Render pattern:
  - Render functions read state and draw UI.
  - Render functions do not change state.
*/
function renderMessage() {
    if (gameStatus === "playing") {
        messageEl.textContent = `Turn ${turn + 1} of ${MAX_TURNS}: build your guess`;
        return;
    }

    if (gameStatus === "won") {
        messageEl.textContent = "You cracked the code!";
        return;
    }

    if (gameStatus === "lost") {
        messageEl.textContent = "Out of turns. Better luck next time!";
    }
}

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
  Board rendering:
  - MAX_TURNS rows
  - each row shows 4 guess circles
  - each row shows a 2x2 peg box (up to 4 pegs)
*/
function renderBoard() {
    boardEl.innerHTML = "";

    for (let row = 0; row < MAX_TURNS; row += 1) {
        const rowEl = document.createElement("div");
        rowEl.classList.add("board-row");

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

        const pegBoxEl = document.createElement("div");
        pegBoxEl.classList.add("peg-box");

        const fb = feedbacks[row];
        if (fb) {
            for (let i = 0; i < fb.exact; i += 1) {
                const peg = document.createElement("div");
                peg.classList.add("peg", "exact");
                pegBoxEl.appendChild(peg);
            }

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
  Button state:
  - Submit is disabled until the guess has 4 colors
  - Submit is disabled when the game ends
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
  Event -> Update State -> Render
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

function handleSubmitGuess() {
    if (gameStatus !== "playing") return;
    if (currentGuess.length < CODE_LENGTH) return;

    const feedback = scoreGuess(currentGuess, secretCode);

    guesses.push([...currentGuess]);
    feedbacks.push(feedback);

    if (feedback.exact === CODE_LENGTH) {
        gameStatus = "won";
        playWinSound();
    } else {
        playSubmitSound();
        turn += 1;

        if (turn >= MAX_TURNS) {
            gameStatus = "lost";
            playLoseSound();
        }
    }

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

    if (isSoundOn) playTone(520, 80);
}

/*
  Testing shortcut:
  - Press "C" to reveal the secret code in an alert
  - Useful for verifying win logic quickly
  - Remove this listener later if needed
*/
function handleKeyDown(event) {
    if (event.key.toLowerCase() !== "c") return;

    const names = secretCode.map(c => c.name).join(", ");
    alert(`Secret code: ${names}`);
}

/*-------------------------------- Initialization ----------------------------*/

/*
  init() is idempotent:
  - Calling init() always creates a fresh valid starting state
*/
function init() {
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

/*-------------------------------- Listeners --------------------------------*/

paletteEl.addEventListener("click", handlePaletteClick);
submitBtnEl.addEventListener("click", handleSubmitGuess);
resetBtnEl.addEventListener("click", handleReset);
soundToggleEl.addEventListener("click", handleSoundToggle);
window.addEventListener("keydown", handleKeyDown);

/*-------------------------------- Start Game --------------------------------*/

init();
