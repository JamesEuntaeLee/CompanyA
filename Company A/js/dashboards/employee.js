// employee.js - Updated with working charts and data
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Fetch all data from Firebase
    const data = await fetchDashboardData();
    
    // Initialize charts with real data
    initRevenueChart(data);
    initRegionalChart(data);
    initProductMixChart(data);
    initCustomerSegmentsChart(data);
    initForecastChart(data);
    
    // Update summary stats
    updateSummaryStats(data);
    
    // Update top products table
    updateTopProductsTable(data.topProducts);
    
  } catch (error) {
    console.error("Error loading dashboard data:", error);
    // Fallback to sample data if Firebase fails
    loadSampleData();
  }
});

async function fetchDashboardData() {
  // Reference to your collections
  const salesRef = collection(db, "sales");
  const productsRef = collection(db, "products");
  const clientsRef = collection(db, "clients");
  const inventoryRef = collection(db, "inventory");
  
  // Fetch all data
  const [salesSnapshot, productsSnapshot, clientsSnapshot, inventorySnapshot] = await Promise.all([
    getDocs(salesRef),
    getDocs(productsRef),
    getDocs(clientsRef),
    getDocs(inventoryRef)
  ]);
  
  // Process sales data
  const salesData = salesSnapshot.docs.map(doc => doc.data());
  const monthlyRevenue = processMonthlyRevenue(salesData);
  
  // Process product data
  const productsData = productsSnapshot.docs.map(doc => doc.data());
  const topProducts = getTopProducts(productsData);
  
  // Process client data
  const clientsData = clientsSnapshot.docs.map(doc => doc.data());
  
  // Process inventory data
  const inventoryData = inventorySnapshot.docs.map(doc => doc.data());
  
  return {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    revenue: monthlyRevenue,
    regions: ['North', 'South', 'East', 'West'],
    regionSales: calculateRegionSales(salesData),
    products: topProducts.map(p => p.name),
    productSales: topProducts.map(p => p.sales),
    customerSegments: ['Retail', 'Wholesale', 'Corporate', 'Government'],
    segmentSales: calculateSegmentSales(clientsData),
    forecast: calculateForecast(monthlyRevenue),
    forecastMonths: ['Aug', 'Sep', 'Oct', 'Nov'],
    topProducts: topProducts,
    inventoryStatus: calculateInventoryStatus(inventoryData)
  };
}

// Helper functions to process Firebase data
function processMonthlyRevenue(salesData) {
  // Group sales by month and sum revenue
  const monthlyTotals = [0, 0, 0, 0, 0, 0, 0]; // Jan-Jul
  
  salesData.forEach(sale => {
    const saleDate = sale.date.toDate();
    const month = saleDate.getMonth(); // 0-11
    if (month >= 0 && month <= 6) { // Jan-Jul
      monthlyTotals[month] += sale.amount;
    }
  });
  
  return monthlyTotals;
}

function calculateRegionSales(salesData) {
  // Calculate sales by region (assuming each sale has a region field)
  const regions = {
    North: 0,
    South: 0,
    East: 0,
    West: 0
  };
  
  salesData.forEach(sale => {
    if (regions.hasOwnProperty(sale.region)) {
      regions[sale.region] += sale.amount;
    }
  });
  
  // Convert to percentages
  const total = Object.values(regions).reduce((a, b) => a + b, 0);
  return Object.values(regions).map(val => Math.round((val / total) * 100));
}

function getTopProducts(productsData) {
  // Sort products by sales and return top 4
  return productsData
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 4)
    .map(product => ({
      name: product.name,
      sales: product.totalSales,
      revenue: product.totalRevenue,
      growth: calculateGrowth(product.previousSales, product.totalSales)
    }));
}

function calculateSegmentSales(clientsData) {
  // Calculate sales by customer segment
  const segments = {
    Retail: 0,
    Wholesale: 0,
    Corporate: 0,
    Government: 0
  };
  
  clientsData.forEach(client => {
    if (segments.hasOwnProperty(client.segment)) {
      segments[client.segment] += client.totalSpend;
    }
  });
  
  // Convert to percentages
  const total = Object.values(segments).reduce((a, b) => a + b, 0);
  return Object.values(segments).map(val => Math.round((val / total) * 100));
}

