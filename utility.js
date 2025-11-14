const fs = require('fs').promises;

// ============================================
// CONFIGURATION
// ============================================
const RESPONSES_FILE = 'claude_responses.json';
const ANTHROPIC_API_KEY = '';

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Load all data from the JSON file
 */
async function loadAllData() {
  try {
    const data = await fs.readFile(RESPONSES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading data:', error.message);
    return [];
  }
}

/**
 * Get all entries
 */
async function getAllEntries() {
  const data = await loadAllData();
  return data;
}

/**
 * Get entry by ID
 */
async function getEntryById(id) {
  const data = await loadAllData();
  return data.find(entry => entry.id === id) || null;
}

/**
 * Get all questions from a specific entry
 */
async function getQuestionsByEntryId(id) {
  const entry = await getEntryById(id);
  return entry ? entry.questions : [];
}

/**
 * Get all questions from all entries
 */
async function getAllQuestions() {
  const data = await loadAllData();
  const allQuestions = [];
  
  data.forEach(entry => {
    entry.questions.forEach(q => {
      allQuestions.push({
        entryId: entry.id,
        jokeType: entry.jokeType,
        ...q
      });
    });
  });
  
  return allQuestions;
}

/**
 * Get a random question from all entries
 */
async function getRandomQuestion() {
  const questions = await getAllQuestions();
  if (questions.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * questions.length);
  return questions[randomIndex];
}

/**
 * Get questions by joke type
 */
async function getQuestionsByType(jokeType) {
  const data = await loadAllData();
  const questions = [];
  
  data.forEach(entry => {
    if (entry.jokeType.toLowerCase() === jokeType.toLowerCase()) {
      entry.questions.forEach(q => {
        questions.push({
          entryId: entry.id,
          jokeType: entry.jokeType,
          ...q
        });
      });
    }
  });
  
  return questions;
}

/**
 * Get a specific question by entry ID and question index
 */
async function getQuestionByIndex(entryId, questionIndex) {
  const entry = await getEntryById(entryId);
  if (!entry || !entry.questions[questionIndex]) return null;
  
  return {
    entryId: entry.id,
    jokeType: entry.jokeType,
    ...entry.questions[questionIndex]
  };
}

/**
 * Get only the question text (without choices) - extracts before the first "A)"
 */
function extractQuestionText(fullQuestion) {
  const match = fullQuestion.match(/^(.*?)\s*A\)/);
  return match ? match[1].trim() : fullQuestion;
}

/**
 * Get only the choices from a question
 */
function extractChoices(fullQuestion) {
  const choices = {
    A: null,
    B: null,
    C: null,
    D: null
  };
  
  const aMatch = fullQuestion.match(/A\)\s*([^B]*?)(?=\s*B\)|$)/);
  const bMatch = fullQuestion.match(/B\)\s*([^C]*?)(?=\s*C\)|$)/);
  const cMatch = fullQuestion.match(/C\)\s*([^D]*?)(?=\s*D\)|$)/);
  const dMatch = fullQuestion.match(/D\)\s*(.*?)$/);
  
  if (aMatch) choices.A = aMatch[1].trim();
  if (bMatch) choices.B = bMatch[1].trim();
  if (cMatch) choices.C = cMatch[1].trim();
  if (dMatch) choices.D = dMatch[1].trim();
  
  return choices;
}

/**
 * Format a question for display
 */
function formatQuestionForDisplay(questionObj) {
  return `
Question: ${questionObj.question}
Correct Answer: ${questionObj.correctAnswer}
${questionObj.explanation ? 'Explanation: ' + questionObj.explanation : ''}
`.trim();
}

/**
 * Format a question for quiz (without answer)
 */
function formatQuestionForQuiz(questionObj) {
  return questionObj.question;
}

/**
 * Check if an answer is correct
 */
function checkAnswer(questionObj, userAnswer) {
  return questionObj.correctAnswer.toUpperCase() === userAnswer.toUpperCase();
}

/**
 * Get statistics about the data
 */
async function getStatistics() {
  const data = await loadAllData();
  
  let totalQuestions = 0;
  const jokeTypes = {};
  
  data.forEach(entry => {
    totalQuestions += entry.questions.length;
    
    if (jokeTypes[entry.jokeType]) {
      jokeTypes[entry.jokeType]++;
    } else {
      jokeTypes[entry.jokeType] = 1;
    }
  });
  
  return {
    totalEntries: data.length,
    totalQuestions: totalQuestions,
    jokeTypes: jokeTypes,
    latestEntry: data.length > 0 ? data[data.length - 1] : null
  };
}

/**
 * Export questions to a simple text format
 */
async function exportToText(outputFile = 'questions_export.txt') {
  const questions = await getAllQuestions();
  
  let textContent = 'EXPORTED QUESTIONS\n';
  textContent += '==================\n\n';
  
  questions.forEach((q, index) => {
    textContent += `${index + 1}. ${q.question}\n`;
    textContent += `   Answer: ${q.correctAnswer}\n`;
    if (q.explanation) {
      textContent += `   ${q.explanation}\n`;
    }
    textContent += `   Type: ${q.jokeType}\n\n`;
  });
  
  await fs.writeFile(outputFile, textContent, 'utf8');
  console.log(`✓ Exported to ${outputFile}`);
  return textContent;
}

// ============================================
// REGENERATE FUNCTION
// ============================================

/**
 * Generate prompt based on joke type and count
 */
