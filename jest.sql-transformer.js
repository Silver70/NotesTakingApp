// Mirrors babel-plugin-inline-import (used by Metro/babel.config.js for the
// app bundle) for Jest: lets any test that imports db/client.ts — which
// pulls in drizzle-kit's generated migrations.js, which `import`s .sql
// files — resolve those imports instead of Jest trying to parse raw SQL
// as JavaScript.
module.exports = {
  process(sourceText) {
    return { code: `module.exports = ${JSON.stringify(sourceText)};` };
  },
};
