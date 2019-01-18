const parser = require('@babel/parser');
const t = require('@babel/types');
const traverse = require('@babel/traverse');
const assert = require('assert');
const debug = require('debug')('import-helper:addImports');

function normalizeImportMap(importMap) {
  return Object.keys(importMap).reduce((memo, key) => {
    importMap[key].forEach(method => {
      memo[method] = key;
    });
    return memo;
  }, {});
}

function buildImportsCode(imports) {
  return Object.keys(imports).map(key => {
    return `import ${buildSpecifiers(imports[key].specifiers)} from '${key}';`;
  });
}

function buildSpecifiers(specifiers) {
  let defaultSpecifier = null;
  const normalSpecifiers = specifiers.filter(s => {
    if (s.isDefault) defaultSpecifier = s;
    return !s.isDefault;
  });
  const specifiersCode = normalSpecifiers.map(({ local, imported }) => {
    if (local === imported) return local;
    else return `${imported} as ${local}`;
  });
  let defaultSpecifierCode = '';
  if (defaultSpecifier) {
    defaultSpecifierCode = `${defaultSpecifier.local}, `;
  }
  return [
    defaultSpecifierCode,
    specifiersCode.length ? `{ ${specifiersCode.join(', ')} }` : '',
  ].join('');
}

function isESM(code) {
  return code.indexOf('require(') === -1;
}

function addImports(code, importMap) {
  assert(isESM(code), `We don't support cjs module now.`);

  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx'],
  });

  const identifiers = {};
  const imports = {};
  const visitor = {
    Identifier(path) {
      // exclude identifiers in import statement
      if (!path.parentPath || !t.isImportSpecifier(path.parentPath.node)) {
        identifiers[path.node.name] = true;
      }
    },
    ImportDeclaration(path) {
      const { source, loc, specifiers } = path.node;
      if (!source.value.startsWith('.')) {
        imports[source.value] = {
          specifiers: specifiers.map(specifier => {
            if (t.isImportDefaultSpecifier(specifier)) {
              return {
                local: specifier.local.name,
                isDefault: true,
              };
            } else {
              return {
                local: specifier.local.name,
                imported: specifier.imported.name,
              };
            }
          }),
          line: Object.keys(loc).reduce((memo, key) => {
            memo[loc[key].line] = true;
            return memo;
          }, {}),
        };
      }
    },
  };

  traverse.default(ast, visitor);

  debug(`imports: ${JSON.stringify(imports)}`);
  debug(`identifiers: ${JSON.stringify(Object.keys(identifiers))}`);

  // get lines for remove
  const lines = Object.keys(imports).reduce((memo, key) => {
    return {
      ...memo,
      ...(imports[key].line || {}),
    };
    return memo;
  }, {});

  // update improts
  const im = normalizeImportMap(importMap);
  Object.keys(identifiers).forEach(identifier => {
    if (im[identifier]) {
      const specifier = { local: identifier, imported: identifier };
      if (!imports[im[identifier]]) {
        imports[im[identifier]] = {
          specifiers: [specifier],
        };
      }
      if (
        !imports[im[identifier]].specifiers.some(s => s.local === identifier)
      ) {
        imports[im[identifier]].specifiers.push(specifier);
      }
    }
  });

  // 删除 imports 语句
  const codeArr = code.split('\n').filter((lineCode, index) => {
    return !lines[String(index + 1)];
  });
  debug(codeArr.join('\n'));

  // 构建新的 import 语句
  const importsCode = buildImportsCode(imports);
  debug(importsCode.join('\n'));

  // 拼
  return `${importsCode.join('\n')}\n${codeArr.join('\n')}`;
}

module.exports = addImports;
