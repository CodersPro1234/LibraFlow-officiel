const express = require('express');
const router = express.Router();
const Book = require('../models/Book');
const Loan = require('../models/Loan');
const User = require('../models/User');
const { protect, librarianOnly } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  try {
    const isLibrarian = req.user.role === 'librarian';

    // On lance TOUTES les requêtes en parallèle pour minimiser la latence (très important pour MongoDB Atlas)
    const queries = [
      Book.countDocuments(),
      Loan.countDocuments({ status: 'active' }),
      // CORRECTION : "late" n'est jamais persisté en DB, on le calcule dynamiquement
      Loan.countDocuments({ status: 'active', dueDate: { $lt: new Date() } }),
      Book.aggregate([{ $group: { _id: null, total: { $sum: '$availableCopies' } } }]),
      Loan.aggregate([
        { $group: { _id: '$book', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'books', localField: '_id', foreignField: '_id', as: 'book' } },
        { $unwind: '$book' },
        { $project: { title: '$book.title', author: '$book.author', coverImage: '$book.coverImage', count: 1 } }
      ]),
      Book.aggregate([
        { $group: { _id: '$genre', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ])
    ];

    if (isLibrarian) {
      queries.push(User.countDocuments({ role: 'student' }));
    } else {
      queries.push(Loan.countDocuments({ user: req.user._id, status: 'active' }));
      queries.push(Loan.countDocuments({ user: req.user._id, status: 'returned' }));
    }

    const results = await Promise.all(queries);

    const [
      totalBooks,
      activeLoansCount,
      lateLoansCount,
      availableBooksRes,
      topBooks,
      byGenre
    ] = results;

    const availableBooks = availableBooksRes[0]?.total || 0;

    if (isLibrarian) {
      const totalStudents = results[6];
      res.json({
        totalBooks,
        availableBooks,
        activeLoans: activeLoansCount,
        lateLoans: lateLoansCount,
        totalStudents,
        topBooks,
        byGenre
      });
    } else {
      const myActiveLoans = results[6];
      const myReturnHistory = results[7];
      res.json({
        totalBooks,
        availableBooks,
        activeLoans: myActiveLoans,
        lateLoans: 0,
        myReturnHistory,
        topBooks,
        byGenre
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;