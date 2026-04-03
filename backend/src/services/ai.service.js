const { GoogleGenAI } = require('@google/genai')
const { z } = require('zod')
const { zodToJsonSchema } = require('zod-to-json-schema')
// const {resume,selfdescribe,jobdescribe} = require('./temp.js')

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
});

const AI_MODEL_CANDIDATES = [
    "gemini-3-flash-preview",
    "gemini-2.5-flash"
]
const MAX_RETRIES_PER_MODEL = 2
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504])

const interViewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),

    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),

    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),


    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum(["low", "medium", "high"]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),


    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),


    title: z.string().describe("The title of the job for which the interview report is generated"),
})

function toCleanString(value, fallback = "") {
    if (typeof value === "string") {
        return value.trim()
    }

    if (typeof value === "number") {
        return String(value)
    }

    if (value == null) {
        return fallback
    }

    if (typeof value === "object") {
        return JSON.stringify(value)
    }

    return fallback
}

function tryParseJsonString(value) {
    if (typeof value !== "string") {
        return null
    }

    const trimmed = value.trim()
    if (!(trimmed.startsWith("{") && trimmed.endsWith("}"))) {
        return null
    }

    try {
        return JSON.parse(trimmed)
    } catch {
        return null
    }
}

function normalizeQuestionItem(item, index) {
    const parsedStringObject = tryParseJsonString(item)
    if (parsedStringObject && typeof parsedStringObject === "object" && !Array.isArray(parsedStringObject)) {
        return normalizeQuestionItem(parsedStringObject, index)
    }

    if (item && typeof item === "object" && !Array.isArray(item)) {
        return {
            question: toCleanString(item.question, `Question ${index + 1}`),
            intention: toCleanString(item.intention, "Assess relevant knowledge and communication."),
            answer: toCleanString(item.answer, "Give a structured answer with clear examples and outcomes."),
        }
    }

    const text = toCleanString(item, `Question ${index + 1}`)
    if (text.includes("|")) {
        const [question, intention, answer] = text.split("|").map((part) => part.trim())
        return {
            question: question || `Question ${index + 1}`,
            intention: intention || "Assess relevant knowledge and communication.",
            answer: answer || "Give a structured answer with clear examples and outcomes.",
        }
    }

    return {
        question: text,
        intention: "Assess relevant knowledge and communication.",
        answer: "Give a structured answer with clear examples and outcomes.",
    }
}

function normalizeSkillGapItem(item) {
    const parsedStringObject = tryParseJsonString(item)
    if (parsedStringObject && typeof parsedStringObject === "object" && !Array.isArray(parsedStringObject)) {
        return normalizeSkillGapItem(parsedStringObject)
    }

    if (item && typeof item === "object" && !Array.isArray(item)) {
        const severity = ["low", "medium", "high"].includes(item.severity) ? item.severity : "medium"
        return {
            skill: toCleanString(item.skill, "Unspecified skill gap"),
            severity,
        }
    }

    return {
        skill: toCleanString(item, "Unspecified skill gap"),
        severity: "medium",
    }
}

function normalizePreparationTasks(value) {
    if (Array.isArray(value)) {
        return value.map((task) => toCleanString(task)).filter(Boolean)
    }

    const text = toCleanString(value)
    if (!text) {
        return ["Review role-specific fundamentals", "Practice common interview questions", "Prepare concrete project examples"]
    }

    return text
        .split(/\r?\n|;|•|-/)
        .map((task) => task.trim())
        .filter(Boolean)
}

function normalizePreparationPlanItem(item, index) {
    const parsedStringObject = tryParseJsonString(item)
    if (parsedStringObject && typeof parsedStringObject === "object" && !Array.isArray(parsedStringObject)) {
        return normalizePreparationPlanItem(parsedStringObject, index)
    }

    if (item && typeof item === "object" && !Array.isArray(item)) {
        return {
            day: Number.isFinite(Number(item.day)) ? Number(item.day) : index + 1,
            focus: toCleanString(item.focus, `Preparation Focus ${index + 1}`),
            tasks: normalizePreparationTasks(item.tasks),
        }
    }

    const text = toCleanString(item, `Preparation Focus ${index + 1}`)
    if (text.includes("|")) {
        const [focus, ...tasks] = text.split("|").map((part) => part.trim()).filter(Boolean)
        return {
            day: index + 1,
            focus: focus || `Preparation Focus ${index + 1}`,
            tasks: tasks.length > 0 ? tasks : ["Review fundamentals", "Practice answering relevant questions"],
        }
    }

    return {
        day: index + 1,
        focus: text,
        tasks: ["Review fundamentals", "Practice answering relevant questions", "Revise examples from past work"],
    }
}

