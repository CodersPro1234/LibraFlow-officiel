import { useLocation, Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, FileText, CheckCircle2 } from "lucide-react";
import { generateLoanPDF, generateReturnReceiptPDF } from "../utils/generatePDF";

export default function Ticket() {
  const location = useLocation();
  const navigate = useNavigate();
  const { type, loan, qrCode } = location.state || {};

  if (!loan) {
    return <Navigate to="/app/loans" replace />;
  }

  const isLoan = type === "loan";

  const handleDownload = () => {
    if (isLoan) {
      generateLoanPDF(loan, qrCode);
    } else {
      generateReturnReceiptPDF(loan);
    }
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
        <div className={`p-8 text-center text-white relative ${isLoan ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-gradient-to-br from-emerald-600 to-emerald-500'}`}>
          <h2 className="text-3xl font-bold mb-2">
            {isLoan ? "Bon d'Emprunt" : "Reçu de Retour"}
          </h2>
          <p className="text-sm text-white/70 font-mono tracking-widest uppercase">
            #{loan._id.slice(-8)}
          </p>
          
          {!isLoan && (
            <div className="absolute top-6 right-6 opacity-20">
              <CheckCircle2 className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-8 relative">
          <div className="absolute -top-4 left-8 right-8 border-t-[3px] border-dashed border-slate-200" />
          
          {isLoan && qrCode && (
            <div className="flex flex-col items-center justify-center mb-8 mt-4">
              <div className="p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm mb-3">
                 <img src={qrCode} alt="QR Code" className="w-40 h-40" />
              </div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest text-center">
                Scannez à la bibliothèque
              </p>
            </div>
          )}

          {!isLoan && (
            <div className="flex flex-col items-center justify-center mb-8 mt-4 text-emerald-500">
               <CheckCircle2 className="w-20 h-20 mb-3" />
               <p className="text-lg font-bold text-slate-800">Livre retourné avec succès</p>
               <p className="text-sm text-slate-500 text-center max-w-xs mt-1">
                 Ce reçu confirme que le livre a été rendu en bon état.
               </p>
            </div>
          )}

          <div className="bg-slate-50 p-6 rounded-2xl mb-8 space-y-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Livre</p>
              <p className="text-xl font-bold text-slate-900 leading-tight mb-1">{loan.book?.title}</p>
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
                  {isLoan ? "Retour max" : "Date de retour"}
                </p>
                <p className="text-base font-bold text-slate-900 font-mono">
                  {new Date(isLoan ? loan.dueDate : (loan.returnedAt || Date.now())).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className={`w-full py-4 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-lg ${
              isLoan 
                ? 'bg-gradient-to-r from-sky-500 to-indigo-600' 
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
            }`}
          >
            <Download className="w-5 h-5" />
            Télécharger en PDF
          </button>
        </div>
      </div>
    </div>
  );
}
