const express = require("express");
const router = express.Router();
const QRCode = require("qrcode");
const Loan = require("../models/Loan");
const Book = require("../models/Book");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { protect, librarianOnly } = require("../middleware/auth");

// ── GET /api/loans — Liste des emprunts ──
router.get("/", protect, async (req, res) => {
  try {
    const filter = req.user.role === "librarian" ? {} : { user: req.user._id };
    const loans = await Loan.find(filter)
      .populate("user", "name email studentId")
      .populate("book", "title author genre")
      .sort({ createdAt: -1 })
      .lean(); // Utilise lean() pour plus de rapidité (retourne des objets simples)

    // On calcule le statut 'late' à la volée s'il n'est pas déjà marqué en base
    // Cela évite de faire un updateMany (écriture) à chaque chargement (lecture)
    const now = new Date();
    const processedLoans = loans.map(loan => {
      if (loan.status === "active" && new Date(loan.dueDate) < now) {
        return { ...loan, status: "late" };
      }
      return loan;
    });

    res.json(processedLoans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/loans/:id — Détail d'un emprunt (utilisé par le scanner) ──
router.get("/:id", protect, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate("user", "name email studentId")
      .populate("book", "title author genre");
    if (!loan) return res.status(404).json({ message: "Emprunt introuvable" });
    res.json(loan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/loans — Créer une demande d'emprunt (étudiant) ──
// Status "pending" — le livre N'EST PAS décrémenté ici
// La décrémentation se fait à la confirmation (PUT /:id/confirm)
router.post("/", protect, async (req, res) => {
  try {
    const { bookId, userId } = req.body;
    const isLibrarian = req.user.role === "librarian";

    // If librarian provides userId, use it. Otherwise use logged in user.
    const targetUserId = (isLibrarian && userId) ? userId : req.user._id;

    // Vérifier que le livre existe
    const bookExists = await Book.findById(bookId).lean();
    if (!bookExists) return res.status(404).json({ message: "Livre introuvable" });

    // Vérifier qu'il n'a pas déjà ce livre en cours
    const existingLoan = await Loan.findOne({
      user: targetUserId,
      book: bookId,
      status: { $in: ["pending", "active"] },
    });
    if (existingLoan)
      return res.status(400).json({
        message: isLibrarian
          ? "Cet étudiant a déjà une demande ou un emprunt en cours pour ce livre"
          : "Vous avez déjà une demande pour ce livre",
      });

    const status = isLibrarian ? "active" : "pending";
    const borrowedAt = isLibrarian ? new Date() : undefined;

    let book = null;
    if (isLibrarian) {
      // CORRECTION : opération atomique — décrémente seulement s'il reste des copies
      // Élimine la race condition (deux bibliothécaires simultanés)
      book = await Book.findOneAndUpdate(
        { _id: bookId, availableCopies: { $gt: 0 } },
        { $inc: { availableCopies: -1 } },
        { new: true }
      );
      if (!book)
        return res.status(400).json({ message: "Aucune copie disponible" });
    } else {
      // Pour un étudiant (pending), on vérifie juste la disponibilité sans décrémenter
      if (bookExists.availableCopies <= 0)
        return res.status(400).json({ message: "Aucune copie disponible" });
    }

    const loan = await Loan.create({ user: targetUserId, book: bookId, status, borrowedAt });

    await loan.populate("user", "name email");
    await loan.populate("book", "title author genre");

    res.status(201).json(loan);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── GET /api/loans/:id/qrcode — Générer le QR code d'un emprunt ──
// Retourne le QR code en base64 PNG
router.get("/:id/qrcode", protect, async (req, res) => {
  try {
    // CORRECTION : populate("book") pour accéder à title et author
    const loan = await Loan.findById(req.params.id).populate("book", "title author");
    if (!loan) return res.status(404).json({ message: "Emprunt introuvable" });

    const bookTitle = loan.book?.title || "Inconnu";
    const bookAuthor = loan.book?.author || "Inconnu";

    // Le QR code encode l'ID de l'emprunt + Titre + Auteur pour le résumé
    const qrData = `LIBRAFLOW_LOAN:${loan._id}|${bookTitle}|${bookAuthor}`;
    const qrBase64 = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: { dark: "#0F0E0C", light: "#FFFFFF" },
    });

    res.json({ qrCode: qrBase64, loanId: loan._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/loans/:id/confirm — Confirmer un emprunt après scan (bibliothécaire) ──
// C'est ici que le livre est décrémenté
router.put("/:id/confirm", protect, librarianOnly, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate("user", "name email studentId")
      .populate("book", "title author genre");

    if (!loan) return res.status(404).json({ message: "Emprunt introuvable" });
    if (loan.status !== "pending")
      return res
        .status(400)
        .json({ message: `Cet emprunt est déjà "${loan.status}"` });

    // CORRECTION : décrémentation atomique — élimine la race condition
    const book = await Book.findOneAndUpdate(
      { _id: loan.book._id, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { new: true }
    );
    if (!book)
      return res.status(400).json({
        message: "Plus aucune copie disponible au moment de la confirmation",
      });

    // Confirmer l'emprunt
    loan.status = "active";
    loan.borrowedAt = new Date();
    await loan.save();

    // Notification Temps Réel via Socket.io
    req.io.to(loan.user._id.toString()).emit("notification", {
      title: "Emprunt confirmé ! 📖",
      message: `Ton emprunt pour "${loan.book.title}" est prêt !`,
      type: "success"
    });

    // Sauvegarder en base aussi
    await Notification.create({
      user: loan.user._id,
      title: "Emprunt confirmé ! 📖",
      message: `Ton emprunt pour "${loan.book.title}" est prêt !`,
      type: "success"
    });

    res.json(loan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/loans/:id/return — Retourner un livre après scan (bibliothécaire) ──
router.put("/:id/return", protect, librarianOnly, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate("user", "name email studentId")
      .populate("book", "title author genre");

    if (!loan) return res.status(404).json({ message: "Emprunt introuvable" });
    if (loan.status === "returned")
      return res.status(400).json({ message: "Livre déjà retourné" });
    if (loan.status === "pending")
      return res
        .status(400)
        .json({
          message: "Emprunt pas encore confirmé — impossible de retourner",
        });

    loan.status = "returned";
    loan.returnedAt = new Date();
    await loan.save();

    // Créditer des points à l'étudiant
    const student = await User.findById(loan.user._id);
    if (student) {
      student.points += 10;

      // Vérification des badges (exemple simple)
      const loanCount = await Loan.countDocuments({ user: student._id, status: "returned" });
      if (loanCount === 5 && !student.badges.some(b => b.name === "Lecteur Assidu")) {
        student.badges.push({ name: "Lecteur Assidu", icon: "📚" });

        // Notification Badge via Socket.io
        req.io.to(student._id.toString()).emit("notification", {
          title: "Nouveau Badge ! 🏆",
          message: "Tu as débloqué le badge 'Lecteur Assidu' !",
          type: "badge"
        });

        await Notification.create({
          user: student._id,
          title: "Nouveau Badge ! 🏆",
          message: "Tu as débloqué le badge 'Lecteur Assidu' !",
          type: "badge"
        });
      }

      await student.save();

      // Notification Points via Socket.io
      req.io.to(student._id.toString()).emit("notification", {
        title: "Points gagnés ! ✨",
        message: `+10 points pour avoir rendu "${loan.book.title}".`,
        type: "success"
      });

      await Notification.create({
        user: student._id,
        title: "Points gagnés ! ✨",
        message: `+10 points pour avoir rendu "${loan.book.title}".`,
        type: "success"
      });

      // ── Envoyer le reçu de retour à l'étudiant via Socket.IO ──
      // Le frontend l'utilisera pour générer automatiquement le PDF
      req.io.to(student._id.toString()).emit("return_receipt", {
        _id:        loan._id,
        user:       loan.user,
        book:       loan.book,
        borrowedAt: loan.borrowedAt,
        dueDate:    loan.dueDate,
        returnedAt: loan.returnedAt,
        status:     loan.status,
      });
    }

    await Book.findByIdAndUpdate(loan.book._id, {
      $inc: { availableCopies: 1 },
    });

    res.json(loan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
