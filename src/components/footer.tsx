"use client"

import { Mail, Phone } from "lucide-react"

export function Footer() {
    return (
        <footer className="border-t border-border bg-card mt-auto">
            <div className="px-6 py-4">
                <div className="flex flex-col md:flex-row items-center justify-center gap-2 text-sm text-muted-foreground">
                    <span>Website developed by <span className="font-semibold text-foreground">Shahnawaz</span></span>
                    <span className="hidden md:inline">•</span>
                    <div className="flex items-center gap-4">
                        <a
                            href="mailto:harisshahnawaz47@gmail.com"
                            className="flex items-center gap-1 hover:text-accent transition-colors"
                        >
                            <Mail className="h-3.5 w-3.5" />
                            <span>harisshahnawaz47@gmail.com</span>
                        </a>
                        <span>•</span>
                        <a
                            href="tel:0302148208"
                            className="flex items-center gap-1 hover:text-accent transition-colors"
                        >
                            <Phone className="h-3.5 w-3.5" />
                            <span>0302148208</span>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    )
}
