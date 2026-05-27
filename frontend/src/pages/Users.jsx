import { useEffect, useState } from "react";
import api from "../api/axios";
import { useLanguage } from "../context/LanguageContext";
import {
  Users as UsersIcon, Shield, GraduationCap, Search,
  X, Phone, Mail, Hash, BookOpen, Trophy, Calendar, User,
} from "lucide-react";

/* ── Avatar : photo si dispo, sinon initiale ── */
function Avatar({ user, size = "md" }) {
  const dim = size === "lg" ? "w-20 h-20 text-2xl" : size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm";
  if (user.profileImage) {
    return (
      <img
        src={user.profileImage}
        alt={user.name}
        className={`${dim} rounded-full object-cover border-2 border-white shadow`}
        onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
      />
    );
  }
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-bold flex-shrink-0 ${
      user.role === "librarian"
        ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white"
        : "bg-gradient-to-br from-sky-400 to-indigo-500 text-white"
    }`}>
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

/* ── Modal profil utilisateur ── */
function UserProfileModal({ user, onClose }) {
  if (!user) return null;

  const isAdmin = user.role === "librarian";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div className={`relative p-8 text-center text-white ${
          isAdmin
            ? "bg-gradient-to-br from-amber-500 to-orange-500"
            : "bg-gradient-to-br from-sky-500 to-indigo-600"
        }`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Avatar grand format */}
          <div className="flex justify-center mb-3">
            {user.profileImage ? (
              <img
                src={user.profileImage}
                alt={user.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-white/30 shadow-lg"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center text-3xl font-black shadow-lg">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <h3 className="text-xl font-bold">{user.name}</h3>
          <span className={`inline-flex items-center gap-1 mt-1.5 text-xs font-bold px-3 py-1 rounded-full ${
            isAdmin ? "bg-white/20 text-white" : "bg-white/20 text-white"
          }`}>
            {isAdmin ? <Shield className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
            {isAdmin ? "Administrateur" : "Étudiant"}
          </span>
        </div>

        {/* Corps */}
        <div className="p-6 space-y-3">

          {/* Email */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <Mail className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
              <p className="text-sm font-semibold text-slate-800 truncate">{user.email}</p>
            </div>
          </div>

          {/* Téléphone */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Téléphone</p>
              <p className="text-sm font-semibold text-slate-800">
                {user.phone || <span className="text-slate-400 font-normal italic">Non renseigné</span>}
              </p>
            </div>
          </div>

          {/* Identifiant étudiant (students only) */}
          {!isAdmin && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                <Hash className="w-4 h-4 text-sky-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Numéro étudiant</p>
                <p className="text-sm font-semibold text-slate-800 font-mono">
                  {user.studentId || <span className="text-slate-400 font-normal italic">Non renseigné</span>}
                </p>
              </div>
            </div>
          )}

          {/* Date d'inscription */}
          {user.createdAt && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-violet-500" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inscrit le</p>
                <p className="text-sm font-semibold text-slate-800">
                  {new Date(user.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const { t } = useLanguage();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/users");
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    (u.studentId && u.studentId.toLowerCase().includes(search.toLowerCase()))
  );

  const admins   = filteredUsers.filter((u) => u.role === "librarian");
  const students = filteredUsers.filter((u) => u.role === "student");

  return (
    <div className="animate-fade-in">
      {/* Modal profil */}
      {selectedUser && (
        <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">Administration</p>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-slate-900">Utilisateurs</h2>
            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
              {users.length} Inscrits
            </span>
          </div>
        </div>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 mb-6">
        <div className="flex items-center gap-3 relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
          <input
            type="text"
            placeholder="Rechercher par nom, email ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 w-full bg-slate-50 border-slate-200 focus:bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-slate-400">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-5 py-3.5 font-semibold border-b border-slate-100">Utilisateur</th>
                  <th className="px-5 py-3.5 font-semibold border-b border-slate-100 hidden sm:table-cell">Email</th>
                  <th className="px-5 py-3.5 font-semibold border-b border-slate-100">Rôle</th>
                  <th className="px-5 py-3.5 font-semibold border-b border-slate-100 hidden md:table-cell">Identifiant</th>
                  <th className="px-5 py-3.5 font-semibold border-b border-slate-100 hidden lg:table-cell">Téléphone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">Aucun utilisateur trouvé.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr
                      key={u._id}
                      onClick={() => setSelectedUser(u)}
                      className="hover:bg-sky-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Nom + avatar */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <Avatar user={u} size="sm" />
                            {/* Point vert "en ligne" (décoratif) */}
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white bg-emerald-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 group-hover:text-sky-600 transition-colors truncate">
                              {u.name}
                            </p>
                            {/* Email visible seulement sur mobile quand la colonne email est masquée */}
                            <p className="text-[11px] text-slate-400 truncate sm:hidden">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-5 py-3.5 text-slate-500 hidden sm:table-cell">
                        <span className="truncate max-w-[200px] block">{u.email}</span>
                      </td>

                      {/* Rôle */}
                      <td className="px-5 py-3.5">
                        {u.role === "librarian" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200/50">
                            <Shield className="w-3 h-3" /> Administrateur
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-bold border border-sky-200/50">
                            <GraduationCap className="w-3 h-3" /> Étudiant
                          </span>
                        )}
                      </td>

                      {/* Identifiant */}
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs hidden md:table-cell">
                        {u.studentId || "—"}
                      </td>

                      {/* Téléphone */}
                      <td className="px-5 py-3.5 text-slate-500 text-xs hidden lg:table-cell">
                        {u.phone ? (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-emerald-400" /> {u.phone}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer compteurs */}
          <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-amber-500" />
              <strong className="text-slate-700">{admins.length}</strong> admin{admins.length !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <GraduationCap className="w-3 h-3 text-sky-500" />
              <strong className="text-slate-700">{students.length}</strong> étudiant{students.length !== 1 ? "s" : ""}
            </span>
            <span className="ml-auto italic">Cliquez sur un utilisateur pour voir son profil</span>
          </div>
        </div>
      )}
    </div>
  );
}
