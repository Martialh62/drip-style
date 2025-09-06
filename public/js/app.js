// Gestion de la navigation avec animations
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.target.dataset.page;
        
        // Mise à jour de la navigation
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Animation de transition des pages
        const currentPage = document.querySelector('.page.active');
        const nextPage = document.getElementById(page);
        
        if (currentPage) {
            currentPage.style.animation = 'fadeOut 0.3s ease-out forwards';
            currentPage.addEventListener('animationend', () => {
                currentPage.classList.remove('active');
                currentPage.style.animation = '';
                
                nextPage.classList.add('active');
                nextPage.style.animation = 'fadeIn 0.3s ease-out forwards';
                loadPageData(page);
            }, { once: true });
        } else {
            nextPage.classList.add('active');
            nextPage.style.animation = 'fadeIn 0.3s ease-out forwards';
            loadPageData(page);
        }
    });
});

// Ajout des animations pour le chargement initial
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
});

// Chargement des données selon la page
function loadPageData(page) {
    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'stock':
            loadStock();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'rapports':
            loadRapport();
            break;
    }
}

// Fonctions de chargement des données
// Animation de chargement
function showLoading(element) {
    element.style.opacity = '0.5';
    element.style.pointerEvents = 'none';
    const loader = document.createElement('div');
    loader.className = 'loading-spinner';
    element.appendChild(loader);
}

function hideLoading(element) {
    element.style.opacity = '1';
    element.style.pointerEvents = 'auto';
    const loader = element.querySelector('.loading-spinner');
    if (loader) loader.remove();
}

// Fonction pour formater les prix en FCFA
function formatPrixFCFA(prix) {
    return prix.toLocaleString('fr-FR', {
        style: 'currency',
        currency: 'XOF',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

import config from './config.js';

// Afficher l'indicateur de démarrage du serveur
function showServerStarting() {
    const indicator = document.createElement('div');
    indicator.className = 'server-starting';
    indicator.innerHTML = `
        <p>🔄 Le serveur est en cours de démarrage... Veuillez patienter quelques instants.</p>
    `;
    document.body.prepend(indicator);
    return indicator;
}

// Vérification de la connexion au serveur
async function checkServerConnection(retries = 10) {
    const indicator = document.querySelector('.server-starting');
    if (indicator) {
        indicator.innerHTML = `
            <div class="alert alert-info">
                <p>🔄 Connexion au serveur...</p>
                <p class="text-muted">Premier démarrage : 2-3 minutes</p>
                <div class="progress mt-2">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" style="width: 0%"></div>
                </div>
            </div>
        `;
    }

    for (let i = 0; i < retries; i++) {
        try {
            if (indicator) {
                const progressBar = indicator.querySelector('.progress-bar');
                progressBar.style.width = `${(i / retries) * 100}%`;
            }

            await config.fetchWithRetry(`${config.API_URL}/health`);
            console.log('💚 Serveur connecté');
            if (indicator) indicator.remove();
            return true;
        } catch (err) {
            console.log(`❗ Tentative ${i + 1}/${retries}`);
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, config.TIMEOUTS.RETRY_DELAY));
            }
        }
    }

    if (indicator) {
        indicator.innerHTML = `
            <div class="alert alert-warning">
                <p>⚠️ Connexion impossible pour le moment</p>
                <p>Cliquez <a href="javascript:window.location.reload()">ici</a> pour réessayer</p>
            </div>
        `;
    }
    return false;
}

// Fonction de gestion des erreurs réseau
function handleNetworkError(error) {
    console.error('Erreur réseau:', error);
    if (!navigator.onLine) {
        return 'Vous êtes hors ligne. Vérifiez votre connexion internet.';
    }
    if (error.name === 'AbortError') {
        return 'La requête a pris trop de temps. Veuillez réessayer.';
    }
    return 'Impossible de se connecter au serveur. Veuillez réessayer plus tard.';
}

