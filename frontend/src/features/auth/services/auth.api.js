import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
})

// by default axios does not give the access to set cookies so we use withcredentials true
export async function register({username,email,password}) {
    const response = await  api.post('/api/auth/register',{
        username,email,password 
    })
    return response.data
}

export async function login({email,password}) {
    const response= await api.post('/api/auth/login',{email,password})
    return response.data
}

export async function logout() {
    const response= await  api.get('/api/auth/logout')
    return response.data
}

export async function getMe(){
    try {
        const response = await api.get('/api/auth/get-me');
        return response.data;
    } catch (error) {
        console.log(error.response?.data?.message || error.message);
        throw error; 
    }
}
