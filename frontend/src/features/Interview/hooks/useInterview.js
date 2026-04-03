import {
    generateInterviewReport,
    deleteInterviewReport,
    generateResumePdf,
    getAllInterviewReports,
    getInterviewReportById
} from "../services/interview.api.js";
import { useCallback, useContext } from "react";
import { InterviewContext } from "../interview.context.js";

export const useInterview = () => {
    const context = useContext(InterviewContext)

    if(!context){
        throw new Error("useInterview must be within an InterviewProvider")
    }

    const {loading,setLoading,report,setReport,reports,setReports} = context

    const generateReport = useCallback(async ({jobDescription,selfDescription,resumeFile}) => {
        setLoading(true)
        try{
            const response = await generateInterviewReport({jobDescription,selfDescription,resumeFile})
            setReport(response.interviewReport)
            return response.interviewReport
        }catch(err){
            console.log(err);   
            throw err
        }finally{
            setLoading(false)
        }
    }, [setLoading, setReport])

    const getReportById = useCallback(async (interviewId) => {
        setLoading(true)
        try{
            const response = await getInterviewReportById({ interviewId })
            setReport(response.interviewReport)
            return response.interviewReport
        }catch(err){
            console.log(err);   
            throw err
        }finally{
            setLoading(false)
        }
    }, [setLoading, setReport])

    const getReports = useCallback(async () => {
        setLoading(true)
        try{
            const response = await getAllInterviewReports()
            setReports(response.interviewReports)
            return response.interviewReports
        }catch(err){
            console.log(err);   
            throw err
        }finally{
            setLoading(false)
        }
    }, [setLoading, setReports])

    const removeReport = useCallback(async (interviewId) => {
        setLoading(true)
        try {
            await deleteInterviewReport({ interviewId })
            setReports((currentReports) => currentReports.filter((reportItem) => reportItem._id !== interviewId))
            setReport((currentReport) => currentReport?._id === interviewId ? null : currentReport)
        } catch (err) {
            console.log(err);
            throw err
        } finally {
            setLoading(false)
        }
    }, [setLoading, setReport, setReports])

    const downloadResumePdf = useCallback(async (interviewId) => {
        setLoading(true)
        try {
            const response = await generateResumePdf({ interviewId })
            return response
        } catch (err) {
            console.log(err);
            throw err
        } finally {
            setLoading(false)
        }
    }, [setLoading])

    return {loading,report,reports,generateReport,getReportById,getReports,removeReport,downloadResumePdf}
}
