import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, collection, query, where, getDocs, onSnapshot, orderBy, limit, addDoc, deleteDoc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const userRef = doc(db, 'users', result.user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      const photoURL = result.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.user.uid}`;
      await setDoc(userRef, {
        displayName: result.user.displayName || 'User',
        photoURL,
        plan: 'standard',
        imagesLeft: 10,
        followersCount: 0,
        followingCount: 0,
        arCredits: 100
      });
    }
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string, displayName: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, 'users', result.user.uid);
    const photoURL = `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.user.uid}`;
    await setDoc(userRef, {
      displayName: displayName || email.split('@')[0],
      photoURL,
      plan: 'standard',
      imagesLeft: 10,
      followersCount: 0,
      followingCount: 0,
      arCredits: 100
    });
  } catch (error) {
    console.error("Sign up failed", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, password: string) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Login failed", error);
    throw error;
  }
};

export const logout = () => signOut(auth);
