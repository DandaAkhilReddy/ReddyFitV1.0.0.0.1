import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// Fix: Import firebase compat app to get User type.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { auth, googleProvider } from '../firebase';
import { useToast } from './useToast';

interface AuthContextType {
    user: firebase.User | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<firebase.User | null>(null);
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        // Fix: Use compat namespaced API for onAuthStateChanged
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        
        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = useCallback(async () => {
        try {
            // Fix: Use compat namespaced API for signInWithPopup
            await auth.signInWithPopup(googleProvider);
            showToast("Successfully signed in!", "success");
        } catch (error: any) {
            console.error("Error signing in with Google: ", error);
            showToast(`Sign-in failed: ${error.message}`, "error");
        }
    }, [showToast]);

    const signOutUser = useCallback(async () => {
        try {
            // Fix: Use compat namespaced API for signOut
            await auth.signOut();
            showToast("You have been signed out.", "info");
        } catch (error: any) {
            console.error("Error signing out: ", error);
            showToast(`Sign-out failed: ${error.message}`, "error");
        }
    }, [showToast]);

    const value = { user, loading, signInWithGoogle, signOutUser };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};