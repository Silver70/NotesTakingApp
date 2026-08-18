module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Lets drizzle's generated migrations.js `import` raw .sql files so they
    // can be bundled into the app and run via drizzle-orm/expo-sqlite's migrator.
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
