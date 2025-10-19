// src/firebase.js
// HMR-safe Firebase initializer with persistence disabled in development
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, setLogLevel } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

/* ------------------ config ------------------ */
const firebaseConfig = {
  apiKey: "AIzaSyC-dO0jJmt79tYIjNqY18yyK8DEpQYpLBQ",
  authDomain: "perfume-b7e1f.firebaseapp.com",
  projectId: "perfume-b7e1f",
  storageBucket: "perfume-b7e1f.firebasestorage.app",
  messagingSenderId: "719945958189",
  appId: "1:719945958189:web:beef3713614cc0feb489a4",
  measurementId: "G-BS273GZFJW"
};

/* ------------------ HMR-safe init & diagnostics ------------------ */
if (typeof window !== "undefined") {
  window.__FIREBASE_INIT_COUNT = (window.__FIREBASE_INIT_COUNT || 0) + 1;
  // Visible in console so you can confirm single init
  // eslint-disable-next-line no-console
  console.info(`[firebase] init count: ${window.__FIREBASE_INIT_COUNT}`);
}

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  // eslint-disable-next-line no-console
  console.info("[firebase] initialized new app");
} else {
  app = getApp();
  // eslint-disable-next-line no-console
  console.info("[firebase] reused existing app");
}

/* ------------------ service exports ------------------ */
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/* ------------------ dev logging (optional) ------------------ */
try {
  if (process.env.NODE_ENV === "development") {
    // enable verbose firestore logs while debugging (remove or set to 'error' in prod)
    try {
      setLogLevel("error"); // keep minimal logs so console isn't flooded; change to 'debug' only when needed
      // eslint-disable-next-line no-console
      console.info("[firebase] Firestore log level set to 'error' in dev");
    } catch (e) {
      // ignore
    }
  }
} catch (err) {
  // ignore
}

/* ------------------ Persistence: DISABLED in development ------------------
   Persistent IndexedDB is the most common source of intermittent INTERNAL ASSERTION
   failures during HMR/dev. We'll keep it OFF for development and enable in production.
   If you want persistence enabled in production, implement it behind NODE_ENV === 'production'.
*/
if (process.env.NODE_ENV === "production") {
  // in production you may enable persistence (optional)
  import("firebase/firestore").then(({ enableIndexedDbPersistence }) => {
    enableIndexedDbPersistence(db).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[firebase] enableIndexedDbPersistence failed:", err && err.code ? err.code : err);
    });
  });
} else {
  // eslint-disable-next-line no-console
  console.info("[firebase] Persistence is DISABLED in development to avoid HMR/indexeddb races");
}

/* ------------------ sanity checks ------------------ */
try {
  if (!db) console.warn("[firebase] db is falsy");
  if (!auth) console.warn("[firebase] auth is falsy");
} catch (err) {
  // ignore
}

/* ------------------ exports ------------------ */
export { app, db, storage, auth, googleProvider };
