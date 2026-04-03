import { useState } from "react";
import { AuthContext } from "./auth.context.js";

export const AuthProvider = ({children}) => {
    const [user,setUser] = useState(null)
    const [loading,setLoading] = useState(true) // in production it is set to true
    
    
    return(
        <AuthContext.Provider value={{user,setUser,loading,setLoading}} >
            {children}
        </AuthContext.Provider>
    )
}
