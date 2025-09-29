const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add support for additional file extensions if needed
config.resolver.assetExts.push(
  // Add any additional asset extensions your app uses
  'db', 'mp3', 'ttf', 'obj', 'png', 'jpg'
);

module.exports = config;
