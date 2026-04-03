import React, { useState,useEffect } from "react";
import "../Style/interview.scss";
import { useInterview, } from "../hooks/useInterview";
import { useNavigate, useParams } from "react-router";

function parseEmbeddedJson(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

function normalizeQuestionForUi(questionItem) {
  const parsedQuestion = parseEmbeddedJson(questionItem?.question);
  if (parsedQuestion) {
    return {
      question: parsedQuestion.question ?? questionItem?.question ?? "",
      intention: parsedQuestion.intention ?? questionItem?.intention ?? "",
      answer: parsedQuestion.answer ?? questionItem?.answer ?? "",
    };
  }

  return questionItem;
}

function normalizeSkillGapForUi(skillGapItem) {
  const parsedSkillGap = parseEmbeddedJson(skillGapItem?.skill);
  if (parsedSkillGap) {
    return {
      skill: parsedSkillGap.skill ?? skillGapItem?.skill ?? "",
      severity: parsedSkillGap.severity ?? skillGapItem?.severity ?? "medium",
    };
  }

  return skillGapItem;
}

function normalizePreparationPlanForUi(planItem, index) {
  const parsedPlan = parseEmbeddedJson(planItem?.focus);
  if (parsedPlan) {
    return {
      day: parsedPlan.day ?? planItem?.day ?? index + 1,
      focus: parsedPlan.focus ?? planItem?.focus ?? "",
      tasks: Array.isArray(parsedPlan.tasks) ? parsedPlan.tasks : planItem?.tasks ?? [],
    };
  }

  return planItem;
}

function Interview() {
  const {report,reports,getReportById,getReports} = useInterview()
  const {interviewId} = useParams()
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState("");
  const [recentErrorMessage, setRecentErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("technical");
  const [openIndex, setOpenIndex] = useState(0);

  useEffect(() => {
    const loadReport = async () => {
      if (!interviewId) {
        return;
      }

      try {
        setErrorMessage("");
        await getReportById(interviewId)
      } catch (error) {
        setErrorMessage(
          error.response?.data?.message || "Unable to load the interview strategy."
        );
      }
    };

    loadReport();
  },[getReportById, interviewId])

  useEffect(() => {
    const loadRecentReports = async () => {
      try {
        setRecentErrorMessage("");
        await getReports();
      } catch (error) {
        setRecentErrorMessage(
          error.response?.data?.message || "Unable to load recent reports."
        );
      }
    };

    loadRecentReports();
  }, [getReports])

  const handleRetry = async () => {
    if (!interviewId) {
      return;
    }

    try {
      setErrorMessage("");
      await getReportById(interviewId)
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message || "Unable to load the interview strategy."
      );
    }
  };

  if (errorMessage) {
    return (
      <main className="interview">
        <div className="interview-container error-state">
          <div className="error-panel">
            <h2>We couldn't load this interview strategy</h2>
            <p>{errorMessage}</p>
            <button onClick={handleRetry} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!report) {
    return (
      <main className="interview">
        <div className="interview-container">
          <div className="main-content">
            <div className="content">
              <h2>Loading your interview strategy...</h2>
            </div>
          </div>
        </div>
      </main>
    )
  }

  const isLowMatchScore = Number(report.matchScore) < 50;

  const renderContent = () => {
    const list =
      activeTab === "technical"
        ? report.technicalQuestions
        : activeTab === "behavioral"
        ? report.behavioralQuestions
        : [];

    // ROADMAP
    if (activeTab === "roadmap") {
      return report.preparationPlan.map((rawDay, i) => {
        const day = normalizePreparationPlanForUi(rawDay, i);

        return (
        <div key={i} className="card roadmap">
          <h3>Day {day.day}: {day.focus}</h3>
          <ul>
            {day.tasks.map((task, j) => (
              <li key={j}>{task}</li>
            ))}
          </ul>
        </div>
      )});
    }

    // QUESTIONS (ACCORDION)
    return list.map((rawQuestion, i) => {
      const q = normalizeQuestionForUi(rawQuestion);

      return (
      <div key={i} className={`card ${openIndex === i ? "open" : ""}`}>

        {/* QUESTION HEADER */}
        <div
          className="question"
          onClick={() => setOpenIndex(openIndex === i ? null : i)}
        >
          <div className="left">
            <span className="q-badge">Q{i + 1}</span>
            <p>{q.question}</p>
          </div>

          <span className="arrow">
            {openIndex === i ? "▴" : "▾"}
          </span>
        </div>

        <div className={`details ${openIndex === i ? "open" : ""}`}>

            <div className="block">
              <span className="tag intention">INTENTION</span>
              <p>{q.intention}</p>
            </div>

            <div className="block">
              <span className="tag answer">MODEL ANSWER</span>
              <p>{q.answer}</p>
            </div>

          </div>
      </div>
    )});
  };

  return (
    <main className="interview">
      <div className="interview-container">
        {isLowMatchScore ? (
          <>
            <div className="low-score-layout">
              <div className="low-score-panel">
                <span className="low-score-badge">Low Match Score</span>
                <h2>This profile is not a strong fit for this role yet</h2>
                <p>
                  Your current match score is {report.matchScore}%. This report is hidden because the fit is below 50%.
                  Try improving your resume, tailoring your self description, or choosing a role that matches your current skills more closely.
                </p>
              </div>

              <div className="recent-reports-panel">
                <div className="recent-reports-header">
                  <h3>Recent Reports</h3>
                  <p>Open one of your latest interview plans.</p>
                </div>

                {recentErrorMessage ? (
                  <div className="recent-reports-empty">{recentErrorMessage}</div>
                ) : reports.length === 0 ? (
                  <div className="recent-reports-empty">
                    Your recent interview reports will appear here.
                  </div>
                ) : (
                  <div className="recent-reports-list">
                    {reports
                      .filter((reportItem) => reportItem._id !== interviewId)
                      .slice(0, 6)
                      .map((reportItem) => (
                        <button
                          key={reportItem._id}
                          type="button"
                          className="recent-report-card"
                          onClick={() => navigate(`/interview/${reportItem._id}`)}
                        >
                          <div className="recent-report-top">
                            <span className="recent-report-title">{reportItem.title}</span>
                            <span className="recent-report-score">{reportItem.matchScore}%</span>
                          </div>
                          <span className="recent-report-date">
                            {new Date(reportItem.createdAt).toLocaleDateString()}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </div>

            <div className="right-panel">
              <div className="match-score">
                <div
                  className="circle"
                  style={{ "--score": report.matchScore }}
                >
                  <span>{report.matchScore}%</span>
                </div>
                <p className="label">Match Score</p>
              </div>
            </div>
          </>
        ) : (
          <>

        {/* SIDEBAR */}
        <div className="sidebar">
          <p className="section-title">SECTIONS</p>

          <p
            className={activeTab === "technical" ? "active" : ""}
            onClick={() => setActiveTab("technical")}
          >
            Technical Questions
          </p>

          <p
            className={activeTab === "behavioral" ? "active" : ""}
            onClick={() => setActiveTab("behavioral")}
          >
            Behavioral Questions
          </p>

          <p
            className={activeTab === "roadmap" ? "active" : ""}
            onClick={() => setActiveTab("roadmap")}
          >
            Roadmap
          </p>
        </div>

        {/* MAIN CONTENT */}
        <div className="main-content">

          <div className="header">
            <h2>
              {activeTab === "technical"
                ? "Technical Questions"
                : activeTab === "behavioral"
                ? "Behavioral Questions"
                : "Preparation Roadmap"}
            </h2>

            <span className="count">
              {activeTab === "technical"
                ? report.technicalQuestions.length
                : activeTab === "behavioral"
                ? report.behavioralQuestions.length
                : report.preparationPlan.length} items
            </span>
          </div>

          <div className="content">
            {renderContent()}
          </div>

          <div className="recent-reports-panel">
            <div className="recent-reports-header">
              <h3>Recent Reports</h3>
              <p>Open one of your latest interview plans.</p>
            </div>

            {recentErrorMessage ? (
              <div className="recent-reports-empty">{recentErrorMessage}</div>
            ) : reports.length === 0 ? (
              <div className="recent-reports-empty">
                Your recent interview reports will appear here.
              </div>
            ) : (
              <div className="recent-reports-list">
                {reports
                  .filter((reportItem) => reportItem._id !== interviewId)
                  .slice(0, 6)
                  .map((reportItem) => (
                    <button
                      key={reportItem._id}
                      type="button"
                      className="recent-report-card"
                      onClick={() => navigate(`/interview/${reportItem._id}`)}
                    >
                      <div className="recent-report-top">
                        <span className="recent-report-title">{reportItem.title}</span>
                        <span className="recent-report-score">{reportItem.matchScore}%</span>
                      </div>
                      <span className="recent-report-date">
                        {new Date(reportItem.createdAt).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">

          {/* MATCH SCORE */}
          <div className="match-score">
            <div
              className="circle"
              style={{ "--score": report.matchScore }}
            >
              <span>{report.matchScore}%</span>
            </div>
            <p className="label">Match Score</p>
          </div>

          {/* SKILL GAPS */}
          <div className="skills">
            <p className="title">Skill Gaps</p>

            <div className="tags">
              {report.skillGaps.map((rawSkillGap, i) => {
                const s = normalizeSkillGapForUi(rawSkillGap);

                return (
                <span key={i} className={s.severity}>
                  {s.skill}
                </span>
              )})}
            </div>
          </div>

        </div>
          </>
        )}
      </div>
    </main>
  );
}

export default Interview;
