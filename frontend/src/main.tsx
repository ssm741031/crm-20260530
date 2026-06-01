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
import { registerSW } from "virtual:pwa-register";
import "./index.css";

// Sprint 15: PWA Service Worker 등록 (silent autoUpdate)
// 새 버전 배포 시 사용자가 다음 방문에서 자연스럽게 업데이트
registerSW({
  immediate: true,
  onNeedRefresh() {
    // 1차는 silent. Sprint 16 에서 토스트 안내 검토.
    console.log("[pwa] new version available — will auto-update on next reload");
  },
  onOfflineReady() {
    console.log("[pwa] offline ready");
  },
});

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
