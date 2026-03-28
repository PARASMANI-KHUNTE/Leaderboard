function normalizeUrl(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

function isLocalhostHost(hostname) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function getApiUrl() {
  const envUrl = normalizeUrl(import.meta.env.VITE_API_URL);
  const browserUrl = typeof window !== 'undefined' ? new URL(window.location.href) : null;
  const browserIsLocal = browserUrl ? isLocalhostHost(browserUrl.hostname) : false;

  if (envUrl) {
    try {
      const parsedEnvUrl = new URL(envUrl);
      const envIsLocal = isLocalhostHost(parsedEnvUrl.hostname);

      // Never let a deployed web app talk to localhost because of a stale build env.
      if (!(envIsLocal && !browserIsLocal)) {
        return envUrl;
      }
    } catch {
      // Fall through to derived defaults if the env value is malformed.
    }
  }

  if (browserUrl && !browserIsLocal) {
    return normalizeUrl(browserUrl.origin);
  }

  return 'http://localhost:5000';
}

const API_URL = getApiUrl();

export default API_URL;
