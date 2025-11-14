const fs = require('fs').promises;

// ============================================
// CONFIGURATION - EDIT THESE VALUES
// ============================================
const ANTHROPIC_API_KEY = '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';
const RESPONSES_FILE = 'claude_responses.json';

// Global variable for joke type
let jokeType = 'rizz';  // Default joke type
let questionCount = 10;  // Default number of questions

// Getter function for joke type
function getJokeType() {
  return jokeType;
}

// Setter function for joke type
function setJokeType(newType) {
  jokeType = newType;
  console.log(`✓ Joke type set to: "${jokeType}"`);
}

// Getter function for question count
function getQuestionCount() {
  return questionCount;
}

// Setter function for question count
function setQuestionCount(count) {
  questionCount = count;
  console.log(`✓ Question count set to: ${questionCount}`);
}

// Function to generate the prompt based on joke type
function generatePrompt() {
  return `Generate ${questionCount} ${jokeType} questions in multiple choice format. 

CRITICAL REQUIREMENTS:
1. The question MUST include all choices on the SAME LINE like this: "Question text? A) choice1 B) choice2 C) choice3 D) choice4"
2. ALL answer choices must be VERY SIMILAR and MISLEADING - make it hard to pick the right one!
3. Use similar words, rhymes, or confusingly close options
4. The correct answer should be short (1-2 words): a name, number, place, or phrase
5. Make the wrong answers almost identical to make users second-guess

Return your response as a JSON array with this exact format:
[
  {
    "question": "Are you a magician? Because whenever I look at you, everyone else disappears. A) Heaven B) Paradise C) Nirvana D) Wonderland",
    "correctAnswer": "A",
    "explanation": "Heaven - Classic rizz line"
  }
]

Example of GOOD misleading choices:
- "What's 9 + 10? A) 19 B) 21 C) 910 D) Nineteen"
- "Best time for dentist? A) 2:30 B) 2:03 C) Tooth-hurty D) 3:20"
- "Capital of confusion? A) Your mind B) My mind C) Our minds D) Their mind"

Make the choices SO SIMILAR that users really have to think! Use wordplay, similar sounds, near-identical meanings, or trick variations.

IMPORTANT: Return ONLY valid JSON, no other text or markdown. The question field must contain the COMPLETE question with all A/B/C/D choices on ONE line.`;
}

// How many times to call the API (if you want multiple sets)
const NUMBER_OF_CALLS = 1;
// ============================================

// Function to call Claude API
async function callClaude(prompt) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 4096,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error Details:', errorData);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

// Function to parse JSON from Claude's response
function parseJSONResponse(responseText) {
  try {
    // Remove markdown code blocks if present
    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/```json\n?/g, '');
    cleanedText = cleanedText.replace(/```\n?/g, '');
    cleanedText = cleanedText.trim();
    
    // Parse the JSON
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    console.error('Raw response:', responseText);
    throw new Error('Response was not valid JSON');
  }
}

// Function to load existing responses
async function loadResponses() {
  try {
    const data = await fs.readFile(RESPONSES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

// Function to save responses
async function saveResponses(responses) {
  await fs.writeFile(
    RESPONSES_FILE, 
    JSON.stringify(responses, null, 2),
    'utf8'
  );
}

// Main function to generate and store response
async function generateAndStore(callNumber) {
  try {
    const prompt = generatePrompt();
    
    console.log(`\n--- Call ${callNumber} ---`);
    console.log(`Generating ${questionCount} ${jokeType} questions...`);
    
    // Call Claude API
    const rawAnswer = await callClaude(prompt);
    
    // Parse the JSON response
    const parsedQuestions = parseJSONResponse(rawAnswer);
    
    console.log(`✓ Received ${parsedQuestions.length} ${jokeType} questions`);
    
    // Load existing responses
    const allResponses = await loadResponses();
    
    // Add new entry with both raw and parsed data
    const newEntry = {
      id: allResponses.length + 1,
      jokeType: jokeType,
      prompt: prompt,
      rawResponse: rawAnswer,
      questions: parsedQuestions,
      model: 'claude-3-5-haiku-20241022',
      timestamp: new Date().toISOString()
    };
    
    allResponses.push(newEntry);
    
    // Save to file
    await saveResponses(allResponses);
    
    console.log('✓ Response saved successfully!');
    
    // Display the questions
    console.log(`\n${jokeType.toUpperCase()} QUESTIONS:\n`);
    parsedQuestions.forEach((item, index) => {
      console.log(`${index + 1}. ${item.question}`);
      console.log(`   ✓ Answer: ${item.correctAnswer}${item.explanation ? ' - ' + item.explanation : ''}\n`);
    });
    
    return parsedQuestions;
  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Run the script
(async () => {
  console.log('🎭 Starting multiple choice question generation...');
  console.log(`Current joke type: "${getJokeType()}"`);
  console.log(`Question count: ${getQuestionCount()}`);
  
  // ============================================
  // CHANGE SETTINGS HERE:
  // ============================================
  // setJokeType('rizz');           // Pick-up lines
  // setJokeType('dad joke');       // Classic dad jokes
  // setJokeType('programming');    // Tech/coding jokes
  // setJokeType('pun');            // Puns
  // setJokeType('trivia');         // General trivia
  // setJokeType('meme');           // Internet meme questions
  // setJokeType('movie');          // Movie quotes/trivia
  // setJokeType('brain teaser');   // Tricky questions
  
  // setQuestionCount(15);          // Change number of questions
  
  // Uncomment to change settings:
  // setJokeType('programming');
  // setQuestionCount(5);
  
  console.log('Number of API calls:', NUMBER_OF_CALLS);
  
  for (let i = 1; i <= NUMBER_OF_CALLS; i++) {
    await generateAndStore(i);
    
    // Add delay between requests if making multiple calls
    if (i < NUMBER_OF_CALLS) {
      console.log('\nWaiting 1 second before next call...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log('\n✓ All done! Check claude_responses.json for results.');
})();