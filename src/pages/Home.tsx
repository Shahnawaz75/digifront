import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function HomePage() {
    const { isAuthenticated, role, loading } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!loading) {
            if (isAuthenticated) {
                if (role === "booker") navigate("/dashboard/booker")
                else if (role === "designer") navigate("/dashboard/designer")
                else if (role === "machine_operator") navigate("/dashboard/operator")
                else if (role === "admin") navigate("/dashboard/admin")
                else navigate("/login") // Should not happen if authenticated
            } else {
                navigate("/login")
            }
        }
    }, [isAuthenticated, loading, role, navigate])

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
}
