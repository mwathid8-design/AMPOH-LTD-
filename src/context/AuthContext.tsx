import * as React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import { User, Role, Branch } from "@/src/types";
import { auth, db } from "@/src/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  switchBranch: (branch: Branch) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 1. Try to fetch user profile by UID
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        
        if (userDoc.exists()) {
          setUser(userDoc.data() as User);
        } else {
          // 2. Check if this is the default admin
          if (firebaseUser.email === "mwathid8@gmail.com") {
            const defaultAdmin: User = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "System Admin",
              role: "ADMIN",
              branch: "COMBINED",
              clinicName: "AMPOH CLINIC GROUP",
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, "users", firebaseUser.uid), defaultAdmin);
            setUser(defaultAdmin);
          } else {
            // 3. Check if the admin pre-authorized this email
            const q = query(collection(db, "users"), where("email", "==", firebaseUser.email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              // Found a pre-authorized user (likely with a placeholder ID or just email)
              const preAuthDoc = querySnapshot.docs[0];
              const preAuthData = preAuthDoc.data();
              
              // Create the real user document with the actual UID
              const newUser: User = {
                ...preAuthData as User,
                uid: firebaseUser.uid,
                displayName: firebaseUser.displayName || preAuthData.displayName || "Staff Member",
                createdAt: preAuthData.createdAt || new Date().toISOString()
              };
              
              await setDoc(doc(db, "users", firebaseUser.uid), newUser);
              
              // If the pre-auth doc had a different ID (like email), delete it to avoid duplicates
              if (preAuthDoc.id !== firebaseUser.uid) {
                await deleteDoc(doc(db, "users", preAuthDoc.id));
              }
              
              setUser(newUser);
            } else {
              // Not authorized
              console.error("User not authorized in system:", firebaseUser.email);
              await signOut(auth);
              setUser(null);
            }
          }
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  const switchBranch = async (branch: Branch) => {
    if (user && user.role === 'ADMIN') {
      const updatedUser = { ...user, branch };
      setUser(updatedUser);
      // We don't necessarily need to persist this to Firestore if it's just a session switch
      // but for admins it's useful to keep track of their active branch.
      await setDoc(doc(db, "users", user.uid), updatedUser, { merge: true });
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, logout, switchBranch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
