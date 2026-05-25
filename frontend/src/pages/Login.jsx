import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import api from "../api/axios";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/login", form);

      login(data);
      navigate("/app/dashboard");
    } catch (err) {
      console.error("Login Error:", err);
      setError(
        err.response?.data?.message || err.message || "Erreur de connexion"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 bg-dots flex items-center justify-center p-4">
      <div className="fixed top-6 right-6 z-50">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-[900px] bg-white rounded-[2rem] overflow-hidden flex flex-col md:flex-row shadow-2xl min-h-[550px] animate-fade-in relative">
        {/* Left Side (White) */}
        <div className="w-full md:w-1/2 p-10 flex flex-col items-center justify-center relative bg-white">
          <h1 className="text-[2.2rem] font-bold text-black mb-6">Sign In</h1>
          
          <div className="flex gap-3 mb-6">
            <button type="button" className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-colors">
              <span className="font-bold text-sm">G</span>
            </button>
            <button type="button" className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-colors">
              <span className="font-bold text-sm">f</span>
            </button>
            <button type="button" className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-colors">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </button>
            <button type="button" className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-slate-50 transition-colors">
              <span className="font-bold text-sm">in</span>
            </button>
          </div>

          <p className="text-slate-500 text-sm mb-4">Sign in With Email & Password</p>



          {error && (
            <div className="w-full mb-4 p-2 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full space-y-3 max-w-[320px]">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#f0f0f0] border-none text-slate-800 text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all placeholder:text-slate-400"
              placeholder="Enter E-mail"
              required
            />
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[#f0f0f0] border-none text-slate-800 text-sm outline-none focus:ring-2 focus:ring-slate-300 transition-all placeholder:text-slate-400"
              placeholder="Enter Password"
              required
            />
            <div className="text-center pt-2 pb-4">
              <a href="#" className="text-sm text-slate-500 hover:text-slate-700">Forget Password?</a>
            </div>
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-full px-10 py-2.5 text-sm font-bold tracking-wider hover:from-slate-700 hover:to-slate-800 transition-all disabled:opacity-50"
              >
                {loading ? t("connecting") : "SIGN IN"}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side (Gradient) */}
        <div className="w-full md:w-1/2 bg-gradient-to-br from-slate-800 to-slate-900 p-10 flex flex-col items-center justify-center text-white text-center rounded-t-[3rem] md:rounded-t-none md:rounded-l-[4rem] md:rounded-r-[2rem] shadow-[-10px_0_30px_rgba(0,0,0,0.1)] relative z-10">
          <h2 className="text-[2.5rem] font-bold mb-4 tracking-wide">Hello World</h2>
          <p className="text-white text-sm mb-8 font-light">
            Sign up now and enjoy our site
          </p>
          <Link
            to="/register"
            className="border border-white text-white rounded-full px-10 py-2.5 text-sm font-bold tracking-wider hover:bg-white hover:text-slate-800 transition-colors"
          >
            SIGN UP
          </Link>
        </div>
      </div>
    </div>
  );
}
