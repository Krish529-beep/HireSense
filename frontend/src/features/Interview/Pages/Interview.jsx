import React, { useState,useEffect } from "react";
import "../Style/interview.scss";
import { useInterview, } from "../hooks/useInterview";
import { useNavigate, useParams } from "react-router";
import { useAuth } from "../../auth/hooks/useAuth";

const PLACEHOLDER_TOKENS = new Set([
  "question",
  "intention",
  "answer",
  "skill",
  "severity",
  "focus",
  "tasks",
  "day",
]);

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

function cleanText(value, fallback = "") {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number") {
    return String(value);
  }

  if (value == null) {
    return fallback;
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

function stripWrappingQuotes(value) {
  return cleanText(value).replace(/^"+|"+$/g, "").trim();
}

function extractQuotedValue(text, key) {
  if (typeof text !== "string") {
    return "";
  }

  const patterns = [
    new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "i"),
    new RegExp(`${key}"?\\s*:\\s*"([^"]+)"`, "i"),
    new RegExp(`${key}\\s*:\\s*"([^"]+)"`, "i"),
    new RegExp(`"${key}"\\s*:\\s*([^,}\\]]+)`, "i"),
    new RegExp(`${key}\\s*:\\s*([^,}\\]]+)`, "i"),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return stripWrappingQuotes(match[1]);
    }
  }

  return "";
}

