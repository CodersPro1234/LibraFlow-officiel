import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../hooks/useToast";
import { generateLoanPDF } from "../utils/generatePDF";
import ScannerModal from "../components/ScannerModal";
import { Search, Plus, Trash2, CheckCircle2, XCircle, BookOpen, Camera, RefreshCw, X, Info, ImagePlus } from "lucide-react";

const GENRES = ["Informatique", "Mathematiques", "Sciences", "Gestion", "Litterature", "Autre"];

const GENRE_STYLES = {
  Informatique: { bg: "from-blue-500 to-cyan-600", light: "bg-blue-50", text: "text-blue-700", icon: "💻" },
  Mathematiques: { bg: "from-purple-500 to-pink-600", light: "bg-purple-50", text: "text-purple-700", icon: "🔢" },
  Sciences: { bg: "from-green-500 to-emerald-600", light: "bg-green-50", text: "text-green-700", icon: "🔬" },
  Gestion: { bg: "from-amber-500 to-orange-600", light: "bg-amber-50", text: "text-amber-700", icon: "📊" },
  Litterature: { bg: "from-rose-500 to-red-600", light: "bg-rose-50", text: "text-rose-700", icon: "📖" },
  Autre: { bg: "from-slate-400 to-slate-600", light: "bg-slate-50", text: "text-slate-700", icon: "📚" },
};

const getStyle = (genre) => GENRE_STYLES[genre] || GENRE_STYLES["Autre"];

const DEFAULT_FORM = { title: "", author: "", genre: "Informatique", totalCopies: 1, description: "", coverImage: "" };

