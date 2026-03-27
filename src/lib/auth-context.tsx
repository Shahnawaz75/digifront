

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

interface AuthContextType {
  isAuthenticated: boolean
  role: "booker" | "designer" | "machine_operator" | "admin" | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [role, setRole] = useState<"booker" | "designer" | "machine_operator" | "admin" | null>(null)
  const [loading, setLoading] = useState(true)

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem("token")
    const storedRole = localStorage.getItem("role") as "booker" | "designer" | "machine_operator" | "admin" | null
    if (token && storedRole) {
      setIsAuthenticated(true)
      setRole(storedRole)
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error("Login failed")
      }

      const data = await response.json()
      localStorage.setItem("token", data.token)
      localStorage.setItem("role", data.role)
      setIsAuthenticated(true)
      setRole(data.role)
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("role")
    setIsAuthenticated(false)
    setRole(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, role, loading, login, logout }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
