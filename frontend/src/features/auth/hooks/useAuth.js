import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout, getMe } from "../services/auth.api"

// Hook layer's main task is to maintain the flow
export const useAuth = () => {
    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context

    const handelLogin = async ({ email, password }) => {
        setLoading(true)
        try {
            const data = await login({ email, password })
            setUser(data.user)
            return true
        } catch (error) {
            console.log(error.response?.data?.message || error.message)
            return false
        } finally {
            setLoading(false)
        }
    }

    const handleRegister = async (data) => {
        setLoading(true)
        try {
            const res = await register(data)
            setUser(res.user)
            return true
        } catch (error) {
            console.log(error.response?.data?.message || error.message)
            return false
        } finally {
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
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const getAndSetUser = async () => {
            try {
                
                const data = await getMe();
                setUser(data.user);
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        getAndSetUser();
    }, []);


    return { user, loading, handelLogin, handleRegister, handelLogout, }
}