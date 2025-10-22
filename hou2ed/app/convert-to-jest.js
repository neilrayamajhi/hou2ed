#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all test files
const testFiles = glob.sync('src/**/*.{spec,test}.{ts,tsx}');

console.log(`Found ${testFiles.length} test files to convert`);

testFiles.forEach((file) => {
  console.log(`Converting ${file}...`);
  let content = fs.readFileSync(file, 'utf8');

  // Skip if already converted
  if (!content.includes('vitest')) {
    console.log(`  Skipping - no vitest imports found`);
    return;
  }

  // Remove vitest imports
  content = content.replace(
    /import\s+{[^}]*}\s+from\s+['"]vitest['"];?\n?/g,
    ''
  );

  // Replace vi. with jest.
  content = content.replace(/\bvi\./g, 'jest.');

  // Replace vi.mocked with type cast
  content = content.replace(/jest\.mocked\(([^)]+)\)/g, '($1 as jest.Mock)');

  // Remove fast-check import if not used (optional)
  if (!content.includes('fc.')) {
    content = content.replace(/import\s+fc\s+from\s+['"]fast-check['"];?\n?/g, '');
  }

  fs.writeFileSync(file, content);
  console.log(`  Converted!`);
});

console.log('Done!');