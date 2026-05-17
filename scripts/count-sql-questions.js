const fs = require('fs');

async function run() {
  try {
    const data = fs.readFileSync('MERGED_QUESTIONS_POPULATION.sql', 'utf8');
    
    // Let's count occurrences of values groups
    // The format is ('ENGLISH', 'JSS1', ...
    const matches = data.match(/\(\s*'(ENGLISH|MATHEMATICS)'/g);
    console.log('Number of question inserts found in MERGED_QUESTIONS_POPULATION.sql:', matches ? matches.length : 0);
  } catch (err) {
    console.error('Error reading file:', err);
  }
}

run();
