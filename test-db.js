require('dotenv').config({ path: '.env.production' });
const mongoose = require('mongoose');

console.log('🔍 Test de connexion MongoDB...');
console.log('URI:', process.env.MONGODB_URI ? 'Définie' : 'Non définie');

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
})
.then(() => {
    console.log('✅ Connexion MongoDB réussie');
    console.log('📊 État de la connexion:', mongoose.connection.readyState);
    return mongoose.connection.db.listCollections().toArray();
})
.then(collections => {
    console.log('📚 Collections disponibles:', collections.map(c => c.name));
})
.catch(err => {
    console.error('❌ Erreur de connexion:', err);
})
.finally(() => {
    mongoose.connection.close();
});
