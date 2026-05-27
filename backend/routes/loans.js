const express = require("express");
const router  = express.Router();
const QRCode  = require("qrcode");
const Loan    = require("../models/Loan");
const Book    = require("../models/Book");
const User    = require("../models/User");
const Notification = require("../models/Notification");
const { protect, librarianOnly } = require("../middleware/auth");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — expire les réservations dont le délai 24h est dépassé
// Appelé avant chaque lecture des emprunts + par le scheduler interne
// ─────────────────────────────────────────────────────────────────────────────
async function expireOverdueReservations(io) {
  const now = new Date();
  const expired = await Loan.find({
    status:          "reserved",
    pickupDeadline:  { $lt: now },
  }).populate("book", "title availableCopies totalCopies")
    .populate("user", "name");

  for (const loan of expired) {
    // Marquer le prêt comme expiré
    loan.status     = "expired";
    loan.qrExpired  = true;
    await loan.save();

    // Remettre le livre en stock (sans dépasser totalCopies)
    const expiredBookUpdate = await Book.findOneAndUpdate(
      { _id: loan.book._id },
      [{ $set: {
        availableCopies: {
          $min: [{ $add: ["$availableCopies", 1] }, "$totalCopies"]
        }
      }}],
      { new: true }
    );
    // Diffuser le nouveau stock à tous les clients connectés
    if (io && expiredBookUpdate) {
      io.emit("book_availability", {
        bookId:          expiredBookUpdate._id.toString(),
        availableCopies: expiredBookUpdate.availableCopies,
        totalCopies:     expiredBookUpdate.totalCopies,
      });
    }

    // Notifier l'étudiant via Socket.io si disponible
    if (io) {
      io.to(loan.user._id.toString()).emit("notification", {
        title:   "Réservation expirée ⏰",
        message: `Ta réservation de "${loan.book.title}" a expiré (24h dépassées). Le livre est de nouveau disponible.`,
        type:    "warning",
      });
    }

    // Notification persistante
    await Notification.create({
      user:    loan.user._id,
      title:   "Réservation expirée ⏰",
      message: `Ta réservation de "${loan.book.title}" a expiré. Le livre est de nouveau disponible.`,
      type:    "warning",
    }).catch(() => {}); // silencieux si erreur
  }

  return expired.length;
}

// Exporter pour le scheduler dans server.js
module.exports.expireOverdueReservations = expireOverdueReservations;

// ── GET /api/loans ────────────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    // Expirer les réservations en retard avant de répondre
    await expireOverdueReservations(req.io).catch(() => {});

    const filter = req.user.role === "librarian" ? {} : { user: req.user._id };
    const loans = await Loan.find(filter)
      .populate("user",  "name email studentId")
      .populate("book",  "title author genre")
      .sort({ createdAt: -1 })
      .lean();

    // Calculer "late" dynamiquement pour les actifs
    const now = new Date();
    const processed = loans.map((loan) => {
      if (loan.status === "active" && loan.dueDate && new Date(loan.dueDate) < now) {
        return { ...loan, status: "late" };
      }
      return loan;
    });

    res.json(processed);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/loans/:id ────────────────────────────────────────────────────────
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

