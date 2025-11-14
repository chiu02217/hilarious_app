const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');

let mainWindow = null;
let quizWindow = null;
let popupTimer = null;

// Configuration
const CONFIG = {
  minPopupInterval: 10000, // 10 seconds for testing (change to longer in production)
  maxPopupInterval: 10000, // 10 seconds for testing
  questionTimeLimit: 30, // 30 seconds to answer
  claudeApiKey: process.env.CLAUDE_API_KEY || '' // Set via environment variable
};

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 400,
    height: 200,
    show: false, // Hidden background process
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('background.html');

  // Start the random popup scheduler
  scheduleNextPopup();
}

function scheduleNextPopup() {
  const delay = Math.random() * (CONFIG.maxPopupInterval - CONFIG.minPopupInterval) + CONFIG.minPopupInterval;

  console.log(`Next popup scheduled in ${Math.round(delay / 1000)} seconds`);

  popupTimer = setTimeout(() => {
    showQuizPopup();
  }, delay);
}

async function generateQuestion() {
  if (!CONFIG.claudeApiKey) {
    // Fallback questions if no API key
    const fallbackQuestions = [
      "What is the capital of France?",
      "How many planets are in our solar system?",
      "What year did World War II end?",
      "What is 15 × 7?",
      "Who painted the Mona Lisa?"
    ];
    return fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
  }

  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: 'Generate a single random trivia question. Only output the question, nothing else.'
      }]
    }, {
      headers: {
        'x-api-key': CONFIG.claudeApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    return response.data.content[0].text.trim();
  } catch (error) {
    console.error('Error generating question:', error.message);
    return "What is 2 + 2?"; // Fallback
  }
}

async function showQuizPopup() {
  if (quizWindow) {
    quizWindow.close();
  }

  const question = await generateQuestion();

  quizWindow = new BrowserWindow({
    width: 600,
    height: 400,
    alwaysOnTop: true,
    frame: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  quizWindow.loadFile('quiz.html');

  // Send question when window is ready
  quizWindow.webContents.on('did-finish-load', () => {
    quizWindow.webContents.send('start-quiz', {
      question: question,
      timeLimit: CONFIG.questionTimeLimit
    });
  });

  quizWindow.on('closed', () => {
    quizWindow = null;
    // Schedule next popup
    scheduleNextPopup();
  });
}

// IPC Handlers
ipcMain.on('answer-submitted', (event, answer) => {
  console.log('User answered:', answer);
  if (quizWindow) {
    quizWindow.close();
  }
});

ipcMain.on('time-expired', () => {
  console.log('Time expired - locking screen!');
  if (quizWindow) {
    quizWindow.setFullScreen(true);
    quizWindow.setAlwaysOnTop(true, 'screen-saver');
    quizWindow.setSkipTaskbar(true);
    quizWindow.setClosable(false);
    quizWindow.setMinimizable(false);

    // Prevent window from losing focus
    quizWindow.setFocusable(true);
    quizWindow.focus();

    // Disable menu bar on macOS
    if (process.platform === 'darwin') {
      quizWindow.setAutoHideMenuBar(true);
      quizWindow.setMenuBarVisibility(false);
    }
  }
});

ipcMain.on('unlock-screen', () => {
  console.log('User pressed ESC - unlocking!');
  if (quizWindow) {
    quizWindow.close();
  }
});

ipcMain.on('trigger-popup-now', () => {
  // For testing - trigger popup immediately
  if (popupTimer) {
    clearTimeout(popupTimer);
  }
  showQuizPopup();
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
