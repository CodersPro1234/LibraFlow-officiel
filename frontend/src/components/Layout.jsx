import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useLanguage } from "../context/LanguageContext";
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
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

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

  const typeColor = (type) => {
    if (type === "badge")   return "bg-amber-50 border-amber-200";
    if (type === "success") return "bg-emerald-50 border-emerald-200";
    if (type === "warning") return "bg-orange-50 border-orange-200";
    return "bg-slate-50 border-slate-100";
  };

  const TypeIcon = ({ type }) => {
    const cls = "w-4 h-4 flex-shrink-0 mt-0.5";
    if (type === "badge")   return <Trophy        className={`${cls} text-amber-500`} />;
    if (type === "success") return <CheckCircle2  className={`${cls} text-emerald-500`} />;
    if (type === "warning") return <AlertTriangle className={`${cls} text-orange-500`} />;
    return <Info className={`${cls} text-slate-400`} />;
  };

  // ── Shared notifications dropdown
  const NotifDropdown = () => (
    <div className="absolute right-0 top-10 z-50 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <p className="font-semibold text-slate-800 text-sm">Notifications</p>
        {unreadCount > 0 && (
          <button onClick={handleMarkRead} className="text-xs text-sky-500 hover:text-sky-700 font-medium">
            Tout marquer lu
          </button>
        )}
      </div>
      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
        {notifications.length === 0 ? (
          <p className="text-center text-slate-400 text-xs py-6">Aucune notification</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id || n.title}
              className={`px-4 py-3 flex gap-3 items-start border ${typeColor(n.type)} ${!n.isRead ? "font-semibold" : "opacity-70"}`}
            >
              <TypeIcon type={n.type} />
              <div>
                <p className="text-xs text-slate-800">{n.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
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
            {showNotifs && <NotifDropdown />}
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
              {showNotifs && <NotifDropdown />}
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
      <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">
        <div className="mx-auto max-w-7xl animate-fade-in">
          <Outlet />
        </div>
      </main>

      {/* ── Lia — Assistant flottant ── */}
      <FloatingAI />
    </div>
  );
}
