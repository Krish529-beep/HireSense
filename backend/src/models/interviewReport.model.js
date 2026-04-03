const mongoose = require('mongoose')

// 🔹 Technical Questions
const technicalQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
    },
    intention: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    }
}, { _id: false })

// 🔹 Behavioral Questions
const behavioralQuestionSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true,
    },
    intention: {
        type: String,
        required: true
    },
    answer: {
        type: String,
        required: true
    }
}, { _id: false })

// 🔹 Skill Gaps
const skillGapSchema = new mongoose.Schema({
    skill: {
        type: String,
        required: true
    },
    severity: {
        type: String,
        enum: ["low", "medium", "high"],
        required: true
    }
}, { _id: false })

// 🔹 Preparation Plan
const preparationPlanSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: true
    },
    focus: {
        type: String,
        required: true
    },
    tasks: [{
        type: String,
        required: true
    }]
}, { _id: false }) // 👈 added consistency

// 🔹 Main Schema
const interviewReportSchema = new mongoose.Schema({
    jobDescription: {
        type: String, // ✅ FIXED
        required: true
    },
    resume: {
        type: String,
    },
    selfDescription: {
        type: String,
    },
    matchScore: {
        type: Number,
        min: 0,
        max: 100
    },
    technicalQuestions: [technicalQuestionSchema],
    behavioralQuestions: [behavioralQuestionSchema],
    skillGaps: [skillGapSchema],
    preparationPlan: [preparationPlanSchema],
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users"
    }
}, {
    timestamps: true
})

const interviewReportModel = mongoose.model("InterviewReport", interviewReportSchema)

module.exports = interviewReportModel