// Fonction utilitaire pour les appels API
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    // Ajout de l'URL de base de l'API
    const fullUrl = url.startsWith('http') ? url : `${config.API_URL}${url}`;
    
    // Configuration par défaut
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        }
    };
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout || config.TIMEOUTS.DEFAULT_REQUEST);
    
    try {
        const response = await fetch(fullUrl, {
            ...defaultOptions,
            ...options,
            signal: controller.signal
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Erreur HTTP: ${response.status}`);
        }
        clearTimeout(id);
        return await response.json();
    } catch (err) {
        const errorMessage = handleNetworkError(err);
        showNotification('error', errorMessage);
        throw new Error(errorMessage);
    }
}

// Fonction de gestion des erreurs
function handleError(error, context) {
    console.error(`Erreur dans ${context}:`, error);
    const message = error.message || 'Une erreur est survenue';
    showNotification('error', message);

    // Réinitialisation de l'interface en cas d'erreur
    hideLoading(document.querySelector('.page.active'));

    // Réessayer automatiquement dans certains cas
    if (message.includes('connexion') || message.includes('hors ligne')) {
        setTimeout(() => {
            console.log('Tentative de reconnexion...');
            loadPageData(document.querySelector('.page.active').id);
        }, 5000);
    }
}

async function loadDashboard() {
    const dashboard = document.getElementById('dashboard');
    showLoading(dashboard);
    try {
        const [articles, transactions, alertes] = await Promise.all([
            fetchWithTimeout('/api/articles'),
            fetchWithTimeout('/api/transactions/aujourd-hui'),
            fetchWithTimeout('/api/reports/alertes')
        ]);

        document.getElementById('totalArticles').textContent = articles.length;
        
        const ventes = transactions.filter(t => t.type === 'SORTIE')
            .reduce((sum, t) => sum + t.quantite, 0);
        document.getElementById('ventesJour').textContent = ventes;

        const entrees = transactions.filter(t => t.type === 'ENTREE')
            .reduce((sum, t) => sum + t.quantite, 0);
        document.getElementById('entreesJour').textContent = entrees;

        // Animation du compteur
        const alertesElement = document.getElementById('alertesStock');
        const targetValue = alertes.length;
        let currentValue = 0;
        const duration = 1000; // 1 seconde
        const increment = targetValue / (duration / 16); // 60 FPS

        const animate = () => {
            currentValue = Math.min(currentValue + increment, targetValue);
            alertesElement.textContent = Math.round(currentValue);
            if (currentValue < targetValue) {
                requestAnimationFrame(animate);
            }
        };
        animate();

        // Tableau des alertes
        const tbody = document.querySelector('#tableAlertesStock tbody');
        tbody.innerHTML = '';
        alertes.forEach(article => {
            tbody.innerHTML += `
                <tr>
                    <td>${article.reference}</td>
                    <td>${article.nom}</td>
                    <td class="stock-alert">${article.quantiteEnStock}</td>
                    <td>${article.seuilAlerte}</td>
                </tr>
            `;
        });
    } catch (err) {
        handleError(err, 'chargement du tableau de bord');
    } finally {
        hideLoading(dashboard);
    }
}

async function loadStock(page = 1) {
    try {
        const response = await config.fetchWithRetry(`${config.API_URL}/api/articles?page=${page}&limit=10`);
        const { data: articles, pagination } = response;
        
        const tbody = document.querySelector('#tableStock tbody');
        tbody.innerHTML = '';
        articles.forEach(article => {
            tbody.innerHTML += `
                <tr>
                    <td>${article.reference}</td>
                    <td>${article.nom}</td>
                    <td>${article.categorie}</td>
                    <td>${formatPrixFCFA(article.prixVente)}</td>
                    <td class="${article.quantiteEnStock <= article.seuilAlerte ? 'stock-alert' : ''}">${article.quantiteEnStock}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="editArticle('${article._id}')">Modifier</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteArticle('${article._id}')">Supprimer</button>
                    </td>
                </tr>
            `;
        });

        // Ajout de la pagination
        const paginationContainer = document.querySelector('#stockPagination');
        if (!paginationContainer) {
            const container = document.createElement('div');
            container.id = 'stockPagination';
            container.className = 'pagination-container mt-3';
            document.querySelector('#tableStock').after(container);
        }
        
        updatePagination('stockPagination', pagination, loadStock);

        // Mise à jour de la liste des articles dans le formulaire de transaction
        const select = document.querySelector('#formTransaction select[name="articleId"]');
        select.innerHTML = '<option value="">Sélectionner un article</option>';
        articles.forEach(article => {
            select.innerHTML += `<option value="${article._id}">${article.reference} - ${article.nom}</option>`;
        });
    } catch (err) {
        handleError(err, 'chargement du stock');
        showNotification('error', 'Erreur lors du chargement du stock. Réessai en cours...');
        setTimeout(() => loadStock(page), config.TIMEOUTS.RETRY_DELAY);
    }
}

// Fonction de mise à jour de la pagination
function updatePagination(containerId, pagination, callback) {
    const container = document.getElementById(containerId);
    const { page, pages, total } = pagination;
    
    let html = `
        <div class="d-flex justify-content-between align-items-center">
            <span>Total: ${total} articles</span>
            <div class="btn-group">
                <button class="btn btn-outline-primary" ${page <= 1 ? 'disabled' : ''} onclick="${callback.name}(1)">
                    «
                </button>
    `;
    
    for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) {
        html += `
            <button class="btn btn-outline-primary ${i === page ? 'active' : ''}" onclick="${callback.name}(${i})">
                ${i}
            </button>
        `;
    }
    
    html += `
                <button class="btn btn-outline-primary" ${page >= pages ? 'disabled' : ''} onclick="${callback.name}(${pages})">
                    »
                </button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

async function loadTransactions() {
    try {
        const transactions = await fetch(`${config.API_URL}/api/transactions`).then(r => r.json());
        const tbody = document.querySelector('#tableTransactions tbody');
        tbody.innerHTML = '';
        transactions.forEach(transaction => {
            const date = new Date(transaction.date).toLocaleString();
            const total = transaction.prix * transaction.quantite;
            tbody.innerHTML += `
                <tr>
                    <td>${date}</td>
                    <td>${transaction.article.reference} - ${transaction.article.nom}</td>
                    <td>${transaction.type === 'ENTREE' ? 'Entrée' : 'Sortie'}</td>
                    <td>${transaction.quantite}</td>
                    <td>${formatPrixFCFA(transaction.prix)}</td>
                    <td>${formatPrixFCFA(total)}</td>
                </tr>
            `;
        });
    } catch (err) {
        console.error('Erreur lors du chargement des transactions:', err);
        alert('Erreur lors du chargement des données');
    }
}

async function loadRapport() {
    const dateInput = document.getElementById('dateRapport');
    dateInput.value = new Date().toISOString().split('T')[0];
    await refreshRapport();
}

async function refreshRapport() {
    try {
        const date = document.getElementById('dateRapport').value;
        const rapport = await fetch(`${config.API_URL}/api/reports/journalier?date=${date}`).then(r => r.json());
        
        const container = document.getElementById('rapportJournalier');
        container.innerHTML = `
            <div class="card">
                <div class="card-body">
                    <h5 class="card-title">Rapport du ${rapport.date}</h5>
                    <div class="row mt-4">
                        <div class="col-md-6">
                            <h6>Entrées en stock</h6>
                            <p>Nombre d'articles: ${rapport.entrees.nombre}</p>
                            <p>Valeur totale: ${formatPrixFCFA(rapport.entrees.total)}</p>
                        </div>
                        <div class="col-md-6">
                            <h6>Sorties (Ventes)</h6>
                            <p>Nombre d'articles: ${rapport.sorties.nombre}</p>
                            <p>Valeur totale: ${formatPrixFCFA(rapport.sorties.total)}</p>
                        </div>
                    </div>
                    <h6 class="mt-4">Détail par article</h6>
                    <div class="table-responsive">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Référence</th>
                                    <th>Nom</th>
                                    <th>Entrées</th>
                                    <th>Sorties</th>
                                    <th>Stock final</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rapport.articles.map(article => `
                                    <tr>
                                        <td>${article.reference}</td>
                                        <td>${article.nom}</td>
                                        <td>${article.entrees}</td>
                                        <td>${article.sorties}</td>
                                        <td>${article.stockFinal}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Erreur lors du chargement du rapport:', err);
        alert('Erreur lors du chargement des données');
    }
}

// Gestion des formulaires
// Système de notification
function showNotification(type, message) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="ri-${type === 'success' ? 'checkbox-circle' : 'error-warning'}-line"></i>
            <span>${message}</span>
        </div>
    `;
    document.body.appendChild(notification);

    // Animation d'entrée
    setTimeout(() => notification.classList.add('show'), 10);

    // Animation de sortie
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Validation des formulaires en temps réel
function validateForm(form) {
    const inputs = form.querySelectorAll('input[required], select[required]');
    let isValid = true;

    inputs.forEach(input => {
        const isInputValid = input.value.trim() !== '';
        input.classList.toggle('is-invalid', !isInputValid);
        if (!isInputValid) isValid = false;
    });

    return isValid;
}

document.getElementById('btnSaveArticle').addEventListener('click', async () => {
    const form = document.getElementById('formArticle');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${config.API_URL}/api/articles`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) throw new Error('Erreur lors de l\'enregistrement');

        form.reset();
        bootstrap.Modal.getInstance(document.getElementById('modalArticle')).hide();
        loadStock();
        loadDashboard();
    } catch (err) {
        console.error('Erreur:', err);
        showNotification('error', 'Erreur lors de l\'enregistrement');
    }
});

