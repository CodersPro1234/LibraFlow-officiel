import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../hooks/useToast";
import QRScanner from "../components/QRScanner";
import { X } from "lucide-react";

export default function Loans() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const [loans, setLoans] = useState([]);
  const [books, setBooks] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [form, setForm] = useState({ userId: "", bookId: "" });
  const [loading, setLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);
  const navigate = useNavigate();
  // Ref pour éviter le double toast causé par React.StrictMode en développement
  // (StrictMode exécute chaque useEffect 2 fois pour détecter les side effects)
  const errorShownRef = useRef(false);

  const fetchAll = function () {
    const isAdmin = user?.role === "librarian";
    const calls = [
      api.get("/loans"),
      api.get("/books?available=true"),
    ];

    if (isAdmin) {
      calls.push(api.get("/auth/users"));
    }

    Promise.all(calls)
      .then(function (results) {
        errorShownRef.current = false; // Reset au succès
        setLoans(results[0].data);
        setIsFromCache(!!results[0].isFromCache);

        const booksData = results[1].data;
        setBooks(Array.isArray(booksData) ? booksData : (booksData.books || []));

        if (isAdmin && results[2]) {
          setUsers(results[2].data.filter((u) => u.role === "student"));
        }
        setLoading(false);
      })
      .catch(function (err) {
        setLoading(false);
        // Afficher l'erreur une seule fois même si StrictMode appelle fetchAll 2 fois
        if (!errorShownRef.current) {
          errorShownRef.current = true;
          const msg = err?.response?.data?.message || t("errorOccurred");
          toast.error(msg);
        }
      });
  };

  useEffect(function () {
    fetchAll();
  }, []);

  const handleCreate = async function (e) {
    e.preventDefault();
    try {
      await api.post("/loans", form);
      setShowForm(false);
      fetchAll();
    } catch (err) {
      toast.error(
        err.response && err.response.data ? err.response.data.message : "Erreur",
      );
    }
  };

  const handleScannerSuccess = function () {
    fetchAll();
  };

  const statusColor = function (status) {
    if (status === "returned") return "badge-success";
    if (status === "late") return "badge-danger";
    if (status === "pending") return "badge-warning";
    return "badge-warning";
  };

  const statusLabel = function (status) {
    if (status === "returned") return t("returned");
    if (status === "late") return t("late");
    if (status === "pending") return t("pending") || "En attente";
    return t("active");
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">
            {t("gestion")}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">{t("loans")}</h2>
            {isFromCache && (
              <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-3 py-1 rounded-full border border-amber-200 uppercase tracking-widest animate-pulse">
                Cache
              </span>
            )}
          </div>
        </div>

        {user && user.role === "librarian" && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={function () { setShowScanner(true); }}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all shadow-sm"
            >
              <span>📷</span>
              <span className="hidden sm:inline">{t("scanQR")}</span>
              <span className="sm:hidden">Scan</span>
            </button>

            <button
              onClick={function () { setShowForm(!showForm); }}
              className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:from-sky-600 hover:to-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">{t("newLoan")}</span>
              <span className="sm:hidden">Nouveau</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal Scanner QR */}
      {showScanner && (
        <QRScanner
          onClose={function () { setShowScanner(false); }}
          onSuccess={function () { handleScannerSuccess(); }}
        />
      )}

      {/* Formulaire nouvel emprunt */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl shadow-card border border-slate-100 p-6 mb-6 animate-slide-down"
        >
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            {t("newLoan")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {t("student")}
              </label>
              {users.length > 0 ? (
                <select
                  required
                  value={form.userId}
                  onChange={function (e) { setForm({ ...form, userId: e.target.value }); }}
                  className="input"
                >
                  <option value="">{t("selectStudent")}</option>
                  {users.map(function (u) {
                    return (
                      <option key={u._id} value={u._id}>
                        {u.name} — {u.email}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  required
                  placeholder={t("selectUser")}
                  value={form.userId}
                  onChange={function (e) { setForm({ ...form, userId: e.target.value }); }}
                  className="input font-mono"
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {t("book")}
              </label>
              <select
                required
                value={form.bookId}
                onChange={function (e) { setForm({ ...form, bookId: e.target.value }); }}
                className="input"
              >
                <option value="">{t("selectBook")}</option>
                {books.map(function (b) {
                  return (
                    <option key={b._id} value={b._id}>
                      {b.title} ({b.availableCopies} {t("available").toLowerCase()})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" className="btn btn-primary">{t("create")}</button>
            <button type="button" onClick={function () { setShowForm(false); }} className="btn btn-secondary">
              {t("cancel")}
            </button>
          </div>
        </form>
      )}

      {/* ── ÉTAT CHARGEMENT / VIDE ── */}
      {loading && (
        <div className="flex items-center justify-center h-40 gap-2 text-slate-400">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">{t("loading")}</span>
        </div>
      )}

      {!loading && loans.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
          <span className="text-4xl">📋</span>
          <p className="text-sm">{t("noLoans")}</p>
        </div>
      )}

      {/* ── MOBILE : Cards ── */}
      {!loading && loans.length > 0 && (
        <>
          {/* Vue cards (mobile) */}
          <div className="sm:hidden space-y-3">
            {loans.map((loan) => (
              <div key={loan._id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900 line-clamp-1">{loan.book?.title}</p>
                    <p className="text-xs text-slate-500">{loan.book?.author}</p>
                  </div>
                  <span className={`badge ${statusColor(loan.status)} flex-shrink-0 ml-2`}>
                    {statusLabel(loan.status)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="font-medium text-slate-700">
                    {user?.role === "librarian" ? loan.user?.name : "Date limite :"}
                  </span>
                  <span className="font-mono">{new Date(loan.dueDate).toLocaleDateString("fr-FR")}</span>
                </div>
                {/* Actions mobile */}
                {user?.role === "librarian" && loan.status !== "returned" && (
                  <button
                    onClick={() => setShowScanner(true)}
                    className={`w-full py-2 rounded-lg text-xs font-semibold transition-colors ${
                      loan.status === "pending"
                        ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    📷 {loan.status === "pending" ? t("confirmScan") : t("returnScan")}
                  </button>
                )}
                {user?.role === "student" && (loan.status === "pending" || loan.status === "active" || loan.status === "late") && (
                  <button
                    onClick={async () => {
                      try {
                        const qrRes = await api.get(`/loans/${loan._id}/qrcode`);
                        navigate("/app/ticket", { state: { type: "loan", loan, qrCode: qrRes.data.qrCode } });
                      } catch {
                        toast.error(t("errorOccurred"));
                      }
                    }}
                    className="w-full py-2 rounded-lg text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors"
                  >
                    📥 Voir le Bon d'emprunt
                  </button>
                )}
                {user?.role === "student" && loan.status === "returned" && (
                  <button
                    onClick={() => {
                      navigate("/app/ticket", { state: { type: "return", loan } });
                    }}
                    className="w-full py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                  >
                    📄 Voir le Reçu de retour
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Vue tableau (desktop) */}
          <div className="hidden sm:block bg-white rounded-xl shadow-card border border-slate-100 overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {user?.role === "librarian" && (
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("student")}</th>
                  )}
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("book")}</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("dueDate")}</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">{t("status")}</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">{t("action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loans.map((loan) => (
                  <tr key={loan._id} className="hover:bg-slate-50 transition-colors">
                    {user?.role === "librarian" && (
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-slate-900">{loan.user?.name}</p>
                        <p className="text-xs text-slate-500">{loan.user?.studentId || loan.user?.email}</p>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900">{loan.book?.title}</p>
                      <p className="text-xs text-slate-500">{loan.book?.author}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                      {new Date(loan.dueDate).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`badge ${statusColor(loan.status)}`}>
                        {statusLabel(loan.status)}
                      </span>
                    </td>
                    {user?.role === "student" && (
                      <td className="px-6 py-4 text-right">
                        {(loan.status === "pending" || loan.status === "active" || loan.status === "late") && (
                          <button
                            onClick={async () => {
                              try {
                                const qrRes = await api.get(`/loans/${loan._id}/qrcode`);
                                navigate("/app/ticket", { state: { type: "loan", loan, qrCode: qrRes.data.qrCode } });
                              } catch {
                                toast.error(t("errorOccurred"));
                              }
                            }}
                            className="inline-flex items-center gap-1 text-xs bg-sky-50 text-sky-700 px-3 py-1.5 rounded-lg hover:bg-sky-100 transition-colors font-medium border border-sky-100"
                          >
                            📥 Voir le Bon
                          </button>
                        )}
                        {loan.status === "returned" && (
                          <button
                            onClick={() => {
                              navigate("/app/ticket", { state: { type: "return", loan } });
                            }}
                            className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors font-medium border border-emerald-100"
                          >
                            📄 Voir le Reçu
                          </button>
                        )}
                      </td>
                    )}
                    {user?.role === "librarian" && (
                      <td className="px-6 py-4 text-right">
                        {loan.status === "pending" && (
                          <button onClick={() => setShowScanner(true)} className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors font-medium">
                            📷 {t("confirmScan")}
                          </button>
                        )}
                        {(loan.status === "active" || loan.status === "late") && (
                          <button onClick={() => setShowScanner(true)} className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors font-medium border border-emerald-100">
                            ✓ {t("returnScan")}
                          </button>
                        )}
                        {loan.status === "returned" && <span className="text-xs text-slate-300">—</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
