const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
    unique: true
  },
  nom: {
    type: String,
    required: true
  },
  description: String,
  categorie: {
    type: String,
    required: true
  },
  taille: String,
  couleur: String,
  prixAchat: {
    type: Number,
    required: true
  },
  prixVente: {
    type: Number,
    required: true
  },
  quantiteEnStock: {
    type: Number,
    default: 0
  },
  seuilAlerte: {
    type: Number,
    default: 5
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  derniereMiseAJour: {
    type: Date,
    default: Date.now
  }
});

// Middleware pour mettre à jour la date de dernière mise à jour
articleSchema.pre('save', function(next) {
  this.derniereMiseAJour = new Date();
  next();
});

module.exports = mongoose.model('Article', articleSchema);
