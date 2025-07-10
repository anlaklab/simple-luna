#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

let totalLines = 0;
let totalFiles = 0;
const results = [];

const rootDir = process.argv[2] || '.';

// ❌ Rutas o carpetas a excluir manualmente (relativas o absolutas)
const ignoredDirs = ['.git', 'node_modules', 'dist', 'out', 'build', '.next'];
const ignoredExtensions = ['.jar', '.png', '.jpg', '.jpeg', '.gif', '.pdf', '.ico', '.svg', '.lock', '.zip', '.bin'];
const ignoredFilenames = ['Thumbs.db', 'desktop.ini'];

function isIgnored(filePath, entryName) {
  const relative = path.relative(rootDir, filePath);

  return (
    ignoredDirs.some(dir => relative.split(path.sep).includes(dir)) ||
    ignoredExtensions.some(ext => filePath.toLowerCase().endsWith(ext)) ||
    ignoredFilenames.includes(entryName)
  );
}

function countFileLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').length;
    results.push({ filePath, lines });
    totalLines += lines;
    totalFiles++;
  } catch (_) {
    // ignorar archivos binarios o ilegibles
  }
}

function walkDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (isIgnored(fullPath, entry.name)) continue;

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
