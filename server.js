const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Routes
const articleRoutes = require('./routes/articles');
const transactionRoutes = require('./routes/transactions');
const reportRoutes = require('./routes/reports');

dotenv.config();

const app = express();

// Configuration CORS
const corsOptions = {
    origin: ['https://drip-style.netlify.app', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur:', err.stack);
    res.status(500).json({
        success: false,
        message: 'Une erreur est survenue',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
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

// Routes
app.use('/api/articles', articleRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
