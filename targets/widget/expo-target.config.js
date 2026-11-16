/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = config => ({
  type: 'widget',
  name: 'HomezyWidget',
  displayName: 'Homezy',
  bundleIdentifier: '.widget',
  deploymentTarget: '16.0',
  frameworks: ['SwiftUI', 'WidgetKit'],
  entitlements: {
    'com.apple.security.application-groups': ['group.com.meikai.homezy'],
  },
});
