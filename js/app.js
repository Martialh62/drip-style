import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, where, serverTimestamp, getDoc } from 'https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js';
import { db, COLLECTIONS } from './config.js';

// Variable pour suivre l'édition d'un article
let currentEditingId = null;

// Fonction d'édition d'article
window.editItem = async (itemId) => {
    currentEditingId = itemId;
    const itemRef = doc(db, COLLECTIONS.ITEMS, itemId);
    const itemDoc = await getDoc(itemRef);
    const item = itemDoc.data();

    document.getElementById('itemName').value = item.name;
    document.getElementById('itemQuantity').value = item.quantity;
    document.getElementById('itemPrice').value = item.price;
    document.getElementById('alertThreshold').value = item.alertThreshold;

    const modal = new bootstrap.Modal(document.getElementById('addItemModal'));
    modal.show();
};

// Fonction de suppression d'article
window.deleteItem = async (itemId) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet article ?')) {
        try {
            await deleteDoc(doc(db, COLLECTIONS.ITEMS, itemId));
            loadStockData();
        } catch (error) {
            alert('Erreur lors de la suppression : ' + error.message);
        }
    }
};

// Gestion de la navigation
document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = e.target.closest('[data-page]').dataset.page;
        showPage(pageId);
    });
});

// Gestion des clics sur les icônes dans la navigation
document.querySelectorAll('[data-page] i').forEach(icon => {
    icon.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pageId = e.target.closest('[data-page]').dataset.page;
        showPage(pageId);
    });
});

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.add('d-none');
    });
    document.getElementById(pageId + 'Page').classList.remove('d-none');
    
    // Met à jour le lien actif
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.page === pageId) {
            link.classList.add('active');
        }
    });

    // Charge les données spécifiques à la page
    switch(pageId) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'stock':
            loadStockData();
            break;
        case 'sales':
            loadSalesData();
            break;
        case 'reports':
            loadReportsData();
            break;
    }
}

// Gestion du stock
// Système de notifications
function showStockAlert(items) {
    const toast = document.getElementById('stockAlert');
    const toastBody = toast.querySelector('.toast-body');
    
    if (items.length > 0) {
        const itemsList = items.map(item => 
            `<div class="d-flex justify-content-between align-items-center mb-2">
                <span>${item.name} (${item.quantity} en stock)</span>
                <span class="badge bg-warning text-dark">Seuil: ${item.alertThreshold}</span>
            </div>`
        ).join('');
        
        toastBody.innerHTML = `
            <h6 class="mb-3">Articles en alerte de stock :</h6>
            ${itemsList}
        `;
        
        const bsToast = new bootstrap.Toast(toast, {
            autohide: false
        });
        bsToast.show();
    }
}

