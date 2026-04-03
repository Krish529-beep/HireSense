import {
    generateInterviewReport,
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

    return {loading,report,reports,generateReport,getReportById,getReports}
}
