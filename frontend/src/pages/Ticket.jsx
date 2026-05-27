import { useLocation, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, CheckCircle2, Clock, BookOpen } from "lucide-react";
import { generateLoanPDF, generateActiveLoanPDF, generateReturnReceiptPDF } from "../utils/generatePDF";

export default function Ticket() {
  const location = useLocation();
  const navigate = useNavigate();
  const { type, loan, qrCode } = location.state || {};

  if (!loan) {
    return <Navigate to="/app/loans" replace />;
  }

  // type : "reservation" | "active" | "return"
  const isReservation = type === "reservation";
  const isActive      = type === "active";
  const isReturn      = type === "return";

  const handleDownload = async () => {
    if (isReservation) await generateLoanPDF(loan, qrCode);
    else if (isActive)  await generateActiveLoanPDF(loan, qrCode);
    else                await generateReturnReceiptPDF(loan);
  };

  // ── Config d'affichage selon le type ──
  const config = isReservation
    ? {
        gradient:    "from-indigo-600 to-sky-500",
        title:       "Bon de Réservation",
        badgeBg:     "bg-amber-100 text-amber-800",
        badgeLabel:  "⏰ En attente de récupération",
        btnGradient: "from-sky-500 to-indigo-600",
        dateLabel:   "Récupérer avant",
        dateValue:   loan.pickupDeadline
          ? new Date(loan.pickupDeadline).toLocaleDateString("fr-FR")
          : "24h à partir de la réservation",
        icon:        null, // QR code affiché
      }
    : isActive
    ? {
        gradient:    "from-indigo-600 to-indigo-500",
        title:       "Bon d'Emprunt",
        badgeBg:     loan.status === "late"
          ? "bg-red-100 text-red-700"
          : "bg-sky-100 text-sky-700",
        badgeLabel:  loan.status === "late" ? "⚠ En retard" : "✓ Emprunt actif",
        btnGradient: "from-indigo-500 to-indigo-600",
        dateLabel:   "Retourner avant",
        dateValue:   loan.dueDate
          ? new Date(loan.dueDate).toLocaleDateString("fr-FR")
          : "—",
        icon:        <BookOpen className="w-16 h-16 opacity-20" />,
      }
    : {
        gradient:    "from-emerald-600 to-emerald-500",
        title:       "Reçu de Retour",
        badgeBg:     "bg-emerald-100 text-emerald-700",
        badgeLabel:  "✓ Livre rendu",
        btnGradient: "from-emerald-500 to-emerald-600",
        dateLabel:   "Retourné le",
        dateValue:   loan.returnedAt
          ? new Date(loan.returnedAt).toLocaleDateString("fr-FR")
          : new Date().toLocaleDateString("fr-FR"),
        icon:        <CheckCircle2 className="w-16 h-16 opacity-20" />,
      };

  return (
    <div className="animate-fade-in max-w-2xl mx-auto py-6">
      <button
        onClick={() => navigate("/app/loans")}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux emprunts
      </button>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className={`p-8 text-center text-white relative bg-gradient-to-br ${config.gradient}`}>
          <h2 className="text-3xl font-bold mb-1">{config.title}</h2>
          <p className="text-sm text-white/60 font-mono tracking-widest uppercase">
            #{loan._id.slice(-8)}
          </p>
          {config.icon && (
            <div className="absolute top-6 right-6">{config.icon}</div>
          )}
        </div>

        {/* Body */}
        <div className="p-8 relative">
          <div className="absolute -top-4 left-8 right-8 border-t-[3px] border-dashed border-slate-200" />

          {/* Badge statut */}
          <div className="flex justify-center mb-6 mt-2">
            <span className={`text-sm font-bold px-4 py-1.5 rounded-full ${config.badgeBg}`}>
              {config.badgeLabel}
            </span>
          </div>

          {/* QR code — réservation ET emprunt actif */}
          {(isReservation || isActive) && qrCode && (
            <div className="flex flex-col items-center justify-center mb-6">
              <div className={`p-3 bg-white rounded-2xl shadow-sm mb-3 border-4 ${isReservation ? "border-sky-100" : "border-indigo-100"}`}>
                <img src={qrCode} alt="QR Code" className="w-44 h-44" />
              </div>
              <div className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest ${isReservation ? "text-amber-600" : "text-indigo-500"}`}>
                <Clock className="w-3 h-3" />
                {isReservation
                  ? "Scannez pour récupérer le livre (24h)"
                  : "Scannez pour enregistrer le retour"}
              </div>
            </div>
          )}

          {/* Icône reçu de retour */}
          {isReturn && (
            <div className="flex flex-col items-center justify-center mb-6 text-emerald-500">
              <CheckCircle2 className="w-20 h-20 mb-2" />
              <p className="text-base font-bold text-slate-800">Livre retourné avec succès</p>
              <p className="text-sm text-slate-500 text-center max-w-xs mt-1">
                Ce reçu confirme que le livre a été rendu en bon état.
              </p>
            </div>
          )}

          {/* Infos principales */}
          <div className="bg-slate-50 p-6 rounded-2xl mb-6 space-y-5">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Livre</p>
              <p className="text-xl font-bold text-slate-900 leading-tight mb-0.5">{loan.book?.title}</p>
              <p className="text-sm text-slate-500">{loan.book?.author}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Étudiant</p>
                <p className="text-base font-bold text-slate-900">{loan.user?.name}</p>
                <p className="text-xs text-slate-500">{loan.user?.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                  {config.dateLabel}
                </p>
                <p className={`text-base font-bold font-mono ${
                  isActive && loan.status === "late" ? "text-red-600" : "text-slate-900"
                }`}>
                  {config.dateValue}
                </p>
              </div>
            </div>
          </div>

          {/* Bouton téléchargement */}
          <button
            onClick={handleDownload}
            className={`w-full py-4 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-lg bg-gradient-to-r ${config.btnGradient}`}
          >
            <Download className="w-5 h-5" />
            Télécharger en PDF
          </button>
        </div>
      </div>
    </div>
  );
}
