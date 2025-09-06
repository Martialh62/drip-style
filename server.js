const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Chargement des variables d'environnement
dotenv.config({ path: '.env.production' });

// Import des modèles
const Article = require('./models/Article');
const Transaction = require('./models/Transaction');

// Configuration MongoDB
mongoose.set('strictQuery', false);
mongoose.set('debug', true);

// Initialisation de l'application Express
const app = express();

// Configuration de base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Options de connexion MongoDB
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
    autoIndex: true,
    connectTimeoutMS: 10000,
    retryWrites: true,
    w: 'majority'
};

// Middleware de logging
app.use((req, res, next) => {
    console.log(`💬 [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Middleware de vérification MongoDB
app.use((req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            success: false,
            message: 'Base de données non connectée',
            readyState: mongoose.connection.readyState
        });
    }
    next();
});

// Routes de base
app.get('/', (req, res) => {
    res.json({
        name: 'DRIP & STYLE API',
        version: '1.0.0',
        status: 'running'
    });
});

// Route de statut
app.get('/status', (req, res) => {
    res.json({
        success: true,
        timestamp: new Date().toISOString(),
        mongodb: {
            connected: mongoose.connection.readyState === 1,
            state: mongoose.connection.readyState
        },
        environment: process.env.NODE_ENV
    });
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
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4,
    autoIndex: true,
    connectTimeoutMS: 10000,
    retryWrites: true,
    w: 'majority'
};

// Vérification de la configuration MongoDB
console.log('🔑 Configuration MongoDB :', {
    uri: process.env.MONGODB_URI ? 'Définie' : 'Non définie',
    env: process.env.NODE_ENV,
    options: mongoOptions
});

// Fonction de connexion avec retry
const connectWithRetry = async (retries = 5) => {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`🔗 Tentative de connexion à MongoDB (${i + 1}/${retries})...`);
            await mongoose.connect(process.env.MONGODB_URI, mongoOptions);
            console.log('✅ Connecté à MongoDB');
            return true;
        } catch (err) {
            console.error(`❌ Erreur de connexion (tentative ${i + 1}):`, err.message);
            if (i < retries - 1) {
                const waitTime = Math.min(1000 * Math.pow(2, i), 10000);
                console.log(`⏳ Attente de ${waitTime/1000} secondes avant la prochaine tentative...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
    }
    throw new Error('Impossible de se connecter à MongoDB après plusieurs tentatives');
};

// Démarrage de la connexion MongoDB
connectWithRetry().catch(err => {
    console.error('❌ Erreur fatale:', err);
    process.exit(1);
});

mongoose.connection.on('error', (err) => {
    console.error('🔴 Erreur MongoDB:', err);
});

mongoose.connection.on('connected', () => {
    console.log('🟢 MongoDB connecté');
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

// Fonction pour trouver un port disponible
const findAvailablePort = async (startPort) => {
    const net = require('net');
    
    const isPortAvailable = (port) => {
        return new Promise((resolve) => {
            const server = net.createServer()
                .once('error', () => resolve(false))
                .once('listening', () => {
                    server.close();
                    resolve(true);
                });
            server.listen(port, '0.0.0.0');
        });
    };

    for (let port = startPort; port < startPort + 10; port++) {
        if (await isPortAvailable(port)) {
            return port;
        }
    }
    throw new Error('Aucun port disponible trouvé');
};

// Démarrage du serveur et de la connexion
const startServer = async () => {
    try {
        // Vérification des variables d'environnement
        console.log('🔑 Variables d\'environnement:', {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            MONGODB_URI: process.env.MONGODB_URI ? 'Définie' : 'Non définie'
        });

        // Connexion à MongoDB
        await connectWithRetry();

        // Trouver un port disponible
        const availablePort = await findAvailablePort(parseInt(PORT));
        console.log(`🔍 Port ${availablePort} disponible`);

        // Démarrage du serveur Express
        app.listen(availablePort, '0.0.0.0', () => {
            console.log(`🚀 Serveur démarré sur le port ${availablePort}`);
            console.log(`🌐 URL de l'API: http://localhost:${availablePort}`);
            console.log('📑 Routes disponibles:');
            console.log('  - GET  /api/status');
            console.log('  - GET  /api/articles');
            console.log('  - POST /api/articles');
        });
    } catch (err) {
        console.error('❌ Erreur au démarrage:', err);
        process.exit(1);
    }
};

// Démarrage de l'application
startServer();

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

// Routes API Articles
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

// Démarrage du serveur
const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
    console.log(`🌐 URL de l'API: http://localhost:${PORT}`);
    console.log('📑 Routes disponibles:');
    console.log('  - GET  /api/status');
    console.log('  - GET  /api/articles');
    console.log('  - POST /api/articles');
});
