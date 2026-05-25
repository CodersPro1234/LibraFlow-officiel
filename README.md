# 📚 LibraFlow

> **Système intelligent de gestion de bibliothèque universitaire**  
> Développé pour le Hackathon BIT — Stack full-stack moderne avec IA intégrée, gamification et PWA.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-06B6D4?logo=tailwindcss&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4-010101?logo=socket.io&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white)

---

## ✨ Fonctionnalités

### Pour les étudiants
- 🔍 **Recherche en temps réel** — recherche instantanée avec debounce dans le catalogue
- 📖 **Demande d'emprunt** — soumettre une demande en un clic, recevoir un bon PDF avec QR code
- 📄 **Reçu de retour automatique** — PDF généré automatiquement en temps réel via Socket.IO dès que le bibliothécaire confirme le retour
- 🏆 **Gamification** — points et badges débloqués à chaque livre rendu
- 🤖 **Assistant IA (Lia)** — chat avec mémoire, résumés de livres, recommandations personnalisées
- 🔊 **TTS / STT** — lecture vocale des réponses IA & dictée vocale (Web Speech API)
- 🌐 **Multilingue** — interface FR / EN

### Pour les bibliothécaires
- 📷 **Scanner QR Code** — confirmer et retourner les emprunts via QR code
- 📊 **Dashboard admin** — statistiques temps réel (total livres, emprunts actifs, retards, top livres)
- ➕ **Gestion du catalogue** — ajouter, modifier, supprimer des livres avec images de couverture
- 👥 **Historique IA global** — voir les conversations IA de tous les étudiants
- 🔔 **Notifications temps réel** — alertes Socket.IO vers les étudiants concernés

### Technique
- 📱 **PWA** — installable, icône, offline cache (Workbox)
- ⚡ **Lazy loading** — code splitting par page, bundle optimisé
- 🔒 **Sécurité** — JWT, Helmet, rate limiting, CORS configuré
- 🗄️ **Historique de conversations** — persisté en MongoDB

---

## 🏗️ Architecture

```
LibraFlow/
├── backend/                    # API Express + Socket.IO
│   ├── models/
│   │   ├── User.js             # Utilisateurs (étudiant / bibliothécaire)
│   │   ├── Book.js             # Livres du catalogue
│   │   ├── Loan.js             # Emprunts
│   │   ├── Notification.js     # Notifications persistées
│   │   └── Conversation.js     # Historique conversations IA
│   ├── routes/
│   │   ├── auth.js             # Authentification + profil
│   │   ├── books.js            # CRUD livres
│   │   ├── loans.js            # Gestion des emprunts
│   │   ├── ai.js               # Chat IA, résumés, recommandations
│   │   ├── conversations.js    # Historique conversations IA
│   │   ├── stats.js            # Statistiques dashboard
│   │   └── notifications.js    # Notifications
│   ├── middleware/
│   │   └── auth.js             # JWT protect + librarianOnly
│   ├── server.js               # Point d'entrée Express + Socket.IO
│   └── .env.example            # Template variables d'environnement
│
└── frontend/                   # React 19 + Vite + TailwindCSS
    └── src/
        ├── pages/
        │   ├── Landing.jsx         # Page d'accueil publique
        │   ├── Login.jsx           # Connexion
        │   ├── Register.jsx        # Inscription (split-screen)
        │   ├── Dashboard.jsx       # Admin — statistiques
        │   ├── StudentHome.jsx     # Étudiant — accueil personnalisé
        │   ├── Catalogue.jsx       # Catalogue des livres
        │   ├── Loans.jsx           # Gestion des emprunts
        │   ├── AI.jsx              # Assistant IA avec historique
        │   ├── Profile.jsx         # Profil utilisateur
        │   └── NotFound.jsx        # Page 404
        ├── components/
        │   ├── Layout.jsx          # Navigation principale
        │   └── QRScanner.jsx       # Scanner QR Code (html5-qrcode)
        ├── context/
        │   ├── AuthContext.jsx     # Authentification globale + updateUser
        │   ├── SocketContext.jsx   # Socket.IO + notifications + reçus
        │   └── LanguageContext.jsx # Internationalisation FR/EN
        ├── utils/
        │   └── generatePDF.js      # Génération PDF (bon emprunt + reçu retour)
        └── api/
            └── axios.js            # Client HTTP avec intercepteur JWT
```

---

## 🚀 Installation