// ── POST /api/loans — Réserver un livre (étudiant) ───────────────────────────
// Décrémentation IMMÉDIATE + délai de récupération 24h
router.post("/", protect, async (req, res) => {
  try {
    const { bookId, userId } = req.body;
    const isLibrarian  = req.user.role === "librarian";
    const targetUserId = (isLibrarian && userId) ? userId : req.user._id;

    // Vérifier l'existence du livre
    const bookExists = await Book.findById(bookId).lean();
    if (!bookExists) return res.status(404).json({ message: "Livre introuvable" });

    // Vérifier qu'il n'a pas déjà une réservation/emprunt actif pour ce livre
    const existingLoan = await Loan.findOne({
      user:   targetUserId,
      book:   bookId,
      status: { $in: ["reserved", "active"] },
    });
    if (existingLoan)
      return res.status(400).json({
        message: isLibrarian
          ? "Cet étudiant a déjà une réservation ou un emprunt en cours pour ce livre"
          : "Vous avez déjà une réservation en cours pour ce livre",
      });

    // Décrémentation atomique — élimine la race condition
    const book = await Book.findOneAndUpdate(
      { _id: bookId, availableCopies: { $gt: 0 } },
      { $inc: { availableCopies: -1 } },
      { new: true }
    );
    if (!book)
      return res.status(400).json({ message: "Aucune copie disponible" });

    // Diffuser le nouveau stock à tous les clients connectés
    req.io?.emit("book_availability", {
      bookId:          book._id.toString(),
      availableCopies: book.availableCopies,
      totalCopies:     book.totalCopies,
    });

    // Délai de récupération : 24h pour l'étudiant, immédiat pour le bibliothécaire
    const now             = new Date();
    const pickupDeadline  = isLibrarian ? null : new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const status          = isLibrarian ? "active" : "reserved";
    const borrowedAt      = isLibrarian ? now : null;
    const dueDate         = isLibrarian
      ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      : null;

    const loan = await Loan.create({
      user: targetUserId,
      book: bookId,
      status,
      borrowedAt,
      dueDate,
      pickupDeadline,
    });

    await loan.populate("user", "name email studentId");
    await loan.populate("book", "title author genre");

    // Notification temps réel (si étudiant)
    if (!isLibrarian && req.io) {
      req.io.to(targetUserId.toString()).emit("notification", {
        title:   "Réservation confirmée ! 📖",
        message: `"${book.title}" est réservé. Venez le récupérer dans les 24h.`,
        type:    "success",
      });
    }

    res.status(201).json(loan);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── GET /api/loans/:id/qrcode ─────────────────────────────────────────────────
router.get("/:id/qrcode", protect, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate("book", "title author");
    if (!loan) return res.status(404).json({ message: "Emprunt introuvable" });

    // QR expiré ?
    if (loan.qrExpired || loan.status === "expired")
      return res.status(410).json({ message: "QR code expiré — réservation annulée" });

    const bookTitle  = loan.book?.title  || "Inconnu";
    const bookAuthor = loan.book?.author || "Inconnu";
    const qrData     = `LIBRAFLOW_LOAN:${loan._id}|${bookTitle}|${bookAuthor}`;
    const qrBase64   = await QRCode.toDataURL(qrData, {
      width:  300,
      margin: 2,
      color:  { dark: "#0F0E0C", light: "#FFFFFF" },
    });

    res.json({ qrCode: qrBase64, loanId: loan._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/loans/:id/confirm — Bibliothécaire remet le livre physiquement ──
// Le livre a déjà été décrémenté à la réservation → pas de re-décrémentation
router.put("/:id/confirm", protect, librarianOnly, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate("user", "name email studentId")
      .populate("book", "title author genre");

    if (!loan) return res.status(404).json({ message: "Emprunt introuvable" });

    if (loan.status === "expired")
      return res.status(400).json({ message: "QR code expiré — réservation annulée" });

    if (loan.status !== "reserved")
      return res.status(400).json({ message: `Cet emprunt est déjà "${loan.status}"` });

    // Passer en actif (livre déjà décrémenté à la réservation)
    const now = new Date();
    loan.status     = "active";
    loan.borrowedAt = now;
    loan.dueDate    = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    await loan.save();

    // Notification
    req.io?.to(loan.user._id.toString()).emit("notification", {
      title:   "Emprunt activé ! 📖",
      message: `"${loan.book.title}" est maintenant en ta possession. À rendre avant le ${loan.dueDate.toLocaleDateString("fr-FR")}.`,
      type:    "success",
    });
    await Notification.create({
      user:    loan.user._id,
      title:   "Emprunt activé ! 📖",
      message: `"${loan.book.title}" est en ta possession. À rendre avant le ${loan.dueDate.toLocaleDateString("fr-FR")}.`,
      type:    "success",
    });

    res.json(loan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/loans/:id/return — Retourner un livre ───────────────────────────
router.put("/:id/return", protect, librarianOnly, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate("user",  "name email studentId")
      .populate("book",  "title author genre");

    if (!loan) return res.status(404).json({ message: "Emprunt introuvable" });
    if (loan.status === "returned")
      return res.status(400).json({ message: "Livre déjà retourné" });
    if (loan.status !== "active")
      return res.status(400).json({ message: "Seuls les emprunts actifs peuvent être retournés" });

    loan.status     = "returned";
    loan.returnedAt = new Date();
    await loan.save();

    // Remettre le livre en stock (SANS dépasser totalCopies)
    const returnedBookUpdate = await Book.findOneAndUpdate(
      { _id: loan.book._id },
      [{ $set: {
        availableCopies: {
          $min: [{ $add: ["$availableCopies", 1] }, "$totalCopies"]
        }
      }}],
      { new: true }
    );
    // Diffuser le nouveau stock à tous les clients connectés
    if (returnedBookUpdate) {
      req.io?.emit("book_availability", {
        bookId:          returnedBookUpdate._id.toString(),
        availableCopies: returnedBookUpdate.availableCopies,
        totalCopies:     returnedBookUpdate.totalCopies,
      });
    }

    // Points & badges étudiant
    const student = await User.findById(loan.user._id);
    if (student) {
      student.points += 10;

      const loanCount = await Loan.countDocuments({ user: student._id, status: "returned" });
      if (loanCount === 5 && !student.badges.some((b) => b.name === "Lecteur Assidu")) {
        student.badges.push({ name: "Lecteur Assidu", icon: "📚" });
        req.io?.to(student._id.toString()).emit("notification", {
          title:   "Nouveau Badge ! 🏆",
          message: "Tu as débloqué le badge 'Lecteur Assidu' !",
          type:    "badge",
        });
        await Notification.create({
          user:    student._id,
          title:   "Nouveau Badge ! 🏆",
          message: "Tu as débloqué le badge 'Lecteur Assidu' !",
          type:    "badge",
        });
      }

      await student.save();

      req.io?.to(student._id.toString()).emit("notification", {
        title:   "Points gagnés ! ✨",
        message: `+10 points pour avoir rendu "${loan.book.title}".`,
        type:    "success",
      });
      await Notification.create({
        user:    student._id,
        title:   "Points gagnés ! ✨",
        message: `+10 points pour avoir rendu "${loan.book.title}".`,
        type:    "success",
      });

      // Reçu de retour via Socket.IO
      req.io?.to(student._id.toString()).emit("return_receipt", {
        _id:        loan._id,
        user:       loan.user,
        book:       loan.book,
        borrowedAt: loan.borrowedAt,
        dueDate:    loan.dueDate,
        returnedAt: loan.returnedAt,
        status:     loan.status,
      });
    }

    res.json(loan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/loans/:id — Annuler une réservation (étudiant ou bibliothécaire)
router.delete("/:id", protect, async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id)
      .populate("book",  "title availableCopies totalCopies")
      .populate("user",  "name");

    if (!loan) return res.status(404).json({ message: "Emprunt introuvable" });

    // Seul le propriétaire ou un bibliothécaire peut annuler
    const isOwner     = loan.user._id.toString() === req.user._id.toString();
    const isLibrarian = req.user.role === "librarian";
    if (!isOwner && !isLibrarian)
      return res.status(403).json({ message: "Non autorisé" });

    // Seules les réservations en attente peuvent être annulées
    if (loan.status !== "reserved")
      return res.status(400).json({
        message: loan.status === "active"
          ? "Impossible d'annuler un emprunt déjà actif. Contactez la bibliothèque."
          : "Cette réservation ne peut plus être annulée.",
      });

    // Marquer comme annulé
    loan.status    = "cancelled";
    loan.qrExpired = true;
    await loan.save();

    // Remettre le livre en stock (sans dépasser totalCopies)
    const cancelledBookUpdate = await Book.findOneAndUpdate(
      { _id: loan.book._id },
      [{ $set: {
        availableCopies: {
          $min: [{ $add: ["$availableCopies", 1] }, "$totalCopies"]
        }
      }}],
      { new: true }
    );
    // Diffuser le nouveau stock à tous les clients connectés
    if (cancelledBookUpdate) {
      req.io?.emit("book_availability", {
        bookId:          cancelledBookUpdate._id.toString(),
        availableCopies: cancelledBookUpdate.availableCopies,
        totalCopies:     cancelledBookUpdate.totalCopies,
      });
    }

    // Notification temps réel
    req.io?.to(loan.user._id.toString()).emit("notification", {
      title:   "Réservation annulée",
      message: `Ta réservation de "${loan.book.title}" a été annulée. Le livre est de nouveau disponible.`,
      type:    "info",
    });

    await Notification.create({
      user:    loan.user._id,
      title:   "Réservation annulée",
      message: `Ta réservation de "${loan.book.title}" a été annulée. Le livre est de nouveau disponible.`,
      type:    "info",
    }).catch(() => {});

    res.json({ message: "Réservation annulée avec succès" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/loans/expire — Forcer l'expiration (admin / cron externe) ──────
router.post("/expire", protect, librarianOnly, async (req, res) => {
  try {
    const count = await expireOverdueReservations(req.io);
    res.json({ expired: count, message: `${count} réservation(s) expirée(s)` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
