// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Adiciona suporte para MP3
config.resolver.assetExts.push('mp3');

module.exports = config;