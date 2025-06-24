let currentUser = null;

  let currentTheme = 'light';
  let previewTheme = null;

  function applyTheme(theme, isPreview = false) {
      document.body.classList.remove('theme-light', 'theme-dark', 'theme-admin-dark');
      document.body.classList.add(`theme-${theme}`);
      if (!isPreview) {
          currentTheme = theme;
          previewTheme = null;
      } else {
          previewTheme = theme;
      }
  }

  async function saveSettings(user) {
      const saveButton = document.querySelector('#prefs-form [type="submit"]');

      try {
          if (saveButton) {
              saveButton.disabled = true;
              saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
          }

          const themeToSave = previewTheme || currentTheme;

          const settings = {
              theme: themeToSave,
              lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
          };

          await db.collection("userSettings").doc(user.uid).set(settings, { merge: true });
          applyTheme(themeToSave);
          showToast('Preferences saved successfully', 'success');
          return true;
      } catch (error) {
          console.error("Save error:", error);
          showToast(`Save failed: ${error.message}`, 'error');
          applyTheme(currentTheme);
          return false;
      } finally {
          if (saveButton) {
              saveButton.disabled = false;
              saveButton.textContent = 'Save Preferences';
          }
      }
  }

  async function loadUserSettings(user) {
      try {
          if (!user) return;
          const doc = await db.collection("userSettings").doc(user.uid).get();
          if (!doc.exists) {
              applyTheme('light');
              return;
          }
          const data = doc.data();
          if (data.theme) {
              currentTheme = data.theme;
              applyTheme(currentTheme);
          }

          setTimeout(() => {
              const themeSelect = document.getElementById('e-theme');
              if (themeSelect) themeSelect.value = currentTheme;
          }, 100);
      } catch (error) {
          console.error("Error loading settings:", error);
          applyTheme('light');
      }
  }

  function showToast(message, type = 'success') {
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);
      setTimeout(() => {
          toast.classList.add('show');
          setTimeout(() => {
              toast.classList.remove('show');
              setTimeout(() => toast.remove(), 300);
          }, 3000);
      }, 100);
  }

async function handleChangePassword(e) {
    e.preventDefault();

    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const changePasswordBtn = document.getElementById('change-password-btn');

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;

    if (newPassword !== confirmNewPassword) {
        showToast('New passwords do not match.', 'error');
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
        return;
    }

    if (newPassword.length < 6) {
        showToast('New password must be at least 6 characters long.', 'error');
        return;
    }

    if (!currentUser || !auth.currentUser) {
        showToast('User not logged in.', 'error');
        return;
    }

    changePasswordBtn.disabled = true;
    changePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Changing...';

    try {
        const credential = firebase.auth.EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
        await auth.currentUser.reauthenticateWithCredential(credential);
        await auth.currentUser.updatePassword(newPassword);

        showToast('Password changed successfully!', 'success');
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmNewPasswordInput.value = '';
    } catch (error) {
        console.error("Error changing password:", error);
        let errorMessage = 'Failed to change password.';
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect current password.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'New password is too weak.';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'Please log out and log in again to change your password.';
        }
        showToast(errorMessage, 'error');
    } finally {
        changePasswordBtn.disabled = false;
        changePasswordBtn.innerHTML = 'Change Password';
    }
}

