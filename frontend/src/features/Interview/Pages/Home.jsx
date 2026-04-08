import React,{useEffect,useState,useRef} from 'react'
import "../Style/home.scss"
import { useInterview } from '../hooks/useInterview'
import {useNavigate} from 'react-router'
import { useAuth } from '../../auth/hooks/useAuth'

function getScoreTone(score) {
    if (score >= 80) return "strong"
    if (score >= 60) return "steady"
    return "early"
}

function getScoreLabel(score) {
    if (score >= 80) return "Strong fit"
    if (score >= 60) return "Promising"
    return "Needs work"
}

function Home() {
    const {loading,reports,generateReport,getReports,removeReport} = useInterview()
    const { user, handelLogout } = useAuth()
    const [jobDescription,setjobDescription] = useState("")
    const [selfDescription,setselfDescription] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [recentErrorMessage, setRecentErrorMessage] = useState("")
    const [selectedResumeName, setSelectedResumeName] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)
    const resumeInputRef = useRef()
    const navigate = useNavigate()

    useEffect(() => {
        const loadReports = async () => {
            try {
                setRecentErrorMessage("")
                await getReports()
            } catch (error) {
                setRecentErrorMessage(
                    error.response?.data?.message || "Unable to load recent reports."
                )
            }
        }

        loadReports()
    }, [getReports])

    const handleGenrateReport =async () => {
        const resumeFile = resumeInputRef.current?.files?.[0]
        setErrorMessage("")

        if (!jobDescription.trim()) {
            setErrorMessage("Please add the target job description.")
            return
        }

        if (!resumeFile && !selfDescription.trim()) {
            setErrorMessage("Please upload a resume or add a self description.")
            return
        }

        try {
            setIsGenerating(true)
            const data = await generateReport({jobDescription,selfDescription,resumeFile})
            navigate(`/interview/${data._id}`)
        } catch (error) {
            setErrorMessage(error.response?.data?.message || "Unable to generate the interview strategy.")
        } finally {
            setIsGenerating(false)
        }
    }

    const handleResumeChange = (event) => {
        const file = event.target.files?.[0]
        setSelectedResumeName(file ? file.name : "")
    }

    const handleDeleteReport = async (event, reportId) => {
        event.stopPropagation()

        try {
            await removeReport(reportId)
        } catch (error) {
            setRecentErrorMessage(
                error.response?.data?.message || "Unable to delete the report."
            )
        }
    }

    const handleLogout = async () => {
        try {
            setIsLoggingOut(true)
            await handelLogout()
            navigate("/login")
        } finally {
            setIsLoggingOut(false)
        }
    }

    return (
        <main className="home">
            <section className="session-bar">
                <div className="session-copy">
                    <span className="session-kicker">Signed in</span>
                    <strong>{user?.username || user?.email || "Workspace user"}</strong>
                </div>
                <button
                    type="button"
                    className="session-action-btn"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                >
                    {isLoggingOut ? "Logging out..." : "Logout"}
                </button>
            </section>

            <section className="hero">
                <div className="hero-copy">
                    <span className="eyebrow">Interview Prep Studio</span>
                    <h1>
                        Build a sharper interview strategy for your <span>next role</span>
                    </h1>
                    <p>
                        Turn a job description and your profile into a focused plan with tailored questions,
                        skill-gap analysis, roadmap guidance, and a role-aligned resume PDF.
                    </p>
                    <div className="hero-note" role="note">
                        Add all available fields, including the job description, resume, and self description, for the best results.
                    </div>
                </div>

                <div className="hero-stats">
                    <div className="hero-stat-card">
                        <span className="hero-stat-label">What you get</span>
                        <strong>Questions, roadmap, score, resume PDF</strong>
                    </div>
                    <div className="hero-stat-card">
                        <span className="hero-stat-label">Best input mix</span>
                        <strong>Job description + resume + self description</strong>
                    </div>
                    <div className="hero-stat-card">
                        <span className="hero-stat-label">Output quality</span>
                        <strong>Stronger when the role details are specific</strong>
                    </div>
                </div>
            </section>

            {/* MAIN CARD */}
            <section className="workspace-shell">
            <div className="card">
                {isGenerating && (
                    <div className="generation-overlay" role="status" aria-live="polite">
                        <div className="generation-loader" aria-hidden="true"></div>
                        <h2>Building your interview plan</h2>
                        <p>
                            Good things take a moment. We are analyzing your profile and role details to generate a stronger report.
                        </p>
                    </div>
                )}

                {/* LEFT */}
                <div className="panel left">
                    <div className="panel-heading">
                        <div className="panel-title">
                            <p>Target Job Description</p>
                            <span className="badge">Required</span>
                        </div>
                        <span className="panel-helper">
                            Paste the full JD so the plan matches the role expectations, tools, and interview depth.
                        </span>
                    </div>

                    <textarea
                    onChange={(e)=> {setjobDescription(e.target.value)}}
                        placeholder="Paste job description here..."
                    />
                </div>

                {/* RIGHT */}
                <div className="panel right">
                    <div className="section">
                        <div className="panel-heading">
                            <div className="panel-title">
                                <p>Your Profile</p>
                            </div>
                            <span className="panel-helper">
                                Upload a resume, add a short summary, or use both for a more reliable report.
                            </span>
                        </div>

                        {/* FILE UPLOAD */}
                        <label className={`upload-box ${selectedResumeName ? "selected" : ""}`}>
                            <input
                                ref={resumeInputRef}
                                type="file"
                                accept="application/pdf"
                                hidden
                                onChange={handleResumeChange}
                            />
                            <div>
                                <p>{selectedResumeName || "Upload your resume PDF"}</p>
                                <span>{selectedResumeName ? "PDF selected and ready to use" : "Drag, drop, or click. PDF only."}</span>
                            </div>
                        </label>
                    </div>

                    <div className="divider"><span>or</span></div>

                    {/* SELF DESCRIPTION */}
                    <div className="section">
                        <label>Quick Self Description</label>
                        <textarea 
                        onChange={(e)=> {setselfDescription(e.target.value)}}
                        placeholder="Briefly describe yourself..." />
                    </div>

                    <div className="info-box">
                        Either resume or self description is required. Adding both usually gives better results.
                    </div>

                    {errorMessage && (
                        <div className="status-banner error" role="alert">
                            {errorMessage}
                        </div>
                    )}

                    <button 
                    onClick={handleGenrateReport}
                    disabled={loading || isGenerating}
                    className="generate-btn">
                        {isGenerating ? "Generating..." : "Generate Interview Strategy"}
                    </button>

                </div>
            </div>
            </section>

            <section className="recent-reports">
                <div className="section-heading">
                    <div>
                        <h2>Recent Reports</h2>
                        <p>Jump back into your latest interview plans and keep iterating on stronger applications.</p>
                    </div>
                </div>

                {recentErrorMessage && (
                    <div className="status-banner error" role="alert">
                        {recentErrorMessage}
                    </div>
                )}

                {!recentErrorMessage && reports.length === 0 && (
                    <div className="empty-reports">
                        Your generated interview reports will appear here.
                    </div>
                )}

                <div className="reports-grid">
                    {reports.slice(0, 6).map((reportItem) => (
                        <article
                            key={reportItem._id}
                            className="report-card"
                            role="button"
                            tabIndex={0}
                            onClick={() => navigate(`/interview/${reportItem._id}`)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault()
                                    navigate(`/interview/${reportItem._id}`)
                                }
                            }}
                        >
                            <div className="report-top">
                                <div className="report-copy">
                                    <span className="report-kicker">Recent role</span>
                                    <h3>{reportItem.title}</h3>
                                </div>
                                <div className="report-actions">
                                    <span className={`report-score ${getScoreTone(reportItem.matchScore)}`}>{reportItem.matchScore}%</span>
                                    <button
                                        type="button"
                                        className="delete-report-btn"
                                        onClick={(event) => handleDeleteReport(event, reportItem._id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            <div className="report-meta">
                                <span className="report-pill">{getScoreLabel(reportItem.matchScore)}</span>
                                <p className="report-date">
                                    Updated {new Date(reportItem.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    )
}

export default Home
