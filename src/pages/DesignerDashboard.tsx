import type React from "react"
import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useSocket } from "@/lib/socket-context"
import apiClient from "@/lib/api-client"
import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Download, ExternalLink, Loader2, Upload, X, FileText } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

interface Booking {
    id: string
    customerName: string
    jobDescription: string
    departments: string[]
    urgency: boolean
    deliveryDate: string
    status: string
    createdAt: string
    designFiles?: string[]
    operatorDeadline?: string
}

interface BookingDetail extends Booking {
    customerContact: string
    materialConsume: string
    materialDetails: string
    jobDescription: string
    clientPicture?: string
    clientFile?: string
}

export default function DesignerDashboard() {
    const { role } = useAuth()
    const { socket } = useSocket()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)
    const designFilesRef = useRef<HTMLInputElement>(null)
    const [designFiles, setDesignFiles] = useState<FileList | null>(null)

    const [designFormData, setDesignFormData] = useState({
        operatorDeadline: "",
        operatorUrgency: false,
    })

    const [activeTab, setActiveTab] = useState("assigned")
    const [historyBookings, setHistoryBookings] = useState<Booking[]>([])
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

    useEffect(() => {
        if (!socket) return

        const handleUpdate = () => {
            console.log("Received booking update")
            const fetchBookings = async () => {
                try {
                    const response = await apiClient.get("/api/bookings/assigned")
                    const processedBookings = (response.data || []).map((b: any) => ({
                        ...b,
                        id: b.id || b._id
                    }))
                    setBookings(processedBookings)
                } catch (err) {
                    console.error("Failed to fetch bookings:", err)
                } finally {
                    setLoading(false)
                }
            }

            const fetchHistory = async () => {
                try {
                    const response = await apiClient.get(`/api/bookings/designer/history?month=${selectedMonth}&year=${selectedYear}`)
                    const processedBookings = (response.data || []).map((b: any) => ({
                        ...b,
                        id: b.id || b._id
                    }))
                    setHistoryBookings(processedBookings)
                } catch (err) {
                    console.error("Failed to fetch history:", err)
                }
            }

            if (activeTab === "assigned") {
                fetchBookings()
            } else {
                fetchHistory()
            }
        }

        socket.on("booking_created", handleUpdate)
        socket.on("booking_updated", handleUpdate)

        return () => {
            socket.off("booking_created", handleUpdate)
            socket.off("booking_updated", handleUpdate)
        }
    }, [socket, activeTab, selectedMonth, selectedYear])

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const response = await apiClient.get("/api/bookings/assigned")
                const processedBookings = (response.data || []).map((b: any) => ({
                    ...b,
                    id: b.id || b._id
                }))
                setBookings(processedBookings)
            } catch (err) {
                setError("Failed to fetch bookings")
            } finally {
                setLoading(false)
            }
        }

        const fetchHistory = async () => {
            try {
                const response = await apiClient.get(`/api/bookings/designer/history?month=${selectedMonth}&year=${selectedYear}`)
                const processedBookings = (response.data || []).map((b: any) => ({
                    ...b,
                    id: b.id || b._id
                }))
                setHistoryBookings(processedBookings)
            } catch (err) {
                console.error("Failed to fetch history:", err)
            }
        }

        if (role === "designer") {
            if (activeTab === "assigned") {
                fetchBookings()
            } else {
                fetchHistory()
            }
        }
    }, [role, activeTab, selectedMonth, selectedYear])

    const handleViewDetails = (booking: Booking) => {
        setSelectedBooking({ ...booking } as BookingDetail)
        setDesignFormData({
            operatorDeadline: "",
            operatorUrgency: false,
        })
        setDesignFiles(null)
        if (designFilesRef.current) designFilesRef.current.value = ""
    }

    const handleSubmitDesign = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedBooking) return

        setSubmitting(true)
        setError("")
        setSuccess(false)

        try {
            const form = new FormData()
            form.append("operatorDeadline", designFormData.operatorDeadline)
            form.append("operatorUrgency", designFormData.operatorUrgency.toString())

            if (designFilesRef.current?.files) {
                for (let i = 0; i < designFilesRef.current.files.length; i++) {
                    form.append("designFiles", designFilesRef.current.files[i])
                }
            }

            await apiClient.put(`/api/bookings/${selectedBooking.id}/design`, form, {
                headers: { "Content-Type": "multipart/form-data" },
            })

            setSuccess(true)
            setSelectedBooking(null)
            setSuccess(true)
            setSelectedBooking(null)
            // Remove the submitted booking from the list
            setBookings((prev) => prev.filter((b) => b.id !== selectedBooking.id))
            setTimeout(() => setSuccess(false), 3000)
            setTimeout(() => setSuccess(false), 3000)
        } catch (err) {
            setError("Failed to submit design")
        } finally {
            setSubmitting(false)
        }
    }

    const getUrgencyBadge = (urgency: boolean) => (
        <span
            className={`text-xs px-2 py-1 rounded-full ${urgency
                ? "bg-red-900/30 text-red-400 border border-red-500/30"
                : "bg-blue-900/30 text-blue-400 border border-blue-500/30"
                }`}
        >
            {urgency ? "Urgent" : "Normal"}
        </span>
    )

    if (role !== "designer") {
        return <div className="text-center p-8 text-destructive">Unauthorized</div>
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <NavHeader title="Designer Dashboard" />

            <main className="p-6 max-w-6xl mx-auto">
                {success && (
                    <Alert className="mb-6 bg-green-900/20 border-green-500/50">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-400">Design submitted to operator successfully!</AlertDescription>
                    </Alert>
                )}

                {error && (
                    <Alert variant="destructive" className="mb-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="assigned">Assigned Bookings</TabsTrigger>
                            <TabsTrigger value="history">Work History</TabsTrigger>
                        </TabsList>

                        {activeTab === "history" && (
                            <div className="flex gap-2">
                                <Select
                                    value={selectedMonth.toString()}
                                    onValueChange={(val) => setSelectedMonth(parseInt(val))}
                                >
                                    <SelectTrigger className="w-[140px] bg-card border-border">
                                        <SelectValue placeholder="Month" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                            <SelectItem key={m} value={m.toString()}>
                                                {new Date(0, m - 1).toLocaleString("default", { month: "long" })}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={selectedYear.toString()}
                                    onValueChange={(val) => setSelectedYear(parseInt(val))}
                                >
                                    <SelectTrigger className="w-[100px] bg-card border-border">
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[2024, 2025, 2026].map((y) => (
                                            <SelectItem key={y} value={y.toString()}>
                                                {y}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <TabsContent value="assigned" className="mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Bookings List */}
                            <div className="lg:col-span-1">
                                <Card className="border-border">
                                    <CardHeader>
                                        <CardTitle>Assigned Bookings</CardTitle>
                                        <CardDescription>{bookings.length} pending</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                                        {bookings.length === 0 ? (
                                            <p className="text-muted-foreground text-sm">No bookings assigned</p>
                                        ) : (
                                            bookings.map((booking) => (
                                                <button
                                                    key={booking.id}
                                                    onClick={() => handleViewDetails(booking)}
                                                    className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${selectedBooking?.id === booking.id
                                                        ? "border-accent bg-accent/10"
                                                        : "border-border bg-card hover:border-accent/50"
                                                        }`}
                                                >
                                                    <p className="font-semibold text-foreground text-sm mb-1">{booking.customerName}</p>
                                                    <p className="text-xs text-muted-foreground mb-1 truncate">{booking.jobDescription}</p>
                                                    <p className="text-[10px] text-muted-foreground mb-2">
                                                        Created: {new Date(booking.createdAt).toLocaleDateString()}
                                                    </p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-muted-foreground">{booking.departments.join(", ")}</span>
                                                        {getUrgencyBadge(booking.urgency)}
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Booking Details */}
                            <div className="lg:col-span-2">
                                {selectedBooking ? (
                                    <Card className="border-border">
                                        <CardHeader className="flex flex-row items-start justify-between">
                                            <div>
                                                <CardTitle>{selectedBooking.customerName}</CardTitle>
                                                <CardDescription>Booking Details</CardDescription>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedBooking(null)}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {/* Booking Info */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-muted-foreground text-sm">Contact</Label>
                                                    <p className="text-foreground font-medium">{selectedBooking.customerContact}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground text-sm">Delivery Date</Label>
                                                    <p className="text-foreground font-medium">
                                                        {new Date(selectedBooking.deliveryDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground text-sm">Created At</Label>
                                                    <p className="text-foreground font-medium">
                                                        {new Date(selectedBooking.createdAt).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div className="col-span-2">
                                                    <Label className="text-muted-foreground text-sm">Departments</Label>
                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                        {selectedBooking.departments.map((dept) => (
                                                            <span key={dept} className="px-3 py-1 bg-primary/10 text-primary rounded text-sm">
                                                                {dept}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="col-span-2">
                                                    <Label className="text-muted-foreground text-sm">Job Description</Label>
                                                    <p className="text-foreground mt-2">{selectedBooking.jobDescription}</p>
                                                </div>

                                                {/* Client Files Section */}
                                                <div className="col-span-2 border-t border-border pt-4">
                                                    <Label className="text-muted-foreground text-sm mb-3 block">Client Files</Label>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {selectedBooking.clientPicture && (
                                                            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded bg-background flex items-center justify-center overflow-hidden border border-border">
                                                                        <img
                                                                            src={`${API_URL}/${selectedBooking.clientPicture}`}
                                                                            alt="Client Pic"
                                                                            className="w-full h-full object-cover"
                                                                            onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/40?text=IMG')}
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-medium text-foreground">Client Picture</p>
                                                                        <p className="text-[10px] text-muted-foreground">Image file</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Button size="icon" variant="ghost" asChild className="h-8 w-8">
                                                                        <a href={`${API_URL}/${selectedBooking.clientPicture}`} target="_blank" rel="noreferrer">
                                                                            <ExternalLink className="h-4 w-4" />
                                                                        </a>
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" asChild className="h-8 w-8">
                                                                        <a href={`${API_URL}/${selectedBooking.clientPicture}`} download>
                                                                            <Download className="h-4 w-4" />
                                                                        </a>
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {selectedBooking.clientFile && (
                                                            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-10 h-10 rounded bg-background flex items-center justify-center border border-border">
                                                                        <Upload className="h-5 w-5 text-muted-foreground" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs font-medium text-foreground">Client Document</p>
                                                                        <p className="text-[10px] text-muted-foreground">Project file</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Button size="icon" variant="ghost" asChild className="h-8 w-8">
                                                                        <a href={`${API_URL}/${selectedBooking.clientFile}`} target="_blank" rel="noreferrer">
                                                                            <ExternalLink className="h-4 w-4" />
                                                                        </a>
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" asChild className="h-8 w-8">
                                                                        <a href={`${API_URL}/${selectedBooking.clientFile}`} download>
                                                                            <Download className="h-4 w-4" />
                                                                        </a>
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {!selectedBooking.clientPicture && !selectedBooking.clientFile && (
                                                            <p className="text-xs text-muted-foreground italic">No files provided by client</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="border-t border-border pt-4">
                                                <h3 className="font-semibold text-foreground mb-4">Submit Design</h3>

                                                <form onSubmit={handleSubmitDesign} className="space-y-4">
                                                    {/* Design Files */}
                                                    <div>
                                                        <Label className="text-foreground">Design Files</Label>
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <Input
                                                                ref={designFilesRef}
                                                                type="file"
                                                                multiple
                                                                accept=".pdf,.dwg,.dxf,.step,.iges"
                                                                className="bg-input border-border hidden"
                                                                onChange={(e) => setDesignFiles(e.target.files)}
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                onClick={() => designFilesRef.current?.click()}
                                                                className="border-border bg-secondary text-foreground hover:bg-secondary/80"
                                                            >
                                                                <Upload className="h-4 w-4 mr-2" />
                                                                Choose Files
                                                            </Button>
                                                            <span className="text-sm text-muted-foreground">
                                                                {designFiles?.length
                                                                    ? `${designFiles.length} file(s) selected`
                                                                    : "No files selected"}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Operator Deadline */}
                                                    <div>
                                                        <Label className="text-foreground">Operator Deadline</Label>
                                                        <Input
                                                            type="datetime-local"
                                                            value={designFormData.operatorDeadline}
                                                            onChange={(e) =>
                                                                setDesignFormData((prev) => ({
                                                                    ...prev,
                                                                    operatorDeadline: e.target.value,
                                                                }))
                                                            }
                                                            className="mt-2 bg-input border-border"
                                                            required
                                                        />
                                                    </div>

                                                    {/* Operator Urgency */}
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={designFormData.operatorUrgency}
                                                            onChange={(e) =>
                                                                setDesignFormData((prev) => ({
                                                                    ...prev,
                                                                    operatorUrgency: e.target.checked,
                                                                }))
                                                            }
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="text-foreground font-medium">Mark as Urgent for Operator</span>
                                                    </label>

                                                    <Button
                                                        type="submit"
                                                        disabled={submitting || !designFiles || designFiles.length === 0 || !designFormData.operatorDeadline}
                                                        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {submitting ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                Submitting...
                                                            </>
                                                        ) : (
                                                            "Send to Operator"
                                                        )}
                                                    </Button>
                                                </form>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card className="border-border">
                                        <CardContent className="pt-6">
                                            <p className="text-center text-muted-foreground">
                                                Select a booking to view details and submit design
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="history" className="mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* History List */}
                            <div className="lg:col-span-1">
                                <Card className="border-border">
                                    <CardHeader>
                                        <CardTitle>Completed Designs</CardTitle>
                                        <CardDescription>{historyBookings.length} items found</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                                        {historyBookings.length === 0 ? (
                                            <p className="text-muted-foreground text-sm">No history found for this period</p>
                                        ) : (
                                            historyBookings.map((booking) => (
                                                <button
                                                    key={booking.id}
                                                    onClick={() => handleViewDetails(booking)}
                                                    className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${selectedBooking?.id === booking.id
                                                        ? "border-accent bg-accent/10"
                                                        : "border-border bg-card hover:border-accent/50"
                                                        }`}
                                                >
                                                    <p className="font-semibold text-foreground text-sm mb-1">{booking.customerName}</p>
                                                    <p className="text-xs text-muted-foreground mb-1 truncate">{booking.jobDescription}</p>
                                                    <p className="text-[10px] text-muted-foreground mb-2">
                                                        Submitted: {new Date(booking.createdAt).toLocaleDateString()}
                                                    </p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-muted-foreground">{booking.departments.join(", ")}</span>
                                                        <span className="text-xs px-3 py-1.5 rounded-md bg-green-600 text-white border border-green-700 font-semibold">
                                                            Completed
                                                        </span>
                                                    </div>
                                                </button>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* History Details */}
                            <div className="lg:col-span-2">
                                {selectedBooking ? (
                                    <Card className="border-border">
                                        <CardHeader className="flex flex-row items-start justify-between">
                                            <div>
                                                <CardTitle>{selectedBooking.customerName}</CardTitle>
                                                <CardDescription>Historical Record</CardDescription>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedBooking(null)}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {/* Basic Info */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-muted-foreground text-sm">Contact</Label>
                                                    <p className="text-foreground font-medium">{selectedBooking.customerContact}</p>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground text-sm">Delivery Date</Label>
                                                    <p className="text-foreground font-medium">
                                                        {new Date(selectedBooking.deliveryDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="col-span-2">
                                                    <Label className="text-muted-foreground text-sm">Job Description</Label>
                                                    <p className="text-foreground mt-2">{selectedBooking.jobDescription}</p>
                                                </div>
                                            </div>

                                            {/* Submitted Design Files */}
                                            <div className="border-t border-border pt-4">
                                                <Label className="text-muted-foreground text-sm mb-3 block">Submitted Design Files</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedBooking.designFiles && selectedBooking.designFiles.length > 0 ? (
                                                        selectedBooking.designFiles.map((file, idx) => (
                                                            <Button key={idx} variant="outline" size="sm" asChild>
                                                                <a href={`${API_URL}/${file}`} target="_blank" rel="noreferrer">
                                                                    <FileText className="h-4 w-4 mr-2" />
                                                                    Design File {idx + 1}
                                                                </a>
                                                            </Button>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm text-muted-foreground italic">No design files found</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Client Files */}
                                            <div className="border-t border-border pt-4">
                                                <Label className="text-muted-foreground text-sm mb-3 block">Client Files</Label>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedBooking.clientFile && (
                                                        <Button variant="outline" size="sm" asChild>
                                                            <a href={`${API_URL}/${selectedBooking.clientFile}`} target="_blank" rel="noreferrer">
                                                                <Download className="h-4 w-4 mr-2" />
                                                                Client File
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {selectedBooking.clientPicture && (
                                                        <Button variant="outline" size="sm" asChild>
                                                            <a href={`${API_URL}/${selectedBooking.clientPicture}`} target="_blank" rel="noreferrer">
                                                                <ExternalLink className="h-4 w-4 mr-2" />
                                                                Client Picture
                                                            </a>
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card className="border-border">
                                        <CardContent className="pt-6">
                                            <p className="text-center text-muted-foreground">
                                                Select a completed job to view details
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
            <Footer />
        </div>
    )
}
