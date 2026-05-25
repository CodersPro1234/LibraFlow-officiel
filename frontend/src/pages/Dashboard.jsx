import { useEffect, useState, useCallback } from "react";
import api from "../api/axios";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { BookOpen, ArrowLeftRight, CheckCircle2, AlertTriangle, Star, Trophy, Repeat2 } from "lucide-react";

function StatCard({ label, value, color, Icon, trend }) {
  const iconBg   = color.replace("-500", "-50");
  const iconText = color.replace("bg-", "text-");
  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 relative overflow-hidden group hover:shadow-hover transition-all">
      <div className={`absolute top-0 left-0 w-1 h-full ${color}`} />
      <div className="flex justify-between items-start mb-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} group-hover:scale-110 transition-transform`}>
          <Icon className={`w-5 h-5 ${iconText}`} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        {trend && <span className="text-[10px] font-bold text-emerald-500 mb-1.5">{trend}</span>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFromCache, setIsFromCache] = useState(false);

  const isLibrarian = user?.role === "librarian";

  const fetchStats = useCallback(() => {
    api
      .get("/stats")
      .then((res) => {
        setStats(res.data);
        setIsFromCache(!!res.isFromCache);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading)
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 gap-2">
        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-medium">{t("loading")}</span>
      </div>
    );

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold text-sky-600 uppercase tracking-widest mb-1">{t("overview")}</p>
          <h2 className="text-3xl font-bold text-slate-900">{t("dashboardTitle")}</h2>
        </div>
        {isFromCache && (
          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-3 py-1.5 rounded-full border border-amber-200 uppercase tracking-widest animate-pulse">
            Mode Hors-ligne : Données en cache
          </span>
        )}
      </div>

      {/* ── WIDGET GAMIFICATION (étudiants seulement) ── */}
      {!isLibrarian && user && (
        <div className="mb-8 bg-gradient-to-r from-sky-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-sky-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sky-100 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" /> {t("myScore") || "Mon score"}
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-black">{user.points || 0}</span>
                <span className="text-sky-200 font-semibold text-lg">pts</span>
              </div>
              <p className="text-sky-100 text-xs mt-1">+10 pts par livre rendu</p>
            </div>

            <div className="flex-1 sm:max-w-xs">
              <p className="text-sky-100 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" /> {t("unlockedBadges") || "Badges débloqués"} ({user.badges?.length || 0})
              </p>
              {user.badges?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.badges.map((b, i) => (
                    <div
                      key={i}
                      title={b.name}
                      className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center cursor-default hover:bg-white/30 transition-colors"
                    >
                      {b.icon ? <span className="text-xl">{b.icon}</span> : <Trophy className="w-5 h-5 text-white" />}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sky-100/70 text-xs italic">Rendez des livres pour débloquer des badges !</p>
              )}
            </div>

            {/* Barre de progression vers le prochain badge */}
            <div className="w-full sm:w-40">
              {(() => {
                const returnCount   = stats?.myReturnHistory || 0;
                const nextMilestone = returnCount < 5 ? 5 : returnCount < 10 ? 10 : returnCount < 20 ? 20 : null;
                if (!nextMilestone)
                  return <p className="text-sky-100 text-xs text-center font-bold">🎉 Tous les badges débloqués !</p>;
                const pct = Math.round((returnCount / nextMilestone) * 100);
                return (
                  <div>
                    <div className="flex justify-between text-xs text-sky-100 mb-1.5">
                      <span>Prochain badge</span>
                      <span>{returnCount}/{nextMilestone}</span>
                    </div>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-sky-100/70 mt-1 text-right">{pct}%</p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {stats ? (
        <>
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard label={t("totalBooks")}  value={stats.totalBooks}     color="bg-sky-500"     Icon={BookOpen}     />
            <StatCard
              label={isLibrarian ? t("activeLoans") : "Mes emprunts actifs"}
              value={stats.activeLoans}
              color="bg-indigo-500"
              Icon={ArrowLeftRight}
            />
            <StatCard label={t("available")}   value={stats.availableBooks} color="bg-emerald-500" Icon={CheckCircle2} />
            <StatCard
              label={isLibrarian ? t("late") : (t("myReturnHistory") || "Retours effectués")}
              value={isLibrarian ? stats.lateLoans : (stats.myReturnHistory || 0)}
              color={isLibrarian ? "bg-rose-500" : "bg-amber-500"}
              Icon={isLibrarian ? AlertTriangle : Repeat2}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Stats by Genre */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 h-full">
                <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                  {t("booksByGenre")}
                </h3>
                <div className="space-y-4">
                  {stats.byGenre?.map((g, i) => {
                    const max    = stats.byGenre[0].count;
                    const colors = ["bg-sky-500","bg-indigo-500","bg-violet-500","bg-rose-500","bg-amber-500"];
                    const pct    = Math.round((g.count / max) * 100);
                    return (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-xs font-semibold text-slate-700">{g._id}</span>
                          <span className="text-[10px] font-bold text-slate-400">{g.count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${colors[i % colors.length]} transition-all duration-700 ease-out`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Most Borrowed Books */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-card border border-slate-100 h-full">
                <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 flex-shrink-0" />
                    {t("mostBorrowed")}
                  </h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {stats.topBooks?.map((b, i) => (
                    <div key={i} className="flex items-center gap-5 px-6 py-4 hover:bg-slate-50 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-300 font-black text-lg group-hover:bg-sky-50 group-hover:text-sky-300 transition-colors">
                        {i < 9 ? "0" + (i + 1) : i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 line-clamp-1">{b.title}</p>
                        <p className="text-xs text-slate-400 font-medium">{b.author}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{b.count}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{t("loans")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-slate-50 rounded-2xl p-12 text-center border-2 border-dashed border-slate-200">
          <p className="text-slate-400 text-sm font-medium">{t("noData")}</p>
        </div>
      )}
    </div>
  );
}
