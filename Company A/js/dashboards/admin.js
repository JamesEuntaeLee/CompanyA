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

  async function saveAdminSettings(user) {
      const saveButton = document.querySelector('#admin-prefs-form [type="submit"]');

      try {
          if (saveButton) {
              saveButton.disabled = true;
              saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
          }

          const themeToSave = previewTheme || currentTheme;

          const settings = {
              theme: themeToSave,
              auditAlerts: document.getElementById('admin-audit-alerts')?.checked || false,
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
              const themeSelect = document.getElementById('admin-theme');
              if (themeSelect) themeSelect.value = currentTheme;
              const auditAlerts = document.getElementById('admin-audit-alerts');
              if (auditAlerts) auditAlerts.checked = data.auditAlerts !== false;
          }, 100);
      } catch (error) {
          console.error("Error loading settings:", error);
          applyTheme('light');
      }
  }

  export function initAdminDashboard(user) {
      console.log('Initializing admin dashboard for:', user.email);

      loadUserSettings(user).then(() => {
          const themeSelect = document.getElementById('admin-theme');
          if (themeSelect) {
              themeSelect.addEventListener('change', (e) => {
                  const newTheme = e.target.value;
                  applyTheme(newTheme, true);
                  console.log('Preview theme:', newTheme);
              });
          }

          const prefsForm = document.getElementById('admin-prefs-form');
          if (prefsForm) {
              prefsForm.addEventListener('submit', async (e) => {
                  e.preventDefault();
                  console.log('Save Preferences clicked');
                  await saveAdminSettings(user);
              });
          }

          const resetBtn = document.getElementById('admin-prefs-reset');
          if (resetBtn) {
              resetBtn.addEventListener('click', () => {
                  if (themeSelect) themeSelect.value = currentTheme;
                  const auditAlerts = document.getElementById('admin-audit-alerts');
                  if (auditAlerts) auditAlerts.checked = true;
                  applyTheme(currentTheme);
                  showToast('Preferences reset to current values', 'info');
              });
          }
      });
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


