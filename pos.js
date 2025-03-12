let updateInventoryModule;

async function loadInventoryModule() {
    try {
        updateInventoryModule = await import('./inventory.js');
    } catch (error) {
        console.error("Error loading inventory module:", error);
        updateInventoryModule = {
            updateInventory: function(product, quantity) {
                console.log(`[Fallback] ${quantity} units of ${product} removed from inventory.`);
            }
        };
    }
}

loadInventoryModule();

let dailySales = JSON.parse(localStorage.getItem('dailySales')) || [];
let currentTransaction = JSON.parse(localStorage.getItem('currentTransaction')) || [];
let salesChart = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('product-id')?.addEventListener('input', function() {
        const productId = this.value;
        let inventory = JSON.parse(localStorage.getItem("inventory")) || [];
        const product = inventory.find(p => p.serial === productId);

        if (product) {
            document.getElementById('product-name').value = product.name;
            document.getElementById('unit-type').value = 'kg';
            document.getElementById('price').value = product.price;
        } else {
            document.getElementById('product-name').value = '';
            document.getElementById('unit-type').value = 'kg';
            document.getElementById('price').value = '';
        }
    });

    document.getElementById('pos-form')?.addEventListener('submit', function(e) {
        e.preventDefault();

        const sale = {
            productId: document.getElementById('product-id').value,
            productName: document.getElementById('product-name').value,
            unitType: document.getElementById('unit-type').value,
            quantity: parseFloat(document.getElementById('quantity').value),
            price: parseFloat(document.getElementById('price').value),
            total: parseFloat(document.getElementById('quantity').value) * parseFloat(document.getElementById('price').value),
            time: new Date().toLocaleString()
        };

        currentTransaction.push(sale);
        updateSalesTable();
        updateCurrentTransactionTotal();
        this.reset();
    });

    updateSalesTable();
    updateHistoryTable();
    updateCurrentTransactionTotal();
    updateDailyTotal();
    updateSalesChart();
});

function updateSalesTable() {
    const tbody = document.getElementById('sales-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    currentTransaction.forEach((sale, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${sale.productId}</td>
            <td>${sale.productName}</td>
            <td>${sale.unitType}</td>
            <td>${sale.quantity}</td>
            <td>रु${sale.price.toFixed(2)}</td>
            <td>रु${sale.total.toFixed(2)}</td>
            <td>${sale.time}</td>
            <td><button class="delete-btn" style="background-color:rgb(237, 69, 69); color: white;" onclick="deleteItem(${index})">Delete</button></td>
        `;
    });

    localStorage.setItem('currentTransaction', JSON.stringify(currentTransaction));
}

function updateHistoryTable() {
    const tbody = document.getElementById('history-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    dailySales.forEach((sale, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${sale.productId}</td>
            <td>${sale.productName}</td>
            <td>${sale.unitType}</td>
            <td>${sale.quantity}</td>
            <td>रु${sale.price.toFixed(2)}</td>
            <td>रु${sale.total.toFixed(2)}</td>
            <td>${sale.time}</td>
            <td><button class="delete-btn" style="background-color:rgb(237, 69, 69); color: white;" onclick="deleteHistoryItem(${index})">Delete</button></td>
        `;
    });
}

function updateCurrentTransactionTotal() {
    const currentTransactionTotalElement = document.getElementById('current-transaction-total');
    if (!currentTransactionTotalElement) return;
    
    const currentTransactionTotal = currentTransaction.reduce((sum, sale) => sum + sale.total, 0);
    currentTransactionTotalElement.textContent = `Current Transaction Total: रु${currentTransactionTotal.toFixed(2)}`;
}

function updateDailyTotal() {
    const dailyTotalElement = document.getElementById('daily-total');
    if (!dailyTotalElement) return;
    
    const dailyTotal = dailySales.reduce((sum, sale) => sum + sale.total, 0);
    dailyTotalElement.textContent = `Daily Total: रु${dailyTotal.toFixed(2)}`;
}