function cleanupLabeledText(value, key, fallback = "") {
  const text = cleanText(value, fallback);
  const parsedObject = parseEmbeddedJson(text);
  if (parsedObject && typeof parsedObject === "object" && !Array.isArray(parsedObject)) {
    return cleanupLabeledText(parsedObject[key] ?? text, key, fallback);
  }

  const extracted = extractQuotedValue(text, key);
  if (extracted) {
    return extracted;
  }

  return text
    .replace(new RegExp(`^"?${key}"?\\s*:\\s*`, "i"), "")
    .replace(/^"+|"+$/g, "")
    .replace(/[}",\]]+$/g, "")
    .trim() || fallback;
}

function extractTasksFromText(value) {
  const text = cleanText(value);
  if (!text) {
    return [];
  }

  const arrayMatch =
    text.match(/"tasks"\s*:\s*\[([\s\S]*?)\]/i) ||
    text.match(/tasks\s*:\s*\[([\s\S]*?)\]/i);

  if (arrayMatch?.[1]) {
    return arrayMatch[1]
      .split(/","|",\s*"|",|"\s*,\s*"/)
      .map((item) => stripWrappingQuotes(item))
      .filter(Boolean);
  }

  return [];
}

function extractLabeledEntries(text, keys) {
  if (typeof text !== "string") {
    return [];
  }

  const pattern = /"(question|intention|answer|skill|severity|day|focus|tasks)"\s*:\s*("(?:[^"\\]|\\.)*"|\[[\s\S]*?\]|[^,\]}]+)/gi;
  const entries = [];
  let match = pattern.exec(text);

  while (match) {
    const key = match[1];
    const rawValue = stripWrappingQuotes(match[2]);
    if (keys.includes(key)) {
      entries.push({ key, value: rawValue });
    }
    match = pattern.exec(text);
  }

  return entries;
}

function isPlaceholderToken(value) {
  return PLACEHOLDER_TOKENS.has(cleanText(value).toLowerCase());
}

function normalizeQuestionForUi(questionItem) {
  if (typeof questionItem === "string") {
    return {
      question: cleanupLabeledText(questionItem, "question", "Interview question"),
      intention: "Assess relevant knowledge and communication.",
      answer: "Give a structured answer with clear examples and outcomes.",
    };
  }

  const parsedQuestion = parseEmbeddedJson(questionItem?.question);
  if (parsedQuestion) {
    return {
      question: cleanupLabeledText(parsedQuestion.question ?? questionItem?.question, "question", "Interview question"),
      intention: cleanupLabeledText(parsedQuestion.intention ?? questionItem?.intention, "intention", "Assess relevant knowledge and communication."),
      answer: cleanupLabeledText(parsedQuestion.answer ?? questionItem?.answer, "answer", "Give a structured answer with clear examples and outcomes."),
    };
  }

  return {
    question: isPlaceholderToken(questionItem?.question)
      ? "Interview question"
      : cleanupLabeledText(questionItem?.question, "question", "Interview question"),
    intention: isPlaceholderToken(questionItem?.intention)
      ? "Assess relevant knowledge and communication."
      : cleanupLabeledText(questionItem?.intention, "intention", "Assess relevant knowledge and communication."),
    answer: isPlaceholderToken(questionItem?.answer)
      ? "Give a structured answer with clear examples and outcomes."
      : cleanupLabeledText(questionItem?.answer, "answer", "Give a structured answer with clear examples and outcomes."),
  };
}

function normalizeSkillGapForUi(skillGapItem) {
  if (typeof skillGapItem === "string") {
    return {
      skill: cleanupLabeledText(skillGapItem, "skill", "Relevant skill gap"),
      severity: "medium",
    };
  }

  const parsedSkillGap = parseEmbeddedJson(skillGapItem?.skill);
  if (parsedSkillGap) {
    return {
      skill: cleanupLabeledText(parsedSkillGap.skill ?? skillGapItem?.skill, "skill", "Relevant skill gap"),
      severity: ["low", "medium", "high"].includes(parsedSkillGap.severity ?? skillGapItem?.severity)
        ? (parsedSkillGap.severity ?? skillGapItem?.severity)
        : "medium",
    };
  }

  return {
    skill: isPlaceholderToken(skillGapItem?.skill)
      ? "Relevant skill gap"
      : cleanupLabeledText(skillGapItem?.skill, "skill", "Relevant skill gap"),
    severity: ["low", "medium", "high"].includes(skillGapItem?.severity)
      ? skillGapItem.severity
      : "medium",
  };
}

function normalizePreparationPlanForUi(planItem, index) {
  if (typeof planItem === "string") {
    return {
      day: index + 1,
      focus: cleanText(planItem, `Preparation Focus ${index + 1}`),
      tasks: [
        "Review role-specific fundamentals",
        "Practice targeted interview questions",
        "Revise project examples",
      ],
    };
  }

  const parsedPlan = parseEmbeddedJson(planItem?.focus);
  if (parsedPlan) {
    const parsedTasks = Array.isArray(parsedPlan.tasks)
      ? parsedPlan.tasks
      : extractTasksFromText(planItem?.tasks ?? planItem?.focus);

    return {
      day: parsedPlan.day ?? planItem?.day ?? index + 1,
      focus: cleanupLabeledText(parsedPlan.focus ?? planItem?.focus, "focus", `Preparation Focus ${index + 1}`),
      tasks: parsedTasks.length > 0
        ? parsedTasks
        : Array.isArray(planItem?.tasks)
        ? planItem.tasks
        : [],
    };
  }

  const extractedTasks = Array.isArray(planItem?.tasks)
    ? planItem.tasks
    : extractTasksFromText(planItem?.tasks ?? planItem?.focus);

  return {
    day: Number.isFinite(Number(planItem?.day)) ? Number(planItem.day) : index + 1,
    focus: isPlaceholderToken(planItem?.focus)
      ? `Preparation Focus ${index + 1}`
      : cleanupLabeledText(planItem?.focus, "focus", `Preparation Focus ${index + 1}`),
    tasks: extractedTasks.length > 0
      ? extractedTasks.map((task) => cleanText(task)).filter(Boolean)
      : [
          "Review role-specific fundamentals",
          "Practice targeted interview questions",
          "Revise project examples",
        ],
  };
}

function buildQuestionList(questionItems = []) {
  if (!Array.isArray(questionItems)) {
    return [];
  }

  const extractedEntries = questionItems.flatMap((item) => {
    if (typeof item === "string") {
      return extractLabeledEntries(item, ["question", "intention", "answer"]);
    }

    if (item && typeof item === "object") {
      return ["question", "intention", "answer"].flatMap((key) =>
        extractLabeledEntries(cleanText(item[key]), ["question", "intention", "answer"])
      );
    }

    return [];
  });

  if (extractedEntries.length >= 3) {
    const regroupedQuestions = [];
    let currentQuestion = {};

    extractedEntries.forEach(({ key, value }) => {
      if (key === "question" && (currentQuestion.question || currentQuestion.intention || currentQuestion.answer)) {
        regroupedQuestions.push(normalizeQuestionForUi(currentQuestion));
        currentQuestion = {};
      }

      currentQuestion[key] = value;

      if (currentQuestion.question && currentQuestion.intention && currentQuestion.answer) {
        regroupedQuestions.push(normalizeQuestionForUi(currentQuestion));
        currentQuestion = {};
      }
    });

    if (regroupedQuestions.length > 0) {
      return regroupedQuestions;
    }
  }

  if (questionItems.every((item) => typeof item === "string")) {
    const cleanedItems = questionItems
      .map((item) => cleanText(item))
      .filter(Boolean)
      .filter((item) => !isPlaceholderToken(item));

    if (cleanedItems.length >= 3) {
      const groupedItems = [];

      for (let index = 0; index + 2 < cleanedItems.length; index += 3) {
        groupedItems.push(
          normalizeQuestionForUi({
            question: cleanedItems[index],
            intention: cleanedItems[index + 1],
            answer: cleanedItems[index + 2],
          })
        );
      }

      if (groupedItems.length > 0) {
        return groupedItems;
      }
    }
  }

  return questionItems.map(normalizeQuestionForUi);
}

function buildSkillGapList(skillGapItems = []) {
  if (!Array.isArray(skillGapItems)) {
    return [];
  }

  const extractedEntries = skillGapItems.flatMap((item) => {
    if (typeof item === "string") {
      return extractLabeledEntries(item, ["skill", "severity"]);
    }

    if (item && typeof item === "object") {
      return ["skill", "severity"].flatMap((key) =>
        extractLabeledEntries(cleanText(item[key]), ["skill", "severity"])
      );
    }

    return [];
  });

  if (extractedEntries.length >= 2) {
    const regroupedSkills = [];
    let currentSkill = {};

    extractedEntries.forEach(({ key, value }) => {
      if (key === "skill" && (currentSkill.skill || currentSkill.severity)) {
        regroupedSkills.push(normalizeSkillGapForUi(currentSkill));
        currentSkill = {};
      }

      currentSkill[key] = value;

      if (currentSkill.skill && currentSkill.severity) {
        regroupedSkills.push(normalizeSkillGapForUi(currentSkill));
        currentSkill = {};
      }
    });

    if (regroupedSkills.length > 0) {
      return regroupedSkills;
    }
  }

  if (skillGapItems.every((item) => typeof item === "string")) {
    const cleanedItems = skillGapItems
      .map((item) => cleanText(item))
      .filter(Boolean)
      .filter((item) => !isPlaceholderToken(item));

    if (cleanedItems.length >= 2) {
      const groupedItems = [];

      for (let index = 0; index + 1 < cleanedItems.length; index += 2) {
        groupedItems.push(
          normalizeSkillGapForUi({
            skill: cleanedItems[index],
            severity: cleanedItems[index + 1],
          })
        );
      }

      if (groupedItems.length > 0) {
        return groupedItems;
      }
    }
  }

  return skillGapItems.map(normalizeSkillGapForUi);
}

function buildPreparationPlan(planItems = []) {
  if (!Array.isArray(planItems)) {
    return [];
  }

  const extractedEntries = planItems.flatMap((item) => {
    if (typeof item === "string") {
      return extractLabeledEntries(item, ["day", "focus", "tasks"]);
    }

    if (item && typeof item === "object") {
      return ["day", "focus", "tasks"].flatMap((key) =>
        extractLabeledEntries(cleanText(item[key]), ["day", "focus", "tasks"])
      );
    }

    return [];
  });

  if (extractedEntries.length >= 3) {
    const regroupedPlan = [];
    let currentDay = {};

    extractedEntries.forEach(({ key, value }) => {
      if (key === "day" && (currentDay.day || currentDay.focus || currentDay.tasks)) {
        regroupedPlan.push(normalizePreparationPlanForUi(currentDay, regroupedPlan.length));
        currentDay = {};
      }

      if (key === "tasks") {
        currentDay.tasks = extractTasksFromText(`tasks:[${value}]`);
      } else {
        currentDay[key] = value;
      }
    });

    if (Object.keys(currentDay).length > 0) {
      regroupedPlan.push(normalizePreparationPlanForUi(currentDay, regroupedPlan.length));
    }

    if (regroupedPlan.length > 0) {
      return regroupedPlan;
    }
  }

  if (planItems.every((item) => typeof item !== "object" || item === null)) {
    const cleanedItems = planItems
      .map((item) => cleanText(item))
      .filter(Boolean)
      .filter((item) => !isPlaceholderToken(item));

    const groupedItems = [];
    let currentDay = null;

    cleanedItems.forEach((item) => {
      const numericValue = Number(item);
      const isDayMarker = Number.isFinite(numericValue) && String(numericValue) === item;

      if (isDayMarker) {
        if (currentDay) {
          groupedItems.push(currentDay);
        }

        currentDay = {
          day: numericValue,
          focus: "",
          tasks: [],
        };
        return;
      }

      if (!currentDay) {
        currentDay = {
          day: groupedItems.length + 1,
          focus: "",
          tasks: [],
        };
      }

      if (!currentDay.focus) {
        currentDay.focus = item;
        return;
      }

      currentDay.tasks.push(item);
    });

    if (currentDay) {
      groupedItems.push(currentDay);
    }

    if (groupedItems.length > 0) {
      return groupedItems.map((item, index) => normalizePreparationPlanForUi(item, index));
    }
  }

  return planItems.map((item, index) => normalizePreparationPlanForUi(item, index));
}

function isGenericQuestionLabel(value) {
  return /^(technical|behavioral)\s+question\s+\d+$/i.test(cleanText(value));
}

function isGenericSkillLabel(value) {
  const text = cleanText(value);
  return /^skill gap\s+\d+$/i.test(text) || /^(relevant|unspecified) skill gap$/i.test(text);
}

function isGenericPlanFocus(value) {
  return /^preparation focus\s+\d+$/i.test(cleanText(value));
}

function hasReliableQuestion(item) {
  const question = cleanText(item?.question);
  const intention = cleanText(item?.intention);
  const answer = cleanText(item?.answer);

  return (
    question.length >= 24 &&
    !isGenericQuestionLabel(question) &&
    intention.length >= 18 &&
    answer.length >= 24
  );
}

function hasReliableSkillGap(item) {
  const skill = cleanText(item?.skill);
  return skill.length >= 6 && !isGenericSkillLabel(skill) && !isPlaceholderToken(skill);
}

function hasReliablePlanItem(item) {
  const focus = cleanText(item?.focus);
  const tasks = Array.isArray(item?.tasks) ? item.tasks.map((task) => cleanText(task)).filter(Boolean) : [];

  return focus.length >= 10 && !isGenericPlanFocus(focus) && tasks.length >= 2;
}

function getFileNameFromDisposition(value, fallback = "tailored_resume.pdf") {
  if (typeof value !== "string") {
    return fallback;
  }

  const utfMatch = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const plainMatch = value.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] || fallback;
}

