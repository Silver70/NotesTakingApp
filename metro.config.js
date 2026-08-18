const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Lets Metro resolve the .sql migration files that drizzle-kit generates.
config.resolver.sourceExts.push('sql');

module.exports = config;
