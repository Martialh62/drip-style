const config = {
    development: {
        apiUrl: 'http://localhost:3001',
        mongoUri: process.env.MONGODB_URI
    },
    production: {
        apiUrl: 'https://drip-style-api.onrender.com',
        mongoUri: process.env.MONGODB_URI
    }
};

const environment = process.env.NODE_ENV || 'development';
module.exports = config[environment];