export default function Catalogue() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [borrowingId, setBorrowingId] = useState(null);
  const [borrowSuccess, setBorrowSuccess] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [missingFields, setMissingFields] = useState({});
  // ISBN scan
  const [isbn, setIsbn] = useState("");
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [showIsbnScanner, setShowIsbnScanner] = useState(false);
  const [customGenre, setCustomGenre] = useState("");
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 20;

  const [isFromCache, setIsFromCache] = useState(false);

  const fetchBooks = (currentPage = 1) => {
    setLoading(true);
    const params = { page: currentPage, limit: LIMIT };
    if (search) params.search = search;
    if (genre) params.genre = genre;
    api
      .get("/books", { params })
      .then((res) => {
        // Support ancien format (array) et nouveau format (objet paginé)
        if (Array.isArray(res.data)) {
          setBooks(res.data);
          setTotal(res.data.length);
          setTotalPages(1);
        } else {
          setBooks(res.data.books || []);
          setTotal(res.data.total || 0);
          setTotalPages(res.data.pages || 1);
        }
        setIsFromCache(!!res.isFromCache);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        if (books.length === 0) toast.error(t("noBooks"));
      });
  };

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setPage(1);
    const timer = setTimeout(() => fetchBooks(1), 400);
    return () => clearTimeout(timer);
  }, [search, genre]);

  // Charger la nouvelle page
  useEffect(() => {
    if (page > 1) fetchBooks(page);
  }, [page]);

  // ── ISBN Autofill
  const handleIsbnLookup = async (isbnValue = isbn) => {
    if (!isbnValue.trim()) return;
    setIsbnLoading(true);
    try {
      const cleanIsbn = isbnValue.trim().replace(/[- ]/g, '');
      const res = await api.get(`/books/isbn/${cleanIsbn}`);
      const data = res.data;
      setForm({
        title: data.title || "",
        author: data.author || "",
        genre: GENRES.includes(data.genre) ? data.genre : "Autre",
        totalCopies: 1,
        description: data.description || "",
        coverImage: data.coverImage || "",
      });
      
      const newMissing = {
        title: !data.title,
        author: !data.author || data.author === 'Auteur inconnu',
        description: !data.description,
        coverImage: !data.coverImage
      };
      setMissingFields(newMissing);
      
      toast.success("Livre trouvé !");
    } catch {
      toast.error("Livre introuvable avec cet ISBN.");
    } finally {
      setIsbnLoading(false);
    }
  };

  const handleIsbnScan = (scannedIsbn) => {
    setShowIsbnScanner(false);
    setIsbn(scannedIsbn);
    handleIsbnLookup(scannedIsbn);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("L'image est trop volumineuse (max 5MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, coverImage: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (payload.genre === "Autre" && customGenre.trim() !== "") {
        payload.genre = customGenre.trim();
      }
      await api.post("/books", payload);
      setShowForm(false);
      setForm(DEFAULT_FORM);
      setCustomGenre("");
      setIsbn("");
      setMissingFields({});
      fetchBooks();
      toast.success("Livre ajouté avec succès !");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'ajout");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("deleteConfirm"))) return;
    try {
      await api.delete("/books/" + id);
      fetchBooks();
      toast.success(t("bookDeleteSuccess"));
    } catch (err) {
      toast.error(err.response?.data?.message || t("errorOccurred"));
    }
  };

  const handleBorrow = async (book) => {
    setBorrowingId(book._id);
    setBorrowSuccess(null);
    try {
      const loanRes = await api.post("/loans", { bookId: book._id });
      const loan = loanRes.data;
      const qrRes = await api.get(`/loans/${loan._id}/qrcode`);
      generateLoanPDF(loan, qrRes.data.qrCode);
      setBorrowSuccess({ bookTitle: book.title });
    } catch (err) {
      toast.error(err.response?.data?.message || "Erreur lors de l'emprunt");
    } finally {
      setBorrowingId(null);
    }
  };

  return (
    <div className="animate-fade-in relative">
      <ScannerModal
        isOpen={showIsbnScanner}
        onClose={() => setShowIsbnScanner(false)}
        onScan={handleIsbnScan}
        title="Scanner ISBN"
        description="Scannez le code-barres au dos du livre"
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-1">{t("library")}</p>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-slate-900">{t("catalogue")}</h2>
            {isFromCache && (
              <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-3 py-1 rounded-full border border-amber-200 uppercase tracking-widest animate-pulse">
                Données en cache
              </span>
            )}
          </div>
        </div>
        {user?.role === "librarian" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:from-sky-600 hover:to-indigo-700 transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            {t("addBook")}
          </button>
        )}
      </div>

      {borrowSuccess && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 animate-slide-down">
          <span className="text-2xl">✅</span>
          <div className="flex-1">
            <p className="font-semibold text-emerald-800">{t("borrowSuccessTitle")}</p>
            <p className="text-sm text-emerald-600">
              {t("borrowSuccessDesc").split("<strong>")[0]} <strong>{borrowSuccess.bookTitle}</strong>{" "}
              {t("borrowSuccessDesc").split("</strong>")[1]}
            </p>
          </div>
          <button onClick={() => setBorrowSuccess(null)} className="text-emerald-400 hover:text-emerald-600 text-xl font-bold">×</button>
        </div>
      )}

      {/* Formulaire ajout livre */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl shadow-card border border-slate-100 p-6 mb-6 animate-slide-down">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">{t("addBook")}</h3>

          {/* ── ISBN Scanner ── */}
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
            <p className="text-xs font-semibold text-indigo-700 mb-2 uppercase tracking-wide">📦 Remplissage automatique par ISBN</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Saisir l'ISBN manuellement (ex: 978...)"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleIsbnLookup())}
                className="input flex-1 text-sm font-medium"
              />
              <button
                type="button"
                onClick={() => setShowIsbnScanner(true)}
                className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-all border border-indigo-200 flex items-center gap-2 font-medium text-sm"
                title="Scanner le code-barres"
              >
                <Camera className="w-4 h-4" />
                Scanner
              </button>
              <button
                type="button"
                onClick={() => handleIsbnLookup()}
                disabled={isbnLoading}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {isbnLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Rechercher
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <input required placeholder={t("title")} value={form.title} onChange={(e) => { setForm({ ...form, title: e.target.value }); setMissingFields({ ...missingFields, title: false }); }} className={`input ${missingFields.title ? 'border-amber-400 bg-amber-50' : ''}`} />
              {missingFields.title && <p className="text-[10px] text-amber-600 mt-1 ml-1 font-bold tracking-wide uppercase">⚠️ Titre non trouvé</p>}
            </div>
            <div className="flex flex-col">
              <input required placeholder={t("author")} value={form.author} onChange={(e) => { setForm({ ...form, author: e.target.value }); setMissingFields({ ...missingFields, author: false }); }} className={`input ${missingFields.author ? 'border-amber-400 bg-amber-50' : ''}`} />
              {missingFields.author && <p className="text-[10px] text-amber-600 mt-1 ml-1 font-bold tracking-wide uppercase">⚠️ Auteur non trouvé</p>}
            </div>
            
            <div className="flex flex-col gap-2">
              <select value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} className="input">
                {GENRES.map((g) => <option key={g}>{g}</option>)}
              </select>
              {form.genre === "Autre" && (
                <input type="text" placeholder="Précisez le genre..." value={customGenre} onChange={(e) => setCustomGenre(e.target.value)} className="input border-indigo-200 bg-indigo-50/50 animate-fade-in" />
              )}
            </div>
            <input type="number" min="1" placeholder={t("copies")} value={form.totalCopies} onChange={(e) => setForm({ ...form, totalCopies: parseInt(e.target.value) })} className="input" />
            
            <div className="flex flex-col">
              <div className="flex gap-2">
                <input placeholder="URL de couverture ou Image" value={form.coverImage} onChange={(e) => { setForm({ ...form, coverImage: e.target.value }); setMissingFields({ ...missingFields, coverImage: false }); }} className={`input flex-1 ${missingFields.coverImage ? 'border-amber-400 bg-amber-50' : ''}`} />
                <label className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-200 flex items-center justify-center cursor-pointer" title="Importer une image depuis votre appareil">
                  <ImagePlus className="w-4 h-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { handleImageUpload(e); setMissingFields({ ...missingFields, coverImage: false }); }} />
                </label>
              </div>
              {missingFields.coverImage && <p className="text-[10px] text-amber-600 mt-1 ml-1 font-bold tracking-wide uppercase">⚠️ Couverture non trouvée</p>}
            </div>
            
            <div className="flex flex-col">
              <textarea placeholder={t("description")} value={form.description} onChange={(e) => { setForm({ ...form, description: e.target.value }); setMissingFields({ ...missingFields, description: false }); }} className={`input resize-none ${missingFields.description ? 'border-amber-400 bg-amber-50' : ''}`} rows={2} />
              {missingFields.description && <p className="text-[10px] text-amber-600 mt-1 ml-1 font-bold tracking-wide uppercase">⚠️ Description non trouvée</p>}
            </div>
          </div>

          {form.coverImage && (
            <div className="mt-3 flex items-center gap-3">
              <img src={form.coverImage} alt="Aperçu couverture" className="h-20 w-14 object-cover rounded-lg border shadow-sm" />
              <p className="text-xs text-slate-400">Aperçu de la couverture</p>
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button type="submit" className="btn btn-primary">{t("add")}</button>
            <button type="button" onClick={() => { setShowForm(false); setIsbn(""); setForm(DEFAULT_FORM); setMissingFields({}); }} className="btn btn-secondary">{t("cancel")}</button>
          </div>
        </form>
      )}

      {/* Recherche & Filtre */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-10" />
        </div>
        <select value={genre} onChange={(e) => setGenre(e.target.value)} className="input w-full sm:w-48">
          <option value="">{t("allGenres")}</option>
          {GENRES.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>

      {!loading && (
        <p className="text-xs text-slate-400 mb-5">
          {total} {t("book")}{total !== 1 ? "s" : ""} {t("found") || "trouvé"}{total !== 1 ? "s" : ""}
          {totalPages > 1 && <span className="ml-2 text-slate-300">— Page {page}/{totalPages}</span>}
        </p>
      )}

      {/* ── GRILLE DE CARTES ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">{t("loading")}</span>
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <span className="text-5xl mb-4">📭</span>
          <p className="text-sm">{t("noBooks")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {books.map((book) => {
            const style = getStyle(book.genre);
            const isAvailable = book.availableCopies > 0;
            const isBorrowing = borrowingId === book._id;

            return (
              <div key={book._id} onClick={() => setSelectedBook(book)} className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 flex flex-col cursor-pointer relative">
                {/* ── Couverture grande taille ── */}
                <div className="relative h-52 overflow-hidden flex-shrink-0">
                  {book.coverImage ? (
                    <>
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.nextSibling.style.display = "flex";
                        }}
                      />
                      {/* Fallback si l'image fail */}
                      <div
                        style={{ display: "none" }}
                        className={`absolute inset-0 bg-gradient-to-br ${style.bg} flex flex-col items-center justify-center`}
                      >
                        <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white opacity-10" />
                        <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-white opacity-10" />
                        <BookOpen className="w-12 h-12 text-white/60 z-10" />
                        <p className="text-white text-xs font-semibold text-center px-3 mt-2 leading-tight line-clamp-2 z-10">{book.title}</p>
                      </div>
                    </>
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${style.bg} flex flex-col items-center justify-center relative`}>
                      <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-white opacity-10" />
                      <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-white opacity-10" />
                      <span className="text-6xl drop-shadow-lg z-10">{style.icon}</span>
                      <p className="text-white text-xs font-semibold text-center px-3 mt-2 leading-tight line-clamp-2 drop-shadow z-10">{book.title}</p>
                    </div>
                  )}

                  {/* Badge disponibilité */}
                  <div className="absolute top-2 right-2 z-20">
                    {isAvailable ? (
                      <span className="flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                        <CheckCircle2 className="w-3 h-3" /> {t("availableStatus")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                        <XCircle className="w-3 h-3" /> {t("borrowedStatus")}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Infos ── */}
                <div className="p-3 flex flex-col flex-1 bg-white">
                  <p className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 mb-1">{book.title}</p>
                  <p className="text-xs text-slate-500 truncate mb-2">{book.author}</p>
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${style.light} ${style.text} w-fit mb-3`}>{book.genre}</span>

                  <div className="flex items-center justify-between text-xs mb-3 mt-auto">
                    <span className="text-slate-400">{t("copiesLabel")}</span>
                    <span className="font-semibold">
                      <span className={isAvailable ? "text-emerald-600" : "text-red-500"}>{book.availableCopies}</span>
                      <span className="text-slate-300">/{book.totalCopies}</span>
                    </span>
                  </div>

                  {user?.role === "student" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleBorrow(book); }}
                      disabled={!isAvailable || isBorrowing}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        isAvailable && !isBorrowing
                          ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:shadow-md"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      {isBorrowing ? (
                        <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> {t("borrowing")}</>
                      ) : (
                        <><BookOpen className="w-3.5 h-3.5" /> {isAvailable ? t("borrow") : t("unavailable")}</>
                      )}
                    </button>
                  )}

                  {user?.role === "librarian" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(book._id); }}
                      className="w-full py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100 flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {t("delete")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* ── PAGINATION ── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            ← Précédent
          </button>

          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && arr[idx - 1] !== p - 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-3 py-2 text-slate-400 text-sm">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setPage(item)}
                    className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                      page === item
                        ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md"
                        : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Suivant →
          </button>
        </div>
      )}

      {/* ── MODAL DETAILS LIVRE ── */}
      {selectedBook && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedBook(null)}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col sm:flex-row max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {/* Image gauche */}
            <div className="sm:w-2/5 min-h-[250px] sm:min-h-[400px] bg-slate-100 relative flex-shrink-0">
              {selectedBook.coverImage ? (
                <img src={selectedBook.coverImage} alt={selectedBook.title} className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${getStyle(selectedBook.genre).bg} flex items-center justify-center`}>
                  <span className="text-8xl drop-shadow-md">{getStyle(selectedBook.genre).icon}</span>
                </div>
              )}
              {/* Badge dispo sur l'image en mobile */}
              <div className="absolute top-4 left-4 sm:hidden">
                <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-md ${selectedBook.availableCopies > 0 ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
                  {selectedBook.availableCopies > 0 ? "Disponible" : "Indisponible"}
                </span>
              </div>
            </div>
            
            {/* Contenu droite */}
            <div className="sm:w-3/5 p-6 sm:p-8 flex flex-col relative overflow-y-auto custom-scrollbar">
              <button onClick={() => setSelectedBook(null)} className="absolute top-4 right-4 p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors z-10">
                <X className="w-5 h-5" />
              </button>
              
              <div className="mb-5 pr-8">
                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-lg ${getStyle(selectedBook.genre).light} ${getStyle(selectedBook.genre).text} mb-3`}>
                  {selectedBook.genre}
                </span>
                <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-2">{selectedBook.title}</h3>
                <p className="text-slate-500 font-medium text-lg">{selectedBook.author}</p>
              </div>
              
              <div className="flex-1 mb-6">
                <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2"><Info className="w-4 h-4 text-sky-500" /> Synopsis / Description</h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {selectedBook.description || "Aucune description détaillée n'est disponible pour ce livre pour le moment."}
                </p>
              </div>

              <div className="pt-5 border-t border-slate-100 flex items-center justify-between mt-auto">
                <div className="text-sm">
                  <span className="text-slate-400">Exemplaires :</span>
                  <p className="font-bold mt-0.5 text-lg">
                    <span className={selectedBook.availableCopies > 0 ? "text-emerald-600" : "text-red-500"}>{selectedBook.availableCopies}</span>
                    <span className="text-slate-300"> / {selectedBook.totalCopies}</span>
                  </p>
                </div>
                {user?.role === "student" && (
                  <button
                    onClick={() => { handleBorrow(selectedBook); setSelectedBook(null); }}
                    disabled={selectedBook.availableCopies <= 0 || borrowingId === selectedBook._id}
                    className="px-6 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    {selectedBook.availableCopies > 0 ? t("borrow") : t("unavailable")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
