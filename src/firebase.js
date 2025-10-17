// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Uses environment variables (recommended). See .env.local example below.
const firebaseConfig = {
  apiKey: "AIzaSyC-dO0jJmt79tYIjNqY18yyK8DEpQYpLBQ",
  authDomain: "perfume-b7e1f.firebaseapp.com",
  projectId: "perfume-b7e1f",
  storageBucket: "perfume-b7e1f.firebasestorage.app",
  messagingSenderId: "719945958189",
  appId: "1:719945958189:web:beef3713614cc0feb489a4",
  measurementId: "G-BS273GZFJW"
};

const app = initializeApp(firebaseConfig);

// Exports used throughout the app
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth };
