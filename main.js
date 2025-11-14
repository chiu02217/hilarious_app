const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');
require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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
    // macOS
    command = 'osascript -e \'tell application "System Events" to log out\'';
  } else if (process.platform === 'win32') {
    // Windows
    command = 'shutdown /l';
  } else {
    // Linux
    command = 'gnome-session-quit --logout --no-prompt || loginctl terminate-user $USER';
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
