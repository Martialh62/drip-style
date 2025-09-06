const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Log pour débogage
console.log('📓 Initialisation des routes articles');
const Article = require('../models/Article');

// Middleware de vérification de la connexion MongoDB
const checkMongoConnection = (req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            success: false,
            message: 'Base de données non connectée',
            status: mongoose.connection.readyState
        });
    }
    next();
};

// Appliquer le middleware à toutes les routes
router.use(checkMongoConnection);

// Obtenir tous les articles
router.get('/', async (req, res) => {
    console.log(' Recherche des articles...');
    try {
        const articles = await Article.find();
        console.log(` ${articles.length} articles trouvés`);
        res.json({
            success: true,
            data: articles,
            count: articles.length
        });
    } catch (err) {
        console.error(' Erreur lors de la récupération des articles:', err);
        res.status(500).json({
            success: false,
            message: 'Erreur lors de la récupération des articles',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// Créer un nouvel article
router.post('/', async (req, res) => {
  const article = new Article({
    reference: req.body.reference,
    nom: req.body.nom,
    description: req.body.description,
    categorie: req.body.categorie,
    taille: req.body.taille,
    couleur: req.body.couleur,
    prixAchat: req.body.prixAchat,
    prixVente: req.body.prixVente,
    quantiteEnStock: req.body.quantiteEnStock || 0,
    seuilAlerte: req.body.seuilAlerte
  });

  try {
    const nouvelArticle = await article.save();
    res.status(201).json(nouvelArticle);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Mettre à jour un article
router.patch('/:id', async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    
    if (req.body.nom) article.nom = req.body.nom;
    if (req.body.description) article.description = req.body.description;
    if (req.body.categorie) article.categorie = req.body.categorie;
    if (req.body.taille) article.taille = req.body.taille;
    if (req.body.couleur) article.couleur = req.body.couleur;
    if (req.body.prixAchat) article.prixAchat = req.body.prixAchat;
    if (req.body.prixVente) article.prixVente = req.body.prixVente;
    if (req.body.seuilAlerte) article.seuilAlerte = req.body.seuilAlerte;

    const articleMisAJour = await article.save();
    res.json(articleMisAJour);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Supprimer un article
router.delete('/:id', async (req, res) => {
  try {
    await Article.findByIdAndDelete(req.params.id);
    res.json({ message: 'Article supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Log des routes disponibles
console.log('📗 Routes articles disponibles:', [
    'GET /api/articles',
    'POST /api/articles',
    'PUT /api/articles/:id',
    'DELETE /api/articles/:id'
]);

module.exports = router;