function ensureMinimumArrayItems(items, factory, minimumCount) {
    const result = [...items]

    while (result.length < minimumCount) {
        result.push(factory(result.length))
    }

    return result
}

function normalizeInterviewReport(raw) {
    const technicalQuestions = Array.isArray(raw.technicalQuestions)
        ? raw.technicalQuestions.map(normalizeQuestionItem)
        : []

    const behavioralQuestions = Array.isArray(raw.behavioralQuestions)
        ? raw.behavioralQuestions.map(normalizeQuestionItem)
        : []

    const skillGaps = Array.isArray(raw.skillGaps)
        ? raw.skillGaps.map(normalizeSkillGapItem)
        : []

    const preparationPlan = Array.isArray(raw.preparationPlan)
        ? raw.preparationPlan.map(normalizePreparationPlanItem)
        : []

    return {
        title: toCleanString(raw.title, "Interview Preparation Plan"),
        matchScore: Math.max(0, Math.min(100, Math.round(Number(raw.matchScore) || 0))),
        technicalQuestions: ensureMinimumArrayItems(
            technicalQuestions.slice(0, 8),
            (index) => ({
                question: `Technical question ${index + 1}`,
                intention: "Assess relevant technical knowledge for the role.",
                answer: "Give a structured, example-driven answer and explain tradeoffs.",
            }),
            6
        ),
        behavioralQuestions: ensureMinimumArrayItems(
            behavioralQuestions.slice(0, 6),
            (index) => ({
                question: `Behavioral question ${index + 1}`,
                intention: "Assess communication, ownership, and teamwork.",
                answer: "Use the STAR format with a concrete example and measurable outcome.",
            }),
            4
        ),
        skillGaps: ensureMinimumArrayItems(
            skillGaps.slice(0, 10),
            (index) => ({
                skill: `Skill gap ${index + 1}`,
                severity: "medium",
            }),
            4
        ),
        preparationPlan: ensureMinimumArrayItems(
            preparationPlan.slice(0, 10),
            (index) => ({
                day: index + 1,
                focus: `Preparation Focus ${index + 1}`,
                tasks: ["Review fundamentals", "Practice targeted questions", "Revise project examples"],
            }),
            5
        ).map((item, index) => ({
            ...item,
            day: index + 1,
            tasks: ensureMinimumArrayItems(
                item.tasks.slice(0, 5).filter(Boolean),
                (taskIndex) => `Task ${taskIndex + 1} for day ${index + 1}`,
                3
            ),
        })),
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function getStatusCode(error) {
    return error?.status ?? error?.error?.code ?? error?.cause?.status ?? error?.cause?.error?.code
}

function isRetryableAiError(error) {
    return RETRYABLE_STATUS_CODES.has(getStatusCode(error))
}

async function generateStructuredContent(prompt) {
    let lastError = null

    for (const model of AI_MODEL_CANDIDATES) {
        for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt += 1) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: zodToJsonSchema(interViewReportSchema),
                    }
                })

                return response.text
            } catch (error) {
                lastError = error

                if (!isRetryableAiError(error)) {
                    throw error
                }

                const isLastAttemptForModel = attempt === MAX_RETRIES_PER_MODEL
                const isLastModel = model === AI_MODEL_CANDIDATES[AI_MODEL_CANDIDATES.length - 1]

                if (isLastAttemptForModel && isLastModel) {
                    break
                }

                await sleep(1000 * attempt)
            }
        }
    }

    const serviceError = new Error("AI service is temporarily unavailable. Please try again.")
    serviceError.statusCode = 503
    serviceError.cause = lastError
    throw serviceError
}


