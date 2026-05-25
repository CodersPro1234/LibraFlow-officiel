const fs = require('fs');
const path = require('path');

const BASE = '/home/nana-marc/bit-library/bit-library-frontend/src';

const files = {

  'context/AuthContext.jsx': `import { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userData.token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);`,

  'api/axios.js': `import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = "Bearer " + token;
  return config;
});

export default api;`,

  'App.jsx': `import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Catalogue from './pages/Catalogue';
import Loans from './pages/Loans';
import AI from './pages/AI';

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="catalogue" element={<Catalogue />} />
            <Route path="loans" element={<Loans />} />
            <Route path="ai" element={<AI />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}`,

  'components/Layout.jsx': `import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/',          icon: '◈', label: 'Dashboard'  },
  { to: '/catalogue', icon: '📚', label: 'Catalogue'  },
  { to: '/loans',     icon: '↩', label: 'Emprunts'   },
  { to: '/ai',        icon: '✦', label: 'IA Gemini'  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex min-h-screen bg-amber-50">
      <aside className="w-56 bg-stone-900 flex flex-col fixed top-0 left-0 h-full z-50">
        <div className="px-6 py-7 border-b border-stone-800">
          <p className="text-amber-400 text-xs font-mono tracking-widest uppercase mb-1">BIT Library</p>
          <h1 className="text-white font-serif text-xl font-bold">BookSmart</h1>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                "flex items-center gap-3 px-6 py-3 text-sm transition-all border-l-2 " +
                (isActive
                  ? "text-amber-400 bg-stone-800 border-amber-400"
                  : "text-stone-400 border-transparent hover:text-white hover:bg-stone-800")
              }
            >
              <span>{icon}</span> {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 border-t border-stone-800">
          <p className="text-white text-sm font-medium">{user && user.name}</p>
          <p className="text-stone-500 text-xs font-mono mb-3">{user && user.role}</p>
          <button onClick={handleLogout} className="text-xs text-stone-500 hover:text-red-400 transition-colors">
            Deconnexion
          </button>
        </div>
      </aside>
      <main className="ml-56 flex-1 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}`,

  'pages/Login.jsx': `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      login(data);
      navigate('/');
    } catch (err) {
      setError(err.response && err.response.data ? err.response.data.message : 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <div className="bg-white border border-amber-100 rounded-2xl shadow-sm p-10 w-full max-w-sm">
        <p className="text-amber-500 text-xs font-mono tracking-widest uppercase mb-2">BIT Library</p>
        <h1 className="font-serif text-3xl font-bold text-stone-900 mb-1">Connexion</h1>
        <p className="text-stone-400 text-sm mb-8">Systeme de gestion intelligent</p>
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-stone-500 uppercase tracking-wider mb-1">Email</label>
            <input type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-amber-400 transition-colors"
              placeholder="admin@bit.edu" required />
          </div>
          <div>
            <label className="block text-xs font-mono text-stone-500 uppercase tracking-wider mb-1">Mot de passe</label>
            <input type="password" value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border border-stone-200 rounded-lg px-4 py-3 text-sm outline-none focus:border-amber-400 transition-colors"
              placeholder="••••••" required />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-stone-900 text-white rounded-lg py-3 text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50">
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  );
}`,

  'pages/Dashboard.jsx': `import { useEffect, useState } from 'react';
import api from '../api/axios';

function StatCard({ label, value, color, icon }) {
  return (
    <div className="bg-white border border-amber-100 rounded-xl p-5 relative overflow-hidden">
      <div className={"absolute top-0 left-0 right-0 h-1 " + color} />
      <p className="text-xs font-mono text-stone-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="font-serif text-4xl font-bold text-stone-900">{value}</p>
      <span className="absolute bottom-4 right-4 text-3xl opacity-10">{icon}</span>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats')
      .then(function(res) { setStats(res.data); setLoading(false); })
      .catch(function() { setLoading(false); });
  }, []);

  if (loading) return <div className="p-8 text-stone-400 font-mono text-sm">Chargement...</div>;

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1">Vue generale</p>
        <h2 className="font-serif text-3xl font-bold text-stone-900">Dashboard</h2>
      </div>
      {stats ? (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            <StatCard label="Total livres"  value={stats.totalBooks}     color="bg-amber-400"  icon="📚" />
            <StatCard label="En emprunt"    value={stats.activeLoans}    color="bg-orange-400" icon="↩"  />
            <StatCard label="Disponibles"   value={stats.availableBooks} color="bg-green-500"  icon="✓"  />
            <StatCard label="Retards"       value={stats.lateLoans}      color="bg-red-500"    icon="⚠"  />
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white border border-amber-100 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-amber-50">
                <h3 className="font-serif text-lg font-bold">Livres les plus empruntés</h3>
              </div>
              <div className="divide-y divide-amber-50">
                {stats.topBooks && stats.topBooks.map(function(b, i) {
                  return (
                    <div key={i} className="flex items-center gap-4 px-6 py-3">
                      <span className="font-serif text-2xl font-bold text-stone-200">{i < 9 ? "0" + (i+1) : i+1}</span>
                      <div>
                        <p className="text-sm font-medium text-stone-800">{b.title}</p>
                        <p className="text-xs text-stone-400">{b.author} · {b.count} emprunts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-white border border-amber-100 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-amber-50">
                <h3 className="font-serif text-lg font-bold">Livres par genre</h3>
              </div>
              <div className="px-6 py-4 space-y-4">
                {stats.byGenre && stats.byGenre.map(function(g, i) {
                  var max = stats.byGenre[0].count;
                  var colors = ['bg-stone-900','bg-amber-400','bg-green-500','bg-orange-400','bg-red-400'];
                  return (
                    <div key={i}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{g._id}</span>
                        <span className="text-xs font-mono text-stone-400">{g.count}</span>
                      </div>
                      <div className="h-2 bg-amber-50 rounded-full overflow-hidden">
                        <div className={"h-full rounded-full " + (colors[i] || 'bg-stone-300')}
                          style={{ width: ((g.count/max)*100) + "%" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        <p className="text-stone-400 text-sm">Aucune donnée disponible.</p>
      )}
    </div>
  );
}`,

  'pages/Catalogue.jsx': `import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const GENRES = ['Informatique','Mathematiques','Sciences','Gestion','Litterature','Autre'];

export default function Catalogue() {
  const { user } = useAuth();
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title:'', author:'', genre:'Informatique', totalCopies:1, description:'' });
  const [loading, setLoading] = useState(true);

  const fetchBooks = function() {
    var params = {};
    if (search) params.search = search;
    if (genre) params.genre = genre;
    api.get('/books', { params: params }).then(function(res) {
      setBooks(res.data);
      setLoading(false);
    });
  };

  useEffect(function() { fetchBooks(); }, [search, genre]);

  const handleAdd = async function(e) {
    e.preventDefault();
    await api.post('/books', form);
    setShowForm(false);
    setForm({ title:'', author:'', genre:'Informatique', totalCopies:1, description:'' });
    fetchBooks();
  };

  const handleDelete = async function(id) {
    if (!window.confirm('Supprimer ce livre ?')) return;
    await api.delete('/books/' + id);
    fetchBooks();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1">Bibliotheque</p>
          <h2 className="font-serif text-3xl font-bold text-stone-900">Catalogue</h2>
        </div>
        {user && user.role === 'librarian' && (
          <button onClick={function() { setShowForm(!showForm); }}
            className="bg-stone-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors">
            + Ajouter un livre
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white border border-amber-100 rounded-xl p-6 mb-6 grid grid-cols-2 gap-4">
          <input required placeholder="Titre" value={form.title}
            onChange={function(e) { setForm({...form, title: e.target.value}); }}
            className="border border-stone-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-400" />
          <input required placeholder="Auteur" value={form.author}
            onChange={function(e) { setForm({...form, author: e.target.value}); }}
            className="border border-stone-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-400" />
          <select value={form.genre} onChange={function(e) { setForm({...form, genre: e.target.value}); }}
            className="border border-stone-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-400">
            {GENRES.map(function(g) { return <option key={g}>{g}</option>; })}
          </select>
          <input type="number" min="1" placeholder="Nombre d'exemplaires" value={form.totalCopies}
            onChange={function(e) { setForm({...form, totalCopies: parseInt(e.target.value)}); }}
            className="border border-stone-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-400" />
          <textarea placeholder="Description (optionnel)" value={form.description}
            onChange={function(e) { setForm({...form, description: e.target.value}); }}
            className="border border-stone-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-400 col-span-2 resize-none" rows={2} />
          <div className="col-span-2 flex gap-3">
            <button type="submit" className="bg-stone-900 text-white px-6 py-2 rounded-lg text-sm">Ajouter</button>
            <button type="button" onClick={function() { setShowForm(false); }}
              className="border border-stone-200 px-6 py-2 rounded-lg text-sm">Annuler</button>
          </div>
        </form>
      )}

      <div className="flex gap-3 mb-6">
        <input placeholder="Rechercher titre, auteur..." value={search}
          onChange={function(e) { setSearch(e.target.value); }}
          className="flex-1 border border-stone-200 bg-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-400" />
        <select value={genre} onChange={function(e) { setGenre(e.target.value); }}
          className="border border-stone-200 bg-white rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-400">
          <option value="">Tous les genres</option>
          {GENRES.map(function(g) { return <option key={g}>{g}</option>; })}
        </select>
      </div>

      <div className="bg-white border border-amber-100 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-amber-50">
              <th className="text-left px-6 py-3 text-xs font-mono text-stone-400 uppercase tracking-wider">Livre</th>
              <th className="text-left px-6 py-3 text-xs font-mono text-stone-400 uppercase tracking-wider">Genre</th>
              <th className="text-left px-6 py-3 text-xs font-mono text-stone-400 uppercase tracking-wider">Dispo</th>
              <th className="text-left px-6 py-3 text-xs font-mono text-stone-400 uppercase tracking-wider">Statut</th>
              {user && user.role === 'librarian' && <th className="px-6 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-50">
            {loading ? (
              <tr><td colSpan="5" className="px-6 py-8 text-center text-stone-400 text-sm">Chargement...</td></tr>
            ) : books.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-8 text-center text-stone-400 text-sm">Aucun livre trouve</td></tr>
            ) : books.map(function(book) {
              return (
                <tr key={book._id} className="hover:bg-amber-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-stone-800">{book.title}</p>
                    <p className="text-xs text-stone-400">{book.author}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-500">{book.genre}</td>
                  <td className="px-6 py-4 font-mono text-sm">{book.availableCopies}/{book.totalCopies}</td>
                  <td className="px-6 py-4">
                    <span className={"text-xs font-mono px-3 py-1 rounded-full " + (book.availableCopies > 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600')}>
                      {book.availableCopies > 0 ? 'Disponible' : 'Emprunte'}
                    </span>
                  </td>
                  {user && user.role === 'librarian' && (
                    <td className="px-6 py-4">
                      <button onClick={function() { handleDelete(book._id); }}
                        className="text-xs text-stone-300 hover:text-red-500 transition-colors">Supprimer</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}`,

  'pages/Loans.jsx': `import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Loans() {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [books, setBooks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ userId: '', bookId: '' });
  const [loading, setLoading] = useState(true);

  const fetchAll = function() {
    Promise.all([api.get('/loans'), api.get('/books')]).then(function(results) {
      setLoans(results[0].data);
      setBooks(results[1].data.filter(function(b) { return b.availableCopies > 0; }));
      setLoading(false);
    });
  };

  useEffect(function() { fetchAll(); }, []);

  const handleCreate = async function(e) {
    e.preventDefault();
    try {
      await api.post('/loans', form);
      setShowForm(false);
      fetchAll();
    } catch (err) {
      alert(err.response && err.response.data ? err.response.data.message : 'Erreur');
    }
  };

  const handleReturn = async function(id) {
    await api.put('/loans/' + id + '/return');
    fetchAll();
  };

  const statusColor = function(status) {
    if (status === 'returned') return 'bg-green-50 text-green-700';
    if (status === 'late') return 'bg-red-50 text-red-600';
    return 'bg-amber-50 text-amber-700';
  };

  const statusLabel = function(status) {
    if (status === 'returned') return 'Retourne';
    if (status === 'late') return 'Retard';
    return 'Actif';
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1">Gestion</p>
          <h2 className="font-serif text-3xl font-bold text-stone-900">Emprunts</h2>
        </div>
        {user && user.role === 'librarian' && (
          <button onClick={function() { setShowForm(!showForm); }}
            className="bg-stone-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors">
            + Nouvel emprunt
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-amber-100 rounded-xl p-6 mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-stone-400 uppercase tracking-wider mb-1">ID MongoDB de l'etudiant</label>
            <input required placeholder="ex: 64f3a..." value={form.userId}
              onChange={function(e) { setForm({...form, userId: e.target.value}); }}
              className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-400 font-mono" />
          </div>
          <div>
            <label className="block text-xs font-mono text-stone-400 uppercase tracking-wider mb-1">Livre</label>
            <select required value={form.bookId} onChange={function(e) { setForm({...form, bookId: e.target.value}); }}
              className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-400">
              <option value="">Choisir un livre</option>
              {books.map(function(b) {
                return <option key={b._id} value={b._id}>{b.title} ({b.availableCopies} dispo)</option>;
              })}
            </select>
          </div>
          <div className="col-span-2 flex gap-3">
            <button type="submit" className="bg-stone-900 text-white px-6 py-2 rounded-lg text-sm">Creer</button>
            <button type="button" onClick={function() { setShowForm(false); }}
              className="border border-stone-200 px-6 py-2 rounded-lg text-sm">Annuler</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-amber-100 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-amber-50">
              <th className="text-left px-6 py-3 text-xs font-mono text-stone-400 uppercase tracking-wider">Etudiant</th>
              <th className="text-left px-6 py-3 text-xs font-mono text-stone-400 uppercase tracking-wider">Livre</th>
              <th className="text-left px-6 py-3 text-xs font-mono text-stone-400 uppercase tracking-wider">Date limite</th>
              <th className="text-left px-6 py-3 text-xs font-mono text-stone-400 uppercase tracking-wider">Statut</th>
              {user && user.role === 'librarian' && <th className="px-6 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-amber-50">
            {loading ? (
              <tr><td colSpan="5" className="px-6 py-8 text-center text-stone-400 text-sm">Chargement...</td></tr>
            ) : loans.length === 0 ? (
              <tr><td colSpan="5" className="px-6 py-8 text-center text-stone-400 text-sm">Aucun emprunt</td></tr>
            ) : loans.map(function(loan) {
              return (
                <tr key={loan._id} className="hover:bg-amber-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">{loan.user && loan.user.name}</p>
                    <p className="text-xs text-stone-400">{loan.user && loan.user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium">{loan.book && loan.book.title}</p>
                    <p className="text-xs text-stone-400">{loan.book && loan.book.author}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-stone-500">
                    {new Date(loan.dueDate).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={"text-xs font-mono px-3 py-1 rounded-full " + statusColor(loan.status)}>
                      {statusLabel(loan.status)}
                    </span>
                  </td>
                  {user && user.role === 'librarian' && (
                    <td className="px-6 py-4">
                      {loan.status !== 'returned' && (
                        <button onClick={function() { handleReturn(loan._id); }}
                          className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-lg hover:bg-green-100 transition-colors">
                          Retourner
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}`,

  'pages/AI.jsx': `import { useState } from 'react';
import api from '../api/axios';

export default function AI() {
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState('');
  const [bookId, setBookId] = useState('');
  const [loadingRec, setLoadingRec] = useState(false);
  const [loadingSum, setLoadingSum] = useState(false);
  const [statsSummary, setStatsSummary] = useState('');
  const [loadingStats, setLoadingStats] = useState(false);

  const getRecommendations = async function() {
    setLoadingRec(true);
    try {
      const res = await api.post('/ai/recommend');
      setRecommendations(Array.isArray(res.data.recommendations) ? res.data.recommendations : []);
    } catch (err) {
      alert('Erreur IA');
    } finally {
      setLoadingRec(false);
    }
  };

  const getSummary = async function() {
    if (!bookId) { alert("Entre un ID de livre"); return; }
    setLoadingSum(true);
    try {
      const res = await api.post('/ai/summarize', { bookId: bookId });
      setSummary(res.data.summary);
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setLoadingSum(false);
    }
  };

  const getStatsSummary = async function() {
    setLoadingStats(true);
    try {
      const res = await api.get('/ai/stats-summary');
      setStatsSummary(res.data.summary);
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setLoadingStats(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-xs font-mono text-stone-400 uppercase tracking-widest mb-1">Intelligence Artificielle</p>
        <h2 className="font-serif text-3xl font-bold text-stone-900">Gemini AI</h2>
        <p className="text-stone-400 text-sm mt-1">Fonctionnalites intelligentes propulsees par Google Gemini</p>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-stone-900 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-800 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <h3 className="text-white font-serif text-lg">Recommandations personnalisees</h3>
          </div>
          <div className="p-6">
            <p className="text-stone-500 text-xs font-mono mb-4">Base sur votre historique d'emprunts</p>
            <button onClick={getRecommendations} disabled={loadingRec}
              className="w-full bg-amber-400 text-stone-900 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-300 transition-colors disabled:opacity-50 mb-4">
              {loadingRec ? 'Analyse en cours...' : 'Generer mes recommandations'}
            </button>
            <div className="space-y-3">
              {recommendations.map(function(rec, i) {
                return (
                  <div key={i} className="flex gap-3 py-3 border-b border-stone-800 last:border-0">
                    <span className="font-serif text-xl font-bold text-stone-700">{i < 9 ? "0"+(i+1) : i+1}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{rec.title}</p>
                      <p className="text-stone-500 text-xs">{rec.author}</p>
                      <p className="text-stone-400 text-xs mt-1">{rec.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-white border border-amber-100 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-50">
              <h3 className="font-serif text-lg font-bold">Resume de livre</h3>
            </div>
            <div className="p-6">
              <input placeholder="ID MongoDB du livre" value={bookId}
                onChange={function(e) { setBookId(e.target.value); }}
                className="w-full border border-stone-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-amber-400 mb-3 font-mono" />
              <button onClick={getSummary} disabled={loadingSum}
                className="w-full bg-stone-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50">
                {loadingSum ? 'Generation...' : 'Generer le resume'}
              </button>
              {summary && <p className="mt-4 text-sm text-stone-600 leading-relaxed bg-amber-50 rounded-lg p-4">{summary}</p>}
            </div>
          </div>
          <div className="bg-white border border-amber-100 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-50">
              <h3 className="font-serif text-lg font-bold">Analyse des statistiques</h3>
            </div>
            <div className="p-6">
              <button onClick={getStatsSummary} disabled={loadingStats}
                className="w-full bg-stone-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50">
                {loadingStats ? 'Analyse...' : 'Analyser la bibliotheque'}
              </button>
              {statsSummary && <p className="mt-4 text-sm text-stone-600 leading-relaxed bg-amber-50 rounded-lg p-4">{statsSummary}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`
};

// Créer les dossiers
var dirs = ['context', 'api', 'pages', 'components'];
dirs.forEach(function(dir) {
  var p = path.join(BASE, dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Écrire tous les fichiers
console.log('\n Création des fichiers React...\n');
var fileKeys = Object.keys(files);
fileKeys.forEach(function(filePath) {
  var content = files[filePath];
  var fullPath = path.join(BASE, filePath);
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('OK : ' + filePath);
});

console.log('\nFrontend React pret !');
console.log('Lance avec : npm run dev\n');
