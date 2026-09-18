import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { collectImports, validateImport } from './boundaryRules.mjs';

const sourceDirectory = path.resolve('src');
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(absolutePath)));
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(absolutePath);
    }
  }

  return files;
}

function relativeToSource(file) {
  return path.relative(sourceDirectory, file).split(path.sep).join('/');
}

const files = await listSourceFiles(sourceDirectory);
const violations = [];

for (const file of files) {
  const relativeFile = relativeToSource(file);
  const source = await readFile(file, 'utf8');

  for (const specifier of collectImports(source, relativeFile)) {
    const violation = validateImport(relativeFile, specifier);
    if (violation !== null) {
      violations.push(`${relativeFile}: ${violation}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Architecture boundary violations:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`Architecture boundaries clean (${files.length} files checked).`);
