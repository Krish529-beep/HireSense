import { useAuth } from "../hooks/useAuth"; 
import { Navigate, useNavigate } from "react-router";


function Protected({children}) {
    const {user,loading} = useAuth()
    // const navigate = useNavigate()

    if(loading){
        return (
             <main><h1>Loading...</h1></main>
        )
    }
    if(!user){
        return <Navigate to={'/login'}/>
    }
    return children
}

export default Protected

