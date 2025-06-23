import { getSalesData, getInventory, getClients } from './modules/sales.js';
import { createDataTable, initChart, showLoading, hideLoading } from './ui-components.js';

// Tab configuration
const TAB_CONFIG = {
  employee: {
    dashboard: { loader: loadDashboardData },
    sales: { loader: loadSalesData },
    inventory: { loader: loadInventoryData },
    clients: { loader: loadClientsData }
  },
  admin: {
    executive: { loader: loadExecutiveData },
    departments: { loader: loadDepartmentsData },
    regions: { loader: loadRegionsData },
    portfolio: { loader: loadPortfolioData }
  }
};

export function initTabs(role) {
  const tabContainer = document.getElementById(`${role}-tabs`);
  if (!tabContainer) return;

  tabContainer.addEventListener('click', async (e) => {
    if (e.target.classList.contains('tab')) {
      const tabId = e.target.getAttribute('data-tab');
      const userId = auth.currentUser?.uid;
      
      // Update active tab UI
      tabContainer.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
      });
      e.target.classList.add('active');
      
      // Load content
      await loadTabContent(tabId, role, userId);
      
      // Update URL
      window.location.hash = tabId;
    }
  });
}

export async function loadTabContent(tabId, role, userId) {
  showLoading(`Loading ${tabId} data...`);
  
  try {
    // Hide all tab contents first
    document.querySelectorAll(`#${role}-dashboard .tab-content`).forEach(content => {
      content.classList.remove('active');
    });
    
    // Show current tab content
    const contentElement = document.getElementById(`${tabId}-tab`);
    contentElement.classList.add('active');
    
    // Load data if loader exists
    const loader = TAB_CONFIG[role]?.[tabId]?.loader;
    if (loader) {
      await loader(userId);
    }
  } catch (error) {
    console.error(`Error loading ${tabId}:`, error);
    contentElement.innerHTML = createAlert(`Failed to load ${tabId} data`, 'danger');
  } finally {
    hideLoading();
  }
}

// Data loading functions
async function loadDashboardData(userId) {
  const salesData = await getSalesData(userId);
  renderDashboardMetrics(salesData);
}

async function loadSalesData(userId) {
  const salesData = await getSalesData(userId);
  document.getElementById('sales-table-container').innerHTML = 
    createDataTable(
      ['Date', 'Client', 'Amount', 'Status'],
      salesData.map(item => ({
        Date: new Date(item.date).toLocaleDateString(),
        Client: item.clientName,
        Amount: `$${item.amount.toLocaleString()}`,
        Status: item.completed ? '✅ Completed' : '🟡 Pending'
      })),
      'sales-table'
    );
}

async function loadInventoryData() {
  const inventory = await getInventory();
  document.getElementById('inventory-table-container').innerHTML = 
    createDataTable(
      ['Item', 'Quantity', 'Status'],
      inventory.map(item => ({
        Item: item.name,
        Quantity: item.quantity,
        Status: item.quantity < 5 ? '🔴 Critical' : '🟢 Normal'
      })),
      'inventory-table'
    );
}

// Add similar functions for other tabs...