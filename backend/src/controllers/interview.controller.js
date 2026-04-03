const pdfParse = require('pdf-parse')
const genrateInterviewReport = require('../services/ai.service.js')
const interviewReportModel = require('../models/interviewReport.model.js')

async function generateInterviewReportController(req,res) {
    const resumeFile = req.file
    const resumeContent = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
    const {selfdescribe,jobdescribe} = req.body
    const interViewReportByAi = await genrateInterviewReport({
        resume:resumeContent.text,
        selfdescribe:selfdescribe,
        jobdescribe:jobdescribe
    })

    const interviewReport = await interviewReportModel.create({
        user:req.user.id,
        resume:resumeContent.text,
        selfDescription,
        jobDescription,
        ...interViewReportByAi
    })

    res.status(201).json({
        message:"Interview report genrated succ",
        interviewReport
    })

}

module.exports = {generateInterviewReportController}