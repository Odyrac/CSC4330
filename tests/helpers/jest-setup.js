const matchers = require('@testing-library/jest-dom/matchers');
expect.extend(matchers);

// Expose a small helper to load script files into the jest/jsdom global scope
const fs = require('fs');
const path = require('path');
//Fix window alerts to it doesn't yell at me
window.alert = jest.fn();
global.__loadScript = function (relativePath) {
  const full = path.resolve(process.cwd(), relativePath);
  const code = fs.readFileSync(full, 'utf8');
  const wrapped = `(function(){ var window = global.window; var document = global.document; ${code}\n})();`;
  eval(wrapped);
};