async function getMainDashboardData() {
    try {
        const salesSnapshot = await db.collection("sales").get();
        const salesData = salesSnapshot.docs.map(doc => doc.data());

        let monthlyRevenueMap = {};
        let productSalesMap = {};
        let regionSalesMap = {};
        let customerSegmentSalesMap = {};
        let topProductsAggregated = {};

        salesData.forEach(sale => {
            if (sale.monthlySales) {
                for (const monthKey in sale.monthlySales) {
                    const revenue = sale.monthlySales[monthKey];
                    if (typeof revenue === 'number' && !isNaN(revenue)) {
                        const month = monthKey.replace('_', ' '); 
                        monthlyRevenueMap[month] = (monthlyRevenueMap[month] || 0) + revenue;

                        if (sale.productCategory) {
                            productSalesMap[sale.productCategory] = (productSalesMap[sale.productCategory] || 0) + revenue;
                        }

                        if (sale.salesTeam) {
                            regionSalesMap[sale.salesTeam] = (regionSalesMap[sale.salesTeam] || 0) + revenue;
                        }

                        if (sale.segment) {
                            customerSegmentSalesMap[sale.segment] = (customerSegmentSalesMap[sale.segment] || 0) + revenue;
                        }

                        if (sale.productCategory && sale.monthlySales) {
                            topProductsAggregated[sale.productCategory] = (topProductsAggregated[sale.productCategory] || 0) + revenue;
                        }
                    }
                }
            }
        });

        const sortedMonths = Object.keys(monthlyRevenueMap).sort((a, b) => {
            const [monthA, yearA] = a.split(' ');
            const [monthB, yearB] = b.split(' ');
            const dateA = new Date(`01 ${monthA} ${yearA}`);
            const dateB = new Date(`01 ${monthB} ${yearB}`);
            return dateA - dateB;
        });

        const months = sortedMonths;
        const revenue = sortedMonths.map(month => monthlyRevenueMap[month]);

        const regions = Object.keys(regionSalesMap);
        const regionSales = regions.map(region => regionSalesMap[region]);

        const products = Object.keys(productSalesMap);
        const productSales = products.map(product => productSalesMap[product]);

        const customerSegments = Object.keys(customerSegmentSalesMap);
        const segmentSales = customerSegments.map(segment => customerSegmentSalesMap[segment]);

        const sortedTopProducts = Object.entries(topProductsAggregated)
            .sort(([, salesA], [, salesB]) => salesB - salesA)
            .slice(0, 4) 
            .map(([name, sales]) => ({
                name: name,
                sales: sales,
                revenue: sales * 5, 
                growth: Math.floor(Math.random() * 30) - 10 
            }));

        const lastMonthDate = months.length > 0 ? new Date(`01 ${months[months.length - 1]}`) : new Date();
        const forecastMonths = [];
        const forecast = [];
        for (let i = 1; i <= 3; i++) {
            const nextMonthDate = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + i, 1);
            forecastMonths.push(nextMonthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }).replace('.', ''));
            forecast.push((revenue[revenue.length - 1] || 0) * (1 + 0.05 * i));
        }


        return {
            months: months,
            revenue: revenue,
            regions: regions,
            regionSales: regionSales,
            products: products,
            productSales: productSales,
            customerSegments: customerSegments,
            segmentSales: segmentSales,
            forecast: forecast,
            forecastMonths: forecastMonths,
            topProducts: sortedTopProducts,
        };
    } catch (error) {
        console.error("Error fetching main dashboard data:", error);
        return {
            months: [],
            revenue: [],
            regions: [],
            regionSales: [],
            products: [],
            productSales: [],
            customerSegments: [],
            segmentSales: [],
            forecast: [],
            forecastMonths: [],
            topProducts: [],
        };
    }
}

async function getInventoryData() {
    try {
        const inventorySnapshot = await db.collection("inventory").get();
        const inventoryItems = inventorySnapshot.docs.map(doc => doc.data());

        let totalItems = 0;
        let totalValue = 0;
        let lowStock = 0;
        let outOfStock = 0;
        let reorderAlerts = [];

        inventoryItems.forEach(item => {
            totalItems += item.quantity || 0;
            totalValue += (item.quantity || 0) * (item.value || 0);

            if (item.quantity !== undefined && item.reorderLevel !== undefined) {
                if (item.quantity === 0) {
                    outOfStock++;
                    reorderAlerts.push({
                        type: 'critical',
                        text: `Out of Stock: ${item.productName}`,
                        detail: `Product ID: ${item.productId}`,
                        action: 'Order Now'
                    });
                } else if (item.quantity < item.reorderLevel) {
                    lowStock++;
                    reorderAlerts.push({
                        type: 'warning',
                        text: `Low Stock: ${item.productName}`,
                        detail: `Current: ${item.quantity}, Reorder: ${item.reorderLevel}`,
                        action: 'Reorder'
                    });
                }
            }
        });

        const inStock = totalItems - lowStock - outOfStock;

        return {
            totalItems: totalItems,
            totalValue: totalValue,
            lowStock: lowStock,
            outOfStock: outOfStock,
            inStock: inStock,
            inventoryItems: inventoryItems,
            reorderAlerts: reorderAlerts,
            movementMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], 
            movementIn: [100, 120, 90, 150, 110, 130], 
            movementOut: [80, 110, 100, 130, 95, 120], 
        };
    } catch (error) {
        console.error("Error fetching inventory data:", error);
        return {
            totalItems: 0,
            totalValue: 0,
            lowStock: 0,
            outOfStock: 0,
            inStock: 0,
            inventoryItems: [],
            reorderAlerts: [],
            movementMonths: [],
            movementIn: [],
            movementOut: [],
        };
    }
}

