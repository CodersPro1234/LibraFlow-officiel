const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Non autorisé, token manquant' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).lean();
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
};