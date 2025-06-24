// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB-r2sjtSSwY1Cee3n-W0ffypSAbp7WjhE",
  authDomain: "company-a-d9fd1.firebaseapp.com",
  projectId: "company-a-d9fd1",
  storageBucket: "company-a-d9fd1.firebasestorage.app",
  messagingSenderId: "620729068716",
  appId: "1:620729068716:web:c02c7aedff2268fee78309",
  measurementId: "G-VSLDVVSYXK"
};


// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Enhanced login function with session persistence
function login(email, password) {
  return auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
      return auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
          return db.collection("users").doc(userCredential.user.uid).get()
            .then((userDoc) => {
              if (!userDoc.exists) {
                auth.signOut();
                return {
                  success: false,
                  error: "Account not authorized"
                };
              }
              
              // Check if account is disabled
              if (userDoc.data().disabled) {
                auth.signOut();
                return {
                  success: false,
                  error: "Account disabled. Please contact admin."
                };
              }
              
              return {
                success: true,
                user: {
                  uid: userCredential.user.uid,
                  email: userCredential.user.email,
                  name: userDoc.data().name || userCredential.user.email,
                  role: userDoc.data().role || 'employee',
                  avatarUrl: userDoc.data().avatarUrl || 'assets/user-avatar.png'
                }
              };
            });
        });
    })
    .catch((error) => {
      console.error("Login error:", error);
      let errorMessage = error.message.replace("Firebase: ", "");
      
      // More user-friendly error messages
      switch(error.code) {
        case 'auth/user-not-found':
          errorMessage = "No account found with this email";
          break;
        case 'auth/wrong-password':
          errorMessage = "Incorrect password";
          break;
        case 'auth/too-many-requests':
          errorMessage = "Too many attempts. Account temporarily locked.";
          break;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    });
}

function getUserWithAvatar(user) {
    return db.collection("users").doc(user.uid).get()
        .then(doc => {
            if (!doc.exists) {
                throw new Error("User document not found");
            }
            
            const data = doc.data();
            return {
                isAuthenticated: true,
                uid: user.uid,
                email: user.email,
                name: data.name || user.email,
                role: data.role || 'employee',
                avatarUrl: data.avatarUrl || 'assets/user-avatar.png',
                lastLogin: data.lastLogin || null
            };
        })
        .catch(error => {
            console.error("Error loading user:", error);
            return {
                isAuthenticated: true,
                uid: user.uid,
                email: user.email,
                name: user.email,
                role: 'employee',
                avatarUrl: 'assets/user-avatar.png',
                lastLogin: null
            };
        });
}

function monitorAuthState(callback) {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Update last login timestamp
            db.collection("users").doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            }).catch(console.error);
            
            getUserWithAvatar(user)
                .then(userData => callback(userData))
                .catch(error => {
                    console.error("Error loading user:", error);
                    callback({
                        isAuthenticated: true,
                        uid: user.uid,
                        email: user.email,
                        name: user.email,
                        role: 'employee',
                        avatarUrl: 'assets/user-avatar.png'
                    });
                });
        } else {
            callback({ isAuthenticated: false });
        }
    });
}

// Enhanced preference functions with validation
async function saveUserPreferences(userId, role, preferences) {
  try {
    if (!userId || !role) throw new Error("Missing required parameters");
    
    const validPreferences = {
      theme: ['light', 'dark', 'admin-dark'].includes(preferences.theme) ? preferences.theme : 'light',
      notifications: typeof preferences.notifications === 'boolean' ? preferences.notifications : true,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await db.collection("userPreferences").doc(`${userId}_${role}`).set(validPreferences);
    return true;
  } catch (error) {
    console.error("Error saving preferences:", error);
    return false;
  }
}

async function loadUserPreferences(userId, role) {
  try {
    if (!userId || !role) return null;
    
    const doc = await db.collection("userPreferences").doc(`${userId}_${role}`).get();
    if (!doc.exists) return null;
    
    return {
      theme: doc.data().theme || 'light',
      notifications: doc.data().notifications !== false,
      lastUpdated: doc.data().lastUpdated?.toDate() || null
    };
  } catch (error) {
    console.error("Error loading preferences:", error);
    return null;
  }
}

// Make functions available globally
window.login = login;
window.monitorAuthState = monitorAuthState;
window.saveUserPreferences = saveUserPreferences;
window.loadUserPreferences = loadUserPreferences;
window.auth = auth;
window.db = db;