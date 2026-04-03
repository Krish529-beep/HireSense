import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials:true
})

export  const generateInterviewReport= async({jobDescription,selfDescription,resumeFile})=>{
    const formData = new FormData()
    formData.append("jobDescription",jobDescription)
    formData.append("selfDescription",selfDescription)

    if (resumeFile) {
        formData.append("resume",resumeFile)
    }

    const response = await api.post("/api/interview",formData,{
        headers:{
            "Content-Type":"multipart/form-data"
        }
    })
    return response.data
}

export const getInterviewReportById = async ({interviewId}) => {
    const response  = await api.get(`/api/interview/report/${interviewId}`)

    return response.data
}

export const getAllInterviewReports = async () => {
    const response = await api.get("/api/interview/")

    return response.data
}

export const deleteInterviewReport = async ({ interviewId }) => {
    const response = await api.delete(`/api/interview/report/${interviewId}`)

    return response.data
}

export const generateResumePdf = async ({ interviewId }) => {
    const response = await api.post(`/api/interview/resume/pdf/${interviewId}`, null, {
        responseType: "blob",
    })

    return {
        blob: response.data,
        contentDisposition: response.headers["content-disposition"],
    }
}
