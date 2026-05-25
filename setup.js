const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT = 'bit-library';

const files = {
  'package.json': `{
  "name": "bit-library-backend",
  "version": "1.0.0",
  "description": "Smart Book Management System - BIT Hackathon",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "dotenv": "^16.3.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "cors": "^2.8.5",
    "@google/generative-ai": "^0.1.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}`,

  '.env': `PORT=5000
MONGO_URI=mongodb://localhost:27017/bit_library
JWT_SECRET=monsecretjwt2024
GEMINI_API_KEY=mets_ta_cle_gemini_ici`,

  'server.js': `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/auth',  require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/loans', require('./routes/loans'));
app.use('/api/ai',    require('./routes/ai'));
app.use('/api/stats', require('./routes/stats'));

app.get('/', (req, res) => {
  res.json({ message: '📚 BIT Library API — En ligne !' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route introuvable' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(\`🚀 Serveur démarré sur http://localhost:\${PORT}\`);
});`,

  'config/db.js': `const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(\`✅ MongoDB connecté : \${conn.connection.host}\`);
  } catch (error) {
    console.error(\`❌ Erreur MongoDB : \${error.message}\`);
    process.exit(1);
  }
};

module.exports = connectDB;`,

  'models/Book.js': `const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { type: String, required: [true, 'Le titre est obligatoire'], trim: true },
  author: { type: String, required: [true, "L'auteur est obligatoire"], trim: true },
  isbn: { type: String, unique: true, trim: true },
  genre: {
    type: String,
    enum: ['Informatique', 'Mathématiques', 'Sciences', 'Gestion', 'Littérature', 'Autre'],
    default: 'Autre'
  },
  description: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  totalCopies: { type: Number, required: true, min: 1, default: 1 },
  availableCopies: { type: Number, default: function () { return this.totalCopies; } },
  publishedYear: Number,
  publisher: String,
}, { timestamps: true });

bookSchema.virtual('isAvailable').get(function () {
  return this.availableCopies > 0;
});

bookSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Book', bookSchema);`,

  'models/User.js': `const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Le nom est obligatoire'], trim: true },
  email: { type: String, required: [true, "L'email est obligatoire"], unique: true, lowercase: true, trim: true },
  password: { type: String, required: [true, 'Le mot de passe est obligatoire'], minlength: 6, select: false },
  role: { type: String, enum: ['student', 'librarian'], default: 'student' },
  studentId: { type: String, trim: true }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);`,

  'models/Loan.js': `const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  borrowedAt: { type: Date, default: Date.now },
  dueDate: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
  returnedAt: { type: Date, default: null },
  status: { type: String, enum: ['active', 'returned', 'late'], default: 'active' }
}, { timestamps: true });

loanSchema.virtual('isLate').get(function () {
  if (this.status === 'returned') return false;
  return new Date() > this.dueDate;
});

loanSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Loan', loanSchema);`,

  'middleware/auth.js': `const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Non autorisé, token manquant' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) return res.status(401).json({ message: 'Utilisateur introuvable' });
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

exports.librarianOnly = (req, res, next) => {
  if (req.user.role !== 'librarian') {
    return res.status(403).json({ message: 'Réservé aux bibliothécaires' });
  }
  next();
};`,

  'routes/auth.js': `const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, studentId } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'Email déjà utilisé' });
    const user = await User.create({ name, email, password, role, studentId });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role, token: generateToken(user._id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, token: generateToken(user._id) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;`,

  'routes/books.js': `const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const { protect, librarianOnly } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const { search, genre, available } = req.query;
    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }
    if (genre) filter.genre = genre;
    if (available === 'true') filter.availableCopies = { $gt: 0 };
    const books = await Book.find(filter).sort({ createdAt: -1 });
    res.json(books);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Livre introuvable' });
    res.json(book);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, librarianOnly, async (req, res) => {
  try {
    const book = await Book.create(req.body);
    res.status(201).json(book);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', protect, librarianOnly, async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!book) return res.status(404).json({ message: 'Livre introuvable' });
    res.json(book);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete('/:id', protect, librarianOnly, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: 'Livre introuvable' });
    res.json({ message: 'Livre supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;`,

  'routes/loans.js': `const express = require('express');
const router = express.Router();
const Loan = require('../models/Loan');
const Book = require('../models/Book');
const { protect, librarianOnly } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const filter = req.user.role === 'librarian' ? {} : { user: req.user._id };
    const loans = await Loan.find(filter)
      .populate('user', 'name email studentId')
      .populate('book', 'title author genre')
      .sort({ createdAt: -1 });
    const now = new Date();
    for (const loan of loans) {
      if (loan.status === 'active' && loan.dueDate < now) {
        loan.status = 'late';
        await loan.save();
      }
    }
    res.json(loans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', protect, librarianOnly, async (req, res) => {
  try {
    const { userId, bookId } = req.body;
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: 'Livre introuvable' });
    if (book.availableCopies <= 0) return res.status(400).json({ message: 'Aucune copie disponible' });
    const existingLoan = await Loan.findOne({ user: userId, book: bookId, status: { $in: ['active', 'late'] } });
    if (existingLoan) return res.status(400).json({ message: 'Cet étudiant a déjà ce livre' });
    const loan = await Loan.create({ user: userId, book: bookId });
    book.availableCopies -= 1;
    await book.save();
    await loan.populate('user', 'name email');
    await loan.populate('book', 'title author');
    res.status(201).json(loan);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id/return', protect, librarianOnly, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate('book');
    if (!loan) return res.status(404).json({ message: 'Emprunt introuvable' });
    if (loan.status === 'returned') return res.status(400).json({ message: 'Livre déjà retourné' });
    loan.status = 'returned';
    loan.returnedAt = new Date();
    await loan.save();
    await Book.findByIdAndUpdate(loan.book._id, { $inc: { availableCopies: 1 } });
    res.json(loan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;`,

  'routes/ai.js': `const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Book = require('../models/Book');
const Loan = require('../models/Loan');
const { protect } = require('../middleware/auth');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/recommend', protect, async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user._id }).populate('book', 'title author genre').limit(10);
    const borrowedBooks = loans.map(l => \`"\${l.book.title}" de \${l.book.author} (\${l.book.genre})\`);
    if (borrowedBooks.length === 0) {
      return res.json({ recommendations: "Empruntez vos premiers livres pour obtenir des recommandations !" });
    }
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = \`Tu es un bibliothécaire expert. Un étudiant a emprunté : \${borrowedBooks.join(', ')}.
Recommande 3 livres. Réponds uniquement en JSON : [{"title":"...","author":"...","reason":"..."}]\`;
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\\[.*\\]/s);
    const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    res.json({ recommendations });
  } catch (err) {
    res.status(500).json({ message: 'Erreur IA : ' + err.message });
  }
});

router.post('/summarize', protect, async (req, res) => {
  try {
    const { bookId } = req.body;
    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: 'Livre introuvable' });
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = \`Résume en 3 phrases le livre "\${book.title}" de \${book.author} pour des étudiants universitaires.\`;
    const result = await model.generateContent(prompt);
    res.json({ summary: result.response.text() });
  } catch (err) {
    res.status(500).json({ message: 'Erreur IA : ' + err.message });
  }
});

router.get('/stats-summary', protect, async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments();
    const availableBooks = await Book.countDocuments({ availableCopies: { $gt: 0 } });
    const activeLoans = await Loan.countDocuments({ status: 'active' });
    const lateLoans = await Loan.countDocuments({ status: 'late' });
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const prompt = \`Bibliothèque BIT : \${totalBooks} livres, \${availableBooks} disponibles, \${activeLoans} emprunts actifs, \${lateLoans} en retard. Donne un commentaire de 2 phrases et une recommandation.\`;
    const result = await model.generateContent(prompt);
    res.json({ summary: result.response.text() });
  } catch (err) {
    res.status(500).json({ message: 'Erreur IA : ' + err.message });
  }
});

module.exports = router;`,

  'routes/stats.js': `const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const Loan = require('../models/Loan');
const User = require('../models/User');
const { protect, librarianOnly } = require('../middleware/auth');

router.get('/', protect, librarianOnly, async (req, res) => {
  try {
    const [totalBooks, activeLoans, lateLoans, totalStudents] = await Promise.all([
      Book.countDocuments(),
      Loan.countDocuments({ status: 'active' }),
      Loan.countDocuments({ status: 'late' }),
      User.countDocuments({ role: 'student' })
    ]);
    const availableBooks = await Book.aggregate([
      { $group: { _id: null, total: { $sum: '$availableCopies' } } }
    ]);
    const topBooks = await Loan.aggregate([
      { $group: { _id: '$book', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
      { $unwind: '$book' },
      { $project: { title: '$book.title', author: '$book.author', count: 1 } }
    ]);
    const byGenre = await Book.aggregate([
      { $group: { _id: '$genre', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json({ totalBooks, availableBooks: availableBooks[0]?.total || 0, activeLoans, lateLoans, totalStudents, topBooks, byGenre });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;`
};

// Créer les dossiers
console.log('\n📁 Création du projet bit-library...\n');
const dirs = ['config', 'models', 'routes', 'middleware'];
if (!fs.existsSync(PROJECT)) fs.mkdirSync(PROJECT);
dirs.forEach(dir => {
  const p = path.join(PROJECT, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Créer tous les fichiers
for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(PROJECT, filePath);
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`✅ Créé : ${filePath}`);
}

// Installer les dépendances
console.log('\n📦 Installation des dépendances npm...\n');
try {
  execSync('npm install', { cwd: PROJECT, stdio: 'inherit' });
  console.log('\n🎉 Projet prêt ! Lance le serveur avec :\n');
  console.log(`   cd ${PROJECT}`);
  console.log('   npx nodemon server.js\n');
  console.log('⚠️  N\'oublie pas de mettre ta clé Gemini dans le fichier .env !\n');
} catch (err) {
  console.error('❌ Erreur npm install :', err.message);
}
