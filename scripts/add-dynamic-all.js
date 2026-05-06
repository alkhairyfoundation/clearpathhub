const fs = require('fs');
const glob = require('glob');

const pages = glob.sync('src/app/{teacher,student,admin,parent,accountant}/**/page.tsx');

for (const page of pages) {
  if (!fs.existsSync(page)) continue;
  
  let content = fs.readFileSync(page, 'utf8');
  
  // Only add to 'use client' files without dynamic
  if (!content.startsWith("'use client';")) continue;
  if (content.includes("export const dynamic")) {
    console.log(`Skipped: ${page}`);
    continue;
  }
  
  // Add dynamic export after 'use client';
  content = content.replace(
    "'use client';",
    "'use client';\n\nexport const dynamic = 'force-dynamic';"
  );
  
  fs.writeFileSync(page, content);
  console.log(`Updated: ${page}`);
}

console.log('Done!');