import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../hooks/useToast";
import CachedImage from "../components/CachedImage";
import {
  Search, TrendingUp, BookOpen, Clock, ArrowRight,
  Star, Trophy, CheckCircle2, XCircle, Flame, ChevronRight,
} from "lucide-react";

/* ── Petit composant carte livre (recherche + tendances) ── */
function BookCard({ book, onBorrow, borrowingId }) {
  const isBusy = borrowingId === book._id;
  const avail  = book.availableCopies > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden group hover:shadow-hover transition-all flex flex-col">
      {/* Couverture — ratio 2:3 */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-100">
        {book.coverImage ? (
          <>
            <CachedImage
              src={book.coverImage}
              alt={book.title}
              className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-[1.04] transition-transform duration-500"
              loading="lazy"
              onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
            />
            <div className="hidden absolute inset-0 items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50">
              <BookOpen className="w-12 h-12 text-sky-300" />
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50">
            <BookOpen className="w-12 h-12 text-sky-300" />
          </div>
        )}
        {/* Badge disponibilité */}
        <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold shadow ${avail ? "bg-emerald-500 text-white" : "bg-slate-700/80 text-white"}`}>
          {avail ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
          {avail ? "Disponible" : "Emprunté"}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight">{book.title}</p>
          <p className="text-xs text-slate-400 mt-1">{book.author}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
            {book.genre}
          </span>
          <span className="text-[10px] text-slate-400">{book.availableCopies}/{book.totalCopies}</span>
        </div>
        <button
          onClick={() => onBorrow(book)}
          disabled={!avail || isBusy}
          className="w-full py-2.5 rounded-xl text-xs font-bold transition-all bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
        >
          {isBusy ? (
            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : <BookOpen className="w-3.5 h-3.5" />}
          {avail ? "Emprunter" : "Indisponible"}
        </button>
      </div>
    </div>
  );
}

/* ── Carte emprunt actif ── */
function LoanCard({ loan }) {
  const now      = new Date();
  const due      = new Date(loan.dueDate);
  const daysLeft = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  const isLate   = daysLeft < 0;
  const isSoon   = daysLeft >= 0 && daysLeft <= 3;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 hover:shadow-card transition-all">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-6 h-6 text-sky-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-900 truncate">{loan.book?.title}</p>
        <p className="text-xs text-slate-400">{loan.book?.author}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-xs font-bold ${isLate ? "text-rose-500" : isSoon ? "text-amber-500" : "text-emerald-600"}`}>
          {isLate ? `${Math.abs(daysLeft)}j de retard` : `${daysLeft}j restants`}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {new Date(loan.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
        </p>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════ */
export default function StudentHome() {
  const { user }  = useAuth();
  const { t }     = useLanguage();
  const toast     = useToast();

  const [stats,       setStats]       = useState(null);
  const [loans,       setLoans]       = useState([]);
  const [search,      setSearch]      = useState("");
  const [searchRes,   setSearchRes]   = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [borrowingId, setBorrowingId] = useState(null);
  const debounceRef = useRef(null);

  /* Chargement initial */
  const loadData = useCallback(async () => {
    try {
      const [sRes, lRes] = await Promise.all([
        api.get("/stats"),
        api.get("/loans"),
      ]);
      setStats(sRes.data);
      setLoans((lRes.data || []).filter((l) => l.status === "active").slice(0, 3));

      // Pré-cacher les couvertures des top livres en arrière-plan
      if ("caches" in window && sRes.data?.topBooks?.length > 0) {
        const urls = sRes.data.topBooks
          .map((b) => b.coverImage)
          .filter((u) => u && u.startsWith("http"));
        caches.open("libraflow-images").then((cache) => {
          urls.forEach((url) =>
            cache.match(url).then((hit) => {
              if (!hit) fetch(url, { mode: "cors" }).then((r) => r.ok && cache.put(url, r)).catch(() => {});
            })
          );
        }).catch(() => {});
      }
    } catch {
      /* silencieux — offline cache géré par axios interceptor */
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* Recherche debounced */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!search.trim()) { setSearchRes([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/books?search=${encodeURIComponent(search)}&limit=6`);
        const books = Array.isArray(res.data) ? res.data : res.data.books || [];
        setSearchRes(books);
      } catch { setSearchRes([]); }
      finally  { setSearching(false); }
    }, 400);
  }, [search]);

  /* Emprunter */
  const handleBorrow = async (book) => {
    setBorrowingId(book._id);
    try {
      await api.post("/loans", { bookId: book._id });
      toast.success(`"${book.title}" emprunté avec succès !`);
      loadData();
      setSearch("");
      setSearchRes([]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'emprunt");
    } finally {
      setBorrowingId(null);
    }
  };

  /* Badge progress */
  const returnCount   = stats?.myReturnHistory || 0;
  const nextMilestone = returnCount < 5 ? 5 : returnCount < 10 ? 10 : returnCount < 20 ? 20 : null;
  const badgePct      = nextMilestone ? Math.round((returnCount / nextMilestone) * 100) : 100;

  return (
    <div className="animate-fade-in space-y-5 pb-8">

      {/* ── HERO : bonjour + score ── */}
      <div className="bg-gradient-to-r from-sky-500 to-indigo-600 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg shadow-sky-200">
        {/* Décoration */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute bottom-0 right-8 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          {/* Salutation */}
          <div className="flex-1">
            <p className="text-sky-100 text-xs font-bold uppercase tracking-widest mb-1">Tableau de bord étudiant</p>
            <h2 className="text-3xl font-black leading-tight">
              Bonjour, {user?.name?.split(" ")[0]} 👋
            </h2>
            <p className="text-sky-100 text-sm mt-1.5">
              Que souhaitez-vous lire aujourd'hui ?
            </p>
          </div>

          {/* Score */}
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="flex items-center gap-1.5 mb-1">
                <Star className="w-4 h-4 text-yellow-300" />
                <p className="text-sky-100 text-xs font-bold uppercase tracking-widest">Score</p>
              </div>
              <p className="text-4xl font-black">{user?.points || 0}</p>
              <p className="text-sky-200 text-xs">points</p>
            </div>

            <div className="text-center">
              <div className="flex items-center gap-1.5 mb-1">
                <Trophy className="w-4 h-4 text-yellow-300" />
                <p className="text-sky-100 text-xs font-bold uppercase tracking-widest">Badges</p>
              </div>
              <p className="text-4xl font-black">{user?.badges?.length || 0}</p>
              <p className="text-sky-200 text-xs">débloqués</p>
            </div>
          </div>

          {/* Barre progression badge */}
          {nextMilestone && (
            <div className="md:w-44 w-full">
              <div className="flex justify-between text-xs text-sky-100 mb-1.5">
                <span>Prochain badge</span>
                <span>{returnCount}/{nextMilestone}</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-700 ease-out" style={{ width: `${badgePct}%` }} />
              </div>
              <p className="text-xs text-sky-100/70 mt-1 text-right">{badgePct}%</p>
            </div>
          )}
        </div>
      </div>

      {/* ── BARRE DE RECHERCHE ── */}
      <div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          {searching && (
            <svg className="animate-spin h-4 w-4 absolute right-4 top-1/2 -translate-y-1/2 text-sky-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un livre, un auteur..."
            className="w-full pl-12 pr-12 py-4 rounded-2xl border border-slate-200 bg-white text-slate-800 text-sm shadow-card outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
          />
        </div>

        {/* Résultats de recherche */}
        {searchRes.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
            {searchRes.map((book) => (
              <BookCard key={book._id} book={book} onBorrow={handleBorrow} borrowingId={borrowingId} />
            ))}
          </div>
        )}

        {search.trim() && !searching && searchRes.length === 0 && (
          <div className="mt-4 text-center py-8 text-slate-400 text-sm">
            Aucun résultat pour "<strong>{search}</strong>"
          </div>
        )}
      </div>

      {/* ── STATS RAPIDES — 4 cartes cliquables ── */}
      {stats && !search.trim() && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: "Livres dispo",    value: stats.availableBooks,
              icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50",
              to: "/app/catalogue", state: null,
              hint: "Voir le catalogue",
            },
            {
              label: "Emprunts actifs", value: stats.activeLoans,
              icon: BookOpen,     color: "text-indigo-500",  bg: "bg-indigo-50",
              to: "/app/loans", state: { filter: "active" },
              hint: "Voir mes actifs",
            },
            {
              label: "Total livres",    value: stats.totalBooks,
              icon: TrendingUp,   color: "text-sky-500",     bg: "bg-sky-50",
              to: "/app/catalogue", state: null,
              hint: "Voir le catalogue",
            },
            {
              label: "Mes retours",     value: stats.myReturnHistory || 0,
              icon: Star,         color: "text-amber-500",   bg: "bg-amber-50",
              to: "/app/loans", state: { filter: "returned" },
              hint: "Voir mes retours",
            },
          ].map(({ label, value, icon: Icon, color, bg, to, state, hint }) => (
            <Link
              key={label}
              to={to}
              state={state}
              className="bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex items-center gap-3 hover:shadow-hover hover:-translate-y-0.5 hover:border-sky-200 transition-all group cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 leading-tight">{label}</p>
                <p className="text-[9px] text-sky-400 font-semibold mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">{hint} →</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* ── LIVRES TENDANCES — carrousel horizontal ── */}
      {stats?.topBooks?.length > 0 && !search.trim() && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-4.5 h-4.5 text-orange-500" />
              Les plus empruntés
            </h3>
            <Link to="/app/catalogue" className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors">
              Voir tout <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Shelf horizontal — les cartes s'étirent pour remplir l'espace */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1">
            {stats.topBooks.slice(0, 8).map((book, i) => (
              <div
                key={i}
                className="flex-1 min-w-[130px] bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden group hover:shadow-hover hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
              >
                {/* Couverture — ratio 2:3 */}
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-100 flex-shrink-0">
                  {book.coverImage ? (
                    <CachedImage
                      src={book.coverImage}
                      alt={book.title}
                      className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-[1.04] transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50">
                      <BookOpen className="w-8 h-8 text-sky-200" />
                    </div>
                  )}
                  {/* Badge rang */}
                  <div className={`absolute top-1.5 left-1.5 w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black text-white shadow-md ${
                    i === 0 ? "bg-yellow-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-amber-700" : "bg-slate-600"
                  }`}>
                    {i + 1}
                  </div>
                </div>
                {/* Info */}
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <p className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">{book.title}</p>
                  <p className="text-[10px] text-slate-400 truncate">{book.author}</p>
                  <div className="flex items-center gap-1 mt-auto pt-1.5">
                    <TrendingUp className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <span className="text-[10px] font-bold text-emerald-600">{book.count} emprunts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── MES EMPRUNTS ACTIFS ── */}
      {!search.trim() && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-indigo-500" />
              Mes emprunts actifs
            </h3>
            <Link to="/app/loans" className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors">
              Voir tout <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loans.length > 0 ? (
            <div className="space-y-2.5">
              {loans.map((loan) => (
                <LoanCard key={loan._id} loan={loan} />
              ))}
              <Link
                to="/app/loans"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-200 text-xs font-bold text-slate-400 hover:border-indigo-300 hover:text-indigo-500 transition-all"
              >
                Voir tous mes emprunts <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
              <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm font-medium">Aucun emprunt actif</p>
              <p className="text-slate-300 text-xs mt-1">Explorez le catalogue pour emprunter un livre</p>
              <Link
                to="/app/catalogue"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-bold rounded-xl hover:shadow-md transition-all"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Explorer le catalogue
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </section>
      )}

    </div>
  );
}
