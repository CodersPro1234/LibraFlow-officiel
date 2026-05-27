import jsPDF from "jspdf";
import logoSrc from "../assets/logo_LibraFlow.png";

// ── Préchargement du logo (canvas → base64, mis en cache) ─────────────────
let _logoCache = null;
function getLogoBase64() {
  if (_logoCache) return Promise.resolve(_logoCache);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      _logoCache = canvas.toDataURL("image/png");
      resolve(_logoCache);
    };
    img.onerror = () => resolve(null); // fallback dessin vectoriel si erreur
    img.src = logoSrc;
  });
}

// ── Palette LibraFlow — sky-500 → indigo-600 ──────────────────────────────
const C = {
  sky:          [14,  165, 233],   // sky-500    #0ea5e9
  skyDark:      [2,   132, 199],   // sky-600    #0284c7
  skyLight:     [224, 242, 254],   // sky-100    #e0f2fe
  indigo:       [99,  102, 241],   // indigo-500 #6366f1
  indigoDark:   [79,  70,  229],   // indigo-600 #4f46e5
  indigoLight:  [224, 231, 255],   // indigo-100 #e0e7ff
  slate900:     [15,  23,  42],    // slate-900  #0f172a
  slate700:     [51,  65,  85],    // slate-700  #334155
  slate500:     [100, 116, 139],   // slate-500  #64748b
  slate200:     [226, 232, 240],   // slate-200  #e2e8f0
  slate100:     [241, 245, 249],   // slate-100  #f1f5f9
  slate50:      [248, 250, 252],   // slate-50   #f8fafc
  white:        [255, 255, 255],
  amber500:     [245, 158,  11],   // amber-500  #f59e0b
  amber100:     [254, 243, 199],   // amber-100  #fef3c7
  amber50:      [255, 251, 235],   // amber-50   #fffbeb
  amber800:     [146,  64,  14],   // amber-800  #92400e
  emerald500:   [16,  185, 129],   // emerald-500 #10b981
  emerald100:   [209, 250, 229],   // emerald-100 #d1fae5
  emerald800:   [6,    95,  70],   // emerald-800 #065f46
};

// Helpers concis
const fc = (doc, c) => doc.setFillColor(...c);  // fill color
const tc = (doc, c) => doc.setTextColor(...c);  // text color

