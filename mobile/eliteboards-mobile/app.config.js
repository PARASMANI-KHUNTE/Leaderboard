const fs = require('fs');
const path = require('path');

function getEnvUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return String(process.env.EXPO_PUBLIC_API_URL).trim().replace(/['"]/g, '');
  }

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
  let envUrl = getEnvUrl();
  const isProd = process.env.NODE_ENV === 'production' || process.env.EAS_BUILD_PROFILE === 'production';
  
  if (isProd && (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1') || envUrl.includes('10.0.2.2'))) {
    envUrl = 'https://leaderboard-backend-3pek.onrender.com';
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
      API_URL: envUrl || 'https://leaderboard-backend-3pek.onrender.com',
    },
  };
};
