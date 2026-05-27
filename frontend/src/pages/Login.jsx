import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import api from "../api/axios";
import logo from "../assets/logo_LibraFlow.png";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      login(data);
      navigate("/app/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 bg-dots flex items-center justify-center p-4">
      <div className="fixed top-6 right-6 z-50">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-[900px] bg-white rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-2xl min-h-[520px] animate-fade-in">

        {/* ── Panneau gauche — Formulaire ── */}
        <div className="w-full md:w-1/2 p-10 flex flex-col items-center justify-center bg-white">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Connexion</h1>
          <p className="text-slate-400 text-sm mb-7">Accédez à votre espace LibraFlow</p>

          {error && (
            <div className="w-full max-w-[320px] mb-4 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-3 max-w-[320px]">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-100 border-none text-slate-800 text-sm outline-none focus:ring-2 focus:ring-sky-300 transition-all placeholder:text-slate-400"
              placeholder="Adresse e-mail"
              required
              autoComplete="email"
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-100 border-none text-slate-800 text-sm outline-none focus:ring-2 focus:ring-sky-300 transition-all placeholder:text-slate-400"
              placeholder="Mot de passe"
              required
              autoComplete="current-password"
            />

            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-full px-10 py-2.5 text-sm font-bold tracking-wider hover:from-sky-600 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-md"
              >
                {loading ? t("connecting") : "SE CONNECTER"}
              </button>
            </div>
          </form>

          {/* Lien mobile uniquement */}
          <p className="md:hidden text-sm text-slate-500 mt-6">
            Pas de compte ?{" "}
            <Link to="/register" className="text-sky-600 font-semibold hover:underline">
              S'inscrire
            </Link>
          </p>
        </div>

        {/* ── Panneau droit — Gradient LibraFlow ── */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-sky-500 to-indigo-700 p-10 flex flex-col items-center justify-center text-white text-center rounded-t-[3rem] md:rounded-t-none md:rounded-l-[4rem] md:rounded-r-[2rem] relative overflow-hidden">
          {/* Cercles déco */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col items-center">
            <img src={logo} alt="LibraFlow" className="w-16 h-16 rounded-2xl shadow-lg mb-5" />
            <h2 className="text-3xl font-extrabold mb-3 leading-tight">
              Nouveau ici ?
            </h2>
            <p className="text-sky-100 text-sm mb-8 leading-relaxed max-w-xs">
              Créez votre compte étudiant et accédez au catalogue, à l'assistant IA et à vos emprunts.
            </p>
            <Link
              to="/register"
              className="border-2 border-white text-white rounded-full px-10 py-2.5 text-sm font-bold tracking-wider hover:bg-white hover:text-sky-600 transition-all duration-200"
            >
              S'INSCRIRE
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
