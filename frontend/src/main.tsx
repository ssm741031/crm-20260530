import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import AppShell from "./app/AppShell";
import TasksPage from "./pages/TasksPage";
import CustomersPage from "./pages/CustomersPage";
import CategoriesPage from "./pages/CategoriesPage";
import CalendarPage from "./pages/CalendarPage";
import HabitsPage from "./pages/HabitsPage";
import PipelinePage from "./pages/PipelinePage";
import ActivityPage from "./pages/ActivityPage";
import NoticeLogsPage from "./pages/NoticeLogsPage";
import SearchPage from "./pages/SearchPage";
import LoginPage from "./pages/LoginPage";
import { AuthProvider } from "./contexts/AuthContext";
import RequireAuth from "./components/RequireAuth";
import "./index.css";

// Sprint 12: 고보험 서버 /crm 패스 서브배포 — basename 적용
// Sprint 13: AuthProvider + /login + RequireAuth 로 보호 라우트 감싸기
const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    {
      path: "/",
      element: (
        <RequireAuth>
          <AppShell />
        </RequireAuth>
      ),
      children: [
        { index: true, element: <Navigate to="/tasks" replace /> },
        { path: "tasks", element: <TasksPage /> },
        { path: "customers", element: <CustomersPage /> },
        { path: "calendar", element: <CalendarPage /> },
        { path: "habits", element: <HabitsPage /> },
        { path: "pipeline", element: <PipelinePage /> },
        { path: "activity", element: <ActivityPage /> },
        { path: "notices", element: <NoticeLogsPage /> },
        { path: "categories", element: <CategoriesPage /> },
        { path: "search", element: <SearchPage /> },
      ],
    },
  ],
  { basename: "/crm" },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
);
