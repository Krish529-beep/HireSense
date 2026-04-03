import React,{useEffect,useState,useRef} from 'react'
import "../Style/home.scss"
import { useInterview } from '../hooks/useInterview'
import {useNavigate} from 'react-router'


function Home() {
    const {loading,reports,generateReport,getReports} = useInterview()
    const [jobDescription,setjobDescription] = useState("")
    const [selfDescription,setselfDescription] = useState("")
    const [errorMessage, setErrorMessage] = useState("")
    const [recentErrorMessage, setRecentErrorMessage] = useState("")
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
            const data = await generateReport({jobDescription,selfDescription,resumeFile})
            navigate(`/interview/${data._id}`)
        } catch (error) {
            setErrorMessage(error.response?.data?.message || "Unable to generate the interview strategy.")
        }
    }

    if(loading){
        return (
            <main className='loading-screen'>
                <h1>Loading yout interview Plan....</h1>
            </main>
        ) 
    }

    return (
        <main className="home">

            {/* HEADER */}
            <div className="header">
                <h1>
                    Create Your Custom <span>Interview Plan</span>
                </h1>
                <p>
                    Let AI analyze the job requirements and your profile
                </p>
            </div>

            {/* MAIN CARD */}
            <div className="card">

                {/* LEFT */}
                <div className="panel left">
                    <div className="panel-title">
                        <p>Target Job Description</p>
                        <span className="badge">Required</span>
                    </div>

                    <textarea
                    onChange={(e)=> {setjobDescription(e.target.value)}}
                        placeholder="Paste job description here..."
                    />
                </div>

                {/* RIGHT */}
                <div className="panel right">

                    <div className="section">
                        <div className="panel-title">
                            <p>Your Profile</p>
                        </div>

                        {/* FILE UPLOAD */}
                        <label className="upload-box">
                            <input ref={resumeInputRef} type="file" hidden />
                            <div>
                                <p>Click to upload</p>
                                <span>PDF only</span>
                            </div>
                        </label>
                    </div>

                    <div className="divider">or</div>

                    {/* SELF DESCRIPTION */}
                    <div className="section">
                        <label>Quick Self Description</label>
                        <textarea 
                        onChange={(e)=> {setselfDescription(e.target.value)}}
                        placeholder="Briefly describe yourself..." />
                    </div>

                    <div className="info-box">
                        Either resume or self description is required
                    </div>

                    {errorMessage && (
                        <div className="status-banner error" role="alert">
                            {errorMessage}
                        </div>
                    )}

                    <button 
                    onClick={handleGenrateReport}
                    disabled={loading}
                    className="generate-btn">
                        {loading ? "Generating..." : "Generate Interview Strategy"}
                    </button>

                </div>
            </div>

            <section className="recent-reports">
                <div className="section-heading">
                    <div>
                        <h2>Recent Reports</h2>
                        <p>Jump back into your latest interview plans.</p>
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
                        <button
                            key={reportItem._id}
                            type="button"
                            className="report-card"
                            onClick={() => navigate(`/interview/${reportItem._id}`)}
                        >
                            <div className="report-top">
                                <h3>{reportItem.title}</h3>
                                <span className="report-score">{reportItem.matchScore}%</span>
                            </div>
                            <p className="report-date">
                                {new Date(reportItem.createdAt).toLocaleDateString()}
                            </p>
                        </button>
                    ))}
                </div>
            </section>
        </main>
    )
}

export default Home
