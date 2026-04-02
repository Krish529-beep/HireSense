import React from 'react'
import "../auth.form.scss"
import { useNavigate,Link } from "react-router"


function Register() {

  const navigate = useNavigate()

  const handleSubmit = (e) =>{
        e.preventDefault()
    }

  return (
     <main>
        <div className="form-container">
            <h1>Register</h1>
            <form action="">
              <div className="input-group">
                    <label htmlFor="Username">Username:</label>
                    <input type="text" id='Username' name='Username' placeholder='Username'/>
                </div>
                <div className="input-group">
                    <label htmlFor="email">Email:</label>
                    <input type="email" id='email' name='email' placeholder='Enter email address'/>
                </div>
                <div className="input-group">
                    <label htmlFor="password">Password:</label>
                    <input type="password" id='password' name='password' placeholder='***'/>
                </div>
                <button className='button primary-button' onSubmit={handleSubmit}>Register</button>
            </form>
            <br/>
            <p  className=''>Alredy have an account ? <Link to={'/login'}>  Login</Link></p>
        </div>
    </main>
  )
}

export default Register