const { GoogleGenAI } = require('@google/genai')
const puppeteer = require('puppeteer')
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
const DEFAULT_TECHNICAL_INTENTION = "Assess relevant technical knowledge for the role."
const DEFAULT_TECHNICAL_ANSWER = "Give a structured, example-driven answer and explain tradeoffs."
const DEFAULT_BEHAVIORAL_INTENTION = "Assess communication, ownership, and teamwork."
const DEFAULT_BEHAVIORAL_ANSWER = "Use the STAR format with a concrete example and measurable outcome."
const DEFAULT_PLAN_TASKS = ["Review fundamentals", "Practice targeted questions", "Revise project examples"]

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

function stripWrappingQuotes(value) {
    const text = toCleanString(value)
    return text.replace(/^"+|"+$/g, "").trim()
}

function extractQuotedValue(text, key) {
    if (typeof text !== "string") {
        return ""
    }

    const patterns = [
        new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "i"),
        new RegExp(`${key}"?\\s*:\\s*"([^"]+)"`, "i"),
        new RegExp(`${key}\\s*:\\s*"([^"]+)"`, "i"),
        new RegExp(`"${key}"\\s*:\\s*([^,}\\]]+)`, "i"),
        new RegExp(`${key}\\s*:\\s*([^,}\\]]+)`, "i"),
    ]

    for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match?.[1]) {
            return stripWrappingQuotes(match[1])
        }
    }

    return ""
}

