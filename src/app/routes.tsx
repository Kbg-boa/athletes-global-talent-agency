import { createBrowserRouter } from "react-router";
import Home from "./pages/Home";
import AthleteProfile from "./pages/AthleteProfile";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/athlete/:id",
    Component: AthleteProfile,
  },
]);
