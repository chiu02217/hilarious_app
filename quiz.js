const { ipcRenderer } = require('electron');

let timeRemaining = 30;
let timerInterval = null;
let morphProgress = 0;
let obamaImage = null;
let isLocked = false;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const timerDisplay = document.getElementById('timer');
const questionDisplay = document.getElementById('question');
const answerInput = document.getElementById('answer-input');
const submitBtn = document.getElementById('submit-btn');
const warning = document.getElementById('warning');
const content = document.getElementById('content');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Load Obama image
obamaImage = new Image();
obamaImage.src = 'obama.jpg';
obamaImage.onload = () => {
    console.log('Obama image loaded');
};

// Receive quiz data from main process
ipcRenderer.on('start-quiz', (event, data) => {
    questionDisplay.textContent = data.question;
    timeRemaining = data.timeLimit;
    timerDisplay.textContent = timeRemaining;
    startTimer();
    answerInput.focus();
});

function startTimer() {
    timerInterval = setInterval(() => {
        timeRemaining--;
        timerDisplay.textContent = timeRemaining;

        // Calculate morph progress (0 to 1)
        const totalTime = 30;
        morphProgress = 1 - (timeRemaining / totalTime);

        // Show warning at 10 seconds
        if (timeRemaining <= 10) {
            warning.classList.add('visible');
            content.classList.add('morphing');
        }

        // Draw Obama morph effect
        drawObamaEffect();

        // Time's up!
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            lockScreen();
        }
    }, 1000);
}

function drawObamaEffect() {
    if (!obamaImage.complete) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid-based morphing effect
    const gridSize = 5; // Size of each grid cell (smaller = more fine-grained)
    const cols = Math.ceil(canvas.width / gridSize);
    const rows = Math.ceil(canvas.height / gridSize);

    // Calculate how many cells to show Obama (based on progress)
    const totalCells = cols * rows;
    const obamaCells = Math.floor(totalCells * morphProgress);

    // Create array of all cell positions
    const cells = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            cells.push({ x, y });
        }
    }

    // Shuffle cells for random appearance
    shuffleArray(cells);

    // Draw Obama in random cells based on progress
    for (let i = 0; i < obamaCells; i++) {
        const cell = cells[i];
        const canvasX = cell.x * gridSize;
        const canvasY = cell.y * gridSize;

        // Map canvas position to Obama image position
        const imgX = (cell.x / cols) * obamaImage.width;
        const imgY = (cell.y / rows) * obamaImage.height;
        const imgWidth = obamaImage.width / cols;
        const imgHeight = obamaImage.height / rows;

        // Gradual alpha increase for each cell based on when it appears
        const cellAppearProgress = i / obamaCells;
        // Extremely gradual fade-in: cells barely visible at first, slowly building
        const cellAge = morphProgress - (cellAppearProgress * morphProgress);
        // Use power of 0.3 for extremely slow initial growth
        const cellAlpha = Math.pow(cellAge, 0.3);

        ctx.globalAlpha = Math.max(0.05, Math.min(1, cellAlpha));

        // Draw section of Obama image
        ctx.drawImage(
            obamaImage,
            imgX, imgY, imgWidth, imgHeight,
            canvasX, canvasY, gridSize, gridSize
        );

        ctx.globalAlpha = 1.0;
    }

    // Add gradual opacity overlay throughout the entire duration
    if (morphProgress > 0.05) {
        // Start immediately and build up extremely gradually
        // Use power of 5 for very slow initial growth
        const overlayProgress = (morphProgress - 0.05) / 0.95;
        ctx.globalAlpha = Math.pow(overlayProgress, 5) * 0.3;
        ctx.drawImage(obamaImage, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function lockScreen() {
    isLocked = true;
    answerInput.disabled = true;
    submitBtn.disabled = true;
    warning.classList.remove('visible');
    document.querySelector('.locked-message').classList.add('visible');
    document.querySelector('.escape-hint').classList.add('visible');

    // Full Obama takeover
    morphProgress = 1;
    drawFullObama();

    // Tell main process to go fullscreen
    ipcRenderer.send('time-expired');

    // Show escape hint after 3 seconds
    setTimeout(() => {
        document.querySelector('.escape-hint').classList.add('visible');
    }, 3000);
}

function drawFullObama() {
    if (!obamaImage.complete) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(obamaImage, 0, 0, canvas.width, canvas.height);

    // Add pulsing effect
    let alpha = 0.5;
    let direction = 1;
    setInterval(() => {
        alpha += direction * 0.02;
        if (alpha >= 1 || alpha <= 0.3) direction *= -1;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = alpha;
        ctx.drawImage(obamaImage, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
    }, 50);
}

function submitAnswer() {
    if (isLocked) return;

    const answer = answerInput.value.trim();
    if (answer) {
        clearInterval(timerInterval);
        ipcRenderer.send('answer-submitted', answer);
    }
}

submitBtn.addEventListener('click', submitAnswer);
answerInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        submitAnswer();
    }
});

// ESC key to unlock when locked
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isLocked) {
        ipcRenderer.send('unlock-screen');
    }
});