### Prérequis
- **Node.js** ≥ 18
- **MongoDB Atlas** (compte gratuit sur [mongodb.com](https://www.mongodb.com/atlas))
- **Compte Groq** (clé API gratuite sur [console.groq.com](https://console.groq.com)) *(optionnel — fallback intégré)*

### 1. Cloner le projet

```bash
git clone https://github.com/votre-username/LibraFlow.git
cd LibraFlow
```

### 2. Configurer le Backend

```bash
cd backend
npm install

# Copier le template des variables d'environnement
cp .env.example .env
```

Éditer `.env` et renseigner vos valeurs :

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/libraflow
JWT_SECRET=votre_secret_jwt_aleatoire_min_64_chars
JWT_EXPIRES_IN=7d
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx   # Optionnel
FRONTEND_URL=http://localhost:5173
```

### 3. Configurer le Frontend

```bash
cd ../frontend
npm install

# Créer le fichier d'environnement
echo "VITE_API_URL=http://localhost:5000/api" > .env
```

### 4. Seed la base de données *(optionnel — données de démo)*

```bash
cd ..
node setup.js
```

### 5. Lancer l'application

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

L'application est disponible sur **http://localhost:5173**

---

## 🔑 Comptes de démo *(après seed)*

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Bibliothécaire | `admin@libraflow.com` | `admin123` |
| Étudiant | `student@libraflow.com` | `student123` |

---

## 📡 API Endpoints

### Authentification
| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/auth/register` | Créer un compte |
| `POST` | `/api/auth/login` | Se connecter |
| `GET` | `/api/auth/me` | Profil courant |
| `PUT` | `/api/auth/profile` | Modifier son profil |
| `GET` | `/api/auth/users` | Liste étudiants *(librarian)* |

### Livres
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/books` | Liste / recherche / filtre |
| `POST` | `/api/books` | Ajouter un livre *(librarian)* |
| `PUT` | `/api/books/:id` | Modifier un livre *(librarian)* |
| `DELETE` | `/api/books/:id` | Supprimer *(librarian)* |

### Emprunts
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/loans` | Liste emprunts (filtrée par rôle) |
| `POST` | `/api/loans` | Créer un emprunt |
| `GET` | `/api/loans/:id/qrcode` | Générer le QR code |
| `PUT` | `/api/loans/:id/confirm` | Confirmer *(librarian + scan)* |
| `PUT` | `/api/loans/:id/return` | Retourner *(librarian + scan)* |

### Intelligence Artificielle
| Méthode | Route | Description |
|---------|-------|-------------|
| `POST` | `/api/ai/chat` | Chat avec Lia (LLaMA 3.3 via Groq) |
| `POST` | `/api/ai/summarize` | Résumé d'un livre (par ID ou titre) |
| `POST` | `/api/ai/recommend` | Recommandations personnalisées |

### Conversations IA
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/conversations` | Mes conversations |
| `POST` | `/api/conversations` | Nouvelle conversation |
| `PUT` | `/api/conversations/:id` | Mettre à jour (ajouter messages) |
| `DELETE` | `/api/conversations/:id` | Supprimer |
| `GET` | `/api/conversations/admin` | Toutes les conversations *(librarian)* |

### Statistiques & Notifications
| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/stats` | Stats dashboard (livres, emprunts, top books...) |
| `GET` | `/api/notifications` | Mes notifications |
| `PUT` | `/api/notifications/mark-read` | Marquer tout comme lu |

---

## ⚡ Événements Socket.IO

| Événement | Direction | Description |
|-----------|-----------|-------------|
| `join` | Client → Serveur | Rejoindre sa room personnelle |
| `notification` | Serveur → Client | Notification temps réel (badge, points, emprunt confirmé) |
| `return_receipt` | Serveur → Client | Données pour génération PDF reçu de retour |

---

## 🛠️ Stack technique

### Backend
| Technologie | Version | Usage |
|-------------|---------|-------|
| Node.js + Express | 4.x | Serveur HTTP + API REST |
| Socket.IO | 4.x | Temps réel (notifications, reçus) |
| Mongoose | 8.x | ODM MongoDB |
| Groq SDK (LLaMA 3.3) | latest | IA conversationnelle |
| JWT + bcryptjs | — | Authentification sécurisée |
| Helmet + express-rate-limit | — | Sécurité HTTP |
| QRCode | 1.5.x | Génération QR codes emprunts |

### Frontend
| Technologie | Version | Usage |
|-------------|---------|-------|
| React | 19 | UI composants |
| Vite | 7 | Build tool + HMR |
| TailwindCSS | 3 | Styles utility-first |
| React Router | 7 | Navigation SPA |
| Axios | 1.x | Client HTTP |
| Lucide React | latest | Icônes SVG |
| jsPDF | 4.x | Génération PDF (bons + reçus) |
| html5-qrcode | 2.x | Scanner QR code (caméra) |
| Socket.IO Client | 4.x | Temps réel |
| vite-plugin-pwa | 1.x | Service Worker + manifest |
| Web Speech API | natif | TTS + STT (sans lib) |

---

## 📱 Progressive Web App

LibraFlow est installable comme application native :
- **Icône** sur l'écran d'accueil (mobile & desktop)
- **Cache Workbox** — pages et assets disponibles hors ligne
- **Service Worker** généré automatiquement au build

```bash
cd frontend && npm run build   # Génère dist/sw.js + dist/workbox-*.js
```

---

## 🔐 Sécurité

- **Helmet** — headers HTTP sécurisés (CSP, HSTS, X-Frame-Options…)
- **Rate limiting** — 100 req/15min global, 10 req/15min sur login/register
- **JWT** — tokens signés, expiration configurable
- **Mots de passe** — hashés avec bcrypt (rounds: 12)
- **CORS** — origines restreintes à `FRONTEND_URL`
- **Body size limit** — 10kb max pour éviter les attaques par payload

---

## 🚢 Déploiement

### Frontend → Vercel

```bash
cd frontend && npm run build
# Déployer le dossier dist/ sur Vercel
# vercel.json déjà configuré pour le routing SPA
```

Variables d'environnement Vercel :
```
VITE_API_URL=https://votre-backend.railway.app/api
```

### Backend → Railway / Render

Variables d'environnement à configurer :
```
PORT=5000
NODE_ENV=production
MONGO_URI=...
JWT_SECRET=...
GROQ_API_KEY=...
FRONTEND_URL=https://votre-app.vercel.app
```

---

## 👥 Équipe

Projet réalisé dans le cadre du **Hackathon BIT (Burkina Institute of Technology)**.

---

## 📄 Licence

MIT — libre d'utilisation, modification et distribution.
