const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  generateRiddle: () => ipcRenderer.invoke('generate-riddle'),
  validateAnswer: (riddle, answer) => ipcRenderer.invoke('validate-answer', riddle, answer),
  resizeWindow: (width, height) => ipcRenderer.invoke('resize-window', width, height),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  exitFullscreen: () => ipcRenderer.invoke('exit-fullscreen'),
  logoutSystem: () => ipcRenderer.invoke('logout-system'),
  generateQuestions: (topic, count) => ipcRenderer.invoke('generate-questions', topic, count),
  getCurrentQuestion: () => ipcRenderer.invoke('get-current-question'),
  checkAnswer: (answer) => ipcRenderer.invoke('check-answer', answer)
});