document.getElementById('btnSaveTransaction').addEventListener('click', async () => {
    const form = document.getElementById('formTransaction');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`${config.API_URL}/api/transactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur lors de l\'enregistrement');
        }

        form.reset();
        bootstrap.Modal.getInstance(document.getElementById('modalTransaction')).hide();
        loadTransactions();
        loadStock();
        loadDashboard();
    } catch (err) {
        console.error('Erreur:', err);
        alert(err.message || 'Erreur lors de l\'enregistrement');
    }
});

document.getElementById('dateRapport').addEventListener('change', refreshRapport);

// Chargement initial avec vérification du serveur
async function initializeApp() {
    const dashboard = document.getElementById('dashboard');
    const loadingText = document.createElement('div');
    loadingText.className = 'loading-text';
    loadingText.textContent = 'Chargement en cours...';
    dashboard.appendChild(loadingText);

    const serverIndicator = showServerStarting();
    showLoading(dashboard);

    try {
        const isConnected = await checkServerConnection();
        if (!isConnected) {
            throw new Error('Le serveur est en cours de démarrage. Veuillez patienter quelques instants...');
        }
        await loadDashboard();
        // Supprimer l'indicateur de démarrage
        serverIndicator.remove();
        loadingText.remove();
    } catch (err) {
        handleError(err, 'initialisation');
        // Réessayer dans 10 secondes
        setTimeout(() => {
            loadingText.textContent = 'Nouvelle tentative de connexion...';
            initializeApp();
        }, 10000);
    }
}

initializeApp();