function calculateForecast(monthlyRevenue) {
  // Simple forecasting based on recent growth
  const lastMonth = monthlyRevenue[monthlyRevenue.length - 1];
  const growthRate = 0.08; // 8% growth assumption
  
  return [
    Math.round(lastMonth * (1 + growthRate)),
    Math.round(lastMonth * (1 + growthRate) * 1.05),
    Math.round(lastMonth * (1 + growthRate) * 1.1),
    Math.round(lastMonth * (1 + growthRate) * 1.15)
  ];
}

function calculateInventoryStatus(inventoryData) {
  const status = {
    inStock: 0,
    lowStock: 0,
    outOfStock: 0
  };
  
  inventoryData.forEach(item => {
    if (item.quantity === 0) {
      status.outOfStock++;
    } else if (item.quantity < item.reorderLevel) {
      status.lowStock++;
    } else {
      status.inStock++;
    }
  });
  
  return status;
}

function calculateGrowth(previous, current) {
  if (previous === 0) return 100; // handle division by zero
  return Math.round(((current - previous) / previous) * 100);
}

// Update UI with real data
function updateSummaryStats(data) {
  const totalRevenue = data.revenue.reduce((a, b) => a + b, 0);
  const quarterlyRevenue = data.revenue.slice(-3).reduce((a, b) => a + b, 0);
  const growth = calculateGrowth(
    data.revenue.slice(0, 3).reduce((a, b) => a + b, 0),
    data.revenue.slice(-3).reduce((a, b) => a + b, 0)
  );
  
  document.querySelector('.stat-value:nth-child(1)').textContent = `+${growth}%`;
  document.querySelector('.stat-value:nth-child(2)').textContent = `$${(quarterlyRevenue / 1000).toFixed(1)}K`;
  document.querySelector('.stat-value:nth-child(3)').textContent = Math.floor(totalRevenue / 250); // simulated customer count
  document.querySelector('.stat-value:nth-child(4)').textContent = `${Math.min(100, Math.floor(growth / 12 * 100))}%`;
}

function updateTopProductsTable(products) {
  const tableBody = document.querySelector('.data-table tbody');
  tableBody.innerHTML = '';
  
  products.forEach(product => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.name}</td>
      <td>${product.sales.toLocaleString()}</td>
      <td>$${product.revenue.toLocaleString()}</td>
      <td class="${product.growth >= 0 ? 'positive' : 'negative'}">${product.growth >= 0 ? '+' : ''}${product.growth}%</td>
    `;
    tableBody.appendChild(row);
  });
}

// Fallback to sample data if Firebase fails
function loadSampleData() {
  const data = {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    revenue: [45000, 52000, 60000, 58000, 62000, 71000, 68000],
    regions: ['North', 'South', 'East', 'West'],
    regionSales: [35, 25, 20, 20],
    products: ['Product A', 'Product B', 'Product C', 'Product D'],
    productSales: [40, 30, 20, 10],
    customerSegments: ['Retail', 'Wholesale', 'Corporate', 'Government'],
    segmentSales: [35, 25, 30, 10],
    forecast: [65000, 68000, 72000, 75000],
    forecastMonths: ['Aug', 'Sep', 'Oct', 'Nov'],
    topProducts: [
      { name: 'Product A', sales: 1850, revenue: 98500, growth: 15 },
      { name: 'Product B', sales: 1420, revenue: 85200, growth: 8 },
      { name: 'Product C', sales: 980, revenue: 58800, growth: -3 },
      { name: 'Product D', sales: 750, revenue: 41500, growth: 22 }
    ]
  };
  
  initRevenueChart(data);
  initRegionalChart(data);
  initProductMixChart(data);
  initCustomerSegmentsChart(data);
  initForecastChart(data);
  updateSummaryStats(data);
  updateTopProductsTable(data.topProducts);
  
  console.warn("Using sample data due to Firebase connection issues");
}

// Chart initialization functions (same as before but with proper error handling)
function initRevenueChart(data) {
  const ctx = document.getElementById('revenue-trend-chart')?.getContext('2d');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.months,
      datasets: [{
        label: 'Monthly Revenue ($)',
        data: data.revenue,
        borderColor: '#4e73df',
        backgroundColor: 'rgba(78, 115, 223, 0.05)',
        borderWidth: 2,
        pointBackgroundColor: '#4e73df',
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: function(value) {
              return '$' + value.toLocaleString();
            }
          }
        }
      }
    }
  });
}

// Other chart init functions remain the same as previous version...
// (Include all the other chart initialization functions from the previous version)