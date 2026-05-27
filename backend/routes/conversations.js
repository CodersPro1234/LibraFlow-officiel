const express      = require("express");
const router       = express.Router();
const { body, validationResult } = require("express-validator");
const Conversation = require("../models/Conversation");
const User         = require("../models/User");
const { protect, librarianOnly } = require("../middleware/auth");

// ── GET /api/conversations — mes conversations ──
router.get("/", protect, async (req, res) => {
  try {
    const convs = await Conversation
      .find({ user: req.user._id })
      .select("title createdAt updatedAt messages")
      .sort({ updatedAt: -1 })
      .lean();

    // Retourne metadata + dernier message pour l'aperçu
    const list = convs.map((c) => ({
      _id:         c._id,
      title:       c.title,
      msgCount:    c.messages.length,
      lastMessage: c.messages[c.messages.length - 1]?.content?.slice(0, 80) || "",
      createdAt:   c.createdAt,
      updatedAt:   c.updatedAt,
    }));

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/conversations/admin — conversations étudiants uniquement ──
router.get("/admin", protect, librarianOnly, async (req, res) => {
  try {
    // Exclure les conversations des bibliothécaires (admins)
    const librarianIds = await User.find({ role: "librarian" }).distinct("_id");

    const convs = await Conversation
      .find({ user: { $nin: librarianIds } })
      .populate("user", "name email studentId role")
      .select("title createdAt updatedAt messages user")
      .sort({ updatedAt: -1 })
      .lean();

    const list = convs.map((c) => ({
      _id:         c._id,
      title:       c.title,
      user:        c.user,
      msgCount:    c.messages.length,
      lastMessage: c.messages[c.messages.length - 1]?.content?.slice(0, 80) || "",
      createdAt:   c.createdAt,
      updatedAt:   c.updatedAt,
    }));

    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/conversations/:id — charger une conversation complète ──
router.get("/:id", protect, async (req, res) => {
  try {
    const query = req.user.role === "librarian"
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user._id };

    const conv = await Conversation.findOne(query).populate("user", "name email studentId").lean();
    if (!conv) return res.status(404).json({ message: "Conversation introuvable" });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/conversations — créer une conversation ──
router.post(
  "/",
  protect,
  [body("title").optional().trim().isLength({ max: 100 })],
  async (req, res) => {
    try {
      const conv = await Conversation.create({
        user:  req.user._id,
        title: req.body.title || "Nouvelle conversation",
      });
      res.status(201).json(conv);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ── PUT /api/conversations/:id — ajouter des messages + maj titre ──
router.put(
  "/:id",
  protect,
  [
    body("messages").optional().isArray(),
    body("title").optional().trim().isLength({ max: 100 }),
  ],
  async (req, res) => {
    try {
      const conv = await Conversation.findOne({ _id: req.params.id, user: req.user._id });
      if (!conv) return res.status(404).json({ message: "Conversation introuvable" });

      if (req.body.title)    conv.title    = req.body.title;
      if (req.body.messages) conv.messages = req.body.messages;

      await conv.save();
      res.json({ _id: conv._id, title: conv.title, msgCount: conv.messages.length, updatedAt: conv.updatedAt });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ── DELETE /api/conversations/:id — supprimer ──
router.delete("/:id", protect, async (req, res) => {
  try {
    const conv = await Conversation.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!conv) return res.status(404).json({ message: "Conversation introuvable" });
    res.json({ message: "Conversation supprimée" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
