const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Routes
// Import des routes
const apiRoutes = require('./routes');

// Log pour débogage
console.log('📑 Chargement des routes API...');

// Chargement des variables d'environnement
if (process.env.NODE_ENV === 'production') {
    dotenv.config({ path: '.env.production' });
} else {
    dotenv.config();
}

const app = express();

// Log des variables d'environnement (sans les secrets)
console.log('💻 Configuration du serveur :', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    DATABASE: process.env.MONGODB_URI ? 'Configurée' : 'Non configurée'
});

// Configuration CORS
const corsOptions = {
    origin: '*',  // Permettre toutes les origines pendant le développement
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: true,
    optionsSuccessStatus: 204
};

// Logger middleware
const requestLogger = (req, res, next) => {
    console.log(`💬 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
};

// Middleware
app.use(requestLogger);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
    console.error('❌ Erreur:', err.stack);
    const statusCode = err.statusCode || 500;
    const errorResponse = {
        success: false,
        message: err.message || 'Une erreur est survenue',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    };

    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
});

// Gestion des routes non trouvées
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route non trouvée: ${req.method} ${req.path}`,
        timestamp: new Date().toISOString()
    });
});

// Configuration de Mongoose
mongoose.set('strictQuery', false);
mongoose.set('debug', true);

// Options de connexion MongoDB
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 30000,
    retryWrites: true,
    w: 'majority'
};

// Fonction de connexion à MongoDB avec retry
async function connectWithRetry() {
    try {
        console.log('📡 Tentative de connexion à MongoDB...');
        console.log('📁 URI:', process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':****@'));
        
        await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
        console.log('✅ Connecté à MongoDB avec succès');
    } catch (err) {
        console.error('❌ Erreur de connexion à MongoDB:', err.message);
        if (err.name === 'MongoServerSelectionError') {
            console.error('🔍 Détails:', err.reason?.servers);
        }
        console.log('🔄 Nouvelle tentative dans 5 secondes...');
        setTimeout(connectWithRetry, 5000);
    }
}

// Gestion des événements de connexion MongoDB
mongoose.connection.on('connected', () => {
    console.log('🟢 MongoDB connecté');
});

mongoose.connection.on('error', (err) => {
    console.error('🔴 Erreur MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('🟡 MongoDB déconnecté');
});

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
    try {
        await mongoose.connection.close();
        console.log('MongoDB déconnecté suite à l\'arrêt de l\'application');
        process.exit(0);
    } catch (err) {
        console.error('Erreur lors de la fermeture de la connexion MongoDB:', err);
        process.exit(1);
    }
});

// Démarrage de la connexion
connectWithRetry();

// Test route
app.get('/test', (req, res) => {
    res.json({ message: 'API opérationnelle' });
});

// Montage des routes API
app.use('/api', apiRoutes);
console.log('✅ Routes API montées sur /api');

// Route racine
app.get('/', (req, res) => {
    res.json({
        message: 'API DRIP & STYLE',
        version: '1.0.0',
        endpoints: [
            '/api/articles',
            '/api/transactions',
            '/api/reports',
            '/health',
            '/test'
        ]
    });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`🌐 URL de l'API: http://localhost:${PORT}`);
});