async function getClientsData() {
    try {
        const clientsSnapshot = await db.collection("customers").get();
        const clientsData = clientsSnapshot.docs.map(doc => doc.data());

        let totalClients = clientsData.length;
        let clientTypesMap = {};


        const topClients = clientsData.map(client => ({
            branchCode: client.branchCode || 'N/A',
            customerName: client.customerName || 'N/A',
            customerGroup: client.customerGroup || 'N/A',
            location: client.location || 'N/A',
            totalSpend: Math.floor(Math.random() * 50000) + 10000, 
            lastOrder: '2024-05-20', 
            status: Math.random() > 0.2 ? 'Active' : 'Inactive',
        }));

        clientsData.forEach(client => {
            if (client.customerGroup) {
                clientTypesMap[client.customerGroup] = (clientTypesMap[client.customerGroup] || 0) + 1;
            }
        });
        const types = Object.keys(clientTypesMap);
        const typeCounts = types.map(type => clientTypesMap[type]);

        return {
            totalClients: totalClients,
            monthlyRevenue: 0, 
            newThisMonth: 0, 
            retentionRate: 0, 
            types: types,
            typeCounts: typeCounts,
            topClients: topClients,
            acquisitionMonths: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'], 
            newClients: [10, 15, 12, 18, 20, 14], 
            recentActivities: [ 
                { type: 'new', icon: 'user-plus', text: 'New client onboarded: ABC Corp.', time: '2 hours ago' },
                { type: 'update', icon: 'edit', text: 'Updated contact for XYZ Ltd.', time: '1 day ago' },
                { type: 'payment', icon: 'dollar-sign', text: 'Payment received from DEF Inc.', time: '3 days ago' },
            ],
        };
    } catch (error) {
        console.error("Error fetching clients data:", error);
        return {
            totalClients: 0,
            monthlyRevenue: 0,
            newThisMonth: 0,
            retentionRate: 0,
            types: [],
            typeCounts: [],
            topClients: [],
            acquisitionMonths: [],
            newClients: [],
            recentActivities: [],
        };
    }
}

export function initEmployeeDashboard(user) {
    currentUser = user; 
    console.log('Initializing employee dashboard with data from Firestore.');

    async function loadMainDashboard() {
        try {
            const mainData = await getMainDashboardData();
            updateSummaryStats(mainData);
            updateTopProductsTable(mainData.topProducts);
            initRevenueChart(mainData);
            initRegionalChart(mainData);
            initProductMixChart(mainData);
            initCustomerSegmentsChart(mainData);
            initForecastChart(mainData);
        } catch (e) {
            console.error("Error rendering main dashboard from Firestore:", e);
        }
    }

    document.querySelector('[data-section="inventory"]').addEventListener('click', async function() {
        try {
            const inventoryData = await getInventoryData();
            updateInventorySummary(inventoryData);
            initInventoryStatusChart(inventoryData);
            initInventoryMovementChart(inventoryData);
            updateInventoryTable(inventoryData.inventoryItems);
            updateReorderAlerts(inventoryData.reorderAlerts);
        } catch(e) {
            console.error("Error rendering inventory tab from Firestore:", e);
        }
    });

    document.querySelector('[data-section="clients"]').addEventListener('click', async function() {
        try {
            const clientsData = await getClientsData();
            updateClientsSummary(clientsData);
            initClientTypesChart(clientsData);
            initClientAcquisitionChart(clientsData);
            updateClientsTable(clientsData.topClients);
            updateRecentClientActivity(clientsData.recentActivities);
        } catch(e) {
            console.error("Error rendering clients tab from Firestore:", e);
        }
    });

    const changePasswordForm = document.getElementById('change-password-form');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleChangePassword);
    }

    loadMainDashboard();

    setTimeout(() => {
        const firstTab = document.querySelector('.nav-links li[data-section="dashboard"]');
        if (firstTab) {
            firstTab.click();
        }
    }, 100);

    console.log('Initializing dashboard for:', user.email);

      loadUserSettings(user).then(() => {
          const themeSelect = document.getElementById('e-theme');
          if (themeSelect) {
              themeSelect.addEventListener('change', (e) => {
                  const newTheme = e.target.value;
                  applyTheme(newTheme, true);
                  console.log('Preview theme:', newTheme);
              });
          }

          const prefsForm = document.getElementById('prefs-form');
          if (prefsForm) {
              prefsForm.addEventListener('submit', async (e) => {
                  e.preventDefault();
                  console.log('Save Preferences clicked');
                  await saveSettings(user);
              });
          }

          const resetBtn = document.getElementById('prefs-reset');
          if (resetBtn) {
              resetBtn.addEventListener('click', () => {
                  if (themeSelect) themeSelect.value = currentTheme;
                  applyTheme(currentTheme);
                  showToast('Preferences reset to current values', 'info');
              });
          }
      });
}

