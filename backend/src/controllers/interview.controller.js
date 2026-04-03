const pdfParse = require('pdf-parse')
const {genrateInterviewReport,genrateResumePdf} = require('../services/ai.service.js')
const interviewReportModel = require('../models/interviewReport.model.js')

async function generateInterviewReportController(req,res) {
    try {
        const {selfDescription,jobDescription} = req.body
        const resumeFile = req.file

        if (!jobDescription?.trim()) {
            return res.status(400).json({
                message:"Job description is required"
            })
        }

        if (!resumeFile && !selfDescription?.trim()) {
            return res.status(400).json({
                message:"Please provide a resume PDF or a self description"
            })
        }

        let resumeContent = ""

        if (resumeFile) {
            const parser = new pdfParse.PDFParse({ data: resumeFile.buffer })
            const parsedResume = await parser.getText()
            resumeContent = parsedResume.text
            await parser.destroy()
        }

        const interViewReportByAi = await genrateInterviewReport({
            resume:resumeContent,
            selfDescription,
            jobDescription
        })

        const interviewReport = await interviewReportModel.create({
            user:req.user.id,
            resume:resumeContent,
            selfDescription,
            jobDescription,
            ...interViewReportByAi
        })

        res.status(201).json({
            message:"Interview report genrated succ",
            interviewReport
        })
    } catch (error) {
        console.error("Interview report generation failed:", error.message)

        if (error.cause) {
            console.error("AI provider error:", error.cause)
        }

        const statusCode = error.statusCode || 500
        const message = statusCode === 503
            ? "AI service is busy right now. Please retry in a moment."
            : statusCode === 422
            ? "AI could not generate a reliable interview report. Please retry with a clearer job description and profile details."
            : "Failed to generate interview report."

        return res.status(statusCode).json({ message })
    }

}

async function getInterviewReportByIdController(req,res) {
    const {interviewId} = req.params
    const interviewReport = await interviewReportModel.findOne({_id:interviewId,user:req.user.id})
    if(!interviewReport){
        return res.status(404).json({
            message:"Interview report not found"
        })
    }

    res.status(200).json({
        message:"Interview Report fetched successfully",
        interviewReport
    })
}

async function getAllInterviewReportsController(req,res) {
    const interviewReports = await interviewReportModel.find({user:req.user.id}).sort({createdAt:-1}).select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")

    res.status(200).json({
        message:"Interveiew reports fetched",
        interviewReports
    })
}

async function deleteInterviewReportController(req,res) {
    const {interviewId} = req.params

    const deletedReport = await interviewReportModel.findOneAndDelete({
        _id: interviewId,
        user: req.user.id
    })

    if(!deletedReport){
        return res.status(404).json({
            message:"Interview report not found"
        })
    }

    res.status(200).json({
        message:"Interview report deleted successfully"
    })
}

/**
 * @description
 */
async function generateResumePdfController(req,res) {
    try {
        const {interviewReportId} = req.params

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewReportId,
            user: req.user.id
        })

        if(!interviewReport){
            return res.status(404).json({
                message:"Interview report not found"
            })
        }

        const {resume,selfDescription,jobDescription,title} = interviewReport
        const pdfBuffer = await genrateResumePdf({resume,selfDescription,jobDescription})
        const safeTitle = String(title || "resume")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "")

        res.set({
            "Content-Type":"application/pdf",
            "Content-Disposition":`attachment; filename=${safeTitle || "resume"}_${interviewReportId}.pdf`
        })
        res.send(pdfBuffer)
    } catch (error) {
        console.error("Resume PDF generation failed:", error.message)

        if (error.cause) {
            console.error("AI provider error:", error.cause)
        }

        const statusCode = error.statusCode || 500
        const message = statusCode === 503
            ? "AI service is busy right now. Please retry in a moment."
            : "Failed to generate resume PDF."

        return res.status(statusCode).json({ message })
    }

}

module.exports = {generateInterviewReportController,getInterviewReportByIdController,getAllInterviewReportsController,deleteInterviewReportController,generateResumePdfController}
