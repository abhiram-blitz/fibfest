import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB_PBcdXqd8lZxRMla3UNCOX5zgRK048NU",
  authDomain: "fibfest-3a2d4.firebaseapp.com",
  databaseURL: "https://fibfest-3a2d4-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "fibfest-3a2d4",
  storageBucket: "fibfest-3a2d4.firebasestorage.app",
  messagingSenderId: "261124402163",
  appId: "1:261124402163:web:508d7cfe53c71ffbc58086",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
