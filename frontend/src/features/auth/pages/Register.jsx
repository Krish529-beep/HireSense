import React, { useState } from 'react'
import "../auth.form.scss"
import { useNavigate, Link } from "react-router"
import { useAuth } from '../hooks/useAuth'

function Register() {
    const { loading, handleRegister } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [username, setUsername] = useState("")
    const [errorMessage, setErrorMessage] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage("")

        const success = await handleRegister({ username, email, password });

        if (success) {
            navigate('/');
        } else {
            setErrorMessage("Registration failed. Try a different email or username and try again.");
        }
    };

    return (
        <main className="auth-page">
            <section className="auth-shell">
                <div className="auth-hero">
                    <span className="auth-eyebrow">Interview Prep Studio</span>
                    <h1>Create your workspace for smarter interview prep</h1>
                    <p>
                        Set up your account to generate tailored interview plans, track recent roles, and build stronger application materials faster.
                    </p>

                    <div className="auth-feature-list">
                        <div className="auth-feature-card">
                            <strong>Role-specific reports</strong>
                            <span>Get fit scores, question banks, and roadmaps shaped around the target job description.</span>
                        </div>
                        <div className="auth-feature-card">
                            <strong>Reusable workflow</strong>
                            <span>Keep your recent reports in one place and jump between roles quickly.</span>
                        </div>
                        <div className="auth-feature-card">
                            <strong>Sharpen your profile</strong>
                            <span>Use the same workspace to turn your profile into a cleaner, job-aligned resume PDF.</span>
                        </div>
                    </div>
                </div>

            <div className="form-container">
                {loading && (
                    <div className="auth-loading-overlay" role="status" aria-live="polite">
                        <div className="auth-loading-panel">
                            <div className="auth-loader" aria-hidden="true"></div>
                            <span className="auth-loading-kicker">Setting things up</span>
                            <h3>Creating your workspace</h3>
                            <p>We’re getting your account ready so you can start generating tailored interview plans.</p>
                        </div>
                    </div>
                )}

                <div className="form-copy">
                    <span className="form-kicker">Get started</span>
                    <h2>Register</h2>
                    <p>Create an account to save reports, generate new plans, and keep your prep organized.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="Username">Username</label>
                        <input
                            onChange={(e) => { setUsername(e.target.value) }}
                            value={username}
                            type="text"
                            id='Username'
                            name='Username'
                            placeholder='Choose a username'
                            autoComplete='username'
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            onChange={(e) => { setEmail(e.target.value) }}
                            value={email}
                            type="email"
                            id='email'
                            name='email'
                            placeholder='Enter email address'
                            autoComplete='email'
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password</label>
                        <input
                            onChange={(e) => { setPassword(e.target.value) }}
                            value={password}
                            type="password"
                            id='password'
                            name='password'
                            placeholder='Create a password'
                            autoComplete='new-password'
                        />
                    </div>

                    {errorMessage && (
                        <div className="auth-status error" role="alert">
                            {errorMessage}
                        </div>
                    )}

                    <button className='button primary-button' disabled={loading}>Register</button>
                </form>

                <p className='auth-switch'>Already have an account? <Link to={'/login'}>Login</Link></p>
            </div>
            </section>
        </main>
    )
}

export default Register
