import { useAuth } from "../hooks/useAuth"; 
import { Navigate } from "react-router";


function Protected({children}) {
    const {user,loading} = useAuth()
    // const navigate = useNavigate()

    if(loading){
        return (
             <main className="app-loader-screen">
                <div className="app-loader-panel" role="status" aria-live="polite">
                    <div className="app-loader-spinner" aria-hidden="true"></div>
                    <span className="app-loader-kicker">Preparing workspace</span>
                    <h2>Loading your session</h2>
                    <p>We are checking your account and restoring your interview workspace.</p>
                </div>
             </main>
        )
    }
    if(!user){
        return <Navigate to={'/login'}/>
    }
    return children
}

export default Protected

