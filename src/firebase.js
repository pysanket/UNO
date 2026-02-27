// ─────────────────────────────────────────────────────────────────────────────
// FIREBASE SETUP
// ─────────────────────────────────────────────────────────────────────────────
// 1. Go to https://console.firebase.google.com
// 2. Create a new project (free Spark plan is enough)
// 3. Add a Web app — copy the firebaseConfig object values below
// 4. In Firebase console → Realtime Database → Create database (test mode)
// 5. That's it! Deploy and share.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