function cleanupLabeledText(value, key, fallback = "") {
    const text = toCleanString(value, fallback)
    const parsedObject = tryParseJsonString(text)
    if (parsedObject && typeof parsedObject === "object" && !Array.isArray(parsedObject)) {
        return cleanupLabeledText(parsedObject[key] ?? text, key, fallback)
    }

    const extracted = extractQuotedValue(text, key)
    if (extracted) {
        return extracted
    }

    return text
        .replace(new RegExp(`^"?${key}"?\\s*:\\s*`, "i"), "")
        .replace(/^"+|"+$/g, "")
        .replace(/[}",\]]+$/g, "")
        .trim() || fallback
}

function extractTasksFromText(value) {
    const text = toCleanString(value)
    if (!text) {
        return []
    }

    const arrayMatch = text.match(/"tasks"\s*:\s*\[([\s\S]*?)\]/i) || text.match(/tasks\s*:\s*\[([\s\S]*?)\]/i)
    if (arrayMatch?.[1]) {
        return arrayMatch[1]
            .split(/","|",\s*"|",|"\s*,\s*"/)
            .map((item) => stripWrappingQuotes(item))
            .filter(Boolean)
    }

    return []
}

function extractLabeledEntries(text, keys) {
    if (typeof text !== "string") {
        return []
    }

    const pattern = /"(question|intention|answer|skill|severity|day|focus|tasks)"\s*:\s*("(?:[^"\\]|\\.)*"|\[[\s\S]*?\]|[^,\]}]+)/gi
    const entries = []
    let match = pattern.exec(text)

    while (match) {
        const key = match[1]
        const value = stripWrappingQuotes(match[2])
        if (keys.includes(key)) {
            entries.push({ key, value })
        }
        match = pattern.exec(text)
    }

    return entries
}

function normalizeQuestionItem(item, index) {
    const parsedStringObject = tryParseJsonString(item)
    if (parsedStringObject && typeof parsedStringObject === "object" && !Array.isArray(parsedStringObject)) {
        return normalizeQuestionItem(parsedStringObject, index)
    }

    if (item && typeof item === "object" && !Array.isArray(item)) {
        return {
            question: cleanupLabeledText(item.question, "question", `Question ${index + 1}`),
            intention: cleanupLabeledText(item.intention, "intention", "Assess relevant knowledge and communication."),
            answer: cleanupLabeledText(item.answer, "answer", "Give a structured answer with clear examples and outcomes."),
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
        question: cleanupLabeledText(text, "question", `Question ${index + 1}`),
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
            skill: cleanupLabeledText(item.skill, "skill", "Unspecified skill gap"),
            severity,
        }
    }

    const severity = extractQuotedValue(toCleanString(item), "severity")

    return {
        skill: cleanupLabeledText(item, "skill", "Unspecified skill gap"),
        severity: ["low", "medium", "high"].includes(severity) ? severity : "medium",
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
        const extractedTasks = Array.isArray(item.tasks) ? item.tasks : extractTasksFromText(item.tasks)
        return {
            day: Number.isFinite(Number(item.day)) ? Number(item.day) : index + 1,
            focus: cleanupLabeledText(item.focus, "focus", `Preparation Focus ${index + 1}`),
            tasks: normalizePreparationTasks(extractedTasks.length > 0 ? extractedTasks : item.tasks),
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
        focus: cleanupLabeledText(text, "focus", `Preparation Focus ${index + 1}`),
        tasks: normalizePreparationTasks(extractTasksFromText(text).length > 0 ? extractTasksFromText(text) : ["Review fundamentals", "Practice answering relevant questions", "Revise examples from past work"]),
    }
}

function ensureMinimumArrayItems(items, factory, minimumCount) {
    const result = [...items]

    while (result.length < minimumCount) {
        result.push(factory(result.length))
    }

    return result
}

function isPlaceholderToken(value) {
    const normalized = toCleanString(value).toLowerCase()
    return [
        "question",
        "intention",
        "answer",
        "skill",
        "severity",
        "focus",
        "tasks",
        "day"
    ].includes(normalized)
}

function extractObjectTriplets(items, keys) {
    const cleanedItems = items
        .map((item) => toCleanString(item))
        .filter(Boolean)
        .filter((item) => !isPlaceholderToken(item))

    const grouped = []
    for (let index = 0; index + keys.length - 1 < cleanedItems.length; index += keys.length) {
        const entry = {}
        keys.forEach((key, keyIndex) => {
            entry[key] = cleanedItems[index + keyIndex]
        })
        grouped.push(entry)
    }

    return grouped
}

function extractPreparationItems(items) {
    const cleanedItems = items
        .map((item) => item)
        .filter((item) => item !== null && item !== undefined)

    const grouped = []
    let current = null

    for (const rawItem of cleanedItems) {
        const text = toCleanString(rawItem)
        if (!text || isPlaceholderToken(text)) {
            continue
        }

        const parsedDay = Number(text)
        if (Number.isFinite(parsedDay) && String(parsedDay) === text) {
            if (current) {
                grouped.push(current)
            }
            current = { day: parsedDay, focus: "", tasks: [] }
            continue
        }

        if (!current) {
            current = { day: grouped.length + 1, focus: "", tasks: [] }
        }

        if (!current.focus) {
            current.focus = text
            continue
        }

        current.tasks.push(text)
    }

    if (current) {
        grouped.push(current)
    }

    return grouped
}

function isGenericQuestionLabel(value) {
    return /^(technical|behavioral)\s+question\s+\d+$/i.test(toCleanString(value))
}

function isGenericSkillLabel(value) {
    const text = toCleanString(value)
    return /^skill gap\s+\d+$/i.test(text) || /^(relevant|unspecified) skill gap$/i.test(text)
}

function isGenericPlanFocus(value) {
    return /^preparation focus\s+\d+$/i.test(toCleanString(value))
}

function hasMeaningfulQuestion(item, type) {
    const defaultIntention = type === "technical" ? DEFAULT_TECHNICAL_INTENTION : DEFAULT_BEHAVIORAL_INTENTION
    const defaultAnswer = type === "technical" ? DEFAULT_TECHNICAL_ANSWER : DEFAULT_BEHAVIORAL_ANSWER
    const question = toCleanString(item.question)
    const intention = toCleanString(item.intention)
    const answer = toCleanString(item.answer)

    return (
        question.length >= 24 &&
        !isGenericQuestionLabel(question) &&
        !isPlaceholderToken(question) &&
        intention.length >= 18 &&
        intention !== defaultIntention &&
        answer.length >= 24 &&
        answer !== defaultAnswer
    )
}

function hasMeaningfulSkillGap(item) {
    const skill = toCleanString(item.skill)
    return skill.length >= 6 && !isGenericSkillLabel(skill) && !isPlaceholderToken(skill)
}

function hasMeaningfulPlanDay(item) {
    const focus = toCleanString(item.focus)
    const tasks = Array.isArray(item.tasks) ? item.tasks.map((task) => toCleanString(task)).filter(Boolean) : []

    return (
        focus.length >= 10 &&
        !isGenericPlanFocus(focus) &&
        !isPlaceholderToken(focus) &&
        tasks.length >= 2 &&
        tasks.some((task) => !DEFAULT_PLAN_TASKS.includes(task) && task.length >= 12)
    )
}

function assertReportQuality(report) {
    const qualitySignals = {
        title: toCleanString(report.title).length >= 4 && toCleanString(report.title) !== "Interview Preparation Plan",
        technicalQuestions: report.technicalQuestions.filter((item) => hasMeaningfulQuestion(item, "technical")).length,
        behavioralQuestions: report.behavioralQuestions.filter((item) => hasMeaningfulQuestion(item, "behavioral")).length,
        skillGaps: report.skillGaps.filter(hasMeaningfulSkillGap).length,
        preparationPlan: report.preparationPlan.filter(hasMeaningfulPlanDay).length,
    }

    const isReliable =
        qualitySignals.title &&
        qualitySignals.technicalQuestions >= 4 &&
        qualitySignals.behavioralQuestions >= 3 &&
        qualitySignals.skillGaps >= 2 &&
        qualitySignals.preparationPlan >= 3

    if (!isReliable) {
        const qualityError = new Error("AI returned a low-quality interview report.")
        qualityError.statusCode = 422
        qualityError.details = qualitySignals
        throw qualityError
    }
}

function normalizeInterviewReport(raw) {
    const technicalQuestionSource = Array.isArray(raw.technicalQuestions)
        ? raw.technicalQuestions
        : []
    const behavioralQuestionSource = Array.isArray(raw.behavioralQuestions)
        ? raw.behavioralQuestions
        : []
    const skillGapSource = Array.isArray(raw.skillGaps)
        ? raw.skillGaps
        : []
    const preparationPlanSource = Array.isArray(raw.preparationPlan)
        ? raw.preparationPlan
        : []

    const technicalLabeledEntries = technicalQuestionSource.flatMap((item) => {
        if (typeof item === "string") {
            return extractLabeledEntries(item, ["question", "intention", "answer"])
        }

        if (item && typeof item === "object") {
            return ["question", "intention", "answer"].flatMap((key) =>
                extractLabeledEntries(toCleanString(item[key]), ["question", "intention", "answer"])
            )
        }

        return []
    })

    const behavioralLabeledEntries = behavioralQuestionSource.flatMap((item) => {
        if (typeof item === "string") {
            return extractLabeledEntries(item, ["question", "intention", "answer"])
        }

        if (item && typeof item === "object") {
            return ["question", "intention", "answer"].flatMap((key) =>
                extractLabeledEntries(toCleanString(item[key]), ["question", "intention", "answer"])
            )
        }

        return []
    })

    const skillLabeledEntries = skillGapSource.flatMap((item) => {
        if (typeof item === "string") {
            return extractLabeledEntries(item, ["skill", "severity"])
        }

        if (item && typeof item === "object") {
            return ["skill", "severity"].flatMap((key) =>
                extractLabeledEntries(toCleanString(item[key]), ["skill", "severity"])
            )
        }

        return []
    })

    const planLabeledEntries = preparationPlanSource.flatMap((item) => {
        if (typeof item === "string") {
            return extractLabeledEntries(item, ["day", "focus", "tasks"])
        }

        if (item && typeof item === "object") {
            return ["day", "focus", "tasks"].flatMap((key) =>
                extractLabeledEntries(toCleanString(item[key]), ["day", "focus", "tasks"])
            )
        }

        return []
    })

    const regroupQuestions = (entries) => {
        const grouped = []
        let current = {}

        entries.forEach(({ key, value }) => {
            if (key === "question" && (current.question || current.intention || current.answer)) {
                grouped.push(normalizeQuestionItem(current, grouped.length))
                current = {}
            }

            current[key] = value

            if (current.question && current.intention && current.answer) {
                grouped.push(normalizeQuestionItem(current, grouped.length))
                current = {}
            }
        })

        return grouped
    }

    const regroupSkills = (entries) => {
        const grouped = []
        let current = {}

        entries.forEach(({ key, value }) => {
            if (key === "skill" && (current.skill || current.severity)) {
                grouped.push(normalizeSkillGapItem(current))
                current = {}
            }

            current[key] = value

            if (current.skill && current.severity) {
                grouped.push(normalizeSkillGapItem(current))
                current = {}
            }
        })

        return grouped
    }

    const regroupPlan = (entries) => {
        const grouped = []
        let current = {}

        entries.forEach(({ key, value }) => {
            if (key === "day" && (current.day || current.focus || current.tasks)) {
                grouped.push(normalizePreparationPlanItem(current, grouped.length))
                current = {}
            }

            if (key === "tasks") {
                current.tasks = extractTasksFromText(`tasks:[${value}]`)
            } else {
                current[key] = value
            }
        })

        if (Object.keys(current).length > 0) {
            grouped.push(normalizePreparationPlanItem(current, grouped.length))
        }

        return grouped
    }

    const technicalQuestions = technicalLabeledEntries.length >= 3
        ? regroupQuestions(technicalLabeledEntries)
        : technicalQuestionSource.every((item) => typeof item === "string")
            ? extractObjectTriplets(technicalQuestionSource, ["question", "intention", "answer"]).map(normalizeQuestionItem)
            : technicalQuestionSource.map(normalizeQuestionItem)

    const behavioralQuestions = behavioralLabeledEntries.length >= 3
        ? regroupQuestions(behavioralLabeledEntries)
        : behavioralQuestionSource.every((item) => typeof item === "string")
            ? extractObjectTriplets(behavioralQuestionSource, ["question", "intention", "answer"]).map(normalizeQuestionItem)
            : behavioralQuestionSource.map(normalizeQuestionItem)

    const skillGaps = skillLabeledEntries.length >= 2
        ? regroupSkills(skillLabeledEntries)
        : skillGapSource.every((item) => typeof item === "string")
            ? extractObjectTriplets(skillGapSource, ["skill", "severity"]).map(normalizeSkillGapItem)
            : skillGapSource.map(normalizeSkillGapItem)

    const preparationPlan = planLabeledEntries.length >= 3
        ? regroupPlan(planLabeledEntries)
        : preparationPlanSource.every((item) => typeof item !== "object" || item === null)
            ? extractPreparationItems(preparationPlanSource).map(normalizePreparationPlanItem)
            : preparationPlanSource.map(normalizePreparationPlanItem)

    return {
        title: toCleanString(raw.title, "Interview Preparation Plan"),
        matchScore: Math.max(0, Math.min(100, Math.round(Number(raw.matchScore) || 0))),
        technicalQuestions: technicalQuestions
            .slice(0, 8)
            .filter((item) => !isPlaceholderToken(item.question)),
        behavioralQuestions: behavioralQuestions
            .slice(0, 6)
            .filter((item) => !isPlaceholderToken(item.question)),
        skillGaps: skillGaps
            .slice(0, 10)
            .filter((item) => !isPlaceholderToken(item.skill)),
        preparationPlan: preparationPlan
            .slice(0, 10)
            .filter((item) => !isPlaceholderToken(item.focus))
            .map((item, index) => ({
            ...item,
            day: index + 1,
            tasks: item.tasks.slice(0, 5).filter(Boolean),
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

async function generateStructuredContent(prompt, responseSchema) {
    let lastError = null

    for (const model of AI_MODEL_CANDIDATES) {
        for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt += 1) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        responseMimeType: 'application/json',
                        responseSchema: zodToJsonSchema(responseSchema),
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

async function generatePdfFormHtml(htmlcontent){
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.setContent(htmlcontent, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({ format: 'A4' })
    await browser.close()
    return pdfBuffer

}

async function genrateResumePdf({resume,selfDescription,jobDescription}){
    const resumePdfSchema = z.object({
        html:z.string().describe("The html contenet of the resume which can be converted to PDF using any libreary like puppeteer")
         
    })
    const prompt = `
    You are an expert resume writer. Create a polished, job-targeted resume in HTML for PDF export.

    Return ONLY valid JSON with exactly this shape:
    {
      "html": "<full HTML document>"
    }

    Hard rules:
    - The html field must contain a complete HTML document with <!DOCTYPE html>, html, head, body, and inline CSS.
    - Do not include markdown, explanations, comments, code fences, scripts, external stylesheets, web fonts, images, or SVG.
    - The design must be professional, modern, ATS-friendly, and readable when exported to A4 PDF.
    - Use white background, dark text, strong spacing, subtle borders, and clear headings.
    - Keep content concise and tailored to the target role.
    - Do not invent employers, dates, degrees, certifications, or achievements that are not supported by the input.
    - If the input is incomplete, write honest and strong summary language instead of fabricating facts.
    - Emphasize role-relevant skills, projects, tools, achievements, and impact.

    Preferred sections:
    - Header
    - Professional Summary
    - Core Skills
    - Experience or Project Experience
    - Selected Projects
    - Education

    Writing rules:
    - Use sharp bullet points with action verbs.
    - Focus on measurable impact where supported by the input.
    - Avoid generic filler and avoid sounding AI-generated.
    - Optimize the resume specifically for the target job description.

    Candidate resume content:
    ${resume}

    Candidate self description:
    ${selfDescription}

    Target job description:
    ${jobDescription}
    `
    const responseText = await generateStructuredContent(prompt, resumePdfSchema)
    const jsonContent = JSON.parse(responseText)
    const pdfBuffer = await generatePdfFormHtml(jsonContent.html)
    return pdfBuffer
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


    const responseText = await generateStructuredContent(strictPrompt, interViewReportSchema)

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
    assertReportQuality(normalized)

    return interViewReportSchema.parse(normalized)
}

module.exports = {genrateInterviewReport,genrateResumePdf}