function generatePrompt(jokeType, count) {
  return `Generate ${count} ${jokeType} questions in multiple choice format. 

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

/**
 * Call Claude API
 */
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

/**
 * Parse JSON from Claude's response
 */
function parseJSONResponse(responseText) {
  try {
    let cleanedText = responseText.trim();
    cleanedText = cleanedText.replace(/```json\n?/g, '');
    cleanedText = cleanedText.replace(/```\n?/g, '');
    cleanedText = cleanedText.trim();
    
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error('Failed to parse JSON response:', error);
    console.error('Raw response:', responseText);
    throw new Error('Response was not valid JSON');
  }
}

/**
 * Save responses to file
 */
async function saveResponses(responses) {
  await fs.writeFile(
    RESPONSES_FILE, 
    JSON.stringify(responses, null, 2),
    'utf8'
  );
}

/**
 * Regenerate questions with specified joke type and count
 * @param {string} jokeType - Type of joke (e.g., 'rizz', 'dad joke', 'programming')
 * @param {number} count - Number of questions to generate (default: 10)
 * @returns {Object} The newly created entry with questions
 */
async function regenerateQuestions(jokeType, count = 10) {
  try {
    console.log(`\n🔄 Regenerating ${count} ${jokeType} questions...`);
    
    // Generate prompt
    const prompt = generatePrompt(jokeType, count);
    
    // Call Claude API
    console.log('⏳ Calling Claude API...');
    const rawAnswer = await callClaude(prompt);
    
    // Parse response
    console.log('📝 Parsing response...');
    const parsedQuestions = parseJSONResponse(rawAnswer);
    
    console.log(`✓ Received ${parsedQuestions.length} questions`);
    
    // Load existing responses
    const allResponses = await loadAllData();
    
    // Create new entry
    const newEntry = {
      id: allResponses.length + 1,
      jokeType: jokeType,
      prompt: prompt,
      rawResponse: rawAnswer,
      questions: parsedQuestions,
      model: 'claude-3-5-haiku-20241022',
      timestamp: new Date().toISOString()
    };
    
    // Add to responses
    allResponses.push(newEntry);
    
    // Save to file
    await saveResponses(allResponses);
    
    console.log('✓ Questions saved successfully!');
    
    // Display the questions
    console.log(`\n${jokeType.toUpperCase()} QUESTIONS:\n`);
    parsedQuestions.forEach((item, index) => {
      console.log(`${index + 1}. ${item.question}`);
      console.log(`   ✓ Answer: ${item.correctAnswer}${item.explanation ? ' - ' + item.explanation : ''}\n`);
    });
    
    return newEntry;
  } catch (error) {
    console.error('❌ Error regenerating questions:', error.message);
    throw error;
  }
}

// ============================================
// EXAMPLE USAGE
// ============================================

async function main() {
  console.log('=== Question Utility Demo ===\n');
  
  // Get statistics
  console.log('📊 Statistics:');
  const stats = await getStatistics();
  console.log(JSON.stringify(stats, null, 2));
  console.log('\n---\n');
  
  // Get all questions
  console.log('📝 All Questions:');
  const allQuestions = await getAllQuestions();
  console.log(`Total questions: ${allQuestions.length}\n`);
  
  // Get a random question
  console.log('🎲 Random Question:');
  const randomQ = await getRandomQuestion();
  if (randomQ) {
    console.log(formatQuestionForDisplay(randomQ));
    console.log('\n---\n');
  }
  
  // Get questions from entry 1
  console.log('📋 Questions from Entry 1:');
  const entry1Questions = await getQuestionsByEntryId(1);
  entry1Questions.slice(0, 3).forEach((q, i) => {
    console.log(`\n${i + 1}. ${formatQuestionForQuiz(q)}`);
  });
  console.log('\n---\n');
  
  // Extract components from a question
  console.log('🔍 Extracting Components:');
  if (allQuestions.length > 0) {
    const sampleQ = allQuestions[0];
    console.log('Full question:', sampleQ.question);
    console.log('\nQuestion text only:', extractQuestionText(sampleQ.question));
    console.log('\nChoices:', JSON.stringify(extractChoices(sampleQ.question), null, 2));
    console.log('\nCorrect answer:', sampleQ.correctAnswer);
  }
  console.log('\n---\n');
  
  // Test answer checking
  console.log('✅ Testing Answer Check:');
  if (allQuestions.length > 0) {
    const testQ = allQuestions[0];
    console.log('Question:', extractQuestionText(testQ.question));
    console.log('Correct answer:', testQ.correctAnswer);
    console.log('Testing "A":', checkAnswer(testQ, 'A') ? '✓ Correct' : '✗ Wrong');
    console.log('Testing correct answer:', checkAnswer(testQ, testQ.correctAnswer) ? '✓ Correct' : '✗ Wrong');
  }
  
  // Regenerate questions example
  console.log('\n---\n');
  console.log('🔄 REGENERATE EXAMPLE:');
  console.log('Uncomment the line below to regenerate questions');
  // await regenerateQuestions('programming', 5);
  
  // Export to text file
  console.log('\n---\n');
  console.log('💾 Exporting to text file...');
  await exportToText();
}

// Run the demo
if (require.main === module) {
  main().catch(console.error);
}

// ============================================
// EXPORTS
// ============================================
module.exports = {
  loadAllData,
  getAllEntries,
  getEntryById,
  getQuestionsByEntryId,
  getAllQuestions,
  getRandomQuestion,
  getQuestionsByType,
  getQuestionByIndex,
  extractQuestionText,
  extractChoices,
  formatQuestionForDisplay,
  formatQuestionForQuiz,
  checkAnswer,
  getStatistics,
  exportToText,
  regenerateQuestions
};