window.deleteItem = function(index) {
    currentTransaction.splice(index, 1);
    updateSalesTable();
    updateCurrentTransactionTotal();
};

window.deleteHistoryItem = function(index) {
    dailySales.splice(index, 1);
    updateHistoryTable();
    updateDailyTotal();
    localStorage.setItem('dailySales', JSON.stringify(dailySales));
};

window.deleteCurrentTransaction = function() {
    currentTransaction = [];
    updateSalesTable();
    updateCurrentTransactionTotal();
    localStorage.setItem('currentTransaction', JSON.stringify(currentTransaction));
};

window.completePayment = function() {
    const receivedAmount = parseFloat(document.getElementById('received-amount')?.value || "0");
    const currentTransactionTotal = currentTransaction.reduce((sum, sale) => sum + sale.total, 0);
    const change = receivedAmount - currentTransactionTotal;
    const errorMessage = document.getElementById("error-message");

    if (change < 0) {
        if (errorMessage) {
            errorMessage.textContent = 'Insufficient amount ❌';
            errorMessage.style.color = "red";
            errorMessage.style.display = "block";
        }
        return;
    } else if (!receivedAmount) {
        if (errorMessage) {
            errorMessage.textContent = 'Please enter the valid amount  ❌';
            errorMessage.style.color = "red";
            errorMessage.style.display = "block";
        }
        return;
    } else {
        if (errorMessage) {
            errorMessage.textContent = "Thank you for shopping with us don't forget to take your receipt and change ✅";
            errorMessage.style.color = "#4CAF50";
            errorMessage.style.display = "block";
        }
    }
    

    if (updateInventoryModule && typeof updateInventoryModule.updateInventory === 'function') {
        currentTransaction.forEach(item => {
            updateInventoryModule.updateInventory(item.productId, item.quantity);
        });
    }

    dailySales = dailySales.concat(currentTransaction);
    localStorage.setItem('dailySales', JSON.stringify(dailySales));
    
    currentTransaction = [];
    updateSalesTable();
    updateHistoryTable();
    updateCurrentTransactionTotal();
    updateDailyTotal();
    
    const changeAmountElement = document.getElementById('change-amount');
    if (changeAmountElement) {
        changeAmountElement.textContent = `Change: रु${change.toFixed(2)}`;
    }
    
    updateSalesChart();
    
    const receivedAmountElement = document.getElementById('received-amount');
    if (receivedAmountElement) {
        receivedAmountElement.value = '';
    }
};

window.exportToCSV = function() {
    const headers = ['Product ID', 'Product Name', 'Unit Type', 'Quantity', 'Price/Unit', 'Total', 'Time'];
    const rows = dailySales.map(sale => [
        sale.productId,
        sale.productName,
        sale.unitType,
        sale.quantity,
        sale.price,
        sale.total,
        sale.time
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `sales_${new Date().toLocaleDateString()}.csv`);
    a.click();
};

function updateSalesChart() {
    const chartCanvas = document.getElementById('salesChart');
    if (!chartCanvas) return;
    
    const salesByProduct = dailySales.reduce((acc, sale) => {
        if (!acc[sale.productName]) {
            acc[sale.productName] = {
                quantity: 0,
                total: 0
            };
        }
        acc[sale.productName].quantity += sale.quantity;
        acc[sale.productName].total += sale.total;
        return acc;
    }, {});

    const sortedProducts = Object.entries(salesByProduct)
        .sort((a, b) => b[1].total - a[1].total);

    const labels = sortedProducts.map(([product]) => product);
    const data = sortedProducts.map(([, stats]) => stats.total);

    if (typeof Chart === 'undefined') {
        console.error("Chart.js not loaded");
        chartCanvas.textContent = "Chart.js library not loaded";
        return;
    }

    if (salesChart) {
        salesChart.destroy();
    }

    const ctx = chartCanvas.getContext('2d');
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Sales (रु)',
                data: data,
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Total Sales (रु)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Products'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                title: {
                    display: true,
                    text: 'Sales by Product'
                }
            }
        }
    });
}