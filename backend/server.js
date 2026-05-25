require('dotenv').config();

// Résolution DNS prioritaire IPv4 pour éviter les pannes dual-stack (fetch failed)
const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// ── Validation des variables d'environnement critiques ──
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Variable d'environnement manquante : ${key}`);
    process.exit(1); // Arrêt immédiat si config critique absente
  }
});

if (process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️  JWT_SECRET trop court (< 32 caractères). Utilisez openssl rand -hex 64');
}

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

// ── FRONTEND_URL autorisé ──
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ── Sécurité : Headers HTTP (helmet) ──
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // pour les images/assets
}));

// ── Sécurité : CORS strict ──
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
app.use(cors({
  origin: (origin, callback) => {
    // Autoriser les requêtes sans origin (Postman, curl, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS bloqué pour : ${origin}`));
  },
  credentials: true,
}));

// ── Sécurité : Rate Limiting ──

// Limite globale : 200 req/15min par IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de requêtes, réessayez dans 15 minutes.' },
});

// Limite stricte sur auth : 10 tentatives/15min par IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
});

app.use(globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Body Parser ──
app.use(express.json({ limit: '10mb' })); // Limite augmentée pour autoriser les images base64

// ── Socket.IO ──
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware pour attacher l'instance io à chaque requête
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ── Connexion MongoDB ──
connectDB();

// ── Routes ──
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/books',         require('./routes/books'));
app.use('/api/loans',         require('./routes/loans'));
app.use('/api/ai',            require('./routes/ai'));
app.use('/api/stats',         require('./routes/stats'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/conversations', require('./routes/conversations'));

// ── Health Check ──
app.get('/', (req, res) => {
  res.json({
    message: '📚 LibraFlow API — En ligne !',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
  });
});

// ── Gestion Socket.IO ──
io.on('connection', (socket) => {
  console.log('🔌 Client connecté :', socket.id);

  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`👤 Utilisateur ${userId} a rejoint sa room.`);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client déconnecté :', socket.id);
  });
});

// ── Route 404 ──
app.use((req, res) => {
  res.status(404).json({ message: 'Route introuvable' });
});

// ── Gestionnaire d'erreurs global ──
app.use((err, req, res, next) => {
  console.error('❌ Erreur serveur :', err.message);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === 'production'
      ? 'Erreur interne du serveur'
      : err.message,
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`🌐 Frontend autorisé : ${FRONTEND_URL}`);
});
