import { useContext } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout,  } from "../services/auth.api"

// Hook layer's main task is to maintain the flow
export const useAuth = () => {
    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context

    const handelLogin = async ({ email, password }) => {
        setLoading(true)
        try {
            const data = await login({ email, password })
            setUser(data.user)
        } catch (error) {
            console.log(error);
            
        }finally{
             setLoading(false)
        }
    }

    const handleRegister = async ({ username, email, password }) => {
        setLoading(true)
        try {
            const data = await register({ username, email, password })
            setUser(data.user)
        } catch (error) {
            console.log(error);
            
        }finally{
            setLoading(false)
        }   
    }

    const handelLogout = async () => {
        setLoading(true)
        try {
             const data = await logout()
            setUser(null)
        } catch (error) {
            console.log(error);   
        }finally{
             setLoading(false)
        }
    }

    return { user, loading, handelLogin, handleRegister, handelLogout }
}