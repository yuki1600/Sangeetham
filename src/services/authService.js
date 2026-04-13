import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  getIdToken
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { apiUrl } from '../utils/api';

export const authService = {
  /**
   * Listen for auth changes and sync user metadata from the local backend.
   */
  subscribe(callback) {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        // Clear session cookie on logout (if applicable)
        callback(null);
        return;
      }

      // Get ID token to authenticate with our Express backend
      const token = await getIdToken(firebaseUser);
      
      try {
        // Sync with local backend
        const res = await fetch(apiUrl('/api/auth/sync'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (res.ok) {
          const userData = await res.json();
          callback(userData);
        } else {
          console.error('Failed to sync auth with local backend');
          callback({
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            picture: firebaseUser.photoURL,
            role: 'viewer'
          });
        }
      } catch (err) {
        console.error('Auth sync error:', err);
        callback(null);
      }
    });
  },

  async login() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Login failed:', error.message);
      throw error;
    }
  },

  async logout() {
    await signOut(auth);
  }
};
