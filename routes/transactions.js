const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Article = require('../models/Article');

// Obtenir toutes les transactions
router.get('/', async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate('article')
      .sort({ date: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Créer une nouvelle transaction
router.post('/', async (req, res) => {
  try {
    const article = await Article.findById(req.body.articleId);
    if (!article) {
      return res.status(404).json({ message: 'Article non trouvé' });
    }

    // Vérifier le stock disponible pour les sorties
    if (req.body.type === 'SORTIE' && article.quantiteEnStock < req.body.quantite) {
      return res.status(400).json({ message: 'Stock insuffisant' });
    }

    const transaction = new Transaction({
      article: req.body.articleId,
      type: req.body.type,
      quantite: req.body.quantite,
      prix: req.body.prix,
      note: req.body.note
    });

    const nouvelleTransaction = await transaction.save();
    res.status(201).json(nouvelleTransaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Obtenir les transactions d'aujourd'hui
router.get('/aujourd-hui', async (req, res) => {
  try {
    const debut = new Date();
    debut.setHours(0, 0, 0, 0);
    
    const fin = new Date();
    fin.setHours(23, 59, 59, 999);

    const transactions = await Transaction.find({
      date: {
        $gte: debut,
        $lte: fin
      }
    }).populate('article');

    res.json(transactions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
