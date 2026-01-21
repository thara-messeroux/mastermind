/*-------------- Constants -------------*/
/*
  Requirement: game has win/lose + turn limit
*/
const CODE_LENGTH = 4;
const MAX_TURNS = 10;

/*---------- Variables (state) ---------*/
/*
  Principle: Single Source of Truth
  - The whole game lives in these variables
  - UI should be drawn from this state
*/
let secretCode;       /* the hidden answer */
let currentGuess;     /* what player is building */
let turn;             /* 0-based turn counter */
let gameStatus;       /* "playing" | "won" | "lost" */
let isSoundOn;        /* sound toggle */
let guesses;          /* history of guesses */
let feedbacks;        /* history of feedback (true/false per slot) */
let theme;            /* "light" or "dark" */
let isCodeVisible;    /* reveal code toggle */

/*----- Cached Element References  -----*/
/*
  Principle: Cache DOM references
  - Query once, reuse many times
*/
const messageEl = document.querySelector("#message");
const guessSlotsEl = document.querySelector("#guess-slots");
const paletteEl = document.querySelector("#palette");
const submitBtnEl = document.querySelector("#submit-guess");
const boardEl = document.querySelector("#board");

const resetBtnEl = document.querySelector("#reset");
const soundToggleEl = document.querySelector("#sound-toggle");
const themeToggleEl = document.querySelector("#theme-toggle");
const revealCodeBtnEl = document.querySelector("#reveal-code");
const codeRevealEl = document.querySelector("#code-reveal");

/*-------------- Functions -------------*/
/*
  Principle: Separation of Concerns
  - Helpers do logic
  - Render does UI
  - Handlers connect user actions to state updates
*/

/* ---------- Audio (short effects) ---------- */
/*
  Requirement: Add audio details
  - Short sound effects to help focus on the game
*/
let audioCtx = null;

function ensureAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playTone(freq, ms, volume = 0.06, type = "sine") {
    if (!isSoundOn) return;

    ensureAudio();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = volume;

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    setTimeout(() => osc.stop(), ms);
}

function playClickSound() { playTone(620, 50, 0.04, "triangle"); }
function playSubmitSound() { playTone(420, 90, 0.05, "sine"); }

/* Playful win “jingle” */
function playWinSound() {
    playTone(660, 90, 0.06, "sine");
    setTimeout(() => playTone(880, 90, 0.06, "sine"), 90);
    setTimeout(() => playTone(990, 120, 0.06, "sine"), 180);
}

function playLoseSound() {
    playTone(260, 120, 0.06, "sine");
    setTimeout(() => playTone(180, 160, 0.06, "sine"), 130);
}

/* ---------- Helpers (game logic) ---------- */

/*
  Create the secret code with NO duplicates.
  - We shuffle COLORS and take first 4
  - This makes the game easier and clear
*/
function getRandomCodeNoDuplicates() {
    const pool = [...COLORS];

    /* Fisher-Yates shuffle (reliable shuffle) */
    for (let i = pool.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    return pool.slice(0, CODE_LENGTH);
}

/*
  Feedback aligned by position (simple version):
  - true means correct color in the correct slot
  - false means not correct for that slot
*/
function getPositionFeedback(guess, code) {
    const feedback = [];

    for (let i = 0; i < CODE_LENGTH; i += 1) {
        feedback.push(guess[i].hex === code[i].hex);
    }

    return feedback;
}

/* ---------- Render (State -> UI) ---------- */
/*
  Requirement: DOM manipulation
  Principle: State → Render
  - Read state
  - Draw UI
  - Do not change state here
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

    messageEl.textContent = "Out of turns. Better luck next time!";
}

function renderGuessSlots() {
    guessSlotsEl.innerHTML = "";

    for (let i = 0; i < CODE_LENGTH; i += 1) {
        const slotEl = document.createElement("div");
        slotEl.classList.add("guess-slot");

        const selectedColor = currentGuess[i];
        if (selectedColor) {
            slotEl.style.backgroundColor = selectedColor.hex;
            slotEl.classList.add("filled");
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

        /* Accessibility: screen readers get a label */
        buttonEl.setAttribute("aria-label", `Choose ${color.name}`);
        buttonEl.dataset.hex = color.hex;

        paletteEl.appendChild(buttonEl);
    }
}

