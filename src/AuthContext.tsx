import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  avatarConfig?: any;
  plan: 'standard' | 'premium';
  isVerified?: boolean;
  imagesLeft: number;
  designerUsesLeft?: number;
  editUsesLeft?: number;
  followersCount: number;
  followingCount: number;
  arCredits: number;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), async (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          let needsUpdate = false;
          const updates: any = {};

          // Auto-fix for users who upgraded before arCredits were added
          if (data.plan === 'premium' && data.arCredits === undefined) {
            updates.arCredits = 15000;
            needsUpdate = true;
          }
          
          if (data.designerUsesLeft === undefined) {
            updates.designerUsesLeft = data.plan === 'premium' ? 15 : 2;
            needsUpdate = true;
          }
          
          if (data.editUsesLeft === undefined) {
            updates.editUsesLeft = data.plan === 'premium' ? 15 : 2;
            needsUpdate = true;
          }

          if (needsUpdate) {
            try {
              await updateDoc(doc(db, 'users', user.uid), updates);
            } catch (e) {
              console.error("Failed to auto-renew features", e);
            }
          }

          setProfile({ uid: user.uid, ...data, ...updates } as UserProfile);
        }
        setLoading(false);
      }, (error) => {
        console.error("Error fetching user profile:", error);
        setLoading(false);
      });
      return () => unsubscribeProfile();
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
