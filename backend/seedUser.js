require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const users = [
  // ── BIBLIOTHÉCAIRES ──
  {
    name: "Admin BIT",
    email: "admin@bit.edu",
    password: "admin123",
    role: "librarian",
  },
  {
    name: "Fatima Ouédraogo",
    email: "fatima.ouedraogo@bit.edu",
    password: "fatima123",
    role: "librarian",
  },

  // ── ÉTUDIANTS ──
  {
    name: "Kofi Diallo",
    email: "kofi.diallo@bit.edu",
    password: "kofi123",
    role: "student",
    studentId: "BIT2024001",
  },
  {
    name: "Aïcha Maiga",
    email: "aicha.maiga@bit.edu",
    password: "aicha123",
    role: "student",
    studentId: "BIT2024002",
  },
  {
    name: "Sidi Ouédraogo",
    email: "sidi.ouedraogo@bit.edu",
    password: "sidi123",
    role: "student",
    studentId: "BIT2024003",
  },
  {
    name: "Aminata Traoré",
    email: "aminata.traore@bit.edu",
    password: "aminata123",
    role: "student",
    studentId: "BIT2024004",
  },
  {
    name: "Ibrahim Sawadogo",
    email: "ibrahim.sawadogo@bit.edu",
    password: "ibrahim123",
    role: "student",
    studentId: "BIT2024005",
  },
  {
    name: "Mariam Kaboré",
    email: "mariam.kabore@bit.edu",
    password: "mariam123",
    role: "student",
    studentId: "BIT2024006",
  },
  {
    name: "Seydou Coulibaly",
    email: "seydou.coulibaly@bit.edu",
    password: "seydou123",
    role: "student",
    studentId: "BIT2024007",
  },
  {
    name: "Rasmata Zongo",
    email: "rasmata.zongo@bit.edu",
    password: "rasmata123",
    role: "student",
    studentId: "BIT2024008",
  },
  {
    name: "Adama Compaoré",
    email: "adama.compaore@bit.edu",
    password: "adama123",
    role: "student",
    studentId: "BIT2024009",
  },
  {
    name: "Salimata Barry",
    email: "salimata.barry@bit.edu",
    password: "salimata123",
    role: "student",
    studentId: "BIT2024010",
  },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connecté");

    await User.deleteMany({});
    try {
      await User.collection.dropIndex("studentId_1");
    } catch (e) {
      // Index might not exist, that's fine
    }
    console.log("🗑️  Anciens utilisateurs supprimés");

    // On crée les users un par un pour que le hook bcrypt s'exécute
    const created = [];
    for (const u of users) {
      const user = await User.create(u);
      created.push(user);
      console.log(
        `   ✅ ${user.role === "librarian" ? "👔" : "🎓"} ${user.name} — ${user.email}`,
      );
    }

    console.log(`\n👥 ${created.length} utilisateurs créés avec succès !\n`);
    console.log("📋 Comptes de connexion :");
    console.log("   👔 Bibliothécaire : admin@bit.edu / admin123");
    console.log("   🎓 Étudiant       : kofi.diallo@bit.edu / kofi123\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Erreur :", err.message);
    process.exit(1);
  }
};

seed();
