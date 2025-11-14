// State
let currentRiddle = '';
let timeRemaining = 60;
let timerInterval = null;
let resizeInterval = null;
let currentWidth = 400;
let currentHeight = 300;
let screenWidth = 0;
let screenHeight = 0;
let isMaxed = false;
let totalQuestions = 0;
let currentQuestionNum = 0;

// Audio context for emergency sounds
let audioContext = null;
let sirenOscillator = null;
let sirenGain = null;
let sirenInterval = null;

// DOM Elements
const topicScreen = document.getElementById('topic-screen');
const loadingScreen = document.getElementById('loading-screen');
const riddleScreen = document.getElementById('riddle-screen');
const resultScreen = document.getElementById('result-screen');
const topicInput = document.getElementById('topic-input');
const countInput = document.getElementById('count-input');
const generateBtn = document.getElementById('generate-btn');
const riddleText = document.getElementById('riddle-text');
const answerInput = document.getElementById('answer-input');
const submitBtn = document.getElementById('submit-btn');
const timerDisplay = document.getElementById('timer-display');
const currentQuestionDisplay = document.getElementById('current-question');
const totalQuestionsDisplay = document.getElementById('total-questions');
const warningMessage = document.getElementById('warning-message');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const restartBtn = document.getElementById('restart-btn');

// Initialize
async function init() {
  // Get screen size
  const screenSize = await window.electronAPI.getScreenSize();
  screenWidth = screenSize.width;
  screenHeight = screenSize.height;

  // Initialize audio context on any user interaction
  document.addEventListener('click', () => {
    initAudio();
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
  }, { once: true });

  // Show topic selection screen
  showScreen('topic');
}

// Generate questions based on topic and count
async function generateQuestions() {
  const topic = topicInput.value.trim();
  const count = parseInt(countInput.value);

  if (!topic) {
    alert('Please enter a topic!');
    return;
  }

  if (count < 1 || count > 20) {
    alert('Please enter a number between 1 and 20!');
    return;
  }

  showScreen('loading');

  try {
    const result = await window.electronAPI.generateQuestions(topic, count);

    if (result.success) {
      totalQuestions = result.totalQuestions;
      currentQuestionNum = 0;
      totalQuestionsDisplay.textContent = totalQuestions;

      // Load first question
      await loadQuestion();
    } else {
      alert('Failed to generate questions: ' + result.error);
      showScreen('topic');
    }
  } catch (error) {
    alert('Error generating questions: ' + error.message);
    showScreen('topic');
  }
}

// Load current question
async function loadQuestion() {
  // Exit fullscreen/kiosk mode if active
  await window.electronAPI.exitFullscreen();

  try {
    const result = await window.electronAPI.getCurrentQuestion();

    if (result.success) {
      currentRiddle = result.question;
      riddleText.textContent = currentRiddle;
      currentQuestionNum = result.currentIndex + 1;
      currentQuestionDisplay.textContent = currentQuestionNum;

      // Reset state
      timeRemaining = 60;
      currentWidth = 400;
      currentHeight = 300;
      isMaxed = false;
      answerInput.value = '';
      warningMessage.classList.add('hidden');
      stopEmergencySound();

      // Show riddle screen and start timer
      showScreen('riddle');
      startTimer();
    } else {
      // No more questions
      showFinalResult();
    }
  } catch (error) {
    alert('Error loading question: ' + error.message);
  }
}

// Show specific screen
function showScreen(screen) {
  topicScreen.classList.add('hidden');
  loadingScreen.classList.add('hidden');
  riddleScreen.classList.add('hidden');
  resultScreen.classList.add('hidden');

  if (screen === 'topic') {
    topicScreen.classList.remove('hidden');
    topicInput.focus();
  } else if (screen === 'loading') {
    loadingScreen.classList.remove('hidden');
  } else if (screen === 'riddle') {
    riddleScreen.classList.remove('hidden');
    answerInput.focus();
  } else if (screen === 'result') {
    resultScreen.classList.remove('hidden');
  }
}

// Initialize audio context
function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
}

// Start emergency siren sound
async function startEmergencySound(urgency = 'low') {
  initAudio();

  // Resume audio context if suspended (required for browser autoplay policies)
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  stopEmergencySound(); // Stop any existing sound

  // Create oscillator for siren
  sirenOscillator = audioContext.createOscillator();
  sirenGain = audioContext.createGain();

  sirenOscillator.connect(sirenGain);
  sirenGain.connect(audioContext.destination);

  // Set frequency based on urgency
  let minFreq, maxFreq, sweepSpeed, volume;

  if (urgency === 'critical') {
    // Very fast, loud, high-pitched alarm
    minFreq = 800;
    maxFreq = 1200;
    sweepSpeed = 100;
    volume = 0.4;
  } else if (urgency === 'high') {
    // Fast alarm
    minFreq = 600;
    maxFreq = 1000;
    sweepSpeed = 150;
    volume = 0.3;
  } else {
    // Gentle warning beep
    minFreq = 400;
    maxFreq = 600;
    sweepSpeed = 300;
    volume = 0.2;
  }

  sirenGain.gain.value = volume;
  sirenOscillator.frequency.value = minFreq;
  sirenOscillator.start();

  // Create sweeping siren effect
  let increasing = true;
  let currentFreq = minFreq;

  sirenInterval = setInterval(() => {
    if (increasing) {
      currentFreq += 50;
      if (currentFreq >= maxFreq) {
        increasing = false;
      }
    } else {
      currentFreq -= 50;
      if (currentFreq <= minFreq) {
        increasing = true;
      }
    }
    if (sirenOscillator) {
      sirenOscillator.frequency.value = currentFreq;
    }
  }, sweepSpeed);
}

