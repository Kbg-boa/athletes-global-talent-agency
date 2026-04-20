import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router"; // On importe le moteur de navigation
import { router } from "./routes.tsx";        // On importe tes routes (/admin, /login, etc.)
import { sanitizeUrlAtBoot } from "./lib/security";
import "./styles/index.css";

sanitizeUrlAtBoot();

// On dit à React d'utiliser le RouterProvider au lieu de charger juste <App />
createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />
);