async function genrateInterviewReport({ resume, selfDescription, jobDescription }) {

    const prompt = `
    You are an expert technical recruiter and interview coach. Your ONLY task is to analyze a candidate's profile against a job description and return a structured JSON report.

    CRITICAL OUTPUT RULES — READ BEFORE RESPONDING:
    - Respond with ONLY a valid JSON object. No markdown, no code fences, no backticks, no explanation, no preamble, no postamble.
    - Your entire response must be parseable by JSON.parse() with zero modifications.
    - Do not include comments, trailing commas, or any non-JSON text anywhere.
    - Every field listed in the schema is REQUIRED. Never omit a field.

    JSON SCHEMA YOU MUST FOLLOW EXACTLY:
    {
    "title": string,                         // Job title being applied for
    "matchScore": number,                    // Integer 0–100. How well candidate matches the JD.
    "technicalQuestions": [                  // Array of 5–8 objects
    {
      "question": string,                  // A specific, relevant technical interview question
      "intention": string,                 // What the interviewer is trying to assess with this question
      "answer": string                     // Key points, approach, and structure the candidate should cover
    }
  ],
  "behavioralQuestions": [                 // Array of 4–6 objects
    {
      "question": string,                  // A behavioral/situational interview question
      "intention": string,                 // What the interviewer is trying to assess
      "answer": string                     // STAR method guidance and key points to hit
    }
  ],
  "skillGaps": [                           // Array of objects, one per identified gap
    {
      "skill": string,                     // Name of the skill the candidate lacks or is weak in
      "severity": "low" | "medium" | "high" // Impact on candidacy: low = nice-to-have, medium = important, high = critical
    }
  ],
  "preparationPlan": [                     // Array of day objects covering a realistic prep timeline
    {
      "day": number,                       // Day number starting from 1, sequential integers only
      "focus": string,                     // Single main theme for the day (e.g. "System design basics")
      "tasks": string[]                    // Array of 3–5 concrete, actionable tasks for the day
            }
    ]
    }

    CONTENT RULES:
    - matchScore must be an integer (no decimals). Calibrate honestly — 100 means near-perfect match.
    - severity values must be exactly one of: "low", "medium", or "high" — no other values allowed.
    - day values must be sequential integers starting from 1 with no gaps.
    - Every string field must be non-empty and substantive — no placeholder text.
    - technicalQuestions must be role-specific and technically rigorous, not generic.
    - behavioralQuestions must be grounded in real scenarios relevant to the role.
    - preparationPlan should be realistic for the number of gaps and role complexity.

    INPUT YOU WILL RECEIVE:
    - Candidate profile (resume / skills summary)
    - Job description

    Now analyze the inputs and respond with ONLY the JSON object.
    Candidate Profile:
    ${resume}
    Self Description:
    ${selfDescription}
    Job Description:
    ${jobDescription}
    `;

    const strictPrompt = `
    Return ONLY a valid JSON object.

    Top-level keys required:
    - title
    - matchScore
    - technicalQuestions
    - behavioralQuestions
    - skillGaps
    - preparationPlan

    Rules:
    - No markdown.
    - No code fences.
    - No explanation text.
    - Every item inside technicalQuestions must be an object with question, intention, answer.
    - Every item inside behavioralQuestions must be an object with question, intention, answer.
    - Every item inside skillGaps must be an object with skill, severity.
    - Every item inside preparationPlan must be an object with day, focus, tasks.
    - technicalQuestions must contain exactly 6 objects.
    - behavioralQuestions must contain exactly 4 objects.
    - skillGaps must contain exactly 4 objects.
    - preparationPlan must contain exactly 5 objects.
    - preparationPlan.tasks must contain exactly 3 strings per day.
    - skillGaps severity must be only low, medium, or high.
    - preparationPlan day values must be 1, 2, 3, 4, 5.
    - matchScore must be an integer from 0 to 100.

    Example format:
    {
      "title": "Backend Developer",
      "matchScore": 78,
      "technicalQuestions": [
        {
          "question": "How does JWT authentication work?",
          "intention": "Check auth fundamentals.",
          "answer": "Explain token creation, signing, validation, expiry, and a practical flow."
        }
      ],
      "behavioralQuestions": [
        {
          "question": "Tell me about a time you handled a difficult bug.",
          "intention": "Assess ownership and problem-solving.",
          "answer": "Use STAR and explain your investigation, fix, and outcome."
        }
      ],
      "skillGaps": [
        {
          "skill": "System design",
          "severity": "medium"
        }
      ],
      "preparationPlan": [
        {
          "day": 1,
          "focus": "Authentication basics",
          "tasks": ["Revise JWT flow", "Practice auth interview questions", "Prepare one project example"]
        }
      ]
    }

    Candidate Profile:
    ${resume}
    Self Description:
    ${selfDescription}
    Job Description:
    ${jobDescription}
    `;


    const responseText = await generateStructuredContent(strictPrompt)

    // try {
    //     const parsed = JSON.parse(response.text);
    //     const validated = interViewReportSchema.parse(parsed);
    //     console.log(validated);
    //     console.log(parsed);
    // } catch (err) {
    //     console.log("❌ Invalid JSON, raw output:");
    //     console.log(response.text);
    // }

    const parsed = JSON.parse(responseText)
    const normalized = normalizeInterviewReport(parsed)

    return interViewReportSchema.parse(normalized)
}

module.exports = genrateInterviewReport
