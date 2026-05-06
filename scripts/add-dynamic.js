const fs = require('fs');
const path = require('path');

const dirs = [
  'accountant', 'admin', 'parent', 'student', 'teacher'
];

function addDynamicExport(dir) {
  const dirPath = path.join(__dirname, 'src/app', dir);
  if (!fs.existsSync(dirPath)) return;
  
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const item of items) {
    if (!item.isDirectory()) continue;
    const pagePath = path.join(dirPath, item.name, 'page.tsx');
    if (!fs.existsSync(pagePath)) continue;
    
    let content = fs.readFileSync(pagePath, 'utf8');
    if (!content.startsWith("'use client'")) continue;
    if (content.includes("export const dynamic")) {
      console.log(`Already has dynamic: ${item.name}`);
      continue;
    }
    
    // Insert after 'use client'
    const newContent = content.replace(
      "'use client';",
      "'use client';\n\nexport const dynamic = 'force-dynamic';"
    );
    fs.writeFileSync(pagePath, newContent);
    console.log(`Added to ${item.name}`);
  }
}

dirs.forEach(addDynamicExport);
console.log('Done!');