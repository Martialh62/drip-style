const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Import des modèles
const Article = require('./models/Article');
const Transaction = require('./models/Transaction');

// Log pour débogage
console.log('📑 Chargement des modèles...', {
    Article: Article ? 'OK' : 'Non chargé',
    Transaction: Transaction ? 'OK' : 'Non chargé'
});

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

// Middleware essentiels
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));

// Middleware de logging
app.use((req, res, next) => {
    console.log(`💬 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Vérification de la connexion MongoDB
app.use((req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        console.error('❌ MongoDB non connecté - ReadyState:', mongoose.connection.readyState);
        return res.status(503).json({
            success: false,
            message: 'Base de données non connectée',
            readyState: mongoose.connection.readyState
        });
    }
    next();
});

// Servir les fichiers statiques
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

// Test de la connexion MongoDB
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        mongodb: {
            connected: mongoose.connection.readyState === 1,
            state: mongoose.connection.readyState
        },
        timestamp: new Date().toISOString()
    });
});

// Routes API
app.get('/api/articles', async (req, res) => {
    console.log('🔍 GET /api/articles');
    try {
        const articles = await Article.find();
        console.log(`✅ ${articles.length} articles trouvés`);
        res.json({
            success: true,
            data: articles,
            count: articles.length
        });
    } catch (err) {
        console.error('❌ Erreur:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des articles',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

app.post('/api/articles', async (req, res) => {
    console.log('📝 POST /api/articles', req.body);
    try {
        const article = new Article(req.body);
        await article.save();
        res.status(201).json({
            success: true,
            data: article
        });
    } catch (err) {
        console.error('❌ Erreur:', err);
        res.status(400).json({
            success: false,
            message: 'Erreur lors de la création de l\'article',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

console.log('✅ Routes API montées directement dans server.js');

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

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
    console.error('❌ Erreur globale:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Erreur interne du serveur',
        path: req.path,
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Gestionnaire de routes non trouvées
app.use((req, res) => {
    console.log('⚠️ Route non trouvée:', req.method, req.path);
    res.status(404).json({
        success: false,
        message: `Route non trouvée: ${req.method} ${req.path}`,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`🌐 URL de l'API: http://localhost:${PORT}`);
    console.log('📑 Routes disponibles:');
    console.log('  - GET  /api/status');
    console.log('  - GET  /api/articles');
    console.log('  - POST /api/articles');
});
