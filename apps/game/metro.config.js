// Expo SDK 52+ configures npm workspaces automatically (watch folders, hoisted node_modules).
// Kept as an explicit file so there is one obvious place to change bundler behaviour.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = config;
