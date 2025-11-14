# Hilarious Obama Quiz App

A desktop application that randomly pops up on your screen, asks you a trivia question, and slowly morphs into Obama while you're answering. If you don't answer in time, it locks you in fullscreen Obama mode!

## Features

- Random popup scheduler (configurable intervals)
- 30-second countdown timer per question
- Progressive Obama image morphing effect using canvas pixel manipulation
- Fullscreen lock when time expires
- Claude API integration for dynamic question generation
- Fallback questions if no API key is provided

## Setup

1. Install dependencies:
```bash
npm install
```

2. (Optional) Set up Claude API for dynamic questions:
```bash
export CLAUDE_API_KEY="your-api-key-here"
```

If you don't set an API key, the app will use fallback trivia questions.

## Running the App

```bash
npm start
```

For testing with a visible background window:
```bash
npm run dev
```

## How It Works

1. The app runs in the background
2. At random intervals (30 sec - 2 min by default), a popup window appears
3. You have 30 seconds to answer the question
4. While the timer counts down, the window gradually morphs into Obama using a grid-based pixel remapping effect
5. If you answer in time, the window closes and another popup is scheduled
6. If time runs out, the window goes fullscreen and becomes locked in Obama mode

## Configuration

Edit the `CONFIG` object in [main.js](main.js) to customize:

- `minPopupInterval`: Minimum time between popups (ms)
- `maxPopupInterval`: Maximum time between popups (ms)
- `questionTimeLimit`: Time to answer each question (seconds)

## Testing

The background window (visible in dev mode) has a "Trigger Popup Now" button to test the popup immediately without waiting.

## Files

- [main.js](main.js) - Main Electron process, handles scheduling and window management
- [quiz.html](quiz.html) - Quiz popup window UI
- [quiz.js](quiz.js) - Quiz logic, timer, and Obama morphing effect
- [background.html](background.html) - Hidden background process window
- [obama.jpg](obama.jpg) - Obama portrait for morphing effect

## The Morphing Effect

The Obama morphing effect works by:
1. Dividing the canvas into a grid of cells
2. As time progresses, randomly selecting cells to fill with portions of Obama's image
3. Gradually increasing opacity and coverage until full Obama takeover
4. When locked, displaying a pulsing full-screen Obama image

Inspired by [obamify](https://github.com/Spu7Nix/obamify) but implemented with HTML5 Canvas for simplicity.

## Notes

- The app is currently set to short intervals for testing
- For production use, increase the popup intervals in the CONFIG
- On macOS, you may need to grant accessibility permissions for fullscreen lock to work properly
