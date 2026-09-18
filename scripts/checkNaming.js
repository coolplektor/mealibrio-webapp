import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..', 'src');

// ------------ helpers ------------

function isCamelCase(name) {
  return /^[a-z][a-zA-Z0-9]*$/.test(name);
}

function isPascalCase(name) {
  return /^[A-Z][A-Za-z0-9]*$/.test(name);
}

const errors = [];

function reportError(filePath, message) {
  errors.push({ filePath, message });
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile()) {
      checkFileName(fullPath, entry.name);
    }
  }
}

function checkFileName(fullPath, name) {
  const ext = path.extname(name);
  const base = path.basename(name, ext);

  // Ignore type declarations
  if (name.endsWith('.d.ts')) return;

  // Ignore tests
  if (name.endsWith('.test.ts') || name.endsWith('.spec.ts') || name.endsWith('.test.tsx')) {
    return;
  }

  // 1. Check TS/TSX
  if (ext === '.tsx') {
    checkTsxFile(fullPath, base);
  } else if (ext === '.ts') {
    checkTsFile(fullPath, base);
  }
  // 2. Check CSS Modules
  else if (name.endsWith('.module.css')) {
    checkCssModuleFile(fullPath, name);
  }
}

function checkCssModuleFile(fullPath, name) {
  // Extract "RenderStatusTag" from "RenderStatusTag.module.css"
  const baseName = name.replace('.module.css', '');

  if (!isPascalCase(baseName)) {
    reportError(
      fullPath,
      `CSS Module "${name}" should be PascalCase (e.g. "RenderStatusTag.module.css").`
    );
  }
}

function checkTsxFile(fullPath, base) {
  if (base === 'index') return;

  if (!isPascalCase(base)) {
    reportError(
      fullPath,
      `TSX file "${base}.tsx" should be PascalCase or "index.tsx" (e.g. "HomePage.tsx").`
    );
  }
}

function checkTsFile(fullPath, base) {
  if (base === 'index') return;

  // 1. PRIORITY: Hooks (e.g. useBillingContext.ts)
  // Hooks must always be camelCase, even if they end in "Context"
  if (base.startsWith('use')) {
    if (!isCamelCase(base)) {
      reportError(
        fullPath,
        `Hook file "${base}.ts" should be camelCase (e.g. "useBillingContext.ts").`
      );
    }
    return;
  }

  // 2. PRIORITY: Context Definitions (e.g. BillingContext.ts)
  // If it's not a hook, but ends in Context, it's likely the Context object itself.
  if (base.endsWith('Context')) {
    if (!isPascalCase(base)) {
      reportError(
        fullPath,
        `Context definition file "${base}.ts" should be PascalCase (e.g. "BillingContext.ts").`
      );
    }
    return;
  }

  // 3. PRIORITY: Class Exports
  const content = fs.readFileSync(fullPath, 'utf8');
  const exportClassMatch = content.match(/\bexport\s+class\s+([A-Z][A-Za-z0-9_]*)/);

  if (exportClassMatch) {
    const className = exportClassMatch[1];

    if (!isPascalCase(base)) {
      reportError(
        fullPath,
        `File "${base}.ts" exports a class and should be PascalCase (e.g. "${className}.ts").`
      );
      return;
    }

    if (base !== className) {
      reportError(
        fullPath,
        `File "${base}.ts" exports class "${className}". Consider renaming the file to "${className}.ts".`
      );
    }

    return;
  }

  // 4. FALLBACK: Standard Utility/File
  // No exported class, not a hook, not a context -> expect camelCase
  if (!isCamelCase(base)) {
    reportError(
      fullPath,
      `Non-class TS file "${base}.ts" should be camelCase or "index.ts" (e.g. "utils.ts", "apiConfig.ts").`
    );
  }
}

// ------------ run ------------

walkDir(ROOT_DIR);

if (errors.length > 0) {
  console.error('❌ Naming convention violations found:\n');
  for (const err of errors) {
    console.error(`- ${err.filePath}`);
    console.error(`  -> ${err.message}`);
  }
  console.error(`\nTotal issues: ${errors.length}`);
  process.exitCode = 1;
} else {
  console.log('✅ All file names follow the configured conventions.');
}
