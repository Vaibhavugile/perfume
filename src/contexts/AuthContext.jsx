// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile as firebaseUpdateProfile,
} from "firebase/auth";

import { auth, googleProvider, db } from "../firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();

function toPublicUser(u) {
  if (!u) return null;
  return {
    uid: u.uid,
    displayName: u.displayName || "",
    email: u.email || "",
    photoURL: u.photoURL || null,
    emailVerified: u.emailVerified || false,
    providerId:
      (u.providerData && u.providerData[0] && u.providerData[0].providerId) || null,
  };
}

/**
 * Create or update a Firestore user document at `users/{uid}`.
 * This is idempotent — it sets only provided fields and writes `createdAt`
 * only when the doc doesn't exist yet.
 */
async function createOrUpdateUserDoc(uid, { displayName, email, photoURL, provider } = {}) {
  if (!db || !uid) return;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // create new document
      await setDoc(ref, {
        uid,
        displayName: displayName || "",
        email: email || "",
        photoURL: photoURL || null,
        provider: provider || "password",
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        // You can add default isAdmin: false here if you want
      });
    } else {
      // update lastSeen and any changed fields (merge)
      await setDoc(
        ref,
        {
          displayName: displayName || snap.data().displayName || "",
          email: email || snap.data().email || "",
          photoURL: photoURL || snap.data().photoURL || null,
          provider: provider || snap.data().provider || "password",
          lastSeen: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn("createOrUpdateUserDoc error:", err);
    // don't throw — don't break auth flow for Firestore write issues
  }
}

/**
 * Fetch the Firestore user doc and merge it into the public user object.
 * If no doc exists, returns the public user as-is.
 */
async function enrichWithUserDoc(pu) {
  if (!pu || !db) return pu;
  try {
    const ref = doc(db, "users", pu.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return pu;
    const data = snap.data() || {};

    // Merge stored fields into the user object. Keep 'displayName' and 'email' from auth as fallback.
    return {
      ...pu,
      // prefer Firestore values if present
      displayName: data.displayName || pu.displayName,
      email: data.email || pu.email,
      photoURL: data.photoURL ?? pu.photoURL,
      // Common admin/role flag; if you use a different field name, include it too (e.g. roles)
      isAdmin: !!data.isAdmin,
      // spread any additional useful fields you want available on currentUser
      ...data,
    };
  } catch (err) {
    console.warn("enrichWithUserDoc error:", err);
    return pu;
  }
}

export function AuthProvider({ children }) {
  // load cached enriched user if present (backwards-compatible)
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("authUser");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      if (u) {
        // ensure Firestore user doc exists (non-blocking)
        try {
          await createOrUpdateUserDoc(u.uid, {
            displayName: u.displayName,
            email: u.email,
            photoURL: u.photoURL,
            provider: (u.providerData && u.providerData[0] && u.providerData[0].providerId) || null,
          });
        } catch (err) {
          console.warn("Could not create user doc on auth change", err);
        }

        // convert to public user and then enrich with Firestore user doc
        const pu = toPublicUser(u);
        const enriched = await enrichWithUserDoc(pu);
        setUser(enriched);
        try {
          localStorage.setItem("authUser", JSON.stringify(enriched));
        } catch (err) {}
      } else {
        setUser(null);
        try {
          localStorage.removeItem("authUser");
        } catch (err) {}
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // --- signup with email/password and create user doc ---
  const signupWithEmail = useCallback(async (email, password, displayName) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      try {
        await firebaseUpdateProfile(cred.user, { displayName });
      } catch (err) {
        console.warn("updateProfile failed", err);
      }
    }

    // create Firestore doc (ensure exists)
    await createOrUpdateUserDoc(cred.user.uid, {
      displayName: displayName || cred.user.displayName,
      email: cred.user.email,
      photoURL: cred.user.photoURL,
      provider: "password",
    });

    const pu = toPublicUser(cred.user);
    const enriched = await enrichWithUserDoc(pu);
    setUser(enriched);
    try {
      localStorage.setItem("authUser", JSON.stringify(enriched));
    } catch (err) {}
    return enriched;
  }, []);

  // --- sign in with email ---
  const signInWithEmail = useCallback(async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);

    // update lastSeen
    createOrUpdateUserDoc(cred.user.uid, {
      displayName: cred.user.displayName,
      email: cred.user.email,
      photoURL: cred.user.photoURL,
      provider: "password",
    });

    const pu = toPublicUser(cred.user);
    const enriched = await enrichWithUserDoc(pu);
    setUser(enriched);
    try {
      localStorage.setItem("authUser", JSON.stringify(enriched));
    } catch (err) {}
    return enriched;
  }, []);

  // --- Google popup sign-in (upsert user doc) ---
  const signInWithGoogle = useCallback(async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    // ensure Firestore doc
    await createOrUpdateUserDoc(cred.user.uid, {
      displayName: cred.user.displayName,
      email: cred.user.email,
      photoURL: cred.user.photoURL,
      provider: "google",
    });

    const pu = toPublicUser(cred.user);
    const enriched = await enrichWithUserDoc(pu);
    setUser(enriched);
    try {
      localStorage.setItem("authUser", JSON.stringify(enriched));
    } catch (err) {}
    return enriched;
  }, []);

  // sign out
  const logout = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
    try {
      localStorage.removeItem("authUser");
    } catch {}
  }, []);

  const sendPasswordReset = useCallback(async (email) => {
    return sendPasswordResetEmail(auth, email);
  }, []);

  const updateUserProfile = useCallback(async (profile) => {
    if (!auth.currentUser) throw new Error("No authenticated user");
    await firebaseUpdateProfile(auth.currentUser, profile);

    // also update user doc
    await createOrUpdateUserDoc(auth.currentUser.uid, {
      displayName: profile.displayName,
      photoURL: profile.photoURL,
    });

    // refresh enriched user
    const pu = toPublicUser(auth.currentUser);
    const enriched = await enrichWithUserDoc(pu);
    setUser(enriched);
    try {
      localStorage.setItem("authUser", JSON.stringify(enriched));
    } catch {}
    return enriched;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        // backward-compatible keys
        user,             // existing name some parts of your app may use
        loading,
        // add alias expected by admin components
        currentUser: user,
        // auth APIs
        signupWithEmail,
        signInWithEmail,
        signInWithGoogle,
        logout,
        sendPasswordReset,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
