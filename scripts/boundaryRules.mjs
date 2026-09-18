import path from 'node:path';
import ts from 'typescript';

const FORBIDDEN_LAYER_IMPORTS = {
  common: new Set(['app', 'domain', 'features', 'infra', 'store']),
  domain: new Set(['app', 'features', 'infra', 'store']),
  infra: new Set(['app', 'features', 'store']),
  features: new Set(['app']),
  store: new Set(['app'])
};
const TEST_MODULE_REFERENCE_METHODS = new Set(['doMock', 'importActual', 'mock']);

function scriptKind(fileName) {
  if (fileName.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (fileName.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (fileName.endsWith('.js')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

export function collectImports(source, fileName = 'source.ts') {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    false,
    scriptKind(fileName)
  );
  const imports = [];

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      imports.push(node.moduleSpecifier.text);
    } else if (ts.isCallExpression(node)) {
      const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isTestModuleReference =
        ts.isPropertyAccessExpression(node.expression) &&
        ts.isIdentifier(node.expression.expression) &&
        (node.expression.expression.text === 'vi' || node.expression.expression.text === 'jest') &&
        TEST_MODULE_REFERENCE_METHODS.has(node.expression.name.text);
      const moduleArgument = node.arguments[0];

      if (
        (isDynamicImport || isTestModuleReference) &&
        moduleArgument !== undefined &&
        ts.isStringLiteralLike(moduleArgument)
      ) {
        imports.push(moduleArgument.text);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return imports;
}

export function resolveSourceImport(relativeFile, specifier) {
  let target;
  if (specifier.startsWith('@/')) {
    target = specifier.slice(2);
  } else if (specifier.startsWith('src/')) {
    target = specifier.slice(4);
  } else if (specifier.startsWith('.')) {
    target = path.posix.join(path.posix.dirname(relativeFile), specifier);
  } else {
    return null;
  }

  const normalized = path.posix.normalize(target);
  return normalized === '..' || normalized.startsWith('../') ? null : normalized;
}

function layerOf(sourcePath) {
  return sourcePath.split('/')[0];
}

function featureOf(sourcePath) {
  const parts = sourcePath.split('/');
  return parts[0] === 'features' && parts.length > 1 ? parts[1] : null;
}

export function validateImport(relativeFile, specifier) {
  const target = resolveSourceImport(relativeFile, specifier);
  if (target === null) {
    if (
      layerOf(relativeFile) === 'domain' &&
      (specifier === 'react' || specifier.startsWith('react/'))
    ) {
      return `domain code may not import React: ${specifier}`;
    }
    return null;
  }

  const importerLayer = layerOf(relativeFile);
  const targetLayer = layerOf(target);
  if (FORBIDDEN_LAYER_IMPORTS[importerLayer]?.has(targetLayer)) {
    return `${importerLayer} code may not import ${targetLayer}: ${specifier}`;
  }

  if (importerLayer === 'features' && targetLayer === 'store' && target !== 'store') {
    return `features must use the public "@/store" hooks/type surface instead of ${specifier}`;
  }

  const targetFeature = featureOf(target);
  const importerFeature = featureOf(relativeFile);
  if (targetFeature !== null && targetFeature === importerFeature && !specifier.startsWith('.')) {
    return `imports inside feature "${importerFeature}" must be relative, not ${specifier}`;
  }

  if (targetFeature !== null && targetFeature !== importerFeature && target.split('/').length > 2) {
    return `imports of feature "${targetFeature}" must use "@/features/${targetFeature}" instead of ${specifier}`;
  }

  return null;
}
