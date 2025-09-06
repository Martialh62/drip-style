const express = require('express');
const router = express.Router();

// Import des routes
const articleRoutes = require('./articles');
const transactionRoutes = require('./transactions');
const reportRoutes = require('./reports');

// Log pour débogage
console.log('📚 Chargement des routes...');

// Configuration des routes
router.use('/articles', articleRoutes);
router.use('/transactions', transactionRoutes);
router.use('/reports', reportRoutes);

// Log des routes montées
console.log('✅ Routes montées avec succès');

module.exports = router;
