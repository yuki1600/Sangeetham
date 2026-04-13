import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sync user with backend
  const syncUser = async (user) => {
    if (!user) return null;
    try {
      const idToken = await user.getIdToken();
      
      // Set token in cookie so backend can read it
      document.cookie = `token=${idToken}; path=/; max-age=3600; SameSite=Lax`;

      console.log('Syncing user with backend...');
      const response = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const syncedUser = await response.json();
        console.log('User synced successfully:', syncedUser.role);
        return syncedUser;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Backend sync failed:', response.status, errorData);
        alert(`Authentication sync failed: ${errorData.error || 'Unknown server error'}`);
      }
    } catch (error) {
      console.error('Failed to sync user with backend:', error);
      alert('Connection error during authentication sync. Please check if the server is running.');
    }
    return null;
  };

  const loginWithGoogle = async () => {
    if (!auth) {
      alert('Google Login is not configured. Please check your .env file.');
      return;
    }
    try {
      console.log('Starting Google Login...');
      const result = await signInWithPopup(auth, googleProvider);
      const synced = await syncUser(result.user);
      if (synced) {
        setCurrentUser(synced);
      }
    } catch (error) {
      console.error('Login failed:', error);
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.warn('Login attempt cancelled or blocked by popup settings.');
      } else {
        alert(`Login failed: ${error.message}`);
      }
    }
  };

  const logout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      setCurrentUser(null);
      // Force reload to the landing page to clear all states and prevent blank screens
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const synced = await syncUser(fbUser);
        setCurrentUser(synced);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const updateProfile = async (formData) => {
    if (!currentUser) return;
    try {
      const idToken = await auth.currentUser.getIdToken();
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const updatedUser = await response.json();
        setCurrentUser(updatedUser);
        return updatedUser;
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const value = {
    user: currentUser,
    loading,
    loginWithGoogle,
    logout,
    updateProfile,
    isAdmin: currentUser?.role === 'admin',
    isEditor: currentUser?.role === 'editor' || currentUser?.role === 'admin',
    authEnabled: !!auth
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
