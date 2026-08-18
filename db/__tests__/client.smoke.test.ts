/**
 * db/client.ts pulls in drizzle-kit's generated migrations.js, which
 * `import`s raw .sql files — a step that only works if the bundler (Metro,
 * via babel-plugin-inline-import) or the test runner (Jest, via
 * jest.sql-transformer.js) knows how to load them. This test only proves
 * the module graph loads under Jest; it doesn't open a real database
 * (that needs the native expo-sqlite module, which isn't available here —
 * see db/test-utils/testDb.ts for the real-SQLite test strategy).
 */
describe('db/client module loading', () => {
  it('imports without the .sql migration files crashing the test runner', () => {
    // require(), not import, so the load happens inside the assertion —
    // a static top-level import would crash test collection itself rather
    // than let this test report the failure.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    expect(() => require('../client')).not.toThrow();
  });

  it('exposes openDatabase and runMigrations', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const client = require('../client');

    expect(typeof client.openDatabase).toBe('function');
    expect(typeof client.runMigrations).toBe('function');
  });
});
