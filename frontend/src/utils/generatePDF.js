import jsPDF from "jspdf";

// ── Couleurs LibraFlow ──
const COLORS = {
  ink: [15, 14, 12],
  gold: [201, 168, 76],
  sage: [74, 103, 65],
  rust: [184, 92, 56],
  muted: [138, 128, 112],
  light: [245, 240, 232],
  white: [254, 252, 248],
};

const setColor = (doc, color, type = "fill") => {
  if (type === "fill") doc.setFillColor(...color);
  else doc.setTextColor(...color);
};

// ── PDF BON D'EMPRUNT (téléchargé par l'étudiant) ──
export const generateLoanPDF = (loan, qrCodeBase64) => {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const W = 210;
  const margin = 20;

  // ── HEADER ──
  setColor(doc, COLORS.ink, "fill");
  doc.rect(0, 0, W, 45, "F");

  // Logo cercle
  setColor(doc, COLORS.gold, "fill");
  doc.circle(margin + 8, 22, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setColor(doc, COLORS.ink, "text");
  doc.text("L", margin + 5.5, 25.5);

  // Titre
  doc.setFontSize(22);
  setColor(doc, COLORS.white, "text");
  doc.text("LibraFlow", margin + 22, 19);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.gold, "text");
  doc.text("Smart Library Management · BIT", margin + 22, 27);

  // Label BON D'EMPRUNT à droite
  doc.setFontSize(9);
  setColor(doc, [255, 255, 255], "text");
  doc.text("BON D'EMPRUNT", W - margin - 35, 19);
  doc.setFontSize(8);
  setColor(doc, COLORS.gold, "text");
  doc.text(
    `#${loan._id?.slice(-8)?.toUpperCase() || "XXXXXXXX"}`,
    W - margin - 35,
    26,
  );

  // ── LIGNE DE SÉPARATION GOLD ──
  setColor(doc, COLORS.gold, "fill");
  doc.rect(0, 45, W, 2, "F");

  // ── CORPS ──
  let y = 65;

  // Message principal
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.ink, "text");
  doc.text("Bon de demande d'emprunt", margin, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.muted, "text");
  doc.text(
    "Présentez ce document au bibliothécaire pour récupérer votre livre.",
    margin,
    y,
  );
  y += 15;

  // ── SECTION ÉTUDIANT ──
  setColor(doc, COLORS.light, "fill");
  doc.rect(margin, y, W - margin * 2, 35, "F");
  setColor(doc, COLORS.gold, "fill");
  doc.rect(margin, y, 3, 35, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.muted, "text");
  doc.text("ÉTUDIANT", margin + 8, y + 8);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.ink, "text");
  doc.text(loan.user?.name || "—", margin + 8, y + 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.muted, "text");
  doc.text(loan.user?.email || "—", margin + 8, y + 26);
  if (loan.user?.studentId) {
    doc.text(`ID: ${loan.user.studentId}`, margin + 8, y + 32);
  }
  y += 45;

  // ── SECTION LIVRE ──
  setColor(doc, COLORS.light, "fill");
  doc.rect(margin, y, W - margin * 2, 35, "F");
  setColor(doc, COLORS.rust, "fill");
  doc.rect(margin, y, 3, 35, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.muted, "text");
  doc.text("LIVRE DEMANDÉ", margin + 8, y + 8);

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.ink, "text");
  doc.text(loan.book?.title || "—", margin + 8, y + 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.muted, "text");
  doc.text(loan.book?.author || "—", margin + 8, y + 26);
  if (loan.book?.genre) {
    doc.text(loan.book.genre, margin + 8, y + 32);
  }
  y += 45;

  // ── DATES ──
  const dateEmprunt = new Date(loan.createdAt || Date.now()).toLocaleDateString(
    "fr-FR",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );
  const dateLimite = new Date(loan.dueDate).toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Deux colonnes dates
  const colW = (W - margin * 2 - 8) / 2;

  setColor(doc, COLORS.light, "fill");
  doc.rect(margin, y, colW, 25, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.muted, "text");
  doc.text("DATE DE DEMANDE", margin + 6, y + 8);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.ink, "text");
  doc.text(dateEmprunt, margin + 6, y + 17);

  setColor(doc, COLORS.light, "fill");
  doc.rect(margin + colW + 8, y, colW, 25, "F");
  setColor(doc, COLORS.gold, "fill");
  doc.rect(margin + colW + 8, y, 3, 25, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.muted, "text");
  doc.text("DATE LIMITE DE RETOUR", margin + colW + 14, y + 8);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.ink, "text");
  doc.text(dateLimite, margin + colW + 14, y + 17);
  y += 35;

  // ── QR CODE ──
  const qrSize = 55;
  const qrX = (W - qrSize) / 2;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.ink, "text");
  doc.text("Scannez ce QR code à la bibliothèque", W / 2, y + 8, {
    align: "center",
  });
  y += 14;

  // Cadre QR
  setColor(doc, COLORS.ink, "fill");
  doc.rect(qrX - 4, y - 4, qrSize + 8, qrSize + 8, "F");
  setColor(doc, COLORS.white, "fill");
  doc.rect(qrX - 2, y - 2, qrSize + 4, qrSize + 4, "F");

  if (qrCodeBase64) {
    doc.addImage(qrCodeBase64, "PNG", qrX, y, qrSize, qrSize);
  }
  y += qrSize + 12;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.muted, "text");
  doc.text(`Résumé : ${loan.book?.title} — ${loan.book?.author}`, W / 2, y, {
    align: "center",
  });
  y += 12;

  // ── FOOTER ──
  setColor(doc, COLORS.ink, "fill");
  doc.rect(0, 280, W, 17, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.muted, "text");
  doc.text("LibraFlow © 2026 · BIT Smart Library Management", W / 2, 290, {
    align: "center",
  });

  doc.save(`LibraFlow_Emprunt_${loan._id?.slice(-8) || "doc"}.pdf`);
};

