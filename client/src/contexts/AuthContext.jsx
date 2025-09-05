import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

// Configurar axios com a URL base da API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
axios.defaults.baseURL = API_URL

// Interceptor para adicionar token automaticamente
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor para tratar erros de autenticação
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expirado ou inválido
      localStorage.removeItem('token')
      localStorage.removeItem('currentUser')
      delete axios.defaults.headers.common['Authorization']
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('currentUser')
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData)
        setUser(parsedUser)
        // Configurar token no axios
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      } catch (error) {
        console.error('Erro ao parsear dados do usuário:', error)
        localStorage.removeItem('token')
        localStorage.removeItem('currentUser')
      }
    }
    
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    try {
      console.log('Tentando login com:', { username })
      const response = await axios.post('/api/auth/login', {
        username,
        password
      })

      console.log('Resposta do login:', response.data)
      
      if (!response.data) {
        throw new Error('Resposta vazia do servidor')
      }

      // Suportar ambas as estruturas de resposta (Vercel e servidor local)
      let token, userData;
      
      if (response.data.data) {
        // Estrutura do Vercel: { success: true, data: { token, user } }
        token = response.data.data.token;
        userData = response.data.data.user;
      } else {
        // Estrutura do servidor local: { success: true, token, user }
        token = response.data.token;
        userData = response.data.user;
      }
      
      if (!token || !userData) {
        throw new Error('Token ou dados do usuário não encontrados na resposta')
      }
      
      // Salvar no localStorage
      localStorage.setItem('token', token)
      localStorage.setItem('currentUser', JSON.stringify(userData))
      
      // Configurar token no axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      setUser(userData)
      return { success: true }
    } catch (error) {
      console.error('Erro no login:', error)
      
      let errorMessage = 'Erro ao fazer login'
      
      if (error.response) {
        // Erro de resposta HTTP
        errorMessage = error.response.data?.message || `Erro ${error.response.status}: ${error.response.statusText}`
      } else if (error.request) {
        // Erro de rede
        errorMessage = 'Erro de conexão com o servidor'
      } else {
        // Outros erros
        errorMessage = error.message || 'Erro desconhecido'
      }
      
      return { 
        success: false, 
        message: errorMessage
      }
    }
  }

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData)
      return { success: true, message: 'Usuário cadastrado com sucesso!' }
    } catch (error) {
      console.error('Erro no cadastro:', error)
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao cadastrar usuário' 
      }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}