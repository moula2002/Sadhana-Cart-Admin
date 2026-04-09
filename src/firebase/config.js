// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { getFunctions } from "firebase/functions";
import { getAuth } from "firebase/auth";   // 🔥 IMPORTANT

const firebaseConfig = {
  apiKey: "AIzaSyDpjMz_gzDUtdLtBryB1hDBccT7vgqRYaE",
  authDomain: "sadhana-cart.firebaseapp.com",
  projectId: "sadhana-cart",
  storageBucket: "sadhana-cart.firebasestorage.app",
  messagingSenderId: "126398142924",
  appId: "1:126398142924:web:90a0999a0ebc992e85a569",
  measurementId: "G-FER4YR4F73"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// 🔐 Authentication (ADMIN LOGIN KU MUST)
export const auth = getAuth(app);

// Other services
export const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const messaging = getMessaging(app);
export const functions = getFunctions(app);

export default app;