function getScoreTone(score) {
  if (score >= 80) return "strong";
  if (score >= 60) return "steady";
  return "early";
}

function getScoreLabel(score) {
  if (score >= 80) return "Strong alignment";
  if (score >= 60) return "Promising alignment";
  return "Needs stronger alignment";
}

function Interview() {
  const {report,reports,getReportById,getReports,removeReport,downloadResumePdf} = useInterview()
  const { user, handelLogout } = useAuth()
  const {interviewId} = useParams()
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState("");
  const [recentErrorMessage, setRecentErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState("technical");
  const [openIndex, setOpenIndex] = useState(0);
  const [isGeneratingResumePdf, setIsGeneratingResumePdf] = useState(false);
  const [resumePdfMessage, setResumePdfMessage] = useState("");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const handleDeleteReport = async (event, reportId) => {
    event.stopPropagation();

    try {
      await removeReport(reportId);

      if (reportId === interviewId) {
        navigate("/");
      }
    } catch (error) {
      setRecentErrorMessage(
        error.response?.data?.message || "Unable to delete the report."
      );
    }
  };

  const handleGenerateResumePdf = async () => {
    if (!interviewId) {
      return;
    }

    try {
      setResumePdfMessage("");
      setIsGeneratingResumePdf(true);
      const { blob, contentDisposition } = await downloadResumePdf(interviewId);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = getFileNameFromDisposition(contentDisposition);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setResumePdfMessage("Your tailored resume PDF is ready.");
    } catch (error) {
      setResumePdfMessage(
        error.response?.data?.message || "Unable to generate the resume PDF right now."
      );
    } finally {
      setIsGeneratingResumePdf(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await handelLogout();
      navigate("/login");
    } finally {
      setIsLoggingOut(false);
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
      <main className="app-loader-screen">
        <div className="app-loader-panel" role="status" aria-live="polite">
          <div className="app-loader-spinner" aria-hidden="true"></div>
          <span className="app-loader-kicker">Interview strategy</span>
          <h2>Loading your interview report</h2>
          <p>We are pulling your latest report details and preparing the workspace.</p>
        </div>
      </main>
    )
  }

  const isLowMatchScore = Number(report.matchScore) < 50;
  const normalizedTechnicalQuestions = buildQuestionList(report.technicalQuestions);
  const normalizedBehavioralQuestions = buildQuestionList(report.behavioralQuestions);
  const normalizedSkillGaps = buildSkillGapList(report.skillGaps);
  const normalizedPreparationPlan = buildPreparationPlan(report.preparationPlan);
  const activeItemCount =
    activeTab === "technical"
      ? normalizedTechnicalQuestions.length
      : activeTab === "behavioral"
      ? normalizedBehavioralQuestions.length
      : normalizedPreparationPlan.length;
  const reportLooksReliable =
    normalizedTechnicalQuestions.filter(hasReliableQuestion).length >= 4 &&
    normalizedBehavioralQuestions.filter(hasReliableQuestion).length >= 3 &&
    normalizedSkillGaps.filter(hasReliableSkillGap).length >= 2 &&
    normalizedPreparationPlan.filter(hasReliablePlanItem).length >= 3;

  if (!reportLooksReliable) {
    return (
      <main className="interview">
        <div className="interview-container error-state">
          <div className="error-panel">
            <h2>This report was not generated reliably</h2>
            <p>
              The AI response for this report was too incomplete or low quality to display safely.
              Please generate another report with a clearer job description and fuller profile details.
            </p>
            <button onClick={() => navigate("/")} className="retry-btn">
              Generate Another Report
            </button>
          </div>
        </div>
      </main>
    )
  }

  const renderContent = () => {
    const list =
      activeTab === "technical"
        ? normalizedTechnicalQuestions
        : activeTab === "behavioral"
        ? normalizedBehavioralQuestions
        : [];

    // ROADMAP
    if (activeTab === "roadmap") {
      return normalizedPreparationPlan.map((day, i) => {

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
    return list.map((q, i) => {

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
        {isGeneratingResumePdf && (
          <div className="resume-loader-overlay" role="status" aria-live="polite">
            <div className="resume-loader-spinner" aria-hidden="true"></div>
            <h2>Generating your resume PDF</h2>
            <p>
              We are tailoring your resume to this role and preparing a downloadable PDF.
            </p>
          </div>
        )}
        <div className="session-strip">
          <div className="session-strip-copy">
            <span className="session-strip-kicker">Signed in</span>
            <strong>{user?.username || user?.email || "Workspace user"}</strong>
          </div>
          <button
            type="button"
            className="session-strip-btn"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
        {isLowMatchScore ? (
          <>
            <div className="low-score-layout">
              <div className="low-score-panel">
                <div className="primary-actions">
                  <button
                    type="button"
                    className="new-report-btn"
                    onClick={() => navigate("/")}
                  >
                    Generate Another Report
                  </button>
                  <button
                    type="button"
                    className="secondary-action-btn"
                    onClick={handleGenerateResumePdf}
                    disabled={isGeneratingResumePdf}
                  >
                    {isGeneratingResumePdf ? "Generating Resume PDF..." : "Generate Resume PDF"}
                  </button>
                </div>
                <span className="low-score-badge">Low Match Score</span>
                <h2>This profile is not a strong fit for this role yet</h2>
                <p>
                  Your current match score is {report.matchScore}%. This report is hidden because the fit is below 50%.
                  Try improving your resume, tailoring your self description, or choosing a role that matches your current skills more closely.
                </p>
                {resumePdfMessage && (
                  <div className="inline-status-message">{resumePdfMessage}</div>
                )}
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
                            <div className="recent-report-copy">
                              <span className="recent-report-kicker">Recent role</span>
                              <span className="recent-report-title">{reportItem.title}</span>
                            </div>
                            <div className="recent-report-actions">
                              <span className={`recent-report-score ${getScoreTone(reportItem.matchScore)}`}>{reportItem.matchScore}%</span>
                              <button
                                type="button"
                                className="delete-report-btn"
                                onClick={(event) => handleDeleteReport(event, reportItem._id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                          <div className="recent-report-meta">
                            <span className="recent-report-pill">{getScoreLabel(reportItem.matchScore)}</span>
                            <span className="recent-report-date">
                              Updated {new Date(reportItem.createdAt).toLocaleDateString()}
                            </span>
                          </div>
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
          <p className="section-title">Workspace</p>
          <div className="sidebar-intro">
            <span className="sidebar-kicker">Active Report</span>
            <h3>{report.title}</h3>
            <p>Move between the key prep sections and keep the report summary in view.</p>
          </div>

          <button
            type="button"
            className={activeTab === "technical" ? "active" : ""}
            onClick={() => setActiveTab("technical")}
          >
            <span className="nav-copy">
              <strong>Technical Questions</strong>
              <small>{normalizedTechnicalQuestions.length} prompts</small>
            </span>
          </button>

          <button
            type="button"
            className={activeTab === "behavioral" ? "active" : ""}
            onClick={() => setActiveTab("behavioral")}
          >
            <span className="nav-copy">
              <strong>Behavioral Questions</strong>
              <small>{normalizedBehavioralQuestions.length} prompts</small>
            </span>
          </button>

          <button
            type="button"
            className={activeTab === "roadmap" ? "active" : ""}
            onClick={() => setActiveTab("roadmap")}
          >
            <span className="nav-copy">
              <strong>Roadmap</strong>
              <small>{normalizedPreparationPlan.length} day plan</small>
            </span>
          </button>

          <div className="sidebar-tip">
            Use the score, skill gaps, and roadmap together before applying or generating a tailored resume.
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="main-content">

          <div className="header">
            <div className="header-copy">
              <span className="header-kicker">Interview Strategy</span>
              <h2>
                {activeTab === "technical"
                  ? "Technical Questions"
                  : activeTab === "behavioral"
                  ? "Behavioral Questions"
                  : "Preparation Roadmap"}
              </h2>
              <p>
                {activeTab === "technical"
                  ? "Use these prompts to rehearse your strongest technical stories, tradeoffs, and implementation choices."
                  : activeTab === "behavioral"
                  ? "Prepare STAR-driven examples that show ownership, clarity, and decision-making."
                  : "Follow a tighter day-by-day plan to close the biggest fit gaps for this role."}
              </p>
            </div>

            <div className="header-actions">
              <div className="primary-actions">
                <button
                  type="button"
                  className="new-report-btn"
                  onClick={() => navigate("/")}
                >
                  Generate Another Report
                </button>
                <button
                  type="button"
                  className="secondary-action-btn"
                  onClick={handleGenerateResumePdf}
                  disabled={isGeneratingResumePdf}
                >
                  {isGeneratingResumePdf ? "Generating Resume PDF..." : "Generate Resume PDF"}
                </button>
              </div>
              <span className="count">
                {activeItemCount} items
              </span>
            </div>
          </div>

          <div className="content">
            {resumePdfMessage && (
              <div className="inline-status-message">{resumePdfMessage}</div>
            )}
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
                        <div className="recent-report-copy">
                          <span className="recent-report-kicker">Recent role</span>
                          <span className="recent-report-title">{reportItem.title}</span>
                        </div>
                        <div className="recent-report-actions">
                          <span className={`recent-report-score ${getScoreTone(reportItem.matchScore)}`}>{reportItem.matchScore}%</span>
                          <button
                            type="button"
                            className="delete-report-btn"
                            onClick={(event) => handleDeleteReport(event, reportItem._id)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="recent-report-meta">
                        <span className="recent-report-pill">{getScoreLabel(reportItem.matchScore)}</span>
                        <span className="recent-report-date">
                          Updated {new Date(reportItem.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-panel">
          <div className="summary-card">
            <span className="summary-kicker">Target Role</span>
            <h3>{report.title}</h3>
            <p>{getScoreLabel(report.matchScore)}</p>
          </div>

          <div className="match-score">
            <div
              className="circle"
              style={{ "--score": report.matchScore }}
            >
              <span>{report.matchScore}%</span>
            </div>
            <p className="label">Match Score</p>
          </div>

          <div className="skills">
            <div className="skills-header">
              <p className="title">Skill Gaps</p>
              <span className="skills-count">{normalizedSkillGaps.length} focus areas</span>
            </div>

            <div className="tags">
              {normalizedSkillGaps.map((s, i) => {
                return (
                <span key={i} className={s.severity}>
                  {s.skill}
                </span>
              )})}
            </div>
          </div>

          <div className="summary-card compact">
            <span className="summary-kicker">How To Use This</span>
            <p>Review the score, study the gaps, rehearse the questions, then use the roadmap to close your weakest areas.</p>
          </div>

        </div>
          </>
        )}
      </div>
    </main>
  );
}

export default Interview;
