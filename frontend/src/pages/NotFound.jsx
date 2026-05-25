import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo_LibraFlow.png";

export default function NotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      {/* Logo */}
      <img src={logo} alt="LibraFlow" className="h-14 w-auto mb-8 opacity-80" />

      {/* Illustration texte */}
      <div className="relative mb-6">
        <p className="text-[120px] sm:text-[160px] font-black text-slate-100 leading-none select-none">
          404
        </p>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl">📭</span>
        </div>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
        Page introuvable
      </h1>
      <p className="text-slate-500 text-sm max-w-sm mb-8 leading-relaxed">
        La page que vous cherchez n'existe pas ou a été déplacée.
        Retournez à l'accueil pour continuer.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => navigate(user ? "/app/dashboard" : "/")}
          className="px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl font-semibold text-sm hover:from-sky-600 hover:to-indigo-700 transition-all shadow-md"
        >
          {user ? "← Tableau de bord" : "← Retour à l'accueil"}
        </button>
        {user && (
          <button
            onClick={() => navigate("/app/catalogue")}
            className="px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-all"
          >
            📚 Catalogue
          </button>
        )}
      </div>

      <p className="text-slate-300 text-xs mt-12">
        LibraFlow © {new Date().getFullYear()} · BIT Smart Library
      </p>
    </div>
  );
}
