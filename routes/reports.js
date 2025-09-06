const express = require('express');
const router = express.Router();
const moment = require('moment');
const Transaction = require('../models/Transaction');
const Article = require('../models/Article');

// Rapport journalier
router.get('/journalier', async (req, res) => {
  try {
    const date = req.query.date ? new Date(req.query.date) : new Date();
    const debut = new Date(date.setHours(0, 0, 0, 0));
    const fin = new Date(date.setHours(23, 59, 59, 999));

    const transactions = await Transaction.find({
      date: {
        $gte: debut,
        $lte: fin
      }
    }).populate('article');

    const rapport = {
      date: moment(date).format('DD/MM/YYYY'),
      entrees: {
        nombre: 0,
        total: 0
      },
      sorties: {
        nombre: 0,
        total: 0
      },
      articles: []
    };

    // Grouper par article
    const articlesMap = new Map();

    transactions.forEach(transaction => {
      if (transaction.type === 'ENTREE') {
        rapport.entrees.nombre += transaction.quantite;
        rapport.entrees.total += transaction.prix * transaction.quantite;
      } else {
        rapport.sorties.nombre += transaction.quantite;
        rapport.sorties.total += transaction.prix * transaction.quantite;
      }

      // Mise à jour des statistiques par article
      const articleId = transaction.article._id.toString();
      if (!articlesMap.has(articleId)) {
        articlesMap.set(articleId, {
          reference: transaction.article.reference,
          nom: transaction.article.nom,
          entrees: 0,
          sorties: 0,
          stockFinal: transaction.article.quantiteEnStock
        });
      }

      const articleStats = articlesMap.get(articleId);
      if (transaction.type === 'ENTREE') {
        articleStats.entrees += transaction.quantite;
      } else {
        articleStats.sorties += transaction.quantite;
      }
    });

    rapport.articles = Array.from(articlesMap.values());

    res.json(rapport);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Articles en alerte de stock
router.get('/alertes', async (req, res) => {
  try {
    const articlesEnAlerte = await Article.find({
      $expr: {
        $lte: ['$quantiteEnStock', '$seuilAlerte']
      }
    });

    res.json(articlesEnAlerte);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
