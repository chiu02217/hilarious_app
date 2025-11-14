const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { regenerateQuestions, getQuestionsByEntryId } = require('./utility.js');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Quiz state
let currentQuestions = [];
let currentQuestionIndex = 0;

let mainWindow;
const INITIAL_WIDTH = 400;
const INITIAL_HEIGHT = 300;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: INITIAL_WIDTH,
    height: INITIAL_HEIGHT,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    resizable: false,
    alwaysOnTop: true,
    frame: true,
  });

  mainWindow.loadFile('index.html');

  // Center the window on screen
  mainWindow.center();

  // Prevent window from being closed
  mainWindow.on('close', (event) => {
    event.preventDefault();
    // Window cannot be closed - must answer the riddle!
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Generate a riddle using Claude API
ipcMain.handle('generate-riddle', async () => {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: 'Generate a single riddle. Only output the riddle question, nothing else. Make it fun and moderately challenging. Examples: "What has keys but no locks, space but no room, and you can enter but not go inside?" or "I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?"'
      }]
    });

    const riddle = message.content[0].text.trim();
    return { success: true, riddle };
  } catch (error) {
    console.error('Error generating riddle:', error);
    return { success: false, error: error.message };
  }
});

// Validate answer using Claude API
ipcMain.handle('validate-answer', async (event, riddle, answer) => {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Riddle: "${riddle}"\n\nUser's answer: "${answer}"\n\nIs this answer correct or acceptable for the riddle? Respond with just "CORRECT" if the answer is right (or close enough/a valid interpretation), or "INCORRECT: [brief explanation]" if wrong. Be somewhat lenient with creative but reasonable answers.`
      }]
    });

    const response = message.content[0].text.trim();
    const isCorrect = response.startsWith('CORRECT');

    return {
      success: true,
      isCorrect,
      explanation: isCorrect ? 'Correct!' : response.replace('INCORRECT: ', '')
    };
  } catch (error) {
    console.error('Error validating answer:', error);
    return { success: false, error: error.message };
  }
});

// Resize window
ipcMain.handle('resize-window', async (event, newWidth, newHeight) => {
  if (mainWindow) {
    const display = require('electron').screen.getPrimaryDisplay();
    const screenWidth = display.workArea.width;
    const screenHeight = display.workArea.height;

    // Cap at screen size
    const finalWidth = Math.min(newWidth, screenWidth);
    const finalHeight = Math.min(newHeight, screenHeight);

    const isMaxed = finalWidth >= screenWidth || finalHeight >= screenHeight;

    if (isMaxed) {
      // Go fullscreen and enable kiosk mode to lock the screen
      mainWindow.setKiosk(true);
      mainWindow.setFullScreen(true);
    } else {
      mainWindow.setSize(finalWidth, finalHeight);
      mainWindow.center();
    }

    return { width: finalWidth, height: finalHeight, maxed: isMaxed };
  }
});

// Exit fullscreen/kiosk mode
ipcMain.handle('exit-fullscreen', async () => {
  if (mainWindow) {
    mainWindow.setKiosk(false);
    mainWindow.setFullScreen(false);
    mainWindow.setSize(INITIAL_WIDTH, INITIAL_HEIGHT);
    mainWindow.center();
  }
});

// Get screen dimensions
ipcMain.handle('get-screen-size', async () => {
  const display = require('electron').screen.getPrimaryDisplay();
  return {
    width: display.workArea.width,
    height: display.workArea.height
  };
});

// Logout the system
ipcMain.handle('logout-system', async () => {
  let command;

  if (process.platform === 'darwin') {
    // macOS - force immediate logout without confirmation
    command = 'launchctl bootout user/$(id -u)';
  } else if (process.platform === 'win32') {
    // Windows - force immediate logout
    command = 'shutdown /l /f';
  } else {
    // Linux - force immediate logout
    command = 'loginctl terminate-user $USER || pkill -KILL -u $(whoami)';
  }

  exec(command, (error) => {
    if (error) {
      console.error('Logout failed:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  });

  return { success: true };
});

// Generate questions for a topic
ipcMain.handle('generate-questions', async (event, topic, count) => {
  try {
    console.log(`Generating ${count} questions for topic: ${topic}`);
    const entry = await regenerateQuestions(topic, count);

    // Store the questions for this session
    currentQuestions = entry.questions;
    currentQuestionIndex = 0;

    return {
      success: true,
      entryId: entry.id,
      totalQuestions: currentQuestions.length
    };
  } catch (error) {
    console.error('Error generating questions:', error);
    return { success: false, error: error.message };
  }
});

// Get current question
ipcMain.handle('get-current-question', async () => {
  try {
    if (currentQuestionIndex >= currentQuestions.length) {
      return { success: false, error: 'No more questions' };
    }

    const question = currentQuestions[currentQuestionIndex];
    return {
      success: true,
      question: question.question,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      currentIndex: currentQuestionIndex,
      totalQuestions: currentQuestions.length
    };
  } catch (error) {
    console.error('Error getting question:', error);
    return { success: false, error: error.message };
  }
});

// Check answer and get response
ipcMain.handle('check-answer', async (event, userAnswer) => {
  try {
    if (currentQuestionIndex >= currentQuestions.length) {
      return { success: false, error: 'No active question' };
    }

    const question = currentQuestions[currentQuestionIndex];
    const isCorrect = question.correctAnswer.toUpperCase() === userAnswer.toUpperCase();

    // Move to next question only if correct
    if (isCorrect) {
      currentQuestionIndex++;
    }

    return {
      success: true,
      isCorrect,
      response: question.explanation,
      hasMoreQuestions: currentQuestionIndex < currentQuestions.length
    };
  } catch (error) {
    console.error('Error checking answer:', error);
    return { success: false, error: error.message };
  }
});