function updateSummaryStats(data) {
    document.querySelector('#dashboard-content .summary-card .stat:nth-child(1) .stat-value').textContent = `+12.5%`;
    document.querySelector('#dashboard-content .summary-card .stat:nth-child(2) .stat-value').textContent = `$284K`;
    document.querySelector('#dashboard-content .summary-card .stat:nth-child(3) .stat-value').textContent = `1,248`;
    document.querySelector('#dashboard-content .summary-card .stat:nth-child(4) .stat-value').textContent = `92%`;
}

function updateTopProductsTable(products) {
  const tableBody = document.querySelector('#dashboard-content .data-table tbody');
  if (!tableBody) return;
  tableBody.innerHTML = '';
  if (!products || products.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="4">No product data available.</td></tr>';
    return;
  }
  products.forEach(product => {
    tableBody.innerHTML += `
      <tr>
        <td>${product.name}</td>
        <td>${product.sales.toLocaleString()}</td>
        <td>$${product.revenue.toLocaleString()}</td>
        <td class="${product.growth >= 0 ? 'positive' : 'negative'}">${product.growth >= 0 ? '+' : ''}${product.growth}%</td>
      </tr>`;
  });
}

function updateInventorySummary(data) {
  document.querySelector('#inventory-content .summary-card .stat:nth-child(1) .stat-value').textContent = data.totalItems.toLocaleString();
  document.querySelector('#inventory-content .summary-card .stat:nth-child(2) .stat-value').textContent = `$${(data.totalValue / 1000).toFixed(0)}K`;
  document.querySelector('#inventory-content .summary-card .stat:nth-child(3) .stat-value').textContent = data.lowStock;
  document.querySelector('#inventory-content .summary-card .stat:nth-child(4) .stat-value').textContent = data.outOfStock;
}

function updateInventoryTable(inventoryItems) {
  const tableBody = document.getElementById('inventory-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = '';
  if (!inventoryItems || inventoryItems.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7">No inventory data available.</td></tr>';
    return;
  }
  inventoryItems.forEach(item => {
    const statusClass = item.quantity === 0 ? 'out-of-stock' : (item.quantity < item.reorderLevel ? 'low-stock' : 'in-stock');
    const statusText = statusClass.replace('-', ' ').replace(/\\b\\w/g, l => l.toUpperCase());
    tableBody.innerHTML += `
      <tr>
        <td>${item.productId || 'N/A'}</td>
        <td>${item.productName || 'N/A'}</td>
        <td>${item.category || 'N/A'}</td>
        <td>${item.quantity || 0}</td>
        <td>${item.reorderLevel || 'N/A'}</td>
        <td><span class="status-badge ${statusClass}">${statusText}</span></td>
        <td>$${((item.value || 0) * (item.quantity || 0)).toLocaleString()}</td>
      </tr>`;
  });
}

function updateReorderAlerts(alerts) {
  const alertsList = document.getElementById('reorder-alerts-list');
  if (!alertsList) return;
  alertsList.innerHTML = '';
  if (!alerts || alerts.length === 0) {
    alertsList.innerHTML = '<div class="alert-item">No reorder alerts.</div>';
    return;
  }
  alerts.forEach(alert => {
    alertsList.innerHTML += `
      <div class="alert-item ${alert.type}">
        <div class="activity-icon ${alert.type === 'critical' ? 'danger' : 'warning'}"><i class="fas fa-exclamation-triangle"></i></div>
        <div class="alert-content">
          <span class="alert-text">${alert.text}</span>
          <span class="alert-detail">${alert.detail}</span>
        </div>
        <button class="alert-action">${alert.action}</button>
      </div>`;
  });
}

function updateClientsSummary(data) {
  document.querySelector('#clients-content .summary-card .stat:nth-child(1) .stat-value').textContent = data.totalClients.toLocaleString();
  document.querySelector('#clients-content .summary-card .stat:nth-child(2) .stat-value').textContent = `$${(data.monthlyRevenue / 1000).toFixed(0)}K`;
  document.querySelector('#clients-content .summary-card .stat:nth-child(3) .stat-value').textContent = data.newThisMonth;
  document.querySelector('#clients-content .summary-card .stat:nth-child(4) .stat-value').textContent = `${data.retentionRate}%`;
}

function updateClientsTable(clients) {
  const tableBody = document.getElementById('clients-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = '';
  if (!clients || clients.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7">No client data available.</td></tr>';
    return;
  }
  clients.forEach(client => {
    const statusClass = client.status === 'Active' ? 'active' : 'inactive';
    tableBody.innerHTML += `
      <tr>
        <td>${client.branchCode || 'N/A'}</td>
        <td>${client.customerName || 'N/A'}</td>
        <td>${client.customerGroup || 'N/A'}</td>
        <td>${client.location || 'N/A'}</td>
        <td>$${(client.totalSpend || 0).toLocaleString()}</td>
        <td>${client.lastOrder || 'N/A'}</td>
        <td><span class="status-badge ${statusClass}">${client.status}</span></td>
      </tr>`;
  });
}

function updateRecentClientActivity(activities) {
  const list = document.getElementById('recent-client-activity-list');
  if (!list) return;
  list.innerHTML = '';
  if (!activities || activities.length === 0) {
    list.innerHTML = '<div class="activity-item">No recent activity.</div>';
    return;
  }
  activities.forEach(act => {
    list.innerHTML += `
      <div class="activity-item">
        <div class="activity-icon ${act.type}"><i class="fas fa-${act.icon}"></i></div>
        <div class="activity-content">
          <span class="activity-text">${act.text}</span>
          <span class="activity-time">${act.time}</span>
        </div>
      </div>`;
  });
}

function createChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        console.error(`Canvas with id "${canvasId}" not found.`);
        return;
    }
    const ctx = canvas.getContext('2d');
    const existingChart = Chart.getChart(ctx);
    if (existingChart) {
        existingChart.destroy();
    }
    new Chart(ctx, config);
}


