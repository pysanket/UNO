# 🃏 UNO Multiplayer

A real-time multiplayer UNO card game — play with friends from anywhere in the world!

**Features:**
- 🌍 Play from any device, any network
- 🔒 Private hands — no one sees your cards
- 🔗 Shareable room links
- ⚡ Real-time sync via Firebase
- 📱 Mobile-friendly
- 🎨 Beautiful dark UI

---

## 🚀 Quick Setup (5 minutes)

### Step 1 — Fork & clone this repo

```bash
git clone https://github.com/YOUR_USERNAME/uno-game.git
cd uno-game
npm install
```

### Step 2 — Create a free Firebase project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → give it a name → click through (no need for Google Analytics)
3. Once created, click **"Web"** icon (`</>`) to add a web app
4. Register app with any nickname → you'll see a `firebaseConfig` object like this:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

5. Copy those values into `src/firebase.js`

### Step 3 — Enable Realtime Database

1. In Firebase console → left sidebar → **"Realtime Database"**
2. Click **"Create database"**
3. Choose a region → click **"Start in test mode"** (allows open reads/writes for 30 days)
4. Click **"Enable"**

> **Note:** After 30 days, update the rules in Firebase console → Realtime Database → Rules to keep it open, or add authentication.

### Step 4 — Update `src/firebase.js`

```js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  databaseURL:       "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId:         "YOUR_PROJECT",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
}
```

### Step 5 — Run locally to test

```bash
npm run dev
```

Open `http://localhost:5173` — create a game, open another tab, join with the code. 

---

## 🌐 Deploy to GitHub Pages (free hosting)

### Option A — Automatic (recommended)

1. Push your code to GitHub:
```bash
git add .
git commit -m "Add Firebase config"
git push origin main
```

2. Go to your GitHub repo → **Settings** → **Pages**
3. Under "Build and deployment", set Source to **"GitHub Actions"**
4. The workflow in `.github/workflows/deploy.yml` will auto-deploy on every push
5. Your game will be live at: `https://YOUR_USERNAME.github.io/uno-game/`

### Option B — Netlify (even easier)

1. Go to [netlify.com](https://netlify.com) → "Add new site" → "Import from Git"
2. Connect your GitHub repo
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Click Deploy — done!

### Option C — Vercel

```bash
npm install -g vercel
vercel
```

---

## 🎮 How to Play

1. **Player 1** opens the site → enters name → clicks **"Create New Game"**
2. **Player 1** shares the room code or the auto-generated join link
3. **Other players** open the link → enter their name → click **"Join Game"**
4. Once 2–4 players have joined, the **host** clicks **"Start Game"**
5. Each player sees only **their own cards** — completely private!
6. On your turn: tap a playable card to play it, or tap the draw pile to draw
7. Wild cards let you choose the next color
8. First player to empty their hand wins! 🏆

### UNO Rules implemented:
- ✅ All number cards (0–9)
- ✅ Skip, Reverse, Draw Two
- ✅ Wild, Wild Draw Four
- ✅ Color selection for wild cards
- ✅ Draw penalty cards added to victim's hand
- ✅ Deck reshuffles when draw pile runs out
- ✅ 2-player Reverse acts as Skip

---

## 🔧 Firebase Security Rules (for production)

After testing, update your Firebase Realtime Database rules:

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true,
        "hands": {
          "$playerName": {
            ".read": true,
            ".write": true
          }
        }
      }
    }
  }
}
```

---

## 🛠 Tech Stack

- **React 18** + **Vite** — frontend
- **Firebase Realtime Database** — real-time game state sync
- **GitHub Actions** — CI/CD deployment
- No other dependencies!

---

## 📁 Project Structure

```
uno-game/
├── src/
│   ├── App.jsx          # Main app — all screens & game logic
│   ├── firebase.js      # ← PUT YOUR FIREBASE CONFIG HERE
│   ├── firebaseSync.js  # Firebase read/write helpers
│   ├── gameLogic.js     # Deck, shuffle, canPlay, makeGameState
│   ├── UnoCard.jsx      # Card component
│   ├── components.jsx   # ColorPicker, Toast, CopyBtn, Spinner
│   ├── main.jsx         # React entry point
│   └── index.css        # Global styles
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.js
├── package.json
└── .github/
    └── workflows/
        └── deploy.yml   # Auto-deploy to GitHub Pages
```
