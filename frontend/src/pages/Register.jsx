import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import api from "../api/axios";
import { useToast } from "../hooks/useToast";
import logo from "../assets/logo_LibraFlow.png";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", studentId: "" });
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/register", form);
      toast.success(t("registrationSuccess"));
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || t("errorOccurred"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 bg-dots flex items-center justify-center p-4">
      <div className="fixed top-6 right-6 z-50">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-[900px] bg-white rounded-[2rem] overflow-hidden flex flex-col-reverse md:flex-row shadow-2xl min-h-[580px] animate-fade-in">

        {/* ── Panneau gauche — Gradient LibraFlow ── */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-sky-500 to-indigo-700 p-10 flex flex-col items-center justify-center text-white text-center rounded-b-[3rem] md:rounded-b-none md:rounded-r-[4rem] md:rounded-l-[2rem] relative overflow-hidden">
          {/* Cercles déco */}
          <div className="absolute -top-16 -left-16 w-56 h-56 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -right-16 w-64 h-64 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col items-center">
            <img src={logo} alt="LibraFlow" className="w-16 h-16 rounded-2xl shadow-lg mb-5" />
            <h2 className="text-3xl font-extrabold mb-3 leading-tight">
              Déjà membre ?
            </h2>
            <p className="text-sky-100 text-sm mb-8 leading-relaxed max-w-xs">
              Connectez-vous pour accéder à votre espace bibliothèque et reprendre vos emprunts.
            </p>
            <Link
              to="/login"
              className="border-2 border-white text-white rounded-full px-10 py-2.5 text-sm font-bold tracking-wider hover:bg-white hover:text-sky-600 transition-all duration-200"
            >
              SE CONNECTER
            </Link>
          </div>
        </div>

        {/* ── Panneau droit — Formulaire ── */}
        <div className="w-full md:w-1/2 p-10 flex flex-col items-center justify-center bg-white">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-1">Créer un compte</h1>
          <p className="text-slate-400 text-sm mb-7">Inscrivez-vous pour accéder à LibraFlow</p>

          <form onSubmit={handleSubmit} className="w-full space-y-3 max-w-[320px]">
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-100 border-none text-slate-800 text-sm outline-none focus:ring-2 focus:ring-sky-300 transition-all placeholder:text-slate-400"
              placeholder="Nom complet"
              required
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-100 border-none text-slate-800 text-sm outline-none focus:ring-2 focus:ring-sky-300 transition-all placeholder:text-slate-400"
              placeholder="Adresse e-mail"
              required
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-100 border-none text-slate-800 text-sm outline-none focus:ring-2 focus:ring-sky-300 transition-all placeholder:text-slate-400"
              placeholder="Mot de passe (min. 6 caractères)"
              required
            />
            <input
              type="text"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-slate-100 border-none text-slate-800 text-sm outline-none focus:ring-2 focus:ring-sky-300 transition-all placeholder:text-slate-400"
              placeholder="Numéro étudiant (ex : BIT-2024-001)"
            />

            <div className="flex justify-center pt-2">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-full px-10 py-2.5 text-sm font-bold tracking-wider hover:from-sky-600 hover:to-indigo-700 transition-all disabled:opacity-50 shadow-md"
              >
                {loading ? t("processing") : "S'INSCRIRE"}
              </button>
            </div>
          </form>

          {/* Lien mobile uniquement */}
          <p className="md:hidden text-sm text-slate-500 mt-6">
            Déjà un compte ?{" "}
            <Link to="/login" className="text-sky-600 font-semibold hover:underline">
              Se connecter
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