function initRevenueChart(data) {
  createChart('revenue-trend-chart', {
    type: 'line', data: { labels: data.months, datasets: [{ label: 'Monthly Revenue ($)', data: data.revenue, borderColor: '#4e73df', backgroundColor: 'rgba(78, 115, 223, 0.05)', borderWidth: 2, fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: value => '$' + (value/1000) + 'K' } } } }
  });
}

function initRegionalChart(data) {
  createChart('regional-chart', {
    type: 'doughnut', data: { labels: data.regions, datasets: [{ data: data.regionSales, backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e'], borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
  });
}

function initProductMixChart(data) {
  createChart('product-mix-chart', {
    type: 'pie', data: { labels: data.products, datasets: [{ data: data.productSales, backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'], borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
  });
}

function initCustomerSegmentsChart(data) {
  createChart('customer-segments-chart', {
    type: 'bar', data: { labels: data.customerSegments, datasets: [{ label: 'Sales by Segment', data: data.segmentSales, backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

function initForecastChart(data) {
  createChart('forecast-chart', {
    type: 'line', data: { labels: data.forecastMonths, datasets: [{ label: 'Projected Revenue ($)', data: data.forecast, borderColor: '#1cc88a', backgroundColor: 'rgba(28, 200, 138, 0.05)', borderWidth: 2, fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false, scales: { y: { ticks: { callback: value => '$' + (value/1000) + 'K' } } } }
  });
}

function initInventoryStatusChart(data) {
  createChart('inventory-status-chart', {
    type: 'doughnut', data: { labels: ['In Stock', 'Low Stock', 'Out of Stock'], datasets: [{ data: [data.inStock, data.lowStock, data.outOfStock], backgroundColor: ['#1cc88a', '#f6c23e', '#e74a3b'], borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
  });
}

function initInventoryMovementChart(data) {
  createChart('inventory-movement-chart', {
    type: 'line', data: { labels: data.movementMonths, datasets: [{ label: 'Stock In', data: data.movementIn, borderColor: '#1cc88a', fill: true, tension: 0.3 }, { label: 'Stock Out', data: data.movementOut, borderColor: '#4e73df', fill: true, tension: 0.3 }] }, options: { responsive: true, maintainAspectRatio: false }
  });
}

function initClientTypesChart(data) {
  createChart('client-types-chart', {
    type: 'pie', data: { labels: data.types, datasets: [{ data: data.typeCounts, backgroundColor: ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e'], borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
  });
}

function initClientAcquisitionChart(data) {
  createChart('client-acquisition-chart', {
    type: 'bar', data: { labels: data.acquisitionMonths, datasets: [{ label: 'New Clients', data: data.newClients, backgroundColor: '#36b9cc' }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}