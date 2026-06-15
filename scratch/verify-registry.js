const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, '../templates');
const registryPath = path.join(templatesDir, 'skills/REGISTRY.md');

if (!fs.existsSync(registryPath)) {
  console.error(`Registry file not found at ${registryPath}`);
  process.exit(1);
}

const registryContent = fs.readFileSync(registryPath, 'utf8');

// Regex to find paths: - Path: `skills/...`
const pathRegex = /-\s+Path:\s+`([^`]+)`/g;
let match;
let missingFiles = 0;
let checkedCount = 0;

console.log('--- Starting Registry Paths Validation ---');

while ((match = pathRegex.exec(registryContent)) !== null) {
  const relativePath = match[1];
  const fullPath = path.join(templatesDir, relativePath);
  checkedCount++;

  if (fs.existsSync(fullPath)) {
    console.log(`[OK] Path verified: ${relativePath}`);
  } else {
    console.error(`[ERROR] File missing: ${relativePath} (Full path: ${fullPath})`);
    missingFiles++;
  }
}

console.log('------------------------------------------');
console.log(`Validation completed.`);
console.log(`Total checked: ${checkedCount}`);
console.log(`Missing files: ${missingFiles}`);

if (missingFiles > 0) {
  process.exit(1);
} else {
  console.log('STATUS: SUCCESS (100% path match)');
  process.exit(0);
}
