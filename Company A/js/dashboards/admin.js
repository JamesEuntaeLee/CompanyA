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
        }, 100);
    } catch (error) {
        console.error("Error loading settings:", error);
        applyTheme('light');
    }
}

async function getUsersData() {
    try {
        const usersSnapshot = await db.collection("users").get(); 
        return usersSnapshot.docs.map(doc => {
            const data = doc.data();
            const joinedDate = data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A';
            return {
                name: data.name,
                email: data.email,
                role: data.role,
                joined: joinedDate 
            };
        });
    } catch (error) {
        console.error("Error fetching users data:", error);
        return [];
    }
}

function updateUserAccountsTable(users) {
    const tableBody = document.getElementById('user-accounts-list');
    if (!tableBody) return;

    tableBody.innerHTML = ''; 

    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="no-data">No user accounts found.</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = `
            <tr>
                <td>${user.name || 'N/A'}</td>
                <td>${user.email || 'N/A'}</td>
                <td>${user.role || 'N/A'}</td>
                <td>${user.joined || 'N/A'}</td> </tr>
        `;
        tableBody.innerHTML += row;
    });
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
                applyTheme(currentTheme);
                showToast('Preferences reset to current values', 'info');
            });
        }
    });

    document.querySelector('[data-section="users"]').addEventListener('click', async function() {
        try {
            const usersData = await getUsersData();
            updateUserAccountsTable(usersData);
        } catch (e) {
            console.error("Error rendering users tab:", e);
        }
    });

    setTimeout(async () => {
        const usersContent = document.getElementById('users-content');
        if (usersContent && usersContent.style.display !== 'none') {
             try {
                const usersData = await getUsersData();
                updateUserAccountsTable(usersData);
            } catch (e) {
                console.error("Error initial loading of users data:", e);
            }
        }
    }, 100);
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