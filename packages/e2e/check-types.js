// Simple script to check TypeScript files for syntax errors
const fs = require('fs');
const path = require('path');

const testDir = path.join(__dirname, 'tests');

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const errors = [];

  // Check for basic syntax issues
  lines.forEach((line, index) => {
    // Check for test.skip(true) pattern which is wrong
    if (line.includes('test.skip(true') && !line.includes('//')) {
      errors.push(`Line ${index + 1}: Found test.skip(true) which may be redundant`);
    }
  });

  return errors;
}

function scanDirectory(dir) {
  const files = fs.readdirSync(dir);
  let allErrors = [];

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      allErrors = allErrors.concat(scanDirectory(filePath));
    } else if (file.endsWith('.spec.ts') || file.endsWith('.ts')) {
      const errors = checkFile(filePath);
      if (errors.length > 0) {
        allErrors.push(`\n${filePath}:`);
        allErrors = allErrors.concat(errors.map(e => `  ${e}`));
      }
    }
  });

  return allErrors;
}

console.log('Checking TypeScript files for common issues...\n');
const errors = scanDirectory(testDir);

if (errors.length === 0) {
  console.log('No obvious issues found in test files.');
} else {
  console.log('Potential issues found:');
  console.log(errors.join('\n'));
}