// ── Placement du logo dans le header ─────────────────────────────────────
// logoBase64 : image préchargée (ou null → fallback vectoriel)
// headerH    : hauteur du bloc header en mm
function placeLogo(doc, logoBase64, M, headerH) {
  const logoSize = headerH - 8; // carré centré verticalement avec 4mm de marge haut/bas
  const logoY    = (headerH - logoSize) / 2;
  if (logoBase64) {
    doc.addImage(logoBase64, "PNG", M, logoY, logoSize, logoSize);
  } else {
    // Fallback : cercles vectoriels
    const cx = M + logoSize / 2;
    const cy = headerH / 2;
    fc(doc, C.sky);       doc.circle(cx, cy, 9, "F");
    fc(doc, C.white);     doc.circle(cx, cy, 7, "F");
    fc(doc, C.indigoDark);doc.circle(cx, cy, 5.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    tc(doc, C.white);
    doc.text("L", cx - 2.2, cy + 2.5);
  }
  return logoSize; // retourne la largeur occupée
}

// ─────────────────────────────────────────────────────────────────────────────
// BON DE RÉSERVATION  (téléchargé par l'étudiant après réservation)
// Page A4 = 210×297mm — footer à y=278 — usable: y=54..276
// ─────────────────────────────────────────────────────────────────────────────
export const generateLoanPDF = async (loan, qrCodeBase64) => {
  const logo = await getLogoBase64();
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const W = 210;
  const M = 20;
  const H = 48; // hauteur header

  // ── HEADER (indigo-600) — 0..48mm ────────────────────────────────────────
  fc(doc, C.indigoDark);
  doc.rect(0, 0, W, H, "F");

  // Liseré sky-500 sur le bord droit
  fc(doc, C.sky);
  doc.rect(W - 5, 0, 5, H, "F");

  // Logo réel (ou fallback)
  const logoW = placeLogo(doc, logo, M, H);
  const textX = M + logoW + 4;

  doc.setFontSize(19);
  doc.setFont("helvetica", "bold");
  tc(doc, C.white);
  doc.text("LibraFlow", textX, 21);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  tc(doc, C.skyLight);
  doc.text("Smart Library Management · BIT", textX, 29);

  // Badge "BON DE RÉSERVATION"
  fc(doc, C.sky);
  doc.roundedRect(W - M - 54, 10, 54, 12, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  tc(doc, C.white);
  doc.text("BON DE RÉSERVATION", W - M - 51, 18);

  // Numéro d'ID
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  tc(doc, C.skyLight);
  doc.text(`#${loan._id?.slice(-8)?.toUpperCase() || "XXXXXXXX"}`, W - M - 51, 29);

  // ── Liseré sky sous header ────────────────────────────────────────────────
  fc(doc, C.sky);
  doc.rect(0, H, W, 2, "F");

  // ── SOUS-TITRE — y = H + 8 ───────────────────────────────────────────────
  let y = H + 8;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate900);
  doc.text("Bon de réservation d'emprunt", M, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text(
    "Présentez ce QR code au bibliothécaire dans les 24 h pour récupérer votre livre.",
    M, y,
  );
  y += 12;

  // ── ÉTUDIANT & LIVRE : deux colonnes côte à côte ─────────────────────────
  const col1X = M;
  const col2X = W / 2 + 3;
  const colW2 = W / 2 - M - 3;
  const infoH = 32;

  // Étudiant (slate-100 / sky)
  fc(doc, C.slate100);
  doc.rect(col1X, y, colW2, infoH, "F");
  fc(doc, C.sky);
  doc.rect(col1X, y, 3, infoH, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate500);
  doc.text("ÉTUDIANT", col1X + 7, y + 8);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate900);
  doc.text(loan.user?.name || "—", col1X + 7, y + 17);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text(loan.user?.email || "—", col1X + 7, y + 24);
  if (loan.user?.studentId) {
    doc.text(`Matricule : ${loan.user.studentId}`, col1X + 7, y + 30);
  }

  // Livre (indigo-100 / indigo)
  fc(doc, C.indigoLight);
  doc.rect(col2X, y, colW2, infoH, "F");
  fc(doc, C.indigo);
  doc.rect(col2X, y, 3, infoH, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate500);
  doc.text("LIVRE RÉSERVÉ", col2X + 7, y + 8);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate900);
  const bookTitle = loan.book?.title || "—";
  const titleTrunc = bookTitle.length > 28 ? bookTitle.slice(0, 25) + "…" : bookTitle;
  doc.text(titleTrunc, col2X + 7, y + 17);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text(loan.book?.author || "—", col2X + 7, y + 24);
  if (loan.book?.genre) {
    doc.text(loan.book.genre, col2X + 7, y + 30);
  }
  y += infoH + 8;

  // ── ALERTE 24H (fond amber-100, bordure amber-500) — h=26 ─────────────────
  const pickupDeadline = loan.pickupDeadline
    ? new Date(loan.pickupDeadline)
    : new Date(Date.now() + 24 * 60 * 60 * 1000);

  const pickupDateStr = pickupDeadline.toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const pickupTimeStr = pickupDeadline.toLocaleTimeString("fr-FR", {
    hour: "2-digit", minute: "2-digit",
  });

  fc(doc, C.amber100);
  doc.rect(M, y, W - M * 2, 26, "F");
  fc(doc, C.amber500);
  doc.rect(M, y, 3.5, 26, "F");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  tc(doc, C.amber800);
  doc.text("⚠  DÉLAI DE RÉCUPÉRATION : 24 HEURES", M + 9, y + 9);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate700);
  doc.text(
    `Récupérez votre livre avant le ${pickupDateStr} à ${pickupTimeStr}.`,
    M + 9, y + 17,
  );
  doc.text("Passé ce délai, la réservation est annulée automatiquement.", M + 9, y + 23);
  y += 34;

  // ── DEUX COLONNES DATES — h=22 ────────────────────────────────────────────
  const dateReservation = new Date(loan.createdAt || Date.now()).toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const colW = (W - M * 2 - 8) / 2;

  // Col gauche : Date de réservation
  fc(doc, C.slate100);
  doc.rect(M, y, colW, 22, "F");
  fc(doc, C.sky);
  doc.rect(M, y, 3, 22, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate500);
  doc.text("DATE DE RÉSERVATION", M + 7, y + 8);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate900);
  doc.text(dateReservation, M + 7, y + 17);

  // Col droite : Récupérer avant
  fc(doc, C.amber100);
  doc.rect(M + colW + 8, y, colW, 22, "F");
  fc(doc, C.amber500);
  doc.rect(M + colW + 8, y, 3, 22, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  tc(doc, C.amber800);
  doc.text("RÉCUPÉRER AVANT", M + colW + 14, y + 8);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate900);
  doc.text(`${pickupDateStr}  à  ${pickupTimeStr}`, M + colW + 14, y + 17);
  y += 30;

  // ── QR CODE — taille 46mm, centré ────────────────────────────────────────
  const qrSize = 46;
  const qrX    = (W - qrSize) / 2;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate900);
  doc.text("Scannez ce QR code à la bibliothèque", W / 2, y + 7, { align: "center" });
  y += 12;

  // Cadre sky autour du QR
  fc(doc, C.sky);
  doc.rect(qrX - 4, y - 4, qrSize + 8, qrSize + 8, "F");
  fc(doc, C.white);
  doc.rect(qrX - 2, y - 2, qrSize + 4, qrSize + 4, "F");

  if (qrCodeBase64) {
    doc.addImage(qrCodeBase64, "PNG", qrX, y, qrSize, qrSize);
  }
  y += qrSize + 7;

  // Résumé sous QR
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text(
    `${loan.book?.title || "—"}  ·  ${loan.book?.author || "—"}`,
    W / 2, y, { align: "center" },
  );

  // ── FOOTER — y=278 ───────────────────────────────────────────────────────
  fc(doc, C.slate900);
  doc.rect(0, 278, W, 19, "F");
  fc(doc, C.sky);
  doc.rect(0, 278, W, 1.5, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text(
    "LibraFlow © 2026  ·  BIT Smart Library Management",
    W / 2, 289, { align: "center" },
  );

  doc.save(`LibraFlow_Reservation_${loan._id?.slice(-8) || "doc"}.pdf`);
};

