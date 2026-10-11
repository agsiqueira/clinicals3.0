// Isolated visual validation only; does not change the app's Metro configuration.
const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const root = path.resolve(__dirname, "..");
const config = getDefaultConfig(root);
config.watchFolders = [path.resolve(root, "..", "backend", "src", "content")];
module.exports = config;
