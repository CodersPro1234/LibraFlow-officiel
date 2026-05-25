import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import LanguageToggle from "../components/LanguageToggle";
import logo from "../assets/logo_LibraFlow.png";
import featAI from "../assets/feat-ai.png";
import featQR from "../assets/feat-qr.png";
import featCatalog from "../assets/feat-catalog.png";
import aboutImg from "../assets/about-librarian.png";
import homeVideo from "../assets/homevideo.mp4";

export default function Landing() {
  const { t, lang, toggleLang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/app/dashboard");
    }
  }, [user, navigate]);

  // Handle scroll for navbar transparency
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleLanguage = () => {
    toggleLang();
  };

  const navLinks = [
    { name: t("home"), href: "#home" },
    { name: t("about"), href: "#about" },
    { name: t("features"), href: "#features" },
    { name: t("contact"), href: "#contact" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 scroll-smooth">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "glass py-3 shadow-md" : "bg-white/95 backdrop-blur-sm py-4 border-b border-slate-100 shadow-sm"}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="LibraFlow Logo" className="h-10 w-auto" />
            <span className="font-bold text-xl tracking-tight text-slate-900">LibraFlow</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <LanguageToggle />
            <button 
              onClick={() => navigate("/login")}
              className="px-5 py-2.5 text-sm font-semibold text-sky-600 hover:bg-sky-50 rounded-xl transition-all"
            >
              {t("login")}
            </button>
            <button 
              onClick={() => navigate("/register")}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-indigo-600 rounded-xl shadow-md hover:shadow-lg hover:shadow-sky-200 transition-all transform hover:-translate-y-0.5"
            >
              {t("getStarted")}
            </button>
          </div>

          {/* Hamburger Button */}
          <button 
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-100 shadow-xl transition-all duration-300 origin-top ${isMobileMenuOpen ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0 pointer-events-none"}`}>
          <div className="flex flex-col p-6 gap-4">
            {navLinks.map((link) => (
              <a 
                key={link.name} 
                href={link.href} 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-base font-medium text-slate-600 hover:text-sky-600 transition-colors"
              >
                {link.name}
              </a>
            ))}
            <div className="pt-4 border-t border-slate-50 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">{t("role")}</span>
                <LanguageToggle />
              </div>
              <button 
                onClick={() => navigate("/login")}
                className="w-full py-3 text-center border border-sky-100 text-sky-600 rounded-2xl font-bold"
              >
                {t("login")}
              </button>
              <button 
                onClick={() => navigate("/register")}
                className="w-full py-3 text-center bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-2xl font-bold shadow-md shadow-sky-100"
              >
                {t("getStarted")}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-slate-900">
        {/* Video Background — poster affiché pendant le chargement */}
        <video
          autoPlay
          loop
          muted
          playsInline
          poster="/hero-poster.jpg"
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-60"
        >
          <source src={homeVideo} type="video/mp4" />
        </video>

        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-transparent to-slate-900/60 z-10" />

        <div className="max-w-7xl mx-auto px-6 relative z-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500/10 text-sky-400 backdrop-blur-md border border-sky-500/20 text-xs font-bold uppercase tracking-widest mb-6 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            {t("burkinaTech")}
          </div>
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight animate-slide-up">
            {t("manageLibraryWithAI")} <br /> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400 font-serif font-black italic">LibraFlow</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-200 mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: "0.1s" }}>
            {t("heroDescription")}
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up" style={{ animationDelay: "0.2s" }}>
            <button
              onClick={() => navigate("/register")}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-2xl font-bold shadow-lg hover:shadow-sky-500/30 hover:from-sky-600 hover:to-indigo-700 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              {t("getStarted")}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-sm text-white border border-white/20 rounded-2xl font-bold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
            >
              {t("learnMore")}
            </a>
          </div>
        </div>

        {/* Abstract shapes for hero background */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[600px] h-[600px] bg-sky-100 rounded-full blur-[100px] opacity-50" />
        <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-100 rounded-full blur-[100px] opacity-40" />
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-sky-50 to-indigo-50 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center">
                 <img src={aboutImg} alt="LibraFlow About" className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" />
              </div>
              <div className="absolute -bottom-6 -right-6 glass p-6 rounded-2xl shadow-xl max-w-xs animate-slide-up">
                <p className="text-sm font-bold text-slate-900 mb-1">{t("efficiency")}</p>
                <p className="text-xs text-slate-500">{t("manualTrackingPast")}</p>
              </div>
            </div>
            
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6 leading-tight">
                {t("craftedForModern")}
              </h2>
              <p className="text-slate-600 mb-8 leading-relaxed">
                {t("craftedDescription")}
              </p>
              <ul className="space-y-4">
                {[
                  t("realTimeSync"),
                  t("crossPlatform"),
                  t("analytics"),
                  t("secureUser")
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">{t("powerfulFeatures")}</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">{t("everythingNeeded")}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                title: t("aiLibrarian"), 
                desc: t("aiLibrarianDesc"), 
                image: featAI, 
                color: "bg-sky-500" 
              },
              { 
                title: t("qrTracking"), 
                desc: t("qrTrackingDesc"), 
                image: featQR, 
                color: "bg-indigo-500" 
              },
              { 
                title: t("smartCatalog"), 
                desc: t("smartCatalogDesc"), 
                image: featCatalog, 
                color: "bg-emerald-500" 
              }
            ].map((f, i) => (
              <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-sky-100/50 transition-all group overflow-hidden">
                <div className={`w-full aspect-video rounded-2xl mb-6 overflow-hidden shadow-md group-hover:scale-105 transition-transform duration-500`}>
                  <img src={f.image} alt={f.title} className="w-full h-full object-cover" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl text-center mx-auto">
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">{t("readyToTransform")}</h2>
              <p className="text-slate-300 mb-10 text-lg">{t("joinHundreds")}</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                  onClick={() => navigate("/register")}
                  className="px-8 py-4 bg-sky-500 text-white rounded-2xl font-bold shadow-lg hover:bg-sky-600 transition-all"
                >
                  {t("createAccount")}
                </button>
                
              </div>
              
              <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  codeurspro@gmail.com
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Pologo,Koudougou,Burkina Faso
                </div>
              </div>
            </div>
            
            {/* Visual flair for the dark section */}
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-96 h-96 bg-sky-500 rounded-full blur-[160px] opacity-20" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-indigo-500 rounded-full blur-[140px] opacity-20" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src={logo} alt="LibraFlow Logo" className="h-8 w-auto grayscale" />
            <span className="font-bold text-lg tracking-tight text-slate-400">LibraFlow</span>
          </div>
          <p className="text-sm text-slate-400" >
            &copy; 2026 LibraFlow. {t("builtBy")} <a href="https://coders-pro.netlify.app/" className="text-gradient">Coders_Pro</a>.
          </p>
        </div>
      </footer>
    </div>
  );
}
