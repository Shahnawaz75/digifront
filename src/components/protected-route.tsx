"use client"

import type React from "react"
import { useAuth } from "@/lib/auth-context"
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ("booker" | "designer" | "machine_operator" | "admin")[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, role, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login")
    } else if (!loading && allowedRoles && role && !allowedRoles.includes(role)) {
      navigate("/")
    }
  }, [isAuthenticated, role, loading, navigate, allowedRoles])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return null
  }

  return <>{children}</>
}
