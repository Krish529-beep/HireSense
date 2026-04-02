import React, { useState } from 'react'
import "../auth.form.scss"
import { useNavigate, Link } from "react-router"
import { useAuth } from '../hooks/useAuth'


function Register() {


    const { loading, handleRegister } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState()
    const [password, setPassword] = useState()
    const [username, setUsername] = useState()

    const handleSubmit = async (e) => {
        e.preventDefault();
        await handleRegister({ username, email, password })
        navigate('/')
    }

    if (loading) {
        return (
            <main>
                Loading
            </main>
        )
    }


    return (
        <main>
            <div className="form-container">
                <h1>Register</h1>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="Username">Username:</label>
                        <input
                            onChange={(e) => { setUsername(e.target.value) }}
                            type="text" id='Username' name='Username' placeholder='Username' />
                    </div>
                    <div className="input-group">
                        <label htmlFor="email">Email:</label>
                        <input
                            onChange={(e) => { setEmail(e.target.value) }}
                            type="email" id='email' name='email' placeholder='Enter email address' />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password:</label>
                        <input
                            onChange={(e) => { setPassword(e.target.value) }}
                            type="password" id='password' name='password' placeholder='***' />
                    </div>
                    <button className='button primary-button' >Register</button>
                </form>
                <br />
                <p className=''>Alredy have an account ? <Link to={'/login'}>  Login</Link></p>
            </div>
        </main>
    )
}

export default Register