// ─────────────────────────────────────────────────────────────────────────────
// BON D'EMPRUNT ACTIF  (le livre est chez l'étudiant)
// Contient un QR code que le bibliothécaire scannera pour enregistrer le retour
// ─────────────────────────────────────────────────────────────────────────────
export const generateActiveLoanPDF = async (loan, qrCodeBase64) => {
  const logo = await getLogoBase64();
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const W = 210;
  const M = 20;
  const H = 48;

  const borrowedAt  = new Date(loan.borrowedAt || Date.now());
  const dueDate     = new Date(loan.dueDate);
  const isLate      = dueDate < new Date();
  const dueDateStr  = dueDate.toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const borrowedStr = borrowedAt.toLocaleDateString("fr-FR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const diffDays = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));

  // ── HEADER (indigo-600) ───────────────────────────────────────────────────
  fc(doc, C.indigoDark);
  doc.rect(0, 0, W, H, "F");
  fc(doc, C.sky);
  doc.rect(W - 5, 0, 5, H, "F");

  const logoW = placeLogo(doc, logo, M, H);
  const textX = M + logoW + 4;

  doc.setFontSize(19);
  doc.setFont("helvetica", "bold");
  tc(doc, C.white);
  doc.text("LibraFlow", textX, 21);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  tc(doc, C.skyLight);
  doc.text("Smart Library Management · BIT", textX, 29);

  // Badge "BON D'EMPRUNT"
  fc(doc, C.sky);
  doc.roundedRect(W - M - 46, 10, 46, 12, 2, 2, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  tc(doc, C.white);
  doc.text("BON D'EMPRUNT", W - M - 43, 18);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  tc(doc, C.skyLight);
  doc.text(`#${loan._id?.slice(-8)?.toUpperCase() || "XXXXXXXX"}`, W - M - 43, 29);

  fc(doc, C.sky);
  doc.rect(0, H, W, 2, "F");

  // ── SOUS-TITRE ────────────────────────────────────────────────────────────
  let y = H + 8;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate900);
  doc.text("Bon d'emprunt — livre en votre possession", M, y);
  y += 6;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text(
    "Présentez ce QR code au bibliothécaire pour enregistrer le retour du livre.",
    M, y,
  );
  y += 12;

  // ── ÉTUDIANT & LIVRE (deux colonnes) ─────────────────────────────────────
  const col1X = M;
  const col2X = W / 2 + 3;
  const colW2 = W / 2 - M - 3;
  const infoH = 28;

  fc(doc, C.slate100);
  doc.rect(col1X, y, colW2, infoH, "F");
  fc(doc, C.sky);
  doc.rect(col1X, y, 3, infoH, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate500);
  doc.text("ÉTUDIANT", col1X + 7, y + 8);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate900);
  doc.text(loan.user?.name || "—", col1X + 7, y + 16);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text(loan.user?.email || "—", col1X + 7, y + 23);

  fc(doc, C.indigoLight);
  doc.rect(col2X, y, colW2, infoH, "F");
  fc(doc, C.indigo);
  doc.rect(col2X, y, 3, infoH, "F");

  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate500);
  doc.text("LIVRE EMPRUNTÉ", col2X + 7, y + 8);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate900);
  const bTitle = loan.book?.title || "—";
  const bTrunc = bTitle.length > 28 ? bTitle.slice(0, 25) + "…" : bTitle;
  doc.text(bTrunc, col2X + 7, y + 16);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text(loan.book?.author || "—", col2X + 7, y + 23);
  y += infoH + 8;

  // ── BLOC DATE LIMITE DE RETOUR ────────────────────────────────────────────
  const accentColor = isLate ? [220, 38, 38]   : C.indigo;
  const blockBg     = isLate ? [254, 226, 226]  : C.indigoLight;
  const labelColor  = isLate ? [185, 28, 28]    : C.indigoDark;

  fc(doc, blockBg);
  doc.rect(M, y, W - M * 2, 30, "F");
  fc(doc, accentColor);
  doc.rect(M, y, 4, 30, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  tc(doc, labelColor);
  doc.text(isLate ? "⚠  DATE DE RETOUR DÉPASSÉE" : "DATE LIMITE DE RETOUR", M + 10, y + 9);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  tc(doc, accentColor);
  doc.text(dueDateStr, M + 10, y + 21);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", isLate ? "bold" : "normal");
  tc(doc, labelColor);
  const dayMsg = isLate
    ? `Retard de ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? "s" : ""}  —  Retournez le livre immédiatement.`
    : diffDays === 0
    ? "À retourner aujourd'hui !"
    : `Il vous reste ${diffDays} jour${diffDays > 1 ? "s" : ""} pour retourner ce livre.`;
  doc.text(dayMsg, M + 10, y + 28);
  y += 38;

  // ── QR CODE (pour le retour) ──────────────────────────────────────────────
  const qrSize = 44;
  const qrX    = (W - qrSize) / 2;

  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate900);
  doc.text("Scannez ce QR code pour enregistrer le retour", W / 2, y + 7, { align: "center" });
  y += 11;

  // Cadre sky autour du QR
  fc(doc, C.sky);
  doc.rect(qrX - 4, y - 4, qrSize + 8, qrSize + 8, "F");
  fc(doc, C.white);
  doc.rect(qrX - 2, y - 2, qrSize + 4, qrSize + 4, "F");

  if (qrCodeBase64) {
    doc.addImage(qrCodeBase64, "PNG", qrX, y, qrSize, qrSize);
  }
  y += qrSize + 7;

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text(
    `${loan.book?.title || "—"}  ·  ${loan.book?.author || "—"}`,
    W / 2, y, { align: "center" },
  );
  y += 10;

  // ── TABLEAU COMPACT (3 lignes) ────────────────────────────────────────────
  const rows = [
    ["Date d'emprunt",     borrowedStr],
    ["Date limite retour", dueDateStr],
    ["Statut",             isLate ? "⚠  En retard" : "✓  Emprunt actif"],
  ];

  fc(doc, C.indigoDark);
  doc.rect(M, y, W - M * 2, 8, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  tc(doc, C.white);
  doc.text("Détail", M + 5, y + 5.5);
  doc.text("Information", M + 80, y + 5.5);
  y += 8;

  rows.forEach((row, i) => {
    const isLast = i === rows.length - 1;
    fc(doc, i % 2 === 0 ? C.white : C.slate50);
    doc.rect(M, y, W - M * 2, 9, "F");
    if (i % 2 === 0) { fc(doc, C.sky); doc.rect(M, y, 2, 9, "F"); }
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    tc(doc, C.slate500);
    doc.text(row[0], M + 7, y + 6);
    doc.setFont("helvetica", isLast ? "bold" : "normal");
    tc(doc, isLast ? (isLate ? [220, 38, 38] : C.indigo) : C.slate900);
    doc.text(row[1], M + 80, y + 6);
    y += 9;
  });

  y += 8;

  // ── MESSAGE OFFICIEL ──────────────────────────────────────────────────────
  fc(doc, C.indigoLight);
  doc.rect(M, y, W - M * 2, 16, "F");
  fc(doc, C.indigo);
  doc.rect(M, y, 3.5, 16, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  tc(doc, C.indigoDark);
  doc.text("📖  Emprunt validé par la bibliothèque du BIT", M + 9, y + 7);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text("Retournez ce livre en bon état avant la date indiquée.", M + 9, y + 13);

  // ── FOOTER ───────────────────────────────────────────────────────────────
  fc(doc, C.slate900);
  doc.rect(0, 278, W, 19, "F");
  fc(doc, C.sky);
  doc.rect(0, 278, W, 1.5, "F");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text(
    "LibraFlow © 2026  ·  BIT Smart Library Management",
    W / 2, 289, { align: "center" },
  );

  doc.save(`LibraFlow_Emprunt_${loan._id?.slice(-8) || "doc"}.pdf`);
};

// ─────────────────────────────────────────────────────────────────────────────
// REÇU DE RETOUR  (style facture professionnelle)
// ─────────────────────────────────────────────────────────────────────────────
export const generateReturnReceiptPDF = async (loan) => {
  const logo = await getLogoBase64();
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const W = 210;
  const M = 20;
  const H = 52;

  const returnDate = new Date(loan.returnedAt || Date.now());
  const borrowDate = new Date(loan.borrowedAt);
  const diffDays   = Math.max(0, Math.round((returnDate - borrowDate) / (1000 * 60 * 60 * 24)));
  const receiptNum = `REC-${returnDate.getFullYear()}${String(returnDate.getMonth() + 1).padStart(2, "0")}${String(returnDate.getDate()).padStart(2, "0")}-${loan._id?.slice(-6)?.toUpperCase()}`;

  // ── HEADER (indigo-600) ───────────────────────────────────────────────────
  fc(doc, C.indigoDark);
  doc.rect(0, 0, W, H, "F");

  // Liseré sky droit
  fc(doc, C.sky);
  doc.rect(W - 5, 0, 5, H, "F");

  const logoW = placeLogo(doc, logo, M, H);
  const textX = M + logoW + 4;

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  tc(doc, C.white);
  doc.text("LibraFlow", textX, 22);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  tc(doc, C.skyLight);
  doc.text("Smart Library Management · BIT", textX, 30);

  // Infos reçu (top-right)
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  tc(doc, C.white);
  doc.text("REÇU DE RETOUR", W - M - 44, 17);
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  tc(doc, C.skyLight);
  doc.text(receiptNum, W - M - 44, 24);
  doc.text(returnDate.toLocaleDateString("fr-FR"), W - M - 44, 31);

  // Badge RETOURNÉ (emerald)
  fc(doc, C.emerald500);
  doc.roundedRect(W - M - 46, 37, 46, 12, 2, 2, "F");
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  tc(doc, C.white);
  doc.text("✓  RETOURNÉ", W - M - 42, 45);

  // Liseré sky
  fc(doc, C.sky);
  doc.rect(0, H, W, 2.5, "F");

  // ── TITRE ────────────────────────────────────────────────────────────────
  let y = H + 14;
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate900);
  doc.text("Reçu de retour de livre", M, y);
  y += 7;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text(
    "Ce document confirme officiellement le retour du livre à la bibliothèque du BIT.",
    M, y,
  );
  y += 16;

  // ── DEUX COLONNES : ÉTUDIANT & LIVRE ─────────────────────────────────────
  const col1X  = M;
  const col2X  = W / 2 + 4;
  const colW2  = W / 2 - M - 4;
  const sectH  = 50;

  // Étudiant (slate-100 / sky)
  fc(doc, C.slate100);
  doc.rect(col1X, y, colW2, sectH, "F");
  fc(doc, C.sky);
  doc.rect(col1X, y, 3.5, sectH, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate500);
  doc.text("ÉTUDIANT", col1X + 8, y + 10);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate900);
  doc.text(loan.user?.name || "—", col1X + 8, y + 20);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text(loan.user?.email || "—", col1X + 8, y + 29);
  if (loan.user?.studentId) {
    doc.text(`Matricule : ${loan.user.studentId}`, col1X + 8, y + 37);
  }

  // Livre (indigo-100 / indigo)
  fc(doc, C.indigoLight);
  doc.rect(col2X, y, colW2, sectH, "F");
  fc(doc, C.indigo);
  doc.rect(col2X, y, 3.5, sectH, "F");

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate500);
  doc.text("LIVRE RETOURNÉ", col2X + 8, y + 10);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate900);
  const bTitle = loan.book?.title || "—";
  doc.text(bTitle.length > 25 ? bTitle.slice(0, 22) + "…" : bTitle, col2X + 8, y + 20);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text(loan.book?.author || "—", col2X + 8, y + 29);
  if (loan.book?.genre) {
    doc.text(loan.book.genre, col2X + 8, y + 37);
  }
  y += sectH + 12;

  // ── TABLEAU RÉCAPITULATIF ─────────────────────────────────────────────────
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  tc(doc, C.slate900);
  doc.text("Récapitulatif de l'emprunt", M, y);
  y += 8;

  const rows = [
    [
      "Date d'emprunt",
      borrowDate.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    ],
    [
      "Date limite de retour",
      new Date(loan.dueDate).toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    ],
    [
      "Date de retour effectif",
      returnDate.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    ],
    ["Durée d'emprunt", `${diffDays} jour${diffDays > 1 ? "s" : ""}`],
    ["Statut", "✓  Retourné en bon état"],
  ];

  // En-tête tableau (indigo-600)
  fc(doc, C.indigoDark);
  doc.rect(M, y, W - M * 2, 9, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  tc(doc, C.white);
  doc.text("Détail", M + 5, y + 6);
  doc.text("Information", M + 80, y + 6);
  y += 9;

  rows.forEach((row, i) => {
    const isLast = i === rows.length - 1;
    fc(doc, i % 2 === 0 ? C.white : C.slate50);
    doc.rect(M, y, W - M * 2, 10, "F");

    // Accent sky sur rangées paires
    if (i % 2 === 0) {
      fc(doc, C.sky);
      doc.rect(M, y, 2, 10, "F");
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    tc(doc, C.slate500);
    doc.text(row[0], M + 7, y + 6.5);

    doc.setFont("helvetica", isLast ? "bold" : "normal");
    tc(doc, isLast ? C.emerald500 : C.slate900);
    doc.text(row[1], M + 80, y + 6.5);
    y += 10;
  });

  y += 14;

  // ── MESSAGE OFFICIEL (emerald) ────────────────────────────────────────────
  fc(doc, C.emerald100);
  doc.rect(M, y, W - M * 2, 22, "F");
  fc(doc, C.emerald500);
  doc.rect(M, y, 3.5, 22, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  tc(doc, C.emerald800);
  doc.text("✓  Retour confirmé par la bibliothèque du BIT", M + 9, y + 9);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text("Ce reçu fait foi du bon retour du livre. Conservez-le comme preuve.", M + 9, y + 17);
  y += 32;

  // ── SIGNATURES ───────────────────────────────────────────────────────────
  const sigW = (W - M * 2 - 20) / 2;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);

  fc(doc, C.slate200);
  doc.rect(M, y + 12, sigW, 0.5, "F");
  doc.text("Signature du bibliothécaire", M, y + 20);

  fc(doc, C.slate200);
  doc.rect(M + sigW + 20, y + 12, sigW, 0.5, "F");
  doc.text("Signature de l'étudiant", M + sigW + 20, y + 20);

  // ── FOOTER ───────────────────────────────────────────────────────────────
  fc(doc, C.slate900);
  doc.rect(0, 272, W, 25, "F");
  fc(doc, C.sky);
  doc.rect(0, 272, W, 1.5, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  tc(doc, C.white);
  doc.text("LibraFlow · BIT Smart Library", M, 282);

  doc.setFont("helvetica", "normal");
  tc(doc, C.slate500);
  doc.text(`Reçu N° ${receiptNum}`, M, 289);
  doc.text("Document généré automatiquement — LibraFlow © 2026", W / 2, 289, { align: "center" });

  tc(doc, C.sky);
  doc.text(returnDate.toLocaleDateString("fr-FR"), W - M, 289, { align: "right" });

  doc.save(`LibraFlow_Recu_Retour_${loan._id?.slice(-8) || "doc"}.pdf`);
};
