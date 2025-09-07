import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js';

// Configuration Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAIqNWV690JccE9DPvUuihpKnB6RZFwAwE",
    authDomain: "drip-style-6cb05.firebaseapp.com",
    projectId: "drip-style-6cb05",
    storageBucket: "drip-style-6cb05.firebasestorage.app",
    messagingSenderId: "607378291215",
    appId: "1:607378291215:web:b2cea234cad2e9bfb8417a",
    measurementId: "G-C6S27L97X4"
};

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);

// Références Firebase
export const auth = getAuth(app);
export const db = getFirestore(app);

// Collections
export const COLLECTIONS = {
    ITEMS: 'items',
    SALES: 'sales',
    STOCK_MOVEMENTS: 'stockMovements',
    CATEGORIES: 'categories'
};
