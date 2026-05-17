const fs = require('fs');

function run() {
  try {
    const data = fs.readFileSync('MERGED_QUESTIONS_POPULATION.sql', 'utf8');
    
    // Let's parse each question row
    // The pattern is: ('SUBJECT', 'LEVEL', 'DIFFICULTY', 'TOPIC', ...
    const lines = data.split('\n');
    const questions = [];
    
    let inStatement = false;
    for (let line of lines) {
      line = line.trim();
      if (line.startsWith('INSERT INTO question_bank')) {
        inStatement = true;
      } else if (inStatement) {
        if (line.startsWith('(') && (line.includes("'ENGLISH'") || line.includes("'MATHEMATICS'"))) {
          // Parse a single question row
          // Let's extract values
          // Clean ending comma or semicolon
          const cleanLine = line.replace(/,$/, '').replace(/;$/, '');
          questions.push(cleanLine);
        }
        if (line.endsWith(';')) {
          inStatement = false;
        }
      }
    }
    
    console.log('Total questions parsed:', questions.length);
    
    // Find exact duplicates
    const uniqueSet = new Set();
    const duplicates = [];
    
    for (const q of questions) {
      // Extract key fields: subject, level, difficulty_level, topic, question
      // A quick way is parsing the quote tokens
      const tokens = [];
      let currentToken = '';
      let inQuotes = false;
      let escape = false;
      
      for (let i = 0; i < q.length; i++) {
        const char = q[i];
        if (char === "'" && !escape) {
          inQuotes = !inQuotes;
        } else if (char === '\\' && !escape) {
          escape = true;
        } else if (inQuotes) {
          currentToken += char;
          escape = false;
        } else if (char === ',' && !inQuotes) {
          tokens.push(currentToken.trim());
          currentToken = '';
        }
      }
      tokens.push(currentToken.trim());
      
      const subject = tokens[0];
      const level = tokens[1];
      const difficulty = tokens[2];
      const topic = tokens[3];
      const question = tokens[5]; // topic is 3, subtopic is 4, question is 5
      
      const key = `${subject} | ${level} | ${difficulty} | ${topic} | ${question}`;
      if (uniqueSet.has(key)) {
        duplicates.push({ key, line: q.substring(0, 100) });
      } else {
        uniqueSet.add(key);
      }
    }
    
    console.log('Number of unique questions:', uniqueSet.size);
    console.log('Number of duplicate questions found in SQL file:', duplicates.length);
    if (duplicates.length > 0) {
      console.log('Duplicate examples:', duplicates);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
