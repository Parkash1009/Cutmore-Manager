import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDtXNOHjbz-Ll-eBUdLhz71VxYWPW76kHg",
  authDomain: "ad-hallmark.firebaseapp.com",
  projectId: "ad-hallmark",
  storageBucket: "ad-hallmark.firebasestorage.app",
  messagingSenderId: "945985344782",
  appId: "1:945985344782:web:db6ae2e3f1395280e7f35f",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);