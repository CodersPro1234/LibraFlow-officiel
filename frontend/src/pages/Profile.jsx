import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../hooks/useToast";
import api from "../api/axios";
import {
  User, Mail, Lock, Hash, Save, LogOut, Trophy,
  Star, ChevronLeft, CheckCircle2, Shield, Globe, Camera
} from "lucide-react";

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const { t, lang, toggleLang }       = useLanguage();
  const navigate = useNavigate();
  const toast    = useToast();

  const [form, setForm]       = useState({ name: "", email: "", studentId: "", password: "", confirmPwd: "" });
  const [saving, setSaving]   = useState(false);
  const [edited, setEdited]   = useState(false);

  /* Pré-remplir le formulaire avec les données actuelles */
  useEffect(() => {
    if (user) {
      setForm({ name: user.name || "", email: user.email || "", studentId: user.studentId || "", password: "", confirmPwd: "" });
    }
  }, [user]);

  const handleChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    setEdited(true);
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image est trop lourde (max. 2 Mo)");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        setSaving(true);
        const { data } = await api.put("/auth/profile", { profileImage: base64String });
        if (updateUser) updateUser(data);
        toast.success("Photo de profil mise à jour ✓");
      } catch (err) {
        toast.error("Erreur lors de l'envoi de l'image");
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPwd) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name, email: form.email };
      if (user.role === "student") payload.studentId = form.studentId;
      if (form.password) payload.password = form.password;

      const { data } = await api.put("/auth/profile", payload);
      // Mettre à jour le contexte Auth si la fonction existe
      if (updateUser) updateUser(data);
      toast.success("Profil mis à jour ✓");
      setEdited(false);
      setForm((f) => ({ ...f, password: "", confirmPwd: "" }));
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de la mise à jour");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isStudent = user?.role === "student";

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Retour */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors text-sm font-medium mb-6"
      >
        <ChevronLeft className="w-4 h-4" />
        Retour
      </button>

      {/* ── HEADER PROFIL ── */}
      <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-3xl p-5 sm:p-8 text-white mb-6 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute bottom-0 right-4 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative z-10 flex items-center gap-4">
          {/* Avatar avec téléversement */}
          <label 
            htmlFor="avatar-upload" 
            className="group relative w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center shadow-lg flex-shrink-0 cursor-pointer overflow-hidden transition-all duration-300 hover:border-white/60 hover:scale-105"
            title="Changer de photo de profil"
          >
            {user?.profileImage ? (
              <img 
                src={user.profileImage} 
                alt="Avatar" 
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
              />
            ) : (
              <span className="text-3xl font-black text-white group-hover:opacity-0 transition-opacity">
                {user?.name?.charAt(0).toUpperCase() || "U"}
              </span>
            )}
            
            {/* Overlay d'appareil photo sur hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
              <Camera className="w-6 h-6 text-white" />
              <span className="text-[9px] text-white/90 font-bold uppercase tracking-wider">Modifier</span>
            </div>
            
            <input 
              type="file" 
              id="avatar-upload" 
              accept="image/*" 
              className="hidden" 
              onChange={handleAvatarUpload} 
            />
          </label>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-black truncate">{user?.name}</h1>
            <p className="text-sky-100 text-sm mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Shield className="w-3.5 h-3.5 text-sky-200" />
              <span className="text-xs font-bold text-sky-100 uppercase tracking-widest">
                {user?.role === "student" ? (user?.studentId || t("student")) : t("admin")}
              </span>
            </div>
          </div>

          {/* Score (étudiants) */}
          {isStudent && (
            <div className="text-center flex-shrink-0 bg-white/10 px-4 py-2.5 rounded-2xl backdrop-blur-sm border border-white/10 shadow-inner">
              <div className="flex items-center gap-1 mb-1 justify-center">
                <Star className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                <span className="text-[10px] text-sky-100 font-bold uppercase tracking-wider">Score</span>
              </div>
              <p className="text-2xl font-black leading-none mb-0.5">{user?.points || 0}</p>
              <p className="text-sky-200 text-[10px] font-semibold">points</p>
            </div>
          )}
        </div>
      </div>

      {/* ── BADGES (étudiants) ── */}
      {isStudent && user?.badges?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 mb-6">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Badges débloqués ({user.badges.length})
          </h2>
          <div className="flex flex-wrap gap-3">
            {user.badges.map((b, i) => (
              <div
                key={i}
                title={b.name}
                className="group relative w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl hover:scale-110 transition-transform cursor-default"
              >
                {b.icon || <Trophy className="w-6 h-6 text-amber-500" />}
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                  {b.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FORMULAIRE D'ÉDITION ── */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 mb-6">
        <h2 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
          <User className="w-4 h-4 text-sky-500" />
          Modifier mes informations
        </h2>

        <div className="space-y-4">
          {/* Nom */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t("fullName")}</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text" required
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">{t("email")}</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email" required
                value={form.email}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
              />
            </div>
          </div>

          {/* ID Étudiant */}
          {isStudent && (
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ID Étudiant</label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={form.studentId}
                  onChange={(e) => handleChange("studentId", e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                  placeholder="BIT-2024-001"
                />
              </div>
            </div>
          )}

          {/* Séparateur mot de passe */}
          <div className="pt-2 pb-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              Changer le mot de passe (optionnel)
            </p>
          </div>

          {/* Nouveau mot de passe */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nouveau mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleChange("password", e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm outline-none focus:bg-white focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                placeholder="Laisser vide pour ne pas changer"
                minLength={form.password ? 6 : 0}
              />
            </div>
          </div>

          {/* Confirmer mot de passe */}
          {form.password && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Confirmer le mot de passe</label>
              <div className="relative">
                <CheckCircle2 className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${form.confirmPwd === form.password ? "text-emerald-500" : "text-slate-400"}`} />
                <input
                  type="password"
                  value={form.confirmPwd}
                  onChange={(e) => handleChange("confirmPwd", e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl border text-slate-800 text-sm outline-none transition-all bg-slate-50 focus:bg-white focus:ring-2 ${
                    form.confirmPwd && form.confirmPwd !== form.password
                      ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100"
                      : "border-slate-200 focus:border-sky-400 focus:ring-sky-100"
                  }`}
                  placeholder="Répétez le mot de passe"
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={saving || !edited}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-sm font-bold hover:shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? (
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : <Save className="w-4 h-4" />}
          {saving ? "Enregistrement..." : "Sauvegarder les modifications"}
        </button>
      </form>

      {/* ── LANGUE ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-card p-6 mb-6">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Globe className="w-4 h-4 text-sky-500" />
          Langue de l'interface
        </h2>
        <div className="flex gap-3">
          {[
            { code: "fr", flag: "🇫🇷", label: "Français" },
            { code: "en", flag: "🇬🇧", label: "English"  },
          ].map(({ code, flag, label }) => (
            <button
              key={code}
              onClick={() => { if (lang !== code) toggleLang(); }}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                lang === code
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
              }`}
            >
              <span className="text-xl">{flag}</span>
              {label}
              {lang === code && <CheckCircle2 className="w-4 h-4 text-sky-500" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── DÉCONNEXION ── */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-rose-50 text-rose-600 text-sm font-bold hover:bg-rose-100 transition-colors border border-rose-100"
      >
        <LogOut className="w-4 h-4" />
        {t("logout")}
      </button>
    </div>
  );
}
