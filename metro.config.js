const { getSentryExpoConfig } = require('@sentry/react-native/metro');

// Sentry: sourcemap için Debug ID ekler. Diğer ayarlar Expo varsayılanı.
module.exports = getSentryExpoConfig(__dirname);
