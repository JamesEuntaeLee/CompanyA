// ======================
// UI COMPONENTS MODULE
// ======================

// ----------------------
// NAVIGATION COMPONENTS
// ----------------------

/**
 * Renders role-based navigation
 * @param {string} role - User role ('admin' or 'employee')
 */
export function renderNavigation(role) {
    const navItems = {
        employee: [
            { icon: 'fas fa-tachometer-alt', text: 'Dashboard', page: 'dashboard' },
            { icon: 'fas fa-dollar-sign', text: 'Sales', page: 'sales' },
            { icon: 'fas fa-boxes', text: 'Inventory', page: 'inventory' },
            { icon: 'fas fa-users', text: 'Clients', page: 'clients' }
        ],
        admin: [
            { icon: 'fas fa-chart-pie', text: 'Executive', page: 'executive' },
            { icon: 'fas fa-building', text: 'Departments', page: 'departments' },
            { icon: 'fas fa-globe', text: 'Regions', page: 'regions' },
            { icon: 'fas fa-address-book', text: 'Portfolio', page: 'portfolio' }
        ]
    };

    const navHTML = navItems[role].map(item => `
        <li data-page="${item.page}">
            <a href="#${item.page}">
                <i class="${item.icon}"></i>
                <span>${item.text}</span>
            </a>
        </li>
    `).join('');

    document.getElementById('main-nav').innerHTML = navHTML;
    addNavigationEvents();
}

/**
 * Adds click handlers to navigation items
 */
function addNavigationEvents() {
    document.querySelectorAll('#main-nav li').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('#main-nav li').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

// ----------------------
// NAVIGATION SYSTEM (New - for sidebar nav)
// ----------------------

/**
 * Initializes sidebar navigation system
 * @param {string} role - User role
 */
export function initSidebarNavigation(role) {
    // Common navigation items
    let navItems = [
        { section: 'dashboard', icon: 'tachometer-alt', text: 'Dashboard' },
        { section: 'sales', icon: 'shopping-cart', text: 'Sales' },
        { section: 'inventory', icon: 'boxes', text: 'Inventory' },
        { section: 'clients', icon: 'users', text: 'Clients' }
    ];
    
    // Add role-specific items
    if (role === 'manager') {
        navItems.push(
            { section: 'team', icon: 'users-cog', text: 'Team' },
            { section: 'department', icon: 'building', text: 'Department' }
        );
    } else if (role === 'admin') {
        navItems.push(
            { section: 'users', icon: 'user-cog', text: 'Users' },
            { section: 'system', icon: 'cogs', text: 'System' },
            { section: 'audit', icon: 'clipboard-list', text: 'Audit' }
        );
    }
    
    // Add common items for manager and admin
    if (role === 'manager' || role === 'admin') {
        navItems.push({ section: 'reports', icon: 'file-alt', text: 'Reports' });
    }
    
    // Always add settings
    navItems.push({ section: 'settings', icon: 'cog', text: 'Settings' });
    
    // Generate the navigation HTML
    let navHTML = '';
    navItems.forEach(item => {
        navHTML += `
            <li data-section="${item.section}">
                <a href="#"><i class="fas fa-${item.icon}"></i> ${item.text}</a>
            </li>
        `;
    });
    
    // Inject the navigation
    document.getElementById('main-nav').innerHTML = navHTML;
    
    // Set up click handlers
    const navLinks = document.querySelectorAll('.nav-links li');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active nav item
            navLinks.forEach(item => item.classList.remove('active'));
            this.classList.add('active');
            
            // Get the section to show
            const section = this.getAttribute('data-section');
            
            // Hide all content sections
            document.querySelectorAll('.dashboard-content > div').forEach(div => {
                div.style.display = 'none';
            });
            
            // Show the selected section
            const contentDiv = document.getElementById(`${section}-content`);
            if (contentDiv) {
                contentDiv.style.display = 'block';
            }
            
            // Update breadcrumbs
            document.getElementById('current-page').textContent = this.textContent.trim();
            
            // Load data for the section if needed
            loadSectionData(section);
        });
    });
    
    // Activate the first item
    if (navLinks.length > 0) {
        navLinks[0].classList.add('active');
    }
}

function loadSectionData(section) {
    // Implement data loading for each section here
    console.log(`Loading data for ${section} section`);
    // Add your data loading logic for each section
}

// ----------------------
// TAB SYSTEM (Existing - preserved)
// ----------------------

/**
 * Creates a tab navigation component
 * @param {Array} tabs - Array of tab objects {id, label}
 * @param {string} activeTab - Initially active tab ID
 * @returns {string} HTML string
 */
export function createTabs(tabs, activeTab) {
    return `
        <div class="tab-container">
            ${tabs.map(tab => `
                <div class="tab ${tab.id === activeTab ? 'active' : ''}" 
                     data-tab="${tab.id}">
                    ${tab.label}
                </div>
            `).join('')}
        </div>
    `;
}

