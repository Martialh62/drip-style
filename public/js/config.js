// Configuration de l'application
const config = {
    // URL de l'API
    API_URL: 'https://drip-style-api.onrender.com',
    
    // Timeouts (en millisecondes)
    TIMEOUTS: {
        DEFAULT_REQUEST: 30000,
        LONG_REQUEST: 60000,
        SERVER_CHECK: 30000,
        RETRY_DELAY: 5000
    },

    // Réessayer les requêtes
    RETRY: {
        MAX_ATTEMPTS: 3,
        BACKOFF_FACTOR: 2
    }
};

// Fonction pour effectuer des requêtes avec réessai
config.fetchWithRetry = async function(url, options = {}) {
    let lastError;
    for (let attempt = 1; attempt <= this.RETRY.MAX_ATTEMPTS; attempt++) {
        try {
            const response = await fetch(url, {
                ...options,
                timeout: this.TIMEOUTS.DEFAULT_REQUEST
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            lastError = error;
            if (attempt < this.RETRY.MAX_ATTEMPTS) {
                const delay = this.TIMEOUTS.RETRY_DELAY * Math.pow(this.RETRY.BACKOFF_FACTOR, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError;
};

export default config;