function renderBoard() {
    boardEl.innerHTML = "";

    for (let row = 0; row < MAX_TURNS; row += 1) {
        const rowEl = document.createElement("div");
        rowEl.classList.add("board-row");

        const guessForRow = guesses[row];
        const feedbackForRow = feedbacks[row];

        if (guessForRow) {
            rowEl.classList.add("submitted");
        }

        const slotsWrapEl = document.createElement("div");
        slotsWrapEl.classList.add("board-slots");

        for (let col = 0; col < CODE_LENGTH; col += 1) {
            const slotEl = document.createElement("div");
            slotEl.classList.add("board-slot");

            if (guessForRow) {
                slotEl.style.backgroundColor = guessForRow[col].hex;

                /* Visual cue: glow when this slot is correct */
                if (feedbackForRow && feedbackForRow[col] === true) {
                    slotEl.classList.add("exact");
                }
            }

            slotsWrapEl.appendChild(slotEl);
        }

        const pegBoxEl = document.createElement("div");
        pegBoxEl.classList.add("peg-box");

        for (let i = 0; i < CODE_LENGTH; i += 1) {
            const pegEl = document.createElement("div");
            pegEl.classList.add("peg");

            if (feedbackForRow && feedbackForRow[i] === true) {
                pegEl.classList.add("exact");
            }

            pegBoxEl.appendChild(pegEl);
        }

        rowEl.appendChild(slotsWrapEl);
        rowEl.appendChild(pegBoxEl);
        boardEl.appendChild(rowEl);
    }
}

function renderSubmitButton() {
    /*
      Submit is allowed ONLY when:
      - player picked 4 colors
      - game is still playing
    */
    submitBtnEl.disabled =
        currentGuess.length !== CODE_LENGTH || gameStatus !== "playing";
}

function renderSoundToggle() {
    soundToggleEl.textContent = isSoundOn ? "Sound: On" : "Sound: Off";
}

function renderThemeToggle() {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggleEl.textContent = theme === "light" ? "Theme: Light" : "Theme: Dark";
}

function renderCodeReveal() {
    /*
      Requirement note: avoid alert/prompt in many rubrics
      So we show the secret code in the page instead.
    */
    if (isCodeVisible) {
        const names = secretCode.map(c => c.name).join(", ");
        codeRevealEl.textContent = `Secret code: ${names}`;
        revealCodeBtnEl.textContent = "Hide Code";
    } else {
        codeRevealEl.textContent = "";
        revealCodeBtnEl.textContent = "Reveal Code";
    }
}

/* ---------- Event Handlers (Event -> State -> Render) ---------- */
/*
  Principle: Event → Update State → Render
*/

function handlePaletteClick(event) {
    if (gameStatus !== "playing") return;

    const clickedEl = event.target;
    if (!clickedEl.classList.contains("color-btn")) return;

    const hex = clickedEl.dataset.hex;

    /* Rule: no duplicates in the same guess */
    const alreadyPicked = currentGuess.some(c => c.hex === hex);
    if (alreadyPicked) return;

    if (currentGuess.length >= CODE_LENGTH) return;

    const selectedColor = COLORS.find(c => c.hex === hex);
    if (!selectedColor) return;

    currentGuess.push(selectedColor);

    playClickSound();
    renderGuessSlots();
    renderSubmitButton();
}

function handleSubmitGuess() {
    if (gameStatus !== "playing") return;
    if (currentGuess.length < CODE_LENGTH) return;

    const feedback = getPositionFeedback(currentGuess, secretCode);

    guesses.push([...currentGuess]);
    feedbacks.push(feedback);

    const allCorrect = feedback.every(v => v === true);

    if (allCorrect) {
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

    if (isSoundOn) {
        playTone(520, 70, 0.04, "sine");
    }
}

function handleThemeToggle() {
    theme = theme === "light" ? "dark" : "light";
    renderThemeToggle();
}

function handleRevealCodeToggle() {
    isCodeVisible = !isCodeVisible;
    renderCodeReveal();
}

function handleKeyDown(event) {
    if (event.key.toLowerCase() !== "c") return;
    isCodeVisible = !isCodeVisible;
    renderCodeReveal();
}

/* ---------- init (fresh start) ---------- */
/*
  Principle: Idempotent Initialization
  - Calling init() always creates a clean new game
*/
function init() {
    secretCode = Object.freeze(getRandomCodeNoDuplicates());

    currentGuess = [];
    turn = 0;
    gameStatus = "playing";
    isSoundOn = true;

    theme = document.documentElement.getAttribute("data-theme") || "light";
    isCodeVisible = false;

    guesses = [];
    feedbacks = [];

    renderMessage();
    renderGuessSlots();
    renderPalette();
    renderBoard();
    renderSubmitButton();
    renderSoundToggle();
    renderThemeToggle();
    renderCodeReveal();
}

/*----------- Event Listeners ----------*/

paletteEl.addEventListener("click", handlePaletteClick);
submitBtnEl.addEventListener("click", handleSubmitGuess);
resetBtnEl.addEventListener("click", handleReset);
soundToggleEl.addEventListener("click", handleSoundToggle);
themeToggleEl.addEventListener("click", handleThemeToggle);
revealCodeBtnEl.addEventListener("click", handleRevealCodeToggle);
window.addEventListener("keydown", handleKeyDown);

/* Start once */
init();
