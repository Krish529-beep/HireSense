const express = require('express');
const authMiddlewear = require('../middlewaers/auth.middlewaer.js')
const interviewRouter = express.Router()
const interviewController = require('../controllers/interview.controller.js')
const upload = require('../middlewaers/file.middlewaer.js')

/**
 * @route Post api/interview
 * @description genrate new interview report on the basis of user seld desc , resume pdf and job desc
 * @access Private
 */

interviewRouter.post('/',authMiddlewear.authUser,upload.single('resume'),interviewController.generateInterviewReportController)

/**
 * @route GET /api/interview/:interviewId
 * @description get interview report by interviewId
 * @access Private
 * 
 */
interviewRouter.get('/report/:interviewId',authMiddlewear.authUser,interviewController.getInterviewReportByIdController)

/**
 * @route GET /api/interview/
 * @description get all interview reports of logged in user.
 * @acess Private
 */
interviewRouter.get("/",authMiddlewear.authUser,interviewController.getAllInterviewReportsController)

/**
 * @route DELETE /api/interview/report/:interviewId
 * @description delete interview report by interviewId
 * @access Private
 */
interviewRouter.delete('/report/:interviewId',authMiddlewear.authUser,interviewController.deleteInterviewReportController)

interviewRouter.post('/resume/pdf/:interviewReportId',authMiddlewear.authUser,interviewController.generateResumePdfController)
interviewRouter.post('/report/:interviewId/chat',authMiddlewear.authUser,interviewController.generateInterviewChatController)



module.exports =  interviewRouter
