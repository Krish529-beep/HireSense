import React, { useState } from 'react'
import "../auth.form.scss"
import { useNavigate,Link } from "react-router"
import { useAuth } from '../hooks/useAuth'


const Login = () => {

    const {loading,handelLogin} = useAuth()
    const navigate = useNavigate()
    const [email,setEmail]= useState()
    const [password,setPassword] = useState()

    const handleSubmit = async (e) =>{
        e.preventDefault()
        await handelLogin({email,password})
        navigate('/')
    }

    if(loading){
        return (
            <main>
                Loading
            </main>
        )
    }

  return (
    <main>
        <div className="form-container">
            <h1>Login</h1>
            <form onSubmit={handleSubmit}>
                <div className="input-group">
                    <label htmlFor="email">Email:</label>
                    <input 
                    onChange={(e) => {setEmail(e.target.value)}}
                    type="email" id='email' name='email' placeholder='Enter email address'/>
                </div>
                <div className="input-group">
                    <label htmlFor="password">Password:</label>
                    <input
                    onChange={(e)=> {setPassword(e.target.value)}}
                    type="password" id='password' name='password' placeholder='***'/>
                </div>
                <button className='button primary-button' >Login</button>
            </form>
            <br />
            <p  className=''>Dont have an account ? <Link to={'/register'}> Register</Link></p>
        </div>
    </main>
  )
}

export default Login