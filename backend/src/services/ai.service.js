const { GoogleGenAI } = require('@google/genai')
const { z } = require('zod')
const { zodToJsonSchema } = require('zod-to-json-schema')
// const {resume,selfdescribe,jobdescribe} = require('./temp.js')

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
});

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


async function genrateInterviewReport({ resume, selfdescribe, jobdescribe }) {

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
    ${selfdescribe}
    Job Description:
    ${jobdescribe}
    `;


    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: zodToJsonSchema(interViewReportSchema),
          
        }
    })

    try {
        const parsed = JSON.parse(response.text);
        const validated = interViewReportSchema.parse(parsed);
        console.log(validated);
        console.log(parsed);
    } catch (err) {
        console.log("❌ Invalid JSON, raw output:");
        console.log(response.text);
    }

    return parsed
}

module.exports = genrateInterviewReport
