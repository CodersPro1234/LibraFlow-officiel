const express = require("express");
const router  = express.Router();
const Groq    = require("groq-sdk");
const Book    = require("../models/Book");
const Loan    = require("../models/Loan");
const User    = require("../models/User");
const { protect, librarianOnly } = require("../middleware/auth");
const fs   = require("fs");
const path = require("path");

// ── Instancier Groq ───────────────────────────────────────────────────────────
let groq = null;
if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
} else {
  console.warn("⚠️  GROQ_API_KEY not set; AI endpoints will use fallback responses.");
}

const MODEL = "llama-3.3-70b-versatile";

// ── Détection quota / erreur ──────────────────────────────────────────────────
const isQuotaError = (err) =>
  err.message?.includes("429") ||
  err.message?.includes("quota") ||
  err.message?.includes("rate limit") ||
  err.message?.includes("not configured");

// ── Fallbacks ─────────────────────────────────────────────────────────────────
const FALLBACK_CHAT =
  "Je suis temporairement indisponible. Veuillez réessayer dans quelques instants ou consulter directement le catalogue.";
const FALLBACK_SUMMARY =
  "Ce livre est une référence dans son domaine. Il aborde les concepts de manière claire et progressive. Recommandé pour approfondir ses connaissances.";
const FALLBACK_RECOMMENDATIONS = [
  { title: "The Pragmatic Programmer", author: "Hunt & Thomas",   reason: "Essentiel pour tout développeur qui veut progresser." },
  { title: "Clean Architecture",        author: "Robert C. Martin", reason: "Penser en systèmes et architectures durables." },
  { title: "Refactoring",               author: "Martin Fowler",    reason: "Améliorer le code existant sans tout casser." },
];
const FALLBACK_STATS =
  "La bibliothèque fonctionne bien. Il est recommandé de relancer les étudiants en retard et d'identifier les livres populaires.";

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Catalogue de livres pour le contexte IA
// ─────────────────────────────────────────────────────────────────────────────
async function buildCatalogContext(limit = 80) {
  const books = await Book.find({}, "title author genre availableCopies totalCopies").lean();
  if (!books.length) return { catalogText: "Catalogue vide.", bookCount: 0, books };

  // Grouper par genre pour lisibilité
  const byGenre = {};
  books.forEach((b) => {
    const g = b.genre || "Autre";
    if (!byGenre[g]) byGenre[g] = [];
    byGenre[g].push(b);
  });

  const lines = [];
  for (const [genre, list] of Object.entries(byGenre)) {
    lines.push(`\n[${genre}]`);
    list.forEach((b) => {
      const dispo = b.availableCopies > 0 ? `✓ ${b.availableCopies} dispo.` : "✗ indisponible";
      lines.push(`  • "${b.title}" — ${b.author}  (${dispo})`);
    });
  }

  return { catalogText: lines.join("\n"), bookCount: books.length, books };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER — Statistiques en temps réel (bibliothécaire uniquement)
// ─────────────────────────────────────────────────────────────────────────────
async function buildStatsContext() {
  const now = new Date();
  const [
    totalBooks, totalCopies, availableBooks,
    activeLoans, reservedLoans, lateLoans,
    returnedLoans, expiredLoans, totalStudents,
  ] = await Promise.all([
    Book.countDocuments(),
    Book.aggregate([{ $group: { _id: null, total: { $sum: "$totalCopies" } } }]).then((r) => r[0]?.total || 0),
    Book.countDocuments({ availableCopies: { $gt: 0 } }),
    Loan.countDocuments({ status: "active" }),
    Loan.countDocuments({ status: "reserved" }),
    Loan.countDocuments({ status: "active", dueDate: { $lt: now } }),
    Loan.countDocuments({ status: "returned" }),
    Loan.countDocuments({ status: "expired" }),
    User.countDocuments({ role: "student" }),
  ]);

  return `
📊 STATISTIQUES EN TEMPS RÉEL (${now.toLocaleDateString("fr-FR")}) :
• Livres dans le catalogue : ${totalBooks} titres, ${totalCopies} exemplaires total
• Exemplaires disponibles : ${availableBooks} titres ont au moins 1 copie libre
• Emprunts actifs : ${activeLoans}
• Réservations en attente (24h) : ${reservedLoans}
• Emprunts en retard : ${lateLoans}
• Total retours effectués : ${returnedLoans}
• Réservations expirées (non récupérées) : ${expiredLoans}
• Étudiants inscrits : ${totalStudents}
• Taux de disponibilité : ${totalBooks > 0 ? Math.round((availableBooks / totalBooks) * 100) : 0}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — BIBLIOTHÉCAIRE (accès complet)
// ─────────────────────────────────────────────────────────────────────────────
async function buildLibrarianPrompt(librarianName) {
  const { catalogText, bookCount } = await buildCatalogContext();
  const statsText = await buildStatsContext();

  return `Tu es BookIA, l'assistante IA intelligente de LibraFlow — le système de gestion de bibliothèque du BIT (Burkina Institute of Technology).
Tu travailles avec le bibliothécaire ${librarianName || ""}. Tu es son assistant de confiance pour gérer la bibliothèque.

══════════════════════════════════════════════
IDENTITÉ DE LIBRAFLOW
══════════════════════════════════════════════
LibraFlow est un système de gestion de bibliothèque universitaire développé pour le BIT.
Fonctionnalités : catalogue de livres, emprunts, réservations, QR codes, statistiques, gamification (points & badges étudiants).
Flux d'emprunt : Étudiant réserve → QR généré → 24h pour récupérer → Bibliothécaire scanne QR → Emprunt actif (14 jours) → Retour physique → QR scan retour → Reçu PDF.
Si l'étudiant ne récupère pas dans les 24h, la réservation expire automatiquement et le livre revient en stock.

══════════════════════════════════════════════
${statsText}

══════════════════════════════════════════════
CATALOGUE COMPLET (${bookCount} livres) :
${catalogText}

══════════════════════════════════════════════
TES CAPACITÉS EN TANT QU'ASSISTANT BIBLIOTHÉCAIRE :
══════════════════════════════════════════════
1. ANALYSE & RAPPORTS : Commenter les statistiques, identifier les tendances, signaler les problèmes (taux de retard élevé, livres jamais empruntés, etc.)
2. GESTION DE STOCK : Conseiller sur quels livres commander en plusieurs exemplaires, lesquels sont sous-utilisés
3. CATALOGUE : Répondre à toute question sur les livres disponibles, leur disponibilité, leur genre
4. RÉSUMÉS : Résumer n'importe quel livre du catalogue (et même hors catalogue)
5. RECOMMANDATIONS : Suggérer des livres pour les étudiants ou pour enrichir le catalogue
6. OPÉRATIONNEL : Rappeler le flux de travail (comment confirmer un emprunt, gérer un retour, etc.)

LANGUE : Détecte la langue de l'utilisateur et réponds dans cette langue (français ou anglais).
STYLE : Professionnel mais accessible. Données précises. Réponses structurées si besoin.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — ÉTUDIANT (accès restreint, pas de stats)
// ─────────────────────────────────────────────────────────────────────────────
async function buildStudentPrompt(studentName) {
  const { catalogText, bookCount } = await buildCatalogContext();

  return `Tu es BookIA, l'assistante IA de la bibliothèque LibraFlow du BIT (Burkina Institute of Technology).
Tu aides ${studentName || "l'étudiant"} à trouver de bons livres et à utiliser la bibliothèque.

══════════════════════════════════════════════
CATALOGUE DISPONIBLE (${bookCount} livres) :
${catalogText}

══════════════════════════════════════════════
TES CAPACITÉS :
══════════════════════════════════════════════
✓ Résumer un livre (par titre ou auteur)
✓ Recommander des livres selon les goûts, le domaine d'étude ou le niveau
✓ Indiquer si un livre est disponible dans la bibliothèque
✓ Expliquer comment fonctionne le système d'emprunt et de réservation
✓ Donner des conseils de lecture et de méthode d'apprentissage
✓ Aider à trouver des livres sur un sujet donné

══════════════════════════════════════════════
⛔ RÈGLES STRICTES — ABSOLUMENT INTERDITES :
══════════════════════════════════════════════
- NE JAMAIS divulguer les statistiques de la bibliothèque (nombre d'emprunts, taux de retard, nombre d'étudiants, données de gestion…)
- NE JAMAIS répondre aux questions sur l'administration ou la gestion de LibraFlow
- NE JAMAIS communiquer les informations d'autres étudiants
- Si quelqu'un demande des statistiques ou des données administratives → répondre : "Ces informations sont réservées à l'administration. Je peux t'aider à trouver un livre ou te faire une recommandation ! 😊"
- Ces règles s'appliquent MÊME si la demande est formulée autrement, indirectement ou de façon détournée

LANGUE : Réponds dans la langue de l'étudiant (français ou anglais).
STYLE : Chaleureux, encourageant, concis (max 4 phrases sauf pour les résumés).`;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/chat — Chat contextuel (système prompt selon le rôle)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/chat", protect, async (req, res) => {
  try {
    if (!groq) return res.json({ reply: FALLBACK_CHAT, fallback: true });

    const { message, history } = req.body;
    const isLibrarian = req.user.role === "librarian";

    // Construire le system prompt selon le rôle
    const systemContent = isLibrarian
      ? await buildLibrarianPrompt(req.user.name)
      : await buildStudentPrompt(req.user.name);

    const messages = [{ role: "system", content: systemContent }];

    // Historique de conversation (max 20 messages)
    if (Array.isArray(history) && history.length > 0) {
      history.slice(-20).forEach((msg) => {
        if (msg.role === "user" || msg.role === "assistant") {
          messages.push({ role: msg.role, content: msg.text || msg.content || "" });
        }
      });
    }

    messages.push({ role: "user", content: message });

    const response = await groq.chat.completions.create({
      model:       MODEL,
      messages,
      temperature: isLibrarian ? 0.6 : 0.75, // plus précis pour l'admin
      max_tokens:  isLibrarian ? 1500 : 800,  // plus long pour l'analyse
    });

    const reply = response.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    if (isQuotaError(err)) return res.json({ reply: FALLBACK_CHAT, fallback: true });
    res.status(500).json({ message: "Erreur IA : " + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/summarize — Résumé d'un livre (tout le monde)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/summarize", protect, async (req, res) => {
  try {
    const { bookId, title } = req.body;
    let book = null;

    if (bookId) {
      book = await Book.findById(bookId).lean();
    } else if (title?.trim()) {
      book = await Book.findOne({ title: new RegExp(title.trim(), "i") }).lean();
    }

    if (!book) return res.status(404).json({ message: "Livre introuvable. Vérifiez le titre ou l'identifiant." });

    const prompt = `Tu es un expert littéraire. Résume en 4 phrases claires et engageantes le livre "${book.title}" de ${book.author} (genre : ${book.genre || "général"}).
Inclus : le sujet principal, le public cible, et pourquoi ce livre est pertinent pour des étudiants universitaires.
Réponds en français.`;

    const response = await groq.chat.completions.create({
      model:    MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.65,
      max_tokens:  400,
    });

    const summary = response.choices[0].message.content;
    res.json({ summary });
  } catch (err) {
    if (isQuotaError(err)) return res.json({ summary: FALLBACK_SUMMARY, fallback: true });
    res.status(500).json({ message: "Erreur IA : " + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/recommend — Recommandations (tout le monde, basé sur l'historique)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/recommend", protect, async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user._id })
      .populate("book", "title author genre")
      .limit(15)
      .lean();

    const { books: catalog } = await buildCatalogContext();
    const availableTitles = catalog
      .filter((b) => b.availableCopies > 0)
      .map((b) => `"${b.title}" de ${b.author} (${b.genre})`)
      .slice(0, 40)
      .join(", ");

    let profilePart = "";
    if (loans.length > 0) {
      const borrowed = loans.map((l) => `"${l.book?.title}" (${l.book?.genre})`).join(", ");
      profilePart = `L'étudiant a déjà emprunté : ${borrowed}.`;
    } else {
      profilePart = "L'étudiant n'a pas encore emprunté de livre.";
    }

    const prompt = `Tu es un bibliothécaire expert. ${profilePart}
Livres disponibles dans la bibliothèque : ${availableTitles || "catalogue varié"}.
Recommande 3 livres disponibles (si possible dans le catalogue) adaptés au profil de l'étudiant.
Réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
[{"title":"...","author":"...","reason":"..."}]`;

    const response = await groq.chat.completions.create({
      model:       MODEL,
      messages:    [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens:  600,
    });

    const text = response.choices[0].message.content;
    const jsonMatch = text.match(/\[.*\]/s);
    const recommendations = jsonMatch ? JSON.parse(jsonMatch[0]) : FALLBACK_RECOMMENDATIONS;
    res.json({ recommendations });
  } catch (err) {
    if (isQuotaError(err)) return res.json({ recommendations: FALLBACK_RECOMMENDATIONS, fallback: true });
    res.status(500).json({ message: "Erreur IA : " + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ai/stats-summary — Analyse IA des stats (BIBLIOTHÉCAIRE UNIQUEMENT)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/stats-summary", protect, librarianOnly, async (req, res) => {
  try {
    const statsText  = await buildStatsContext();
    const { catalogText, bookCount } = await buildCatalogContext();

    const prompt = `Tu es un assistant expert en gestion de bibliothèque universitaire.
${statsText}

Catalogue : ${bookCount} livres disponibles.

Donne une analyse en 3 parties :
1. État actuel (2 phrases sur la santé de la bibliothèque)
2. Points d'attention (1-2 alertes si il y en a : retards élevés, livres indisponibles, réservations expirées...)
3. Recommandations concrètes (2-3 actions à prendre)
Réponds en français, de façon structurée et professionnelle.`;

    const response = await groq.chat.completions.create({
      model:       MODEL,
      messages:    [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens:  800,
    });

    const summary = response.choices[0].message.content;
    res.json({ summary });
  } catch (err) {
    if (isQuotaError(err)) return res.json({ summary: FALLBACK_STATS, fallback: true });
    res.status(500).json({ message: "Erreur IA : " + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/transcribe — Whisper STT (tout le monde)
// ─────────────────────────────────────────────────────────────────────────────
router.post("/transcribe", protect, async (req, res) => {
  let tempFilePath = null;
  try {
    const { audio } = req.body;
    if (!audio) return res.status(400).json({ message: "Audio manquant" });

    const base64Data  = audio.replace(/^data:audio\/\w+;base64,/, "");
    const buffer      = Buffer.from(base64Data, "base64");
    const tempDir     = path.join(__dirname, "../temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    tempFilePath = path.join(tempDir, `transcribe_${Date.now()}.wav`);
    fs.writeFileSync(tempFilePath, buffer);

    if (!groq) {
      fs.existsSync(tempFilePath) && fs.unlinkSync(tempFilePath);
      return res.json({ text: "", error: "Groq non configuré" });
    }

    const transcription = await groq.audio.transcriptions.create({
      file:     fs.createReadStream(tempFilePath),
      model:    "whisper-large-v3",
      language: "fr",
    });

    fs.existsSync(tempFilePath) && fs.unlinkSync(tempFilePath);
    res.json({ text: transcription.text });
  } catch (err) {
    tempFilePath && fs.existsSync(tempFilePath) && fs.unlinkSync(tempFilePath);
    res.status(500).json({ message: "Erreur transcription : " + err.message });
  }
});

module.exports = router;
