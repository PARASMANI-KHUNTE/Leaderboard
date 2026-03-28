const fs = require('fs');
const path = require('path');

function getEnvUrl() {
  try {
    const envPath = path.resolve(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      return null;
    }
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/EXPO_PUBLIC_API_URL=(.*)/);
    return match ? match[1].trim().replace(/['"]/g, '') : null;
  } catch (e) {
    return null;
  }
}

export default ({ config }) => {
  const envUrl = getEnvUrl();
  
  if (!envUrl) {
    throw new Error('EXPO_PUBLIC_API_URL must be set in .env file for production builds');
  }
  
  return {
    ...config,
    ios: {
      ...config.ios,
      bundleIdentifier: config.ios?.bundleIdentifier || 'com.parasmanikhunte.eliteboards',
      config: {
        ...config.ios?.config,
        usesNonExemptEncryption: false
      }
    },
    android: {
      ...config.android,
      package: config.android?.package || 'com.parasmanikhunte.eliteboards'
    },
    extra: {
      ...config.extra,
      API_URL: envUrl,
    },
  };
};
