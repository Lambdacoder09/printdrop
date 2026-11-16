import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  projectId: 'studio-9707564164-423fc',
  appId: '1:381915458042:web:144b0864e15e421d5d9c43',
  storageBucket: 'studio-9707564164-423fc.firebasestorage.app',
  apiKey: 'AIzaSyDnnZ7jU6G-3adpx_psQk1lRzq1PlkdVHw',
  authDomain: 'studio-9707564164-423fc.firebaseapp.com',
  messagingSenderId: '381915458042',
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    ignoreUndefinedProperties: true,
  });
} catch {
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;

