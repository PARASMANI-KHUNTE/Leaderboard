function getOpenRouterHeaders() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OpenRouter is not configured');
    }

    return {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_REFERER || process.env.CLIENT_URL || 'http://localhost',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'EliteBoards Verification',
    };
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callOpenRouter(payload, options = {}) {
    const {
        retries = 2,
        retryDelayMs = 1200,
    } = options;

    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: getOpenRouterHeaders(),
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            return response.json();
        }

        const message = await response.text();
        lastError = new Error(`OpenRouter request failed: ${response.status} ${message}`);
        lastError.statusCode = response.status;

        const shouldRetry = response.status === 429 && attempt < retries;
        if (!shouldRetry) {
            throw lastError;
        }

        await sleep(retryDelayMs * (attempt + 1));
    }

    throw lastError || new Error('OpenRouter request failed');
}

module.exports = {
    callOpenRouter,
};
