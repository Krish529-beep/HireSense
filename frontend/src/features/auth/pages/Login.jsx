import React, { useState } from 'react'
import "../auth.form.scss"
import { useNavigate, Link } from "react-router"
import { useAuth } from '../hooks/useAuth.js'

const Login = () => {
    const { loading, handelLogin } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [errorMessage, setErrorMessage] = useState("")

    const handleSubmit = async (e) => {
        e.preventDefault()
        setErrorMessage("")
        const success = await handelLogin({ email, password });

        if (success) {
            navigate('/');
        } else {
            setErrorMessage("Invalid email or password. Please check your credentials and try again.");
        }
    }

    return (
        <main className="auth-page">
            <section className="auth-shell">
                <div className="auth-hero">
                    <span className="auth-eyebrow">Interview Prep Studio</span>
                    <h1>Step back into your interview workspace</h1>
                    <p>
                        Review recent reports, generate tailored resume PDFs, and build stronger role-specific prep plans from one place.
                    </p>

                    <div className="auth-feature-list">
                        <div className="auth-feature-card">
                            <strong>Targeted strategy</strong>
                            <span>Generate questions, roadmap guidance, and fit signals for every role.</span>
                        </div>
                        <div className="auth-feature-card">
                            <strong>Resume refinement</strong>
                            <span>Create role-aligned resume PDFs directly from your interview reports.</span>
                        </div>
                        <div className="auth-feature-card">
                            <strong>Recent history</strong>
                            <span>Return to your latest reports without rebuilding the whole flow.</span>
                        </div>
                    </div>
                </div>

                <div className="form-container">
                    {loading && (
                        <div className="auth-loading-overlay" role="status" aria-live="polite">
                            <div className="auth-loading-panel">
                                <div className="auth-loader" aria-hidden="true"></div>
                                <span className="auth-loading-kicker">Secure session</span>
                                <h3>Signing you in</h3>
                                <p>We’re verifying your account and preparing your interview workspace.</p>
                            </div>
                        </div>
                    )}

                    <div className="form-copy">
                        <span className="form-kicker">Welcome back</span>
                        <h2>Login</h2>
                        <p>Use your account to continue building interview strategies for new roles.</p>
                    </div>

                    <form onSubmit={handleSubmit}>
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
                                placeholder='Enter password'
                                autoComplete='current-password'
                            />
                        </div>

                        {errorMessage && (
                            <div className="auth-status error" role="alert">
                                {errorMessage}
                            </div>
                        )}

                        <button className='button primary-button' disabled={loading}>Login</button>
                    </form>

                    <p className='auth-switch'>Don&apos;t have an account? <Link to={'/register'}>Create one</Link></p>
                </div>
            </section>
        </main>
    )
}

export default Login
