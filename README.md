# Hilarious Riddle App

A fun Electron desktop application that challenges you with AI-generated riddles. Answer quickly or watch the window grow!

## Features

- AI-generated riddles powered by Claude Sonnet 4.5
- 60-second countdown timer
- Window grows progressively if you don't answer (15% per second)
- **Fullscreen kiosk mode** locks your screen when window reaches max size
- **System logout** when time runs out or 2 seconds after fullscreen
- **Escalating emergency sounds** at 30s, 15s, and 5s remaining
- **Wrong answers keep the pressure on** - no stopping until you get it right!
- AI-powered answer validation with lenient checking
- Beautiful gradient UI with shake animations

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file from the example:
```bash
cp .env.example .env
```

3. Add your Anthropic API key to `.env`:
```
ANTHROPIC_API_KEY=your_api_key_here
```

Get your API key from: https://console.anthropic.com/

## Running the App

```bash
npm start
```

## How It Works

1. The app launches and generates a riddle using Claude AI
2. You have 60 seconds to solve it
3. After 2 seconds, the window starts growing by 15% every second
4. At 30 seconds, emergency sounds begin (escalating at 15s and 5s)
5. When the window fills your screen, it locks in fullscreen kiosk mode
6. **2 seconds after fullscreen OR when timer hits 0: YOUR SYSTEM LOGS OUT!**
7. Submit your answer:
   - **Correct answer**: Exits fullscreen, shows success, you can try another riddle
   - **Wrong answer**: Shows error message, but everything continues - no mercy!
8. Only a correct answer will save you from logout

**⚠️ SERIOUS WARNING:**
- This app will **LOG YOU OUT of your computer** if you don't answer correctly in time
- Wrong answers don't help - the timer keeps running!
- Only way to exit safely: answer the riddle correctly or force-quit the app (Cmd+Q on Mac, Alt+F4 on Windows)
- Use at your own risk - save your work before running!

## Technology Stack

- **Electron** - Desktop application framework
- **Claude API** - AI-powered riddle generation and validation
- **Node.js** - Runtime environment