async function loadStockData() {
    const stockTableBody = document.getElementById('stockTableBody');
    stockTableBody.innerHTML = '';

    try {
        // Charger toutes les catégories
        const categoriesCollection = collection(db, COLLECTIONS.CATEGORIES);
        const categoriesSnapshot = await getDocs(categoriesCollection);
        const categories = {};
        categoriesSnapshot.forEach(doc => {
            categories[doc.id] = doc.data().name;
        });

        // Charger les articles
        const itemsCollection = collection(db, COLLECTIONS.ITEMS);
        const snapshot = await getDocs(itemsCollection);
        const lowStockItems = [];
        
        // Réinitialiser les notifications précédentes
        const existingToast = bootstrap.Toast.getInstance(document.getElementById('stockAlert'));
        if (existingToast) {
            existingToast.hide();
        }
        
        snapshot.forEach(doc => {
            const item = { id: doc.id, ...doc.data() };
            if (item.quantity <= item.alertThreshold) {
                lowStockItems.push(item);
            }
            
            const row = `
                <tr>
                    <td>${item.id}</td>
                    <td>${categories[item.categoryId] || 'Non catégorisé'}</td>
                    <td>${item.name}</td>
                    <td class="${item.quantity <= item.alertThreshold ? 'low-stock' : ''}">${item.quantity}</td>
                    <td>${item.price.toLocaleString()} FCFA</td>
                    <td>
                        <button class="btn btn-sm btn-primary btn-icon" onclick="editItem('${item.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger btn-icon" onclick="deleteItem('${item.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            stockTableBody.innerHTML += row;
        });

        // Afficher les notifications pour les articles en alerte
        if (lowStockItems.length > 0) {
            showStockAlert(lowStockItems);
        }
    } catch (error) {
        console.error('Erreur lors du chargement du stock :', error);
    }
}

// Gestion des catégories
async function loadCategories() {
    const categorySelect = document.getElementById('category');
    categorySelect.innerHTML = '<option value="">Choisir une catégorie...</option>';

    try {
        const categoriesCollection = collection(db, COLLECTIONS.CATEGORIES);
        const snapshot = await getDocs(categoriesCollection);
        snapshot.forEach(doc => {
            const category = doc.data();
            categorySelect.innerHTML += `
                <option value="${doc.id}">${category.name}</option>
            `;
        });
    } catch (error) {
        console.error('Erreur lors du chargement des catégories:', error);
    }
}

// Ouvrir le modal de catégorie
document.getElementById('addCategoryBtn').addEventListener('click', () => {
    document.getElementById('categoryForm').reset();
    const categoryModal = new bootstrap.Modal(document.getElementById('categoryModal'));
    categoryModal.show();
});

// Enregistrer une nouvelle catégorie
document.getElementById('saveCategoryBtn').addEventListener('click', async () => {
    const categoryName = document.getElementById('categoryName').value;
    const categoryDescription = document.getElementById('categoryDescription').value;

    try {
        const categoriesCollection = collection(db, COLLECTIONS.CATEGORIES);
        await addDoc(categoriesCollection, {
            name: categoryName,
            description: categoryDescription,
            createdAt: serverTimestamp()
        });

        bootstrap.Modal.getInstance(document.getElementById('categoryModal')).hide();
        await loadCategories();
    } catch (error) {
        alert('Erreur lors de l\'enregistrement de la catégorie : ' + error.message);
    }
});

// Ajout/Modification d'article
// Réinitialiser currentEditingId et charger les catégories
document.querySelector('[data-bs-target="#addItemModal"]').addEventListener('click', async () => {
    currentEditingId = null;
    document.getElementById('itemForm').reset();
    await loadCategories();
});

document.getElementById('saveItemBtn').addEventListener('click', async () => {
    const itemName = document.getElementById('itemName').value;
    const quantity = parseInt(document.getElementById('itemQuantity').value);
    const price = parseFloat(document.getElementById('itemPrice').value);
    const alertThreshold = parseInt(document.getElementById('alertThreshold').value);
    const categoryId = document.getElementById('category').value;

    const itemData = {
        name: itemName,
        quantity: quantity,
        price: price,
        alertThreshold: alertThreshold,
        categoryId: categoryId,
        updatedAt: serverTimestamp()
    };

    try {
        if (currentEditingId) {
            const itemRef = doc(db, COLLECTIONS.ITEMS, currentEditingId);
            const oldDoc = await getDoc(itemRef);
            const oldQuantity = oldDoc.data().quantity;
            await updateDoc(itemRef, itemData);

            // Enregistrer le mouvement si la quantité a changé
            if (quantity !== oldQuantity) {
                const difference = quantity - oldQuantity;
                await recordStockMovement(
                    currentEditingId,
                    difference > 0 ? 'entrée' : 'sortie',
                    Math.abs(difference),
                    quantity
                );
            }
        } else {
            const itemsCollection = collection(db, COLLECTIONS.ITEMS);
            const newDoc = await addDoc(itemsCollection, itemData);
            // Enregistrer le mouvement initial
            await recordStockMovement(newDoc.id, 'entrée', quantity, quantity);
        }
        
        bootstrap.Modal.getInstance(document.getElementById('addItemModal')).hide();
        loadStockData();
        document.getElementById('itemForm').reset();
    } catch (error) {
        alert('Erreur lors de l\'enregistrement : ' + error.message);
    }
});

// Gestion des ventes
// Gestion du filtrage des ventes
document.getElementById('periodFilter').addEventListener('change', (e) => {
    const customDateRange = document.getElementById('customDateRange');
    if (e.target.value === 'custom') {
        customDateRange.classList.remove('d-none');
    } else {
        customDateRange.classList.add('d-none');
        loadFilteredSales(e.target.value);
    }
});

document.getElementById('startDate').addEventListener('change', () => loadFilteredSales('custom'));
document.getElementById('endDate').addEventListener('change', () => loadFilteredSales('custom'));

async function loadFilteredSales(period) {
    const startDate = new Date();
    const endDate = new Date();
    
    switch(period) {
        case 'day':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate.setDate(startDate.getDate() - startDate.getDay());
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month':
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'custom':
            const customStart = document.getElementById('startDate').value;
            const customEnd = document.getElementById('endDate').value;
            if (customStart) startDate.setTime(new Date(customStart).getTime());
            if (customEnd) endDate.setTime(new Date(customEnd).getTime());
            break;
    }

    try {
        const salesCollection = collection(db, COLLECTIONS.SALES);
        const salesQuery = query(salesCollection);
        const salesSnapshot = await getDocs(salesQuery);
        
        const categoriesCollection = collection(db, COLLECTIONS.CATEGORIES);
        const categoriesSnapshot = await getDocs(categoriesCollection);
        const categories = {};
        categoriesSnapshot.forEach(doc => {
            categories[doc.id] = doc.data().name;
        });

        const salesTableBody = document.getElementById('salesTableBody');
        salesTableBody.innerHTML = '';
        let totalAmount = 0;

        salesSnapshot.forEach(doc => {
            const sale = doc.data();
            const saleDate = sale.date?.toDate();
            
            if (saleDate && saleDate >= startDate && saleDate <= endDate) {
                const row = `
                    <tr>
                        <td>${saleDate.toLocaleDateString()}</td>
                        <td>${sale.itemName}</td>
                        <td>${categories[sale.categoryId] || 'Non catégorisé'}</td>
                        <td>${sale.quantity}</td>
                        <td>${sale.unitPrice.toLocaleString()} FCFA</td>
                        <td>${sale.totalPrice.toLocaleString()} FCFA</td>
                    </tr>
                `;
                salesTableBody.innerHTML += row;
                totalAmount += sale.totalPrice;
            }
        });

        document.getElementById('salesTotal').textContent = totalAmount.toLocaleString() + ' FCFA';
    } catch (error) {
        console.error('Erreur lors du chargement des ventes :', error);
    }
}

async function loadSalesData() {
    const itemSelect = document.getElementById('itemSelect');
    itemSelect.innerHTML = '<option value="">Sélectionnez un article</option>';

    try {
        const itemsCollection = collection(db, COLLECTIONS.ITEMS);
        const snapshot = await getDocs(itemsCollection);
        snapshot.forEach(doc => {
            const item = doc.data();
            itemSelect.innerHTML += `
                <option value="${doc.id}" data-price="${item.price}" data-quantity="${item.quantity}">
                    ${item.name} - ${item.price} FCFA (${item.quantity} en stock)
                </option>
            `;
        });

        // Charger les ventes du jour par défaut
        loadFilteredSales('day');
    } catch (error) {
        alert('Erreur lors du chargement des articles : ' + error.message);
    }
}

// Enregistrement des mouvements de stock
async function recordStockMovement(itemId, type, quantity, finalQuantity) {
    try {
        const itemRef = doc(db, COLLECTIONS.ITEMS, itemId);
        const itemDoc = await getDoc(itemRef);
        const item = itemDoc.data();

        const movementsCollection = collection(db, COLLECTIONS.STOCK_MOVEMENTS);
        await addDoc(movementsCollection, {
            itemId,
            itemName: item.name,
            categoryId: item.categoryId,
            type,
            quantity,
            finalQuantity,
            date: serverTimestamp()
        });
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement du mouvement :', error);
    }
}

// Enregistrement d'une vente
document.getElementById('saleForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const itemId = document.getElementById('itemSelect').value;
    const quantity = parseInt(document.getElementById('quantity').value);
    
    try {
        const itemRef = doc(db, COLLECTIONS.ITEMS, itemId);
        const itemDoc = await getDoc(itemRef);
        const item = itemDoc.data();

        if (quantity > item.quantity) {
            alert('Stock insuffisant !');
            return;
        }

        const newQuantity = item.quantity - quantity;

        // Mise à jour du stock
        await updateDoc(itemRef, {
            quantity: newQuantity
        });

        // Enregistrement de la vente
        const salesCollection = collection(db, COLLECTIONS.SALES);
        await addDoc(salesCollection, {
            itemId: itemId,
            itemName: item.name,
            categoryId: item.categoryId,
            quantity: quantity,
            unitPrice: item.price,
            totalPrice: item.price * quantity,
            date: serverTimestamp()
        });

        // Enregistrer le mouvement de stock
        await recordStockMovement(itemId, 'sortie', quantity, newQuantity);

        alert('Vente enregistrée avec succès !');
        document.getElementById('saleForm').reset();
        loadDashboardData();
        loadFilteredSales('day');
    } catch (error) {
        alert('Erreur lors de l\'enregistrement de la vente : ' + error.message);
    }
});

// Tableau de bord
async function loadDashboardData() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Nombre total d'articles et alertes
        let totalQuantity = 0;
        let lowStockCount = 0;
        
        const itemsCollection = collection(db, COLLECTIONS.ITEMS);
        const itemsSnapshot = await getDocs(itemsCollection);
        
        itemsSnapshot.forEach(doc => {
            const item = doc.data();
            totalQuantity += item.quantity;
            if (item.quantity <= item.alertThreshold) {
                lowStockCount++;
            }
        });

        document.getElementById('totalItems').textContent = totalQuantity;
        document.getElementById('lowStockItems').textContent = lowStockCount;

        // Ventes du jour
        const salesCollection = collection(db, COLLECTIONS.SALES);
        const salesQuery = query(salesCollection);
        const salesSnapshot = await getDocs(salesQuery);
        
        let dailyTotal = 0;
        let dailyItems = 0;

        salesSnapshot.forEach(doc => {
            const sale = doc.data();
            const saleDate = sale.date?.toDate();
            if (saleDate && saleDate >= today) {
                dailyTotal += sale.totalPrice;
                dailyItems += sale.quantity;
            }
        });

        document.getElementById('dailySales').textContent = dailyTotal.toLocaleString() + ' FCFA';
        document.getElementById('dailyEntries').textContent = dailyItems;

        
    } catch (error) {
        console.error('Erreur lors du chargement des données :', error);
    }
}

// Variables pour stocker les instances des graphiques
let salesChartInstance = null;
let topItemsChartInstance = null;

// Gestion des rapports
document.getElementById('reportType').addEventListener('change', (e) => {
    const salesSection = document.getElementById('salesReportSection');
    const stockSection = document.getElementById('stockMovementsSection');

    if (e.target.value === 'sales') {
        salesSection.classList.remove('d-none');
        stockSection.classList.add('d-none');
        loadSalesCharts();
    } else {
        salesSection.classList.add('d-none');
        stockSection.classList.remove('d-none');
        loadStockMovements();
    }
});

// Charger l'historique des mouvements de stock
async function loadStockMovements() {
    try {
        const movementsCollection = collection(db, COLLECTIONS.STOCK_MOVEMENTS);
        const categoriesCollection = collection(db, COLLECTIONS.CATEGORIES);

        const [movementsSnapshot, categoriesSnapshot] = await Promise.all([
            getDocs(movementsCollection),
            getDocs(categoriesCollection)
        ]);

        const categories = {};
        categoriesSnapshot.forEach(doc => {
            categories[doc.id] = doc.data().name;
        });

        const tableBody = document.getElementById('stockMovementsTableBody');
        tableBody.innerHTML = '';

        const movements = [];
        movementsSnapshot.forEach(doc => {
            movements.push({ id: doc.id, ...doc.data() });
        });

        // Trier par date décroissante
        movements.sort((a, b) => b.date?.toDate() - a.date?.toDate());

        movements.forEach(movement => {
            const date = movement.date?.toDate();
            const row = `
                <tr>
                    <td>${date ? date.toLocaleString() : 'N/A'}</td>
                    <td>${movement.itemName}</td>
                    <td>${categories[movement.categoryId] || 'Non catégorisé'}</td>
                    <td>
                        <span class="badge ${movement.type === 'entrée' ? 'bg-success' : 'bg-danger'}">
                            ${movement.type}
                        </span>
                    </td>
                    <td>${movement.quantity}</td>
                    <td>${movement.finalQuantity}</td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    } catch (error) {
        console.error('Erreur lors du chargement des mouvements :', error);
    }
}

// Rapports des ventes
async function loadSalesCharts() {
    try {
        // Destruction des graphiques existants s'ils existent
        if (salesChartInstance) {
            salesChartInstance.destroy();
        }
        if (topItemsChartInstance) {
            topItemsChartInstance.destroy();
        }

        // Graphique des ventes des 7 derniers jours
        salesChartInstance = new Chart(document.getElementById('salesChart'), {
            type: 'line',
            data: await getWeeklySalesData(),
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Graphique des articles les plus vendus
        topItemsChartInstance = new Chart(document.getElementById('topItemsChart'), {
            type: 'bar',
            data: await getTopItemsData(),
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    } catch (error) {
        alert('Erreur lors du chargement des rapports : ' + error.message);
    }
}

// Fonctions utilitaires pour les rapports
async function getWeeklySalesData() {
    const dates = [];
    const sales = [];
    
    // Récupérer toutes les ventes une seule fois
    const salesCollection = collection(db, COLLECTIONS.SALES);
    const salesQuery = query(salesCollection);
    const salesSnapshot = await getDocs(salesQuery);
    const allSales = [];
    
    salesSnapshot.forEach(doc => {
        const sale = doc.data();
        if (sale.date) {
            allSales.push({
                date: sale.date.toDate(),
                totalPrice: sale.totalPrice
            });
        }
    });
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);

        const total = allSales
            .filter(sale => sale.date >= date && sale.date < nextDate)
            .reduce((sum, sale) => sum + sale.totalPrice, 0);

        dates.push(date.toLocaleDateString());
        sales.push(total);
    }

    return {
        labels: dates,
        datasets: [{
            label: 'Ventes (FCFA)',
            data: sales,
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
        }]
    };
}

async function getTopItemsData() {
    const itemSales = {};
    const salesCollection = collection(db, COLLECTIONS.SALES);
    const salesQuery = query(salesCollection);
    const salesSnapshot = await getDocs(salesQuery);

    salesSnapshot.forEach(doc => {
        const sale = doc.data();
        if (itemSales[sale.itemName]) {
            itemSales[sale.itemName] += sale.quantity;
        } else {
            itemSales[sale.itemName] = sale.quantity;
        }
    });

    const sortedItems = Object.entries(itemSales)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5);

    return {
        labels: sortedItems.map(([name]) => name),
        datasets: [{
            label: 'Quantité vendue',
            data: sortedItems.map(([,qty]) => qty),
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgb(54, 162, 235)',
            borderWidth: 1
        }]
    };
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Si l'utilisateur est déjà connecté, charge la page dashboard
    if (auth.currentUser) {
        showPage('dashboard');
    }
});
