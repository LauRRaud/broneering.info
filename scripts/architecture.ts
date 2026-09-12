import ts from 'typescript';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

// Explicit browser-safe surface. New library modules are server-side by default.
export const sharedLibraries = new Set([
  'admin-contracts', 'booking-management-contracts', 'booking-calendar', 'contracts',
  'contact-validation', 'embed-contracts', 'errors', 'i18n', 'locales',
  'schedule-contracts', 'service-management-contracts', 'service-translation-contracts',
  'notification-contracts', 'booking-mutation-outcome', 'theme-contracts', 'public-phone',
]);
const browserLibraries = new Set(['auth-client', 'client-fetch']);
export function runtimeImports(file: string, source: string) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const imports: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isImportEqualsDeclaration(node) && !node.isTypeOnly && ts.isExternalModuleReference(node.moduleReference)) {
      const expression = node.moduleReference.expression;
      if (expression && ts.isStringLiteral(expression)) imports.push(expression.text);
    }
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const onlyTypes = clause?.isTypeOnly || (!clause?.name && bindings && ts.isNamedImports(bindings) && bindings.elements.length > 0 && bindings.elements.every(e => e.isTypeOnly));
      if (!onlyTypes) imports.push(node.moduleSpecifier.text);
    }
    if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      if (!node.exportClause || !ts.isNamedExports(node.exportClause) || !node.exportClause.elements.every(e => e.isTypeOnly)) imports.push(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
      const arg = node.arguments[0];
      if (!arg || !ts.isStringLiteralLike(arg)) throw new Error(`${file}: computed module loading is not allowed`);
      imports.push(arg.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return {imports, client: ast.statements.some(n => ts.isExpressionStatement(n) && ts.isStringLiteral(n.expression) && n.expression.text === 'use client')};
}
export function checkArchitecture(root = process.cwd()) {
  const files: string[] = [];
  function walk(dir: string) { for (const entry of readdirSync(dir, {withFileTypes: true})) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (/\.(ts|tsx)$/.test(file)) files.push(file); } }
  walk(path.join(root, 'src'));
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
  const options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options;
  const graph = new Map(files.map(file => [file, runtimeImports(file, readFileSync(file, 'utf8'))]));
  const violations = new Set<string>();
  const relative = (file: string) => path.relative(root, file).replaceAll('\\', '/');
  // Component/page styles must be opt-in CSS Modules, never another global theme.
  for (const [file,node] of graph) for (const spec of node.imports) {
    if (spec.endsWith('.css') && !spec.endsWith('.module.css') && !(relative(file)==='src/app/layout.tsx' && spec==='./accessibility.css')) {
      violations.add(`${relative(file)} imports global CSS ${spec}; use a colocated CSS Module`);
    }
  }
  function checkThemeTokens(directory:string) {
    for (const entry of readdirSync(directory,{withFileTypes:true})) {
      const file=path.join(directory,entry.name);
      if(entry.isDirectory())checkThemeTokens(file);
      else if(entry.name.endsWith('.css')) {
        const css=readFileSync(file,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
        for(const match of css.matchAll(/(?:^|[;{])\s*([\w-]+)\s*:/g)) {
          if(!match[1].startsWith('--')&&match[1]!=='color-scheme')violations.add(`${relative(file)} sets ${match[1]}; theme files contain tokens only, move styling to the component`);
        }
      }
    }
  }
  if(existsSync(path.join(root,'src/styles')))checkThemeTokens(path.join(root,'src/styles'));
  for (const [file, node] of graph) {
    if (relative(file).startsWith('src/lib/')) for (const spec of node.imports) {
      const target = ts.resolveModuleName(spec, file, options, ts.sys).resolvedModule?.resolvedFileName;
      if (target && /^src\/(app|components)\//.test(relative(target))) violations.add(`${relative(file)} must not depend on ${relative(target)}`);
    }
  }
  const visited = new Set<string>();
  function visit(file: string, chain: string[]) {
    if (visited.has(file)) return;
    visited.add(file);
    const rel = relative(file);
    if (rel.startsWith('src/lib/') && !sharedLibraries.has(path.basename(file, '.ts')) && !browserLibraries.has(path.basename(file, '.ts'))) {
      violations.add([...chain, rel].join(' -> ') + ' (server library in browser/shared graph)'); return;
    }
    for (const spec of graph.get(file)?.imports ?? []) {
      if (/^(node:|pg$|kysely$|nodemailer|next\/(headers|server)$|better-auth$)/.test(spec)) violations.add(`${rel} imports server dependency ${spec}`);
      const target = ts.resolveModuleName(spec, file, options, ts.sys).resolvedModule?.resolvedFileName;
      if (target && graph.has(path.normalize(target))) visit(path.normalize(target), [...chain, rel]);
    }
  }
  for (const [file, node] of graph) if (node.client || relative(file).startsWith('src/components/') || sharedLibraries.has(path.basename(file, '.ts'))) visit(file, []);
  return {files: files.length, violations: [...violations]};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = checkArchitecture();
  if (result.violations.length) { console.error(result.violations.join('\n')); process.exitCode = 1; }
  else console.log(`Architecture boundaries passed (${result.files} source files).`);
}
