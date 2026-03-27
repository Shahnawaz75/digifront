import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2, Lock, Mail } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Footer } from "@/components/footer"

export default function LoginPage() {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            await login(email, password)
            navigate("/")
        } catch (err) {
            setError("Invalid email or password")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex flex-col">
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    {/* Logo with Rectangle Background */}
                    <div className="mb-8 flex justify-center">
                        <div className="bg-white rounded-2xl shadow-2xl p-8 border-4 border-primary/20">
                            <img
                                src="/digicut-logo.png"
                                alt="Digicut"
                                className="h-28 w-auto"
                            />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">
                            Welcome Back
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Sign in to access your dashboard
                        </p>
                    </div>

                    {/* Login Card */}
                    <Card className="border-2 border-border shadow-2xl backdrop-blur-sm bg-card/95">
                        <CardHeader className="space-y-1 pb-4">
                            <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
                            <CardDescription className="text-base">
                                Enter your credentials to continue
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <Alert variant="destructive" className="border-2">
                                        <AlertCircle className="h-5 w-5" />
                                        <AlertDescription className="font-medium">{error}</AlertDescription>
                                    </Alert>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-foreground text-sm font-semibold">
                                        Email Address
                                    </Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            disabled={loading}
                                            className="h-12 pl-11 bg-input border-2 border-border text-foreground placeholder-muted-foreground focus:border-primary transition-colors"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-foreground text-sm font-semibold">
                                        Password
                                    </Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            disabled={loading}
                                            className="h-12 pl-11 bg-input border-2 border-border text-foreground placeholder-muted-foreground focus:border-primary transition-colors"
                                            required
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base mt-8 shadow-lg hover:shadow-xl transition-all"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        "Sign In"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <Footer />
        </div>
    )
}
