#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

let totalLines = 0;
let totalFiles = 0;
const results = [];

const rootDir = process.argv[2] || '.';

// Carga líneas del .gitignore
let ignoredPaths = [];
const gitignorePath = path.join(rootDir, '.gitignore');
if (fs.existsSync(gitignorePath)) {
  const lines = fs.readFileSync(gitignorePath, 'utf8').split('\n');
  ignoredPaths = lines
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(pattern => pattern.replace(/\/$/, '')); // quita '/' final
}

function isIgnored(filePath) {
  return ignoredPaths.some(pattern => filePath.includes(pattern));
}

function countFileLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    results.push({ filePath, lines });
    totalLines += lines;
    totalFiles++;
  } catch (_) {
    // Ignorar binarios o ilegibles
  }
}

function walkDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(rootDir, fullPath);

    if (isIgnored(relativePath)) continue;

    if (entry.isDirectory()) {
      walkDirectory(fullPath);
    } else if (entry.isFile()) {
      countFileLines(fullPath);
    }
  }
}

walkDirectory(rootDir);

results.forEach(({ filePath, lines }) => {
  console.log(`${lines.toString().padStart(6)}  ${filePath}`);
});

console.log('\n📊 Summary');
console.log(`🧾 Total files: ${totalFiles}`);
console.log(`📏 Total lines: ${totalLines}`);
