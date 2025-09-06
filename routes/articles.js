const express = require('express');
const router = express.Router();
const Article = require('../models/Article');

// Obtenir tous les articles
router.get('/', async (req, res) => {
  try {
    const articles = await Article.find();
    res.json(articles);
  } catch (err) {
    res.status(500).json({ message: err.message });
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

module.exports = router;
