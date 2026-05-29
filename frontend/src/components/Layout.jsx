import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useLanguage } from "../context/LanguageContext";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import LanguageToggle from "./LanguageToggle";
import FloatingAI from "./FloatingAI";
import logo from "../assets/logo_LibraFlow.png";
import {
  LayoutDashboard,
  BookOpen,
  ArrowLeftRight,
  Sparkles,
  Bell,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Info,
  LogOut,
  ChevronRight,
  X,
  Menu,
  Users,
  WifiOff,
  Wifi,
} from "lucide-react";

const navItems = [
  { to: "/app/dashboard", Icon: LayoutDashboard, labelKey: "dashboardNav" },
  { to: "/app/catalogue", Icon: BookOpen,         labelKey: "catalogue" },
  { to: "/app/loans",     Icon: ArrowLeftRight,   labelKey: "loans" },
  { to: "/app/ai",        Icon: Sparkles,         labelKey: "ai" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isOnline, wasOffline } = useNetworkStatus();
  const isOffline = !isOnline;

  // ── Notifications
  const { notifications, unreadCount, markAllRead } = useSocket();
  const [showNotifs, setShowNotifs] = useState(false);
  const notifsRefMobile  = useRef(null);
  const notifsRefDesktop = useRef(null);



  useEffect(() => {
    const handleOnline  = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInsideNotifs =
        (notifsRefMobile.current  && notifsRefMobile.current.contains(e.target)) ||
        (notifsRefDesktop.current && notifsRefDesktop.current.contains(e.target));
      if (!clickedInsideNotifs) setShowNotifs(false);

    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkRead = async () => { await markAllRead(); };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const typeLeftBorder = (type) => {
    if (type === "badge")   return "border-l-amber-400";
    if (type === "success") return "border-l-emerald-400";
    if (type === "warning") return "border-l-orange-400";
    return "border-l-slate-200";
  };

  const TypeIcon = ({ type }) => {
    const cls = "w-4 h-4 flex-shrink-0";
    if (type === "badge")   return <Trophy        className={`${cls} text-amber-500`} />;
    if (type === "success") return <CheckCircle2  className={`${cls} text-emerald-500`} />;
    if (type === "warning") return <AlertTriangle className={`${cls} text-orange-500`} />;
    return <Info className={`${cls} text-sky-400`} />;
  };

  // ── Shared notifications dropdown
  // mobile=true  → fixed sous le header mobile (left-3 right-3 top-16)
  // mobile=false → fixed à droite de la sidebar (left-[268px] top-[52px])
  const NotifDropdown = ({ mobile = false }) => (
    <div className={[
      "z-[200] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden",
      mobile
        ? "fixed top-16 left-3 right-3"           // Mobile : pleine largeur sous le header
        : "fixed left-[268px] top-[52px] w-80",   // Desktop : à droite de la sidebar
    ].join(" ")}>

      {/* Header du dropdown */}
      <div className="px-4 py-3 bg-gradient-to-r from-sky-50 to-slate-50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-sky-500" />
          <p className="font-bold text-slate-800 text-sm">Notifications</p>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkRead}
            className="text-xs text-sky-500 hover:text-sky-700 font-semibold transition-colors"
          >
            Tout lire
          </button>
        )}
      </div>

      {/* Liste */}
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
            <Bell className="w-7 h-7 opacity-25" />
            <p className="text-xs font-medium">Aucune notification</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id || n.title}
              className={[
                "px-4 py-3 flex gap-3 items-start border-l-4 transition-colors hover:bg-slate-50",
                typeLeftBorder(n.type),
                !n.isRead ? "bg-white" : "bg-slate-50/60",
              ].join(" ")}
            >
              <div className="flex-shrink-0 mt-0.5">
                <TypeIcon type={n.type} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className={[
                    "text-xs leading-snug truncate",
                    !n.isRead ? "font-bold text-slate-900" : "font-medium text-slate-500",
                  ].join(" ")}>
                    {n.title}
                  </p>
                  {!n.isRead && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{n.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 md:flex">



      {/* Offline Banner */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-[10px] uppercase tracking-widest font-bold py-1 text-center z-[100] animate-pulse">
          Mode Hors-ligne — Données en cache
        </div>
      )}

      {/* ── Mobile Header ── */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-40">
        {/* Logo → landing */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src={logo} alt="Logo" className="h-8 w-auto" />
          <span className="font-bold text-slate-900">LibraFlow</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Notifications Bell – Mobile */}
          <div className="relative" ref={notifsRefMobile}>
            <button
              onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unreadCount > 0) handleMarkRead(); }}
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
              className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifs && <NotifDropdown mobile={true} />}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isMobileMenuOpen}
            className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            {isMobileMenuOpen
              ? <X    className="w-6 h-6" />
              : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:sticky md:top-0 md:h-screen md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-full flex-col p-4">

          <div className="mb-6 flex items-center justify-between">
            {/* Logo → landing (desktop) */}
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <img src={logo} alt="Logo" className="h-8 w-auto" />
              <h1 className="leading-tight text-base font-bold text-slate-900">LibraFlow</h1>
            </Link>

            {/* Notifications Bell – Desktop — en haut à droite */}
            <div className="relative" ref={notifsRefDesktop}>
              <button
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unreadCount > 0) handleMarkRead(); }}
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} non lues)` : ''}`}
                className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && <NotifDropdown mobile={false} />}
            </div>
          </div>

          {/* Nav items */}
          <nav className="mb-6 flex flex-wrap gap-2 md:flex-col md:gap-1">
            {navItems.map(({ to, Icon, labelKey }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => "nav-link " + (isActive ? "nav-link-active" : "")}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{t(labelKey)}</span>
              </NavLink>
            ))}
            {user?.role === "librarian" && (
              <NavLink
                to="/app/users"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => "nav-link " + (isActive ? "nav-link-active" : "")}
              >
                <Users className="w-4 h-4 flex-shrink-0" />
                <span>Utilisateurs</span>
              </NavLink>
            )}
          </nav>

          {/* User info */}
          <div className="mt-auto space-y-3 border-t border-slate-200 pt-3">
            <button
              onClick={() => { setIsMobileMenuOpen(false); navigate("/app/profile"); }}
              className="w-full flex items-center gap-3 rounded-2xl bg-slate-50 p-3 hover:bg-sky-50 transition-all border border-transparent hover:border-sky-100 group animate-fade-in"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 text-white font-semibold flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform overflow-hidden">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  user?.name?.charAt(0).toUpperCase() || "U"
                )}
              </div>
              <div className="min-w-0 flex-1 flex flex-col items-start translate-y-[-1px]">
                <span className="text-slate-500 font-normal block text-[10px] uppercase tracking-wider mb-0.5">{t("welcome")}</span>
                <p className="text-sm font-bold text-slate-900 truncate w-full text-left">{user?.name || "User"}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-400 transition-colors" />
            </button>

            <div className="flex w-full items-center justify-between px-3 py-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {user?.role === "librarian" ? t("admin") : (user?.studentId || t("student"))}
              </span>
              <LanguageToggle />
            </div>
          </div>

        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="min-w-0 flex-1 flex flex-col">

        {/* ── Bannière HORS-LIGNE ── */}
        {isOffline && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 text-white text-xs font-semibold animate-fade-in flex-shrink-0">
            <WifiOff className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            <span>
              Mode hors-ligne — données affichées depuis le cache.
              <span className="text-slate-400 ml-1 font-normal">Les actions (emprunts, retours, IA) sont désactivées.</span>
            </span>
          </div>
        )}

        {/* ── Bannière CONNEXION RÉTABLIE ── */}
        {wasOffline && isOnline && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-emerald-600 text-white text-xs font-semibold animate-fade-in flex-shrink-0">
            <Wifi className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Connexion rétablie — données actualisées automatiquement.</span>
          </div>
        )}

        <div className="p-4 sm:p-6 md:p-8 flex-1">
          <div className="mx-auto max-w-7xl animate-fade-in">
            <Outlet />
          </div>
        </div>
      </main>

      {/* ── BookIA — Assistant flottant ── */}
      <FloatingAI />
    </div>
  );
}
