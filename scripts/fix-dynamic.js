const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, 'src', 'app');
const roles = ['accountant', 'admin', 'parent', 'student', 'teacher'];

for (const role of roles) {
  const roleDir = path.join(baseDir, role);
  if (!fs.existsSync(roleDir)) continue;
  
  const entries = fs.readdirSync(roleDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    
    const pageFile = path.join(roleDir, entry.name, 'page.tsx');
    if (!fs.existsSync(pageFile)) continue;
    
    let content = fs.readFileSync(pageFile, 'utf8');
    
    // Only add to 'use client' files
    if (!content.startsWith("'use client';")) continue;
    if (content.includes("export const dynamic")) {
      console.log(`Skipped (has dynamic): ${role}/${entry.name}`);
      continue;
    }
    
    // Add dynamic export after 'use client';
    content = content.replace(
      "'use client';",
      "'use client';\n\nexport const dynamic = 'force-dynamic';"
    );
    
    fs.writeFileSync(pageFile, content);
    console.log(`Added dynamic: ${role}/${entry.name}`);
  }
}

console.log('Done!');