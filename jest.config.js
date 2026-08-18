const preset = require('jest-expo/jest-preset');

module.exports = {
  ...preset,
  transform: {
    ...preset.transform,
    '\\.sql$': '<rootDir>/jest.sql-transformer.js',
  },
};