/**
 * Creates a tab content container
 * @param {string} tabId - Unique tab identifier
 * @param {boolean} isActive - Whether tab is initially active
 * @returns {string} HTML string
 */
export function createTabContent(tabId, isActive = false) {
    return `
        <div class="tab-content ${isActive ? 'active' : ''}" 
             id="${tabId}-tab">
            <!-- Content will be loaded here dynamically -->
        </div>
    `;
}

// ----------------------
// DASHBOARD COMPONENTS
// ----------------------

/**
 * Creates a metric card component
 * @param {string} title - Card title
 * @param {string} value - Main value
 * @param {string} change - Percentage change
 * @param {boolean} positive - Whether change is positive
 * @returns {string} HTML string
 */
export function createMetricCard(title, value, change, positive = true) {
    return `
        <div class="metric-card">
            <div class="metric-header">
                <h3>${title}</h3>
                <span class="trend ${positive ? 'positive' : 'negative'}">
                    <i class="fas fa-arrow-${positive ? 'up' : 'down'}"></i> ${change}%
                </span>
            </div>
            <div class="metric-value">${value}</div>
            <div class="metric-sparkline" id="sparkline-${title.toLowerCase().replace(' ', '-')}"></div>
        </div>
    `;
}

/**
 * Creates an alert component
 * @param {string} message - Alert text
 * @param {string} type - 'success', 'warning', or 'danger'
 * @returns {string} HTML string
 */
export function createAlert(message, type = 'warning') {
    const icons = {
        success: 'fa-check-circle',
        warning: 'fa-exclamation-triangle',
        danger: 'fa-times-circle'
    };
    
    return `
        <div class="alert alert-${type}">
            <i class="fas ${icons[type]}"></i>
            <span>${message}</span>
        </div>
    `;
}

// ----------------------
// DATA TABLE COMPONENTS
// ----------------------

/**
 * Creates a sortable table
 * @param {Array} headers - Table headers
 * @param {Array} data - Table data
 * @param {string} id - Table ID
 * @returns {string} HTML string
 */
export function createDataTable(headers, data, id = 'data-table') {
    return `
        <div class="table-container">
            <table id="${id}">
                <thead>
                    <tr>
                        ${headers.map(header => `
                            <th data-sort="${header.key}">
                                ${header.label}
                                <i class="fas fa-sort"></i>
                            </th>
                        `).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${data.map(row => `
                        <tr>
                            ${headers.map(header => `
                                <td>${row[header.key]}</td>
                            `).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

/**
 * Adds sorting functionality to tables
 * @param {string} tableId - Table ID
 */
export function enableTableSorting(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const headers = table.querySelectorAll('th[data-sort]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const key = header.getAttribute('data-sort');
            const isAscending = !header.classList.contains('asc');
            
            // Reset all headers
            headers.forEach(h => {
                h.classList.remove('asc', 'desc');
                h.querySelector('i').className = 'fas fa-sort';
            });
            
            // Set current header
            header.classList.add(isAscending ? 'asc' : 'desc');
            header.querySelector('i').className = `fas fa-sort-${isAscending ? 'up' : 'down'}`;
            
            // Sort data (implementation depends on your data structure)
            sortTableData(table, key, isAscending);
        });
    });
}

// ----------------------
// CHART COMPONENTS
// ----------------------

/**
 * Initializes a Chart.js chart
 * @param {string} canvasId - Canvas element ID
 * @param {string} type - Chart type
 * @param {Object} data - Chart data
 * @param {Object} options - Chart options
 */
export function initChart(canvasId, type, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;
    
    return new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            ...options
        }
    });
}

/**
 * Creates a chart container
 * @param {string} title - Chart title
 * @param {string} id - Canvas ID
 * @param {string} filters - Optional filter HTML
 * @returns {string} HTML string
 */
export function createChartContainer(title, id, filters = '') {
    return `
        <div class="chart-card">
            <div class="chart-header">
                <h3>${title}</h3>
                ${filters}
            </div>
            <div class="chart-wrapper">
                <canvas id="${id}"></canvas>
            </div>
        </div>
    `;
}

// ----------------------
// LOADING STATES
// ----------------------

/**
 * Shows loading state
 * @param {string} message - Loading message
 */
export function showLoading(message = 'Loading data...') {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner">
                <i class="fas fa-circle-notch fa-spin"></i>
            </div>
            <p>${message}</p>
        </div>
    `;
}

/**
 * Hides loading state
 */
export function hideLoading() {
    const loading = document.querySelector('.loading-state');
    if (loading) loading.remove();
}

// ======================
// UTILITY FUNCTIONS
// ======================

function sortTableData(table, key, ascending) {
    // Implementation depends on your data structure
    // This would typically involve:
    // 1. Getting all table rows
    // 2. Sorting them based on the key
    // 3. Rebuilding the table body
}

// Add to existing ui-components.js
export function showToast(message, type = 'success') {
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

