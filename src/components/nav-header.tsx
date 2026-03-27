"use client"

import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"

interface NavHeaderProps {
  title: string
  showMenu?: boolean
}

export function NavHeader({ title, showMenu }: NavHeaderProps) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  return (
    <header className="border-b-2 border-border bg-card shadow-md">
      <div className="flex items-center justify-between h-24 px-8">
        <div className="flex items-center gap-6">
          {/* Logo with Rectangle Background */}
          <div className="bg-white rounded-xl shadow-lg p-4 border-2 border-primary/20">
            <img
              src="/digicut-logo.png"
              alt="Digicut"
              className="h-14 w-auto"
            />
          </div>
          <div className="h-12 w-px bg-border" />
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{title}</h1>
        </div>
        <Button
          onClick={handleLogout}
          variant="outline"
          size="default"
          className="border-2 border-border text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive font-semibold transition-all shadow-sm hover:shadow-md"
        >
          <LogOut className="mr-2 h-5 w-5" />
          Logout
        </Button>
      </div>
    </header>
  )
}
