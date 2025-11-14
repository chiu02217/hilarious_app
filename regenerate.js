const { regenerateQuestions } = require('./utility.js');

(async () => {
  // Change these values:
  const jokeType = 'rizz';
  const count = 10;
  
  await regenerateQuestions(jokeType, count);
})();