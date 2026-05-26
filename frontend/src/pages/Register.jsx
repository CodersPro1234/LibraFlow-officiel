import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import api from "../api/axios";
import { useToast } from "../hooks/useToast";
import {
  User, Mail, Lock, Hash, BookOpen, Sparkles, Trophy,
  GraduationCap, Library, ArrowRight, CheckCircle2,
} from "lucide-react";
import logo from "../assets/logo_LibraFlow.png";

/* ── Champ input avec icône ── */
function InputField({ icon: Icon, type = "text", value, onChange, placeholder, required, autoComplete }) {
  return (
    <div className="relative">
      <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-sm outline-none
                   focus:ring-2 focus:ring-sky-300 focus:border-sky-400 focus:bg-white transition-all
                   placeholder:text-slate-400"
      />
    </div>
  );
}

export default function Register() {
  const [form, setForm] = useState({
    name: "", email: "", password: "", role: "student", studentId: "",
  });
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const navigate = useNavigate();
  const toast = useToast();

  const isLibrarian = form.role === "librarian";

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

  /* ────────────────────────────── Render ────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-sky-950 to-indigo-900 flex items-center justify-center p-4">
      {/* Language toggle */}
      <div className="fixed top-5 right-5 z-50">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl animate-fade-in">

        {/* ══════════ LEFT — Panneau gradient ══════════ */}
        <div className="hidden md:flex flex-col w-[45%] flex-shrink-0 bg-gradient-to-br from-sky-500 via-sky-600 to-indigo-700 p-10 text-white relative overflow-hidden">
          {/* Cercles décoratifs */}
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-white/5" />

          {/* Logo */}
          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <img src={logo} alt="LibraFlow" className="w-10 h-10 rounded-xl shadow-md" />
              <span className="text-xl font-bold tracking-tight">LibraFlow</span>
            </Link>
          </div>

          {/* Tagline */}
          <div className="relative z-10 mt-12 flex-1">
            <h2 className="text-3xl font-bold leading-tight mb-3">
              Rejoignez<br />LibraFlow 🎓
            </h2>
            <p className="text-sky-100 text-sm leading-relaxed mb-8">
              La bibliothèque intelligente de votre établissement.
            </p>

            {/* Features */}
            <ul className="space-y-4">
              {[
                { Icon: BookOpen,  label: "Catalogue de livres enrichi" },
                { Icon: Sparkles,  label: "Assistant IA intégré (Lia)" },
                { Icon: Trophy,    label: "Système de gamification" },
              ].map(({ Icon, label }) => (
                <li key={label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-sky-50">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Statistiques */}
          <div className="relative z-10 flex gap-6 mt-8 border-t border-white/20 pt-6">
            {[
              { value: "300+", label: "Livres" },
              { value: "IA",   label: "Assistant" },
              { value: "∞",    label: "Emprunts" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-extrabold">{value}</p>
                <p className="text-xs text-sky-200 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ══════════ RIGHT — Formulaire ══════════ */}
        <div className="flex-1 p-8 md:p-10 flex flex-col justify-center">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-6 md:hidden">
            <img src={logo} alt="LibraFlow" className="w-8 h-8 rounded-lg" />
            <span className="text-lg font-bold text-slate-900">LibraFlow</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">Créer un compte</h1>
          <p className="text-slate-400 text-sm mb-6">
            Déjà inscrit ?{" "}
            <Link to="/login" className="text-sky-600 hover:underline font-medium">
              Se connecter
            </Link>
          </p>

          {/* Role toggle */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
            {[
              { value: "student",   label: "Étudiant",      Icon: GraduationCap },
              { value: "librarian", label: "Bibliothécaire", Icon: Library       },
            ].map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm({ ...form, role: value })}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  form.role === value
                    ? "bg-white text-sky-700 shadow-sm border border-sky-100"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <InputField
              icon={User}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom complet"
              required
              autoComplete="name"
            />
            <InputField
              icon={Mail}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Adresse e-mail"
              required
              autoComplete="email"
            />
            <InputField
              icon={Lock}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mot de passe (min. 6 caractères)"
              required
              autoComplete="new-password"
            />

            {/* StudentId — étudiant uniquement */}
            {!isLibrarian && (
              <InputField
                icon={Hash}
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                placeholder="Numéro étudiant (ex : BIT-2024-001)"
                required
                autoComplete="off"
              />
            )}

            {/* Avertissement bibliothécaire */}
            {isLibrarian && (
              <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                <p>
                  Les comptes bibliothécaires sont créés par l&apos;administrateur.{" "}
                  <span className="font-semibold">Inscrivez-vous d'abord comme étudiant</span>{" "}
                  puis demandez l&apos;élévation de droits à votre responsable.
                </p>
              </div>
            )}

            {/* CGU */}
            <p className="text-[11px] text-slate-400 leading-relaxed">
              En créant un compte vous acceptez les{" "}
              <span className="underline cursor-pointer hover:text-slate-600">
                conditions d&apos;utilisation
              </span>
              .
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                         bg-gradient-to-r from-sky-500 to-indigo-600
                         text-white font-semibold text-sm
                         hover:from-sky-600 hover:to-indigo-700 active:scale-[.99]
                         transition-all shadow-md disabled:opacity-60"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t("processing")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Créer mon compte
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
