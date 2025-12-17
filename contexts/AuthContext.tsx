import { db } from '@/configs/FirebaseConfig';
import { createUserWithEmailAndPassword, signOut as firebaseSignOut, getAuth, onAuthStateChanged, signInWithEmailAndPassword, User } from 'firebase/auth';
import { arrayRemove, arrayUnion, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// Get auth instance 
const auth = getAuth();

// User profile type
interface UserProfile {
    uid: string;
    email: string | null;
    phone: string | null;
    displayName: string | null;
    photoUrl: string | null;
    following: string[];
    createdAt: any;
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    // Auth methods
    signInWithEmail: (email: string, password: string) => Promise<void>;
    signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
    signOut: () => Promise<void>;
    checkEmailExists: (email: string) => Promise<boolean>;

    // Following methods
    followShop: (shopId: string) => Promise<void>;
    unfollowShop: (shopId: string) => Promise<void>;
    isFollowing: (shopId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // Fetch or create user profile
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

                if (userDoc.exists()) {
                    setUserProfile(userDoc.data() as UserProfile);
                } else {
                    // Create new user profile
                    const newProfile: UserProfile = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        phone: firebaseUser.phoneNumber,
                        displayName: firebaseUser.displayName,
                        photoUrl: firebaseUser.photoURL,
                        following: [],
                        createdAt: serverTimestamp(),
                    };
                    await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
                    setUserProfile(newProfile);
                }
            } else {
                setUserProfile(null);
            }

            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Sign in with email
    const signInWithEmail = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            throw new Error(error.message || 'Sign in failed');
        }
    };

    // Sign up with email
    const signUpWithEmail = async (email: string, password: string, displayName: string) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);

            // Create user profile
            const newProfile: UserProfile = {
                uid: result.user.uid,
                email: email,
                phone: null,
                displayName: displayName,
                photoUrl: null,
                following: [],
                createdAt: serverTimestamp(),
            };
            await setDoc(doc(db, 'users', result.user.uid), newProfile);
            setUserProfile(newProfile);
        } catch (error: any) {
            throw new Error(error.message || 'Sign up failed');
        }
    };

    // Sign out
    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setUserProfile(null);
        } catch (error: any) {
            throw new Error(error.message || 'Sign out failed');
        }
    };

    // Check if email exists (for smart form)
    const checkEmailExists = async (email: string): Promise<boolean> => {
        // We can use fetchSignInMethodsForEmail but it's deprecated
        // For now, we'll try to sign in and catch the error
        // In production, you'd want a backend check
        return false; // Simplified - will implement properly later
    };

    // Follow a shop
    const followShop = async (shopId: string) => {
        if (!user || !userProfile) {
            throw new Error('Must be logged in to follow');
        }

        try {
            // Add to user's following list
            await updateDoc(doc(db, 'users', user.uid), {
                following: arrayUnion(shopId)
            });

            // Add user to shop's followers
            await updateDoc(doc(db, 'shops', shopId), {
                followers: arrayUnion(user.uid),
                followerCount: (userProfile.following.length || 0) + 1
            });

            // Update local state
            setUserProfile(prev => prev ? {
                ...prev,
                following: [...prev.following, shopId]
            } : null);
        } catch (error: any) {
            console.error('Follow error:', error);
            throw new Error('Failed to follow shop');
        }
    };

    // Unfollow a shop
    const unfollowShop = async (shopId: string) => {
        if (!user || !userProfile) {
            throw new Error('Must be logged in to unfollow');
        }

        try {
            // Remove from user's following list
            await updateDoc(doc(db, 'users', user.uid), {
                following: arrayRemove(shopId)
            });

            // Remove user from shop's followers
            await updateDoc(doc(db, 'shops', shopId), {
                followers: arrayRemove(user.uid),
                followerCount: Math.max(0, (userProfile.following.length || 1) - 1)
            });

            // Update local state
            setUserProfile(prev => prev ? {
                ...prev,
                following: prev.following.filter(id => id !== shopId)
            } : null);
        } catch (error: any) {
            console.error('Unfollow error:', error);
            throw new Error('Failed to unfollow shop');
        }
    };

    // Check if user is following a shop
    const isFollowing = (shopId: string): boolean => {
        return userProfile?.following?.includes(shopId) || false;
    };

    const value: AuthContextType = {
        user,
        userProfile,
        isLoading,
        isAuthenticated: !!user,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        checkEmailExists,
        followShop,
        unfollowShop,
        isFollowing,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