// Stop emergency sound
function stopEmergencySound() {
  if (sirenInterval) {
    clearInterval(sirenInterval);
    sirenInterval = null;
  }
  if (sirenOscillator) {
    try {
      sirenOscillator.stop();
    } catch (e) {
      // Already stopped
    }
    sirenOscillator = null;
  }
  if (sirenGain) {
    sirenGain = null;
  }
}

// Start countdown timer
function startTimer() {
  // Clear any existing intervals
  clearInterval(timerInterval);
  clearInterval(resizeInterval);

  timerDisplay.textContent = timeRemaining;

  // Start emergency sound immediately!
  startEmergencySound('low');
  warningMessage.classList.remove('hidden');

  timerInterval = setInterval(() => {
    timeRemaining--;
    timerDisplay.textContent = timeRemaining;

    // Escalate sound urgency as time decreases
    if (timeRemaining === 45) {
      startEmergencySound('low');
    } else if (timeRemaining === 30) {
      startEmergencySound('high');
    } else if (timeRemaining === 15) {
      startEmergencySound('high');
    } else if (timeRemaining === 5) {
      startEmergencySound('critical');
    }

    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      timerDisplay.textContent = '0';
      // Logout the system when time runs out
      window.electronAPI.logoutSystem();
    }
  }, 1000);

  // Start resizing window after a delay
  setTimeout(() => {
    startResizing();
  }, 2000); // Give user 2 seconds before starting to grow
}

// Start resizing the window
function startResizing() {
  resizeInterval = setInterval(async () => {
    if (isMaxed) {
      // Stop growing when maxed out
      clearInterval(resizeInterval);
      return;
    }

    // Increase size by 5% each time (every 1 second)
    const growthFactor = 1.15;
    currentWidth = Math.floor(currentWidth * growthFactor);
    currentHeight = Math.floor(currentHeight * growthFactor);

    const result = await window.electronAPI.resizeWindow(currentWidth, currentHeight);

    if (result.maxed) {
      isMaxed = true;
      clearInterval(resizeInterval);
      // Logout the system when window fills screen
      setTimeout(() => {
        window.electronAPI.logoutSystem();
      }, 2000); // Give 2 seconds warning in fullscreen
    }

    // Update current dimensions to actual size
    currentWidth = result.width;
    currentHeight = result.height;
  }, 1000); // Grow every second
}

// Stop all timers
function stopTimers() {
  clearInterval(timerInterval);
  clearInterval(resizeInterval);
  stopEmergencySound();
}

// Submit answer
async function submitAnswer() {
  const answer = answerInput.value.trim();

  if (!answer) {
    return;
  }

  // Disable input while validating
  submitBtn.disabled = true;
  submitBtn.textContent = 'Checking...';

  try {
    const result = await window.electronAPI.checkAnswer(answer);

    if (result.success) {
      if (result.isCorrect) {
        // Stop timers and show response notification
        stopTimers();

        // Show success notification with response
        const successMsg = document.createElement('div');
        successMsg.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #4CAF50; color: white; padding: 15px 30px; border-radius: 8px; font-weight: bold; z-index: 10000; max-width: 80%; text-align: center;';
        successMsg.textContent = '✓ Correct! ' + result.response;
        document.body.appendChild(successMsg);

        setTimeout(() => {
          successMsg.remove();
          // Load next question or show final result
          if (result.hasMoreQuestions) {
            loadQuestion();
          } else {
            showFinalResult();
          }
        }, 3000);
      } else {
        // If wrong, show error message with response but keep the pressure on!
        answerInput.value = '';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Answer';

        // Show temporary error message with response
        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #f44336; color: white; padding: 15px 30px; border-radius: 8px; font-weight: bold; z-index: 10000; animation: shake 0.5s; max-width: 80%; text-align: center;';
        errorMsg.textContent = '❌ Wrong! ' + result.response;
        document.body.appendChild(errorMsg);

        setTimeout(() => {
          errorMsg.remove();
        }, 3000);

        answerInput.focus();
      }
    } else {
      alert('Error checking answer: ' + result.error);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Answer';
    }
  } catch (error) {
    alert('Error: ' + error.message);
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Answer';
  }
}

// Show final result after all questions
async function showFinalResult() {
  // Exit fullscreen/kiosk mode
  await window.electronAPI.exitFullscreen();

  resultTitle.textContent = '🎉 Quiz Complete!';
  resultTitle.className = 'correct';
  resultMessage.textContent = `You've completed all ${totalQuestions} questions! Great job!`;

  showScreen('result');

  // Re-enable submit button for next round
  submitBtn.disabled = false;
  submitBtn.textContent = 'Submit Answer';
}

// Event listeners
generateBtn.addEventListener('click', generateQuestions);

topicInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    generateQuestions();
  }
});

countInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    generateQuestions();
  }
});

submitBtn.addEventListener('click', submitAnswer);

answerInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    submitAnswer();
  }
});

restartBtn.addEventListener('click', () => {
  showScreen('topic');
});

// Start the app
init();
