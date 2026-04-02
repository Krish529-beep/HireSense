import {createContext,useEffect,useState} from 'react'     
import {getMe} from './services/auth.api.js'


export const AuthContext = createContext()

export const AuthProvider = ({children}) => {
    const [user,setUser] = useState(null)
    const [loading,setLoading] = useState(true) // in production it is set to true
    
    
    return(
        <AuthContext.Provider value={{user,setUser,loading,setLoading}} >
            {children}
        </AuthContext.Provider>
    )
}