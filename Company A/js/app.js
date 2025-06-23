import { auth, monitorAuthState } from './auth.js';
import { initTabs, loadTabContent } from './router.js';

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  monitorAuthState((user) => {
    if (user.isAuthenticated) {
      document.getElementById('user-name').textContent = user.email;
      document.getElementById('user-role').textContent = user.role;
      
      // Initialize tabs based on role
      initTabs(user.role);
      
      // Load initial tab content
      const defaultTab = window.location.hash.substring(1) || 'dashboard';
      loadTabContent(defaultTab, user.role, user.uid);
    } else {
      window.location.hash = '#login';
    }
  });
});