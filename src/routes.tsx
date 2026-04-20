import { createBrowserRouter, isRouteErrorResponse, useRouteError } from "react-router";
import Home from "./app/pages/Home";
import AdminDashboard from "./app/pages/AdminDashboard";
import AdminLogin from "./app/pages/AdminLogin";
import Login from "./app/pages/Login";
import RoleSelectLogin from "./app/pages/RoleSelectLogin";
import StaffDashboard from "./app/pages/StaffDashboard";
import AthleteProfile from "./app/pages/AthleteProfile";
import AthleteJoin from "./app/pages/AthleteJoin";
import ResetPassword from "./app/pages/ResetPassword";
import ProtectedDGRoute from "./app/components/ProtectedDGRoute";
import ProtectedStaffRoute from "./app/components/ProtectedStaffRoute";

function NotFound() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <h1 className="text-5xl font-black text-[#C7FF00] mb-4">404</h1>
        <p className="text-xl text-zinc-300 mb-6">Page introuvable.</p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#C7FF00] text-black font-bold hover:bg-[#b3e600] transition"
        >
          Retour à l'accueil
        </a>
      </div>
    </div>
  );
}

function RouteErrorBoundary() {
  const error = useRouteError();
  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Erreur inattendue";
  const details = isRouteErrorResponse(error)
    ? (typeof error.data === "string" ? error.data : "Une erreur de navigation est survenue.")
    : (error instanceof Error ? error.message : "Veuillez recharger la page.");

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center px-6">
      <div className="max-w-xl text-center">
        <p className="text-xs font-black tracking-[4px] uppercase text-zinc-500 mb-3">AGTA Portal</p>
        <h1 className="text-4xl font-black text-[#C7FF00] mb-3">{title}</h1>
        <p className="text-zinc-300 mb-6">{details}</p>
        <div className="flex items-center justify-center gap-3">
          <a
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#C7FF00] text-black font-bold hover:bg-[#b3e600] transition"
          >
            Retour a l'accueil
          </a>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-zinc-800 text-zinc-100 font-bold hover:bg-zinc-700 transition"
          >
            Recharger
          </button>
        </div>
      </div>
    </div>
  );
}

const withErrorElement = (route: { path: string; Component: any }) => ({
  ...route,
  errorElement: <RouteErrorBoundary />,
});

export const router = createBrowserRouter([
  withErrorElement({ path: "/", Component: Home }),
  withErrorElement({ path: "/athlete/:id", Component: AthleteProfile }),
  withErrorElement({ path: "/login", Component: RoleSelectLogin }),
  withErrorElement({ path: "/login/dg", Component: AdminLogin }),
  withErrorElement({ path: "/login/staff", Component: Login }),
  withErrorElement({ path: "/auth/reset-password", Component: ResetPassword }),
  withErrorElement({ path: "/staff-login", Component: Login }),
  withErrorElement({ path: "/join", Component: AthleteJoin }),
  withErrorElement({
    path: "/admin-dashboard",
    Component: () => (
      <ProtectedDGRoute>
        <AdminDashboard />
      </ProtectedDGRoute>
    ),
  }),
  withErrorElement({
    path: "/staff-dashboard",
    Component: () => (
      <ProtectedStaffRoute>
        <StaffDashboard />
      </ProtectedStaffRoute>
    ),
  }),
  withErrorElement({
    path: "/admin/dg",
    Component: () => (
      <ProtectedDGRoute>
        <AdminDashboard />
      </ProtectedDGRoute>
    ),
  }),
  withErrorElement({
    path: "/admin/staff",
    Component: () => (
      <ProtectedStaffRoute>
        <StaffDashboard />
      </ProtectedStaffRoute>
    ),
  }),
  withErrorElement({ path: "*", Component: NotFound }),
]);