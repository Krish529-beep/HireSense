import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context.js";
import { login, register, logout, getMe } from "../services/auth.api";

// Hook layer's main task is to maintain the flow
export const useAuth = () => {
    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context

    const handelLogin = async ({ email, password }) => {
        setLoading(true)
        try {
            const response = await login({ email, password })
            setUser(response.user)
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
            await logout()
            setUser(null)
        } catch (error) {
            console.log(error);
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        let isMounted = true;

        const getAndSetUser = async () => {
            try {
                const data = await getMe();
                if (isMounted) {
                    setUser(data.user);
                }
            } catch {
                if (isMounted) {
                    setUser(null);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        getAndSetUser();

        return () => {
            isMounted = false;
        };
    }, [setLoading, setUser]);


    return { user, loading, handelLogin, handleRegister, handelLogout, }
}
