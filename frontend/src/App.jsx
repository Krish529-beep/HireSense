import { RouterProvider } from "react-router"
import { router } from "./app.route"
import { AuthProvider } from "./features/auth/auth.context.jsx"
import { InterviewProvider } from "./features/Interview/interview.context.jsx"

function App() {
  return (
    <AuthProvider>
      <InterviewProvider>
        <div className="app-shell">
          <RouterProvider router={router}/>
          <div className="global-ai-note" role="note">
            AI-generated interview plans can make mistakes. Review the output before relying on it.
          </div>
        </div>
      </InterviewProvider>
    </AuthProvider>
  )
}

export default App
