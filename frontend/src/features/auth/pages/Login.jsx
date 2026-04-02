import React from 'react'
import "../auth.form.scss"

const Login = () => {
  return (
    <main>
        <div className="form-container">
            <h1>Login</h1>
            <form action="">
                <div className="input-group">
                    <label htmlFor="email">Email:</label>
                    <input type="email" id='email' name='email' placeholder='Enter email address'/>
                </div>
                <div className="input-group">
                    <label htmlFor="password">Password:</label>
                    <input type="password" id='password' name='password' placeholder='***'/>
                </div>
                <button className='button primary-button'>Login</button>
            </form>
        </div>
    </main>
  )
}

export default Login