// ── PDF REÇU DE RETOUR (style facture professionnelle) ──
export const generateReturnReceiptPDF = (loan) => {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const W = 210;
  const margin = 20;

  const returnDate = new Date(loan.returnedAt || Date.now());
  const borrowDate = new Date(loan.borrowedAt);
  const diffDays = Math.round(
    (returnDate - borrowDate) / (1000 * 60 * 60 * 24),
  );
  const receiptNum = `REC-${returnDate.getFullYear()}${String(returnDate.getMonth() + 1).padStart(2, "0")}${String(returnDate.getDate()).padStart(2, "0")}-${loan._id?.slice(-6)?.toUpperCase()}`;

  // ── HEADER ──
  setColor(doc, COLORS.ink, "fill");
  doc.rect(0, 0, W, 50, "F");

  // Logo
  setColor(doc, COLORS.gold, "fill");
  doc.circle(margin + 8, 22, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setColor(doc, COLORS.ink, "text");
  doc.text("L", margin + 5.5, 25.5);

  doc.setFontSize(22);
  setColor(doc, COLORS.white, "text");
  doc.text("LibraFlow", margin + 22, 19);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.gold, "text");
  doc.text("Smart Library Management · BIT", margin + 22, 27);

  // Numéro de reçu
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setColor(doc, [255, 255, 255], "text");
  doc.text("REÇU DE RETOUR", W - margin - 40, 17);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.gold, "text");
  doc.text(receiptNum, W - margin - 40, 24);
  doc.text(returnDate.toLocaleDateString("fr-FR"), W - margin - 40, 31);

  // Badge RETOURNÉ
  setColor(doc, COLORS.sage, "fill");
  doc.rect(W - margin - 42, 36, 42, 10, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.white, "text");
  doc.text("✓  RETOURNÉ", W - margin - 38, 43);

  // Ligne gold
  setColor(doc, COLORS.gold, "fill");
  doc.rect(0, 50, W, 2, "F");

  // ── TITRE ──
  let y = 68;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.ink, "text");
  doc.text("Reçu de retour de livre", margin, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.muted, "text");
  doc.text(
    "Ce document confirme officiellement le retour du livre à la bibliothèque du BIT.",
    margin,
    y,
  );
  y += 15;

  // ── INFOS ÉTUDIANT & LIVRE (deux colonnes) ──
  const col1X = margin;
  const col2X = W / 2 + 5;
  const colW2 = W / 2 - margin - 5;
  const sectionH = 50;

  // Colonne étudiant
  setColor(doc, COLORS.light, "fill");
  doc.rect(col1X, y, colW2, sectionH, "F");
  setColor(doc, COLORS.gold, "fill");
  doc.rect(col1X, y, 3, sectionH, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.muted, "text");
  doc.text("ÉTUDIANT", col1X + 8, y + 9);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.ink, "text");
  doc.text(loan.user?.name || "—", col1X + 8, y + 19);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.muted, "text");
  doc.text(loan.user?.email || "—", col1X + 8, y + 27);
  if (loan.user?.studentId) {
    doc.text(`Matricule: ${loan.user.studentId}`, col1X + 8, y + 34);
  }

  // Colonne livre
  setColor(doc, COLORS.light, "fill");
  doc.rect(col2X, y, colW2, sectionH, "F");
  setColor(doc, COLORS.rust, "fill");
  doc.rect(col2X, y, 3, sectionH, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.muted, "text");
  doc.text("LIVRE RETOURNÉ", col2X + 8, y + 9);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.ink, "text");

  // Tronquer le titre si trop long
  const bookTitle = loan.book?.title || "—";
  const titleTrunc =
    bookTitle.length > 28 ? bookTitle.slice(0, 25) + "..." : bookTitle;
  doc.text(titleTrunc, col2X + 8, y + 19);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.muted, "text");
  doc.text(loan.book?.author || "—", col2X + 8, y + 27);
  if (loan.book?.genre) {
    doc.text(loan.book.genre, col2X + 8, y + 34);
  }
  y += sectionH + 10;

  // ── TABLEAU RÉCAPITULATIF ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.ink, "text");
  doc.text("Récapitulatif de l'emprunt", margin, y);
  y += 8;

  const rows = [
    [
      "Date de demande",
      borrowDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    ],
    [
      "Date limite de retour",
      new Date(loan.dueDate).toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    ],
    [
      "Date de retour effectif",
      returnDate.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    ],
    ["Durée d'emprunt", `${diffDays} jour${diffDays > 1 ? "s" : ""}`],
    ["Statut", "Retourné en bon état ✓"],
  ];

  // En-tête tableau
  setColor(doc, COLORS.ink, "fill");
  doc.rect(margin, y, W - margin * 2, 9, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.white, "text");
  doc.text("Détail", margin + 5, y + 6);
  doc.text("Information", margin + 80, y + 6);
  y += 9;

  rows.forEach((row, i) => {
    const isLast = i === rows.length - 1;
    setColor(doc, i % 2 === 0 ? COLORS.white : COLORS.light, "fill");
    doc.rect(margin, y, W - margin * 2, 10, "F");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    setColor(doc, COLORS.muted, "text");
    doc.text(row[0], margin + 5, y + 6.5);

    doc.setFont("helvetica", isLast ? "bold" : "normal");
    setColor(doc, isLast ? COLORS.sage : COLORS.ink, "text");
    doc.text(row[1], margin + 80, y + 6.5);
    y += 10;
  });

  y += 15;

  // ── MESSAGE OFFICIEL ──
  setColor(doc, [232, 245, 233], "fill");
  doc.rect(margin, y, W - margin * 2, 22, "F");
  setColor(doc, COLORS.sage, "fill");
  doc.rect(margin, y, 3, 22, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.sage, "text");
  doc.text("✓  Retour confirmé par la bibliothèque du BIT", margin + 8, y + 9);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.muted, "text");
  doc.text(
    "Ce reçu fait foi du bon retour du livre. Conservez-le comme preuve.",
    margin + 8,
    y + 17,
  );
  y += 32;

  // ── SIGNATURES ──
  const sigW = (W - margin * 2 - 20) / 2;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, COLORS.muted, "text");

  // Signature bibliothécaire
  doc.line(margin, y + 15, margin + sigW, y + 15);
  doc.text("Signature du bibliothécaire", margin, y + 20);

  // Signature étudiant
  doc.line(margin + sigW + 20, y + 15, W - margin, y + 15);
  doc.text("Signature de l'étudiant", margin + sigW + 20, y + 20);
  y += 30;

  // ── FOOTER ──
  setColor(doc, COLORS.ink, "fill");
  doc.rect(0, 272, W, 25, "F");
  setColor(doc, COLORS.gold, "fill");
  doc.rect(0, 272, W, 1.5, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, COLORS.white, "text");
  doc.text("LibraFlow · BIT Smart Library", margin, 282);
  setColor(doc, COLORS.muted, "text");
  doc.setFont("helvetica", "normal");
  doc.text(`Reçu N° ${receiptNum}`, margin, 289);
  doc.text("Document généré automatiquement — LibraFlow © 2026", W / 2, 289, {
    align: "center",
  });
  setColor(doc, COLORS.gold, "text");
  doc.text(returnDate.toLocaleDateString("fr-FR"), W - margin, 289, {
    align: "right",
  });

  doc.save(`LibraFlow_Recu_Retour_${loan._id?.slice(-8) || "doc"}.pdf`);
};
