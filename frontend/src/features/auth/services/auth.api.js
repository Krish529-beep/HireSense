import axios from "axios"
const api = axios.create({
    baseURL:"http://localhost:3000",
    withCredentials:true
})

// by default axios does not give the access to set cookies so we use withcredentials true
export async function register({username,email,password}) {
    try{
        const response = await  api.post('/api/auth/register',{
        username,email,password 
    })
    return response.data
    }catch(err){
        console.log(err);
    }

}

export async function login({email,password}) {
    try {
        const response= await api.post('/api/auth/login',{email,password})
        console.log(response);
        
        return response.data

    } catch (error) {
        console.log(error);
        
    }
}

export async function logout() {
    try {
        const response= await  api.get('/api/auth/logout')

        return response.data

    } catch (error) {
        
    }
}

