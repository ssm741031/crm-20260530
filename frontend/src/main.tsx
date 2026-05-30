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
import Placeholder from "./pages/Placeholder";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/tasks" replace /> },
      { path: "tasks", element: <TasksPage /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "calendar", element: <Placeholder title="캘린더" /> },
      { path: "pipeline", element: <Placeholder title="청약 파이프라인" /> },
      { path: "categories", element: <Placeholder title="카테고리 관리" /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
