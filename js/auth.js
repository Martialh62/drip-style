import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js';
import { auth } from './config.js';

// Gestion de l'authentification
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // La redirection sera gérée par l'observateur d'authentification
    } catch (error) {
        alert('Erreur de connexion : ' + error.message);
    }
});

// Déconnexion
document.getElementById('logoutBtn').addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        alert('Erreur de déconnexion : ' + error.message);
    }
});

// Observateur d'état d'authentification
onAuthStateChanged(auth, (user) => {
    const loginSection = document.getElementById('loginSection');
    const appSection = document.getElementById('appSection');

    if (user) {
        loginSection.classList.add('d-none');
        appSection.classList.remove('d-none');
        loadDashboardData(); // Charge les données du tableau de bord
    } else {
        loginSection.classList.remove('d-none');
        appSection.classList.add('d-none');
    }
});
