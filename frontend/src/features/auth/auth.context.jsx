import {createContext,useState} from 'react'     

export const AuthContext = createContext()

export const AuthProvider = ({children}) => {
    const [user,setUser] = useState(null)
    const [lodaing,setLoading] = useState(false) // in production it is set to true
     
    return(
        <AuthContext.Provider value={{user,setUser,lodaing,setLoading}} >
            {children}
        </AuthContext.Provider>
    )
}