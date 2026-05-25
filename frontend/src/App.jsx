import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ToastProvider } from "./hooks/Toast";
import { SocketProvider } from "./context/SocketContext";
import Layout from "./components/Layout";

// Lazy-loaded pages — each becomes its own JS chunk (splits the 1.15MB bundle)
const Landing      = lazy(() => import("./pages/Landing"));
const Dashboard    = lazy(() => import("./pages/Dashboard"));
const StudentHome  = lazy(() => import("./pages/StudentHome"));
const Catalogue    = lazy(() => import("./pages/Catalogue"));
const Loans        = lazy(() => import("./pages/Loans"));
const AI           = lazy(() => import("./pages/AI"));
const Profile      = lazy(() => import("./pages/Profile"));
const Login        = lazy(() => import("./pages/Login"));
const Register     = lazy(() => import("./pages/Register"));
const NotFound     = lazy(() => import("./pages/NotFound"));
const Ticket       = lazy(() => import("./pages/Ticket"));
const Users        = lazy(() => import("./pages/Users"));

// Spinner de chargement plein écran
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin h-8 w-8 text-sky-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-medium text-slate-400">Chargement…</span>
      </div>
    </div>
  );
}

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/" />;
}

// Route /app/dashboard adaptée selon le rôle
function DashboardRouter() {
  const { user } = useAuth();
  return user?.role === "librarian" ? <Dashboard /> : <StudentHome />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <SocketProvider>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public */}
                  <Route path="/"          element={<Landing />}  />
                  <Route path="/login"     element={<Login />}    />
                  <Route path="/register"  element={<Register />} />

                  {/* App — protégé */}
                  <Route
                    path="/app"
                    element={
                      <PrivateRoute>
                        <Layout />
                      </PrivateRoute>
                    }
                  >
                    <Route index element={<Navigate to="/app/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardRouter />} />
                    <Route path="catalogue" element={<Catalogue />} />
                    <Route path="loans"     element={<Loans />}     />
                    <Route path="ticket"    element={<Ticket />}    />
                    <Route path="ai"        element={<AI />}         />
                    <Route path="profile"   element={<Profile />}   />
                    <Route path="users"     element={<Users />}     />
                  </Route>

                  {/* 404 */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </SocketProvider>
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
