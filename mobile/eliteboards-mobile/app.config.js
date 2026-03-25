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
  
  return {
    ...config,
    extra: {
      ...config.extra,
      API_URL: envUrl || 'http://localhost:5000',
    },
  };
};
