import { Routes, Route } from "react-router-dom"
import { ProtectedRoute } from "@/components/protected-route"
import HomePage from "@/pages/Home"
import LoginPage from "@/pages/Login"
import BookerDashboard from "@/pages/BookerDashboard"
import DesignerDashboard from "@/pages/DesignerDashboard"
import OperatorDashboard from "@/pages/OperatorDashboard"
import AdminDashboard from "@/pages/AdminDashboard"

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/dashboard/booker"
        element={
          <ProtectedRoute allowedRoles={["booker"]}>
            <BookerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/designer"
        element={
          <ProtectedRoute allowedRoles={["designer"]}>
            <DesignerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/operator"
        element={
          <ProtectedRoute allowedRoles={["machine_operator"]}>
            <OperatorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default App
