import React, { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import logo from '../assets/logo.svg'
import './Login.css'

function Login() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  })

  const handleLoginChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    })
  }



  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    
    try {
      const result = await login(loginData.username, loginData.password)
      if (result.success) {
        setMessage('Login realizado com sucesso!')
        setMessageType('success')
      } else {
        setMessage(result.message || 'Erro ao fazer login')
        setMessageType('error')
      }
    } catch (error) {
      setMessage(error.message || 'Erro ao fazer login')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }





  return (
    <div className="min-h-screen flex items-center justify-center" style={{background: '#000688'}}>
      <div className="w-full max-w-md">
        <div className="card">
          <div className="card-body">
            <div className="text-center mb-6">
              <img src={logo} alt="Zara Quality System" className="mx-auto mb-4" style={{height: '60px'}} />
              <h2 className="text-2xl font-bold text-primary mb-2">
                Bem-vindo de volta
              </h2>
              <p className="text-secondary">
                Acesse sua conta do sistema
              </p>
            </div>

            {message && (
                <div className={`p-4 rounded-lg mb-4 ${messageType === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  <div className="flex items-center">
                    <i className={`fas ${messageType === 'success' ? 'fa-check-circle text-green' : 'fa-exclamation-triangle text-red-600'} mr-2`}></i>
                    <span className="text-sm font-medium">{message}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleLoginSubmit}>
                <div className="mb-4">
                  <label htmlFor="username" className="block text-sm font-medium mb-2" style={{color: '#000000'}}>
                    <i className="fas fa-user mr-2 text-blue"></i>Usuário
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={loginData.username}
                    onChange={handleLoginChange}
                    required
                    placeholder="Digite seu usuário"
                    className="w-full"
                  />
                </div>
                <div className="mb-6">
                  <label htmlFor="password" className="block text-sm font-medium mb-2" style={{color: '#000000'}}>
                    <i className="fas fa-lock mr-2 text-blue"></i>Senha
                  </label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={loginData.password}
                    onChange={handleLoginChange}
                    required
                    placeholder="Digite sua senha"
                    className="w-full"
                  />
                </div>
                <button type="submit" className="w-full mb-4" disabled={loading}>
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login