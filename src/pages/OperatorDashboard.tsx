import { useEffect, useState, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useSocket } from "@/lib/socket-context"
import apiClient from "@/lib/api-client"
import { NavHeader } from "@/components/nav-header"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, CheckCircle, Clock, Loader2, Play, Square, Download, ExternalLink, FileText, Image, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"

interface Job {
    id: string
    customerName: string
    departments: string[]
    jobDescription: string
    operatorDeadline: string
    operatorUrgency: string
    status: "production" | "in_progress" | "completed"
    clientFile?: string
    clientPicture?: string
    designFiles?: string[]
    deliveryDate: string
}

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

export default function OperatorDashboard() {
    const { role } = useAuth()
    const { socket } = useSocket()
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")

    const [activeTab, setActiveTab] = useState("active")
    const [historyJobs, setHistoryJobs] = useState<Job[]>([])
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [selectedHistoryJob, setSelectedHistoryJob] = useState<Job | null>(null)

    const fetchJobs = useCallback(async () => {
        try {
            console.log("Fetching production jobs...")
            const response = await apiClient.get("/api/bookings/production")
            console.log("Raw API response:", response.data)
            // Ensure each job has an 'id' property, falling back to '_id'
            const processedJobs = (response.data || []).map((j: any) => ({
                ...j,
                id: j.id || j._id
            }))
            console.log("Processed jobs:", processedJobs)
            setJobs(processedJobs)
        } catch (err) {
            console.error("Error fetching jobs:", err)
            setError("Failed to fetch jobs")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (!socket) return

        const handleUpdate = () => {
            console.log("Received booking update")
            fetchJobs()

            const fetchHistory = async () => {
                try {
                    const response = await apiClient.get(`/api/bookings/operator/history?month=${selectedMonth}&year=${selectedYear}`)
                    const processedJobs = (response.data || []).map((j: any) => ({
                        ...j,
                        id: j.id || j._id
                    }))
                    setHistoryJobs(processedJobs)
                } catch (err) {
                    console.error("Error fetching history:", err)
                }
            }
            fetchHistory()
        }

        socket.on("booking_created", handleUpdate)
        socket.on("booking_updated", handleUpdate)

        return () => {
            socket.off("booking_created", handleUpdate)
            socket.off("booking_updated", handleUpdate)
        }
    }, [socket, fetchJobs, selectedMonth, selectedYear])

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = await apiClient.get(`/api/bookings/operator/history?month=${selectedMonth}&year=${selectedYear}`)
                const processedJobs = (response.data || []).map((j: any) => ({
                    ...j,
                    id: j.id || j._id
                }))
                setHistoryJobs(processedJobs)
            } catch (err) {
                console.error("Error fetching history:", err)
            }
        }

        if (role === "machine_operator") {
            if (activeTab === "active") {
                fetchJobs()
            } else {
                fetchHistory()
            }
        }
    }, [role, activeTab, selectedMonth, selectedYear, fetchJobs])

    const handleStartWork = async (jobId: string) => {
        console.log("Starting work on job:", jobId)
        setActionLoading(jobId)
        setError("")
        setSuccess("")

        try {
            await apiClient.put(`/api/bookings/${jobId}/start`)
            // Refresh jobs to ensure state is synced
            await fetchJobs()
            setSuccess("Work started successfully!")
            setTimeout(() => setSuccess(""), 3000)
        } catch (err) {
            console.error("Failed to start work:", err)
            setError("Failed to start work")
        } finally {
            setActionLoading(null)
        }
    }

    const handleEndWork = async (jobId: string) => {
        console.log("Ending work on job:", jobId)
        setActionLoading(jobId)
        setError("")
        setSuccess("")

        try {
            await apiClient.put(`/api/bookings/${jobId}/end`)
            // Refresh jobs to ensure state is synced
            await fetchJobs()
            setSuccess("Work completed successfully!")
            setTimeout(() => setSuccess(""), 3000)
        } catch (err) {
            console.error("Failed to complete work:", err)
            setError("Failed to complete work")
        } finally {
            setActionLoading(null)
        }
    }

    const getStatusBadge = (status: Job["status"]) => {
        const styles = {
            production: "bg-yellow-500 text-gray-900 border-yellow-600",
            in_progress: "bg-blue-600 text-white border-blue-700",
            completed: "bg-green-600 text-white border-green-700",
        }
        const labels = {
            production: "Pending",
            in_progress: "In Progress",
            completed: "Completed",
        }

        return <span className={`text-xs px-3 py-1 rounded-full border ${styles[status]}`}>{labels[status]}</span>
    }

    const getUrgencyBadge = (urgent: string) => (
        <span
            className={`text-xs px-2 py-1 rounded-full ${urgent === 'urgent'
                ? "bg-red-900/30 text-red-400 border border-red-500/30"
                : "bg-muted text-muted-foreground border border-border"
                }`}
        >
            {urgent === 'urgent' ? "Urgent" : "Normal"}
        </span>
    )

    if (role !== "machine_operator") {
        return <div className="text-center p-8 text-destructive">Unauthorized</div>
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    // Categorize jobs (treat 'production' status as pending)
    console.log("All jobs received:", jobs)
    console.log("Jobs count:", jobs.length)

    const pendingJobs = jobs.filter((j) => j.status === "production").sort((a, b) => (b.operatorUrgency === 'urgent' ? 1 : -1))
    const inProgressJobs = jobs.filter((j) => j.status === "in_progress")
    const completedJobs = jobs.filter((j) => j.status === "completed")

    console.log("Pending jobs:", pendingJobs)
    console.log("In Progress jobs:", inProgressJobs)
    console.log("Completed jobs:", completedJobs)

    return (
        <div className="min-h-screen bg-background">
            <NavHeader title="Machine Operator Dashboard" />

            <main className="p-6 max-w-6xl mx-auto">
                {success && (
                    <Alert className="mb-6 bg-green-900/20 border-green-500/50">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-green-400">{success}</AlertDescription>
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
                            <TabsTrigger value="active">Active Jobs</TabsTrigger>
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

                    <TabsContent value="active" className="mt-0 space-y-8">
                        {/* Pending Jobs */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-foreground mb-4">Pending Jobs ({pendingJobs.length})</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {pendingJobs.length === 0 ? (
                                    <Card className="border-border col-span-full">
                                        <CardContent className="pt-6">
                                            <p className="text-center text-muted-foreground">No pending jobs</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    pendingJobs.map((job) => (
                                        <Card key={job.id} className="border-border hover:border-accent/50 transition-colors">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <CardTitle className="text-lg">{job.customerName}</CardTitle>
                                                        <CardDescription className="text-xs mt-1">{job.departments.join(", ")}</CardDescription>
                                                    </div>
                                                    {getUrgencyBadge(job.operatorUrgency)}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <p className="text-sm text-foreground line-clamp-2">{job.jobDescription}</p>

                                                <div className="space-y-2">
                                                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                                                        <Clock className="h-4 w-4 text-accent" />
                                                        <span className="font-medium text-accent">Designer Deadline: {new Date(job.operatorDeadline).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                                                        <Clock className="h-4 w-4" />
                                                        <span>Customer Deadline: {new Date(job.deliveryDate).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                {/* Files Section */}
                                                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                                                    {job.clientFile && (
                                                        <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                                                            <a href={`${API_URL}/${job.clientFile}`} target="_blank" rel="noreferrer">
                                                                <FileText className="h-3 w-3 mr-1" /> Customer File
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {job.clientPicture && (
                                                        <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                                                            <a href={`${API_URL}/${job.clientPicture}`} target="_blank" rel="noreferrer">
                                                                <Image className="h-3 w-3 mr-1" /> Customer Pic
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {job.designFiles && job.designFiles.length > 0 && job.designFiles.map((file, idx) => (
                                                        <Button key={idx} variant="outline" size="sm" className="h-8 text-xs border-accent/50 text-accent" asChild>
                                                            <a href={`${API_URL}/${file}`} target="_blank" rel="noreferrer">
                                                                <ExternalLink className="h-3 w-3 mr-1" /> Design File {idx + 1}
                                                            </a>
                                                        </Button>
                                                    ))}
                                                </div>

                                                <Button
                                                    onClick={() => handleStartWork(job.id)}
                                                    disabled={actionLoading === job.id}
                                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                                                >
                                                    {actionLoading === job.id ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Starting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="mr-2 h-4 w-4" />
                                                            Start Work
                                                        </>
                                                    )}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* In Progress Jobs */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-foreground mb-4">In Progress ({inProgressJobs.length})</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {inProgressJobs.length === 0 ? (
                                    <Card className="border-border col-span-full">
                                        <CardContent className="pt-6">
                                            <p className="text-center text-muted-foreground">No jobs in progress</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    inProgressJobs.map((job) => (
                                        <Card key={job.id} className="border-accent/30 bg-accent/5 hover:border-accent/50 transition-colors">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <CardTitle className="text-lg">{job.customerName}</CardTitle>
                                                        <CardDescription className="text-xs mt-1">{job.departments.join(", ")}</CardDescription>
                                                    </div>
                                                    {getStatusBadge(job.status)}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="space-y-3">
                                                <p className="text-sm text-foreground line-clamp-2">{job.jobDescription}</p>

                                                <div className="space-y-2">
                                                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                                                        <Clock className="h-4 w-4 text-accent" />
                                                        <span className="font-medium text-accent">Designer Deadline: {new Date(job.operatorDeadline).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center text-xs text-muted-foreground gap-2">
                                                        <Clock className="h-4 w-4" />
                                                        <span>Customer Deadline: {new Date(job.deliveryDate).toLocaleDateString()}</span>
                                                    </div>
                                                </div>

                                                {/* Files Section */}
                                                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                                                    {job.clientFile && (
                                                        <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                                                            <a href={`${API_URL}/${job.clientFile}`} target="_blank" rel="noreferrer">
                                                                <FileText className="h-3 w-3 mr-1" /> Customer File
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {job.clientPicture && (
                                                        <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
                                                            <a href={`${API_URL}/${job.clientPicture}`} target="_blank" rel="noreferrer">
                                                                <Image className="h-3 w-3 mr-1" /> Customer Pic
                                                            </a>
                                                        </Button>
                                                    )}
                                                    {job.designFiles && job.designFiles.length > 0 && job.designFiles.map((file, idx) => (
                                                        <Button key={idx} variant="outline" size="sm" className="h-8 text-xs border-accent/50 text-accent" asChild>
                                                            <a href={`${API_URL}/${file}`} target="_blank" rel="noreferrer">
                                                                <ExternalLink className="h-3 w-3 mr-1" /> Design File {idx + 1}
                                                            </a>
                                                        </Button>
                                                    ))}
                                                </div>

                                                <Button
                                                    onClick={() => handleEndWork(job.id)}
                                                    disabled={actionLoading === job.id}
                                                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                                                >
                                                    {actionLoading === job.id ? (
                                                        <>
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            Completing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Square className="mr-2 h-4 w-4" />
                                                            Mark Complete
                                                        </>
                                                    )}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Completed Jobs */}
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-4">Completed ({completedJobs.length})</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {completedJobs.length === 0 ? (
                                    <Card className="border-border col-span-full">
                                        <CardContent className="pt-6">
                                            <p className="text-center text-muted-foreground">No completed jobs</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    completedJobs.map((job) => (
                                        <Card key={job.id} className="border-green-500/30 bg-green-900/5 opacity-75">
                                            <CardHeader className="pb-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <CardTitle className="text-lg">{job.customerName}</CardTitle>
                                                        <CardDescription className="text-xs mt-1">{job.departments.join(", ")}</CardDescription>
                                                    </div>
                                                    {getStatusBadge(job.status)}
                                                </div>
                                            </CardHeader>
                                            <CardContent>
                                                <p className="text-sm text-foreground line-clamp-2">{job.jobDescription}</p>
                                            </CardContent>
                                        </Card>
                                    ))
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
                                        <CardTitle>Completed Jobs</CardTitle>
                                        <CardDescription>{historyJobs.length} items found</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                                        {historyJobs.length === 0 ? (
                                            <p className="text-muted-foreground text-sm">No history found for this period</p>
                                        ) : (
                                            historyJobs.map((job) => (
                                                <button
                                                    key={job.id}
                                                    onClick={() => setSelectedHistoryJob(job)}
                                                    className={`w-full p-3 rounded-lg border-2 text-left transition-colors ${selectedHistoryJob?.id === job.id
                                                        ? "border-accent bg-accent/10"
                                                        : "border-border bg-card hover:border-accent/50"
                                                        }`}
                                                >
                                                    <p className="font-semibold text-foreground text-sm mb-1">{job.customerName}</p>
                                                    <p className="text-xs text-muted-foreground mb-1 truncate">{job.jobDescription}</p>
                                                    <p className="text-[10px] text-muted-foreground mb-2">
                                                        Completed: {new Date(job.deliveryDate).toLocaleDateString()}
                                                    </p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-muted-foreground">{job.departments.join(", ")}</span>
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
                                {selectedHistoryJob ? (
                                    <Card className="border-border">
                                        <CardHeader className="flex flex-row items-start justify-between">
                                            <div>
                                                <CardTitle>{selectedHistoryJob.customerName}</CardTitle>
                                                <CardDescription>Historical Record</CardDescription>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedHistoryJob(null)}
                                                className="text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="space-y-6">
                                            {/* Basic Info */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label className="text-muted-foreground text-sm">Departments</Label>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {selectedHistoryJob.departments.map((dept) => (
                                                            <span key={dept} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                                                                {dept}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <Label className="text-muted-foreground text-sm">Delivery Date</Label>
                                                    <p className="text-foreground font-medium">
                                                        {new Date(selectedHistoryJob.deliveryDate).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="col-span-2">
                                                    <Label className="text-muted-foreground text-sm">Job Description</Label>
                                                    <p className="text-foreground mt-2">{selectedHistoryJob.jobDescription}</p>
                                                </div>
                                            </div>

                                            {/* Files Section */}
                                            <div className="border-t border-border pt-4">
                                                <Label className="text-muted-foreground text-sm mb-3 block">Job Files</Label>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {selectedHistoryJob.clientPicture && (
                                                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded bg-background flex items-center justify-center overflow-hidden border border-border">
                                                                    <img
                                                                        src={`${API_URL}/${selectedHistoryJob.clientPicture}`}
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
                                                                    <a href={`${API_URL}/${selectedHistoryJob.clientPicture}`} target="_blank" rel="noreferrer">
                                                                        <ExternalLink className="h-4 w-4" />
                                                                    </a>
                                                                </Button>
                                                                <Button size="icon" variant="ghost" asChild className="h-8 w-8">
                                                                    <a href={`${API_URL}/${selectedHistoryJob.clientPicture}`} download>
                                                                        <Download className="h-4 w-4" />
                                                                    </a>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {selectedHistoryJob.clientFile && (
                                                        <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 rounded bg-background flex items-center justify-center border border-border">
                                                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-medium text-foreground">Client Document</p>
                                                                    <p className="text-[10px] text-muted-foreground">Project file</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2">
                                                                <Button size="icon" variant="ghost" asChild className="h-8 w-8">
                                                                    <a href={`${API_URL}/${selectedHistoryJob.clientFile}`} target="_blank" rel="noreferrer">
                                                                        <ExternalLink className="h-4 w-4" />
                                                                    </a>
                                                                </Button>
                                                                <Button size="icon" variant="ghost" asChild className="h-8 w-8">
                                                                    <a href={`${API_URL}/${selectedHistoryJob.clientFile}`} download>
                                                                        <Download className="h-4 w-4" />
                                                                    </a>
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {selectedHistoryJob.designFiles && selectedHistoryJob.designFiles.length > 0 && (
                                                    <div className="mt-4">
                                                        <Label className="text-muted-foreground text-sm mb-3 block">Design Files</Label>
                                                        <div className="flex flex-wrap gap-2">
                                                            {selectedHistoryJob.designFiles.map((file, idx) => (
                                                                <Button key={idx} variant="outline" size="sm" className="border-accent/50 text-accent" asChild>
                                                                    <a href={`${API_URL}/${file}`} target="_blank" rel="noreferrer">
                                                                        <ExternalLink className="h-4 w-4 mr-1" /> Design File {idx + 1}
                                                                    </a>
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {!selectedHistoryJob.clientFile && !selectedHistoryJob.clientPicture && (!selectedHistoryJob.designFiles || selectedHistoryJob.designFiles.length === 0) && (
                                                    <p className="text-sm text-muted-foreground italic">No files associated with this job</p>
                                                )}
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
