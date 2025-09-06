const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Chargement des variables d'environnement
dotenv.config({ path: '.env.production' });

// Import des modèles
const Article = require('./models/Article');
const Transaction = require('./models/Transaction');

// Configuration MongoDB
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

// Initialisation de l'application Express
const app = express();
const PORT = process.env.PORT || 3001;

// Configuration de base
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

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
        status: 'running',
        endpoints: [
            '/api/articles',
            '/api/transactions',
            '/status',
            '/health'
        ]
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

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        time: new Date().toISOString() 
    });
});

// Routes API Articles
app.get('/api/articles', async (req, res) => {
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

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
    console.error('❌ Erreur:', err.stack);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Une erreur est survenue',
        path: req.path,
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Gestion des routes non trouvées
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route non trouvée: ${req.method} ${req.path}`,
        timestamp: new Date().toISOString()
    });
});

// Démarrage de l'application
const startServer = async () => {
    try {
        // Connexion à MongoDB
        await connectWithRetry();

        // Démarrage du serveur Express
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Serveur démarré sur le port ${PORT}`);
            console.log('📑 Routes disponibles:');
            console.log('  - GET  /');
            console.log('  - GET  /status');
            console.log('  - GET  /health');
            console.log('  - GET  /api/articles');
            console.log('  - POST /api/articles');
        });
    } catch (err) {
        console.error('❌ Erreur au démarrage:', err);
        process.exit(1);
    }
};

startServer();
