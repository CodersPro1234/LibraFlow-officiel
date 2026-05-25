const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Book = require('../models/Book');
const { protect, librarianOnly } = require('../middleware/auth');

const VALID_GENRES = ['Informatique', 'Mathématiques', 'Sciences', 'Gestion', 'Littérature', 'Autre'];

const bookValidation = [
  body('title').trim().notEmpty().withMessage('Le titre est obligatoire').isLength({ max: 200 }),
  body('author').trim().notEmpty().withMessage("L'auteur est obligatoire").isLength({ max: 150 }),
  body('totalCopies').isInt({ min: 1, max: 999 }).withMessage('Nombre d\'exemplaires invalide'),
  body('genre').optional().isString().trim(),
  body('coverImage').optional().isString().withMessage('L\'image de couverture doit être une chaîne de caractères'),
];

router.get('/', async (req, res) => {
  try {
    const { search, genre, available, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { author: { $regex: search, $options: 'i' } }
      ];
    }

    if (genre) filter.genre = genre;
    if (available === 'true') filter.availableCopies = { $gt: 0 };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // entre 1 et 50
    const skip = (pageNum - 1) * limitNum;

    const [books, total] = await Promise.all([
      Book.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Book.countDocuments(filter),
    ]);

    res.json({
      books,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum),
      hasMore: pageNum < Math.ceil(total / limitNum),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/books/isbn/:isbn — Récupérer les infos d'un livre via OpenLibrary / Google Books
router.get('/isbn/:isbn', protect, librarianOnly, async (req, res) => {
  try {
    const rawIsbn = req.params.isbn;
    const isbn = rawIsbn.replace(/[- ]/g, '');
    let bookInfo = null;

    // 1. Essayer OpenLibrary (Sans limite stricte de quota)
    try {
      const olResponse = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`);
      const olData = await olResponse.json();
      const olKey = `ISBN:${isbn}`;
      
      if (olData && olData[olKey]) {
        const info = olData[olKey];
        bookInfo = {
          title: info.title || '',
          author: info.authors ? info.authors.map(a => a.name).join(', ') : 'Auteur inconnu',
          description: info.excerpts && info.excerpts.length > 0 ? String(info.excerpts[0].text) : (info.notes ? String(info.notes.value || info.notes) : ''),
          genre: info.subjects && info.subjects.length > 0 ? String(info.subjects[0].name) : 'Inconnu',
          coverImage: info.cover ? info.cover.large || info.cover.medium : '',
          isbn: isbn
        };
      }
    } catch (olErr) {
      console.error('Erreur OpenLibrary:', olErr.message);
    }

    // 2. Fallback sur Google Books si OpenLibrary ne trouve rien
    if (!bookInfo) {
      try {
        const gbResponse = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
        const gbData = await gbResponse.json();
        
        if (gbData.items && gbData.items.length > 0) {
          const info = gbData.items[0].volumeInfo;
          bookInfo = {
            title: info.title || '',
            author: info.authors ? info.authors.join(', ') : 'Auteur inconnu',
            description: info.description || '',
            genre: info.categories ? info.categories[0] : 'Inconnu',
            coverImage: info.imageLinks ? info.imageLinks.thumbnail : '',
            isbn: isbn
          };
        }
      } catch (gbErr) {
        console.error('Erreur Google Books:', gbErr.message);
      }
    }

    if (!bookInfo) {
      return res.status(404).json({ message: 'Livre introuvable dans les bases de données (OpenLibrary / Google Books)' });
    }

    res.json(bookInfo);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur lors de la récupération des infos ISBN' });
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

router.post('/', protect, librarianOnly, bookValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
  try {
    const book = await Book.create(req.body);
    res.status(201).json(book);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', protect, librarianOnly, bookValidation, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });
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
    // Bloquer la suppression si des emprunts actifs ou en attente existent
    const Loan = require('../models/Loan');
    const activeCount = await Loan.countDocuments({
      book: req.params.id,
      status: { $in: ['pending', 'active'] },
    });
    if (activeCount > 0)
      return res.status(400).json({
        message: `Impossible : ${activeCount} emprunt${activeCount > 1 ? 's' : ''} actif${activeCount > 1 ? 's' : ''} sur ce livre. Retournez-les d'abord.`,
      });

    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) return res.status(404).json({ message: 'Livre introuvable' });
    res.json({ message: 'Livre supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;