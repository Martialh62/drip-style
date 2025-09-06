const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  article: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Article',
    required: true
  },
  type: {
    type: String,
    enum: ['ENTREE', 'SORTIE'],
    required: true
  },
  quantite: {
    type: Number,
    required: true
  },
  prix: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  note: String
});

// Middleware pour mettre à jour le stock après une transaction
transactionSchema.post('save', async function(doc) {
  const Article = mongoose.model('Article');
  const article = await Article.findById(doc.article);
  
  if (doc.type === 'ENTREE') {
    article.quantiteEnStock += doc.quantite;
  } else {
    article.quantiteEnStock -= doc.quantite;
  }
  
  await article.save();
});

module.exports = mongoose.model('Transaction', transactionSchema);
