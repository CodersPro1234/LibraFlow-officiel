import { useEffect, useState } from "react";
import api from "../api/axios";
import { useLanguage } from "../context/LanguageContext";
import { Users as UsersIcon, Shield, GraduationCap, Search } from "lucide-react";

export default function Users() {
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

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

  return (
    <div className="animate-fade-in">
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
        <div className="flex items-center gap-3 relative max-w-md">
          <Search className="w-5 h-5 text-slate-400 absolute left-3" />
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
                <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold border-b border-slate-100">Utilisateur</th>
                  <th className="p-4 font-semibold border-b border-slate-100">Email</th>
                  <th className="p-4 font-semibold border-b border-slate-100">Rôle</th>
                  <th className="p-4 font-semibold border-b border-slate-100">Identifiant (ID)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-slate-400">Aucun utilisateur trouvé.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-medium text-slate-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        {u.name}
                      </td>
                      <td className="p-4 text-slate-500">{u.email}</td>
                      <td className="p-4">
                        {u.role === "librarian" ? (
                          <span className="flex items-center gap-1.5 w-fit px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-200/50">
                            <Shield className="w-3.5 h-3.5" /> Administrateur
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 w-fit px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-bold border border-sky-200/50">
                            <GraduationCap className="w-3.5 h-3.5" /> Étudiant
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 font-mono text-xs">{u.studentId || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
