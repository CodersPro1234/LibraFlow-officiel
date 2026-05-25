const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const bcrypt  = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { protect, librarianOnly } = require("../middleware/auth");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// ── Helper : retourner les erreurs de validation ──
const handleValidation = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  return null;
};

// ── POST /api/auth/register ──
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Le nom est obligatoire").isLength({ max: 80 }).withMessage("Nom trop long"),
    body("email").isEmail().normalizeEmail().withMessage("Email invalide"),
    body("password").isLength({ min: 6 }).withMessage("Le mot de passe doit avoir au moins 6 caractères"),
    body("studentId").optional().trim().isLength({ max: 30 }).withMessage("ID étudiant trop long"),
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { name, email, password, studentId } = req.body;

      // SÉCURITÉ : rôle toujours "student" à l'inscription publique
      const role = "student";

      const userExists = await User.findOne({ email });
      if (userExists)
        return res.status(400).json({ message: "Email déjà utilisé" });

      const user = await User.create({ name, email, password, role, studentId });
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        profileImage: user.profileImage || "",
        token: generateToken(user._id),
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ── POST /api/auth/login ──
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Email invalide"),
    body("password").notEmpty().withMessage("Mot de passe requis"),
  ],
  async (req, res) => {
    const validationError = handleValidation(req, res);
    if (validationError) return;

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select("+password");
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
        points: user.points,
        badges: user.badges,
        profileImage: user.profileImage || "",
        token: generateToken(user._id),
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

// ── GET /api/auth/users — liste des utilisateurs (librarian only) ──
router.get("/users", protect, librarianOnly, async (req, res) => {
  try {
    const users = await User.find({}, "name email role studentId").lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/auth/me — infos de l'utilisateur connecté ──
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password").lean();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/auth/profile — mise à jour du profil ──
router.put(
  "/profile",
  protect,
  [
    body("name").optional().trim().isLength({ min: 2, max: 80 }).withMessage("Nom entre 2 et 80 caractères"),
    body("email").optional().isEmail().normalizeEmail().withMessage("Email invalide"),
    body("password").optional().isLength({ min: 6 }).withMessage("Mot de passe min. 6 caractères"),
    body("studentId").optional().trim().isLength({ max: 30 }).withMessage("ID étudiant trop long"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array()[0].msg });

    try {
      const { name, email, password, studentId, profileImage } = req.body;
      const user = await User.findById(req.user._id).select("+password");
      if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

      // Vérifier unicité email si changé
      if (email && email !== user.email) {
        const exists = await User.findOne({ email, _id: { $ne: user._id } });
        if (exists) return res.status(400).json({ message: "Email déjà utilisé par un autre compte" });
        user.email = email;
      }

      if (name)      user.name      = name;
      if (studentId !== undefined) user.studentId = studentId;
      if (profileImage !== undefined) user.profileImage = profileImage;
      if (password)  user.password  = await bcrypt.hash(password, 12);

      await user.save();

      res.json({
        _id:       user._id,
        name:      user.name,
        email:     user.email,
        role:      user.role,
        studentId: user.studentId,
        points:    user.points,
        badges:    user.badges,
        profileImage: user.profileImage || "",
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
