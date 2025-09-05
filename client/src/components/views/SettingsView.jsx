import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../../contexts/AuthContext'

const SettingsView = ({ user }) => {
  const { updateUser } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [loading, setLoading] = useState(false)
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    shift: ''
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [systemSettings, setSystemSettings] = useState({
    notifications: {
      email: true,
      push: true,
      sound: true
    },
    theme: 'light',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo'
  })

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        department: user.department || '',
        shift: user.shift || ''
      })
    }
    loadSystemSettings()
  }, [user])

  const loadSystemSettings = async () => {
    try {
      const response = await axios.get('/api/users/profile')
      setSystemSettings(response.data)
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    }
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await axios.put('/api/users/profile', profileData)
      updateUser(response.data)
      alert('Perfil atualizado com sucesso!')
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      alert('Erro ao atualizar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('As senhas não coincidem')
      return
    }
    
    if (passwordData.newPassword.length < 6) {
      alert('A nova senha deve ter pelo menos 6 caracteres')
      return
    }
    
    try {
      setLoading(true)
      await axios.put('/api/users/password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      })
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      
      alert('Senha alterada com sucesso!')
    } catch (error) {
      console.error('Erro ao alterar senha:', error)
      alert('Erro ao alterar senha. Verifique a senha atual.')
    } finally {
      setLoading(false)
    }
  }

  const handleSystemSettingsSubmit = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      await axios.put('/api/users/settings', systemSettings)
      alert('Configurações salvas com sucesso!')
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      alert('Erro ao salvar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target
    setProfileData(prev => ({ ...prev, [name]: value }))
  }

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({ ...prev, [name]: value }))
  }

  const handleSystemSettingsChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (name.includes('.')) {
      const [section, setting] = name.split('.')
      setSystemSettings(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [setting]: type === 'checkbox' ? checked : value
        }
      }))
    } else {
      setSystemSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  const exportData = async () => {
    try {
      const response = await axios.get('/api/users/export', {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'meus_dados.json')
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Erro ao exportar dados:', error)
      alert('Erro ao exportar dados')
    }
  }

  const tabs = [
    { id: 'profile', label: 'Perfil', icon: 'fas fa-user' },
    { id: 'security', label: 'Segurança', icon: 'fas fa-shield-alt' },
    { id: 'notifications', label: 'Notificações', icon: 'fas fa-bell' },
    { id: 'system', label: 'Sistema', icon: 'fas fa-cog' },
    { id: 'data', label: 'Dados', icon: 'fas fa-database' }
  ]

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Configurações</h1>
        <p className="view-subtitle">
          Gerencie suas preferências e configurações do sistema.
        </p>
      </div>

      <div className="section">
        <div className="settings-container">
          <div className="settings-sidebar">
            <nav className="settings-nav">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <i className={tab.icon}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="settings-content">
            {activeTab === 'profile' && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Informações do Perfil</h2>
                  <p className="card-subtitle">
                    Atualize suas informações pessoais e profissionais.
                  </p>
                </div>
                
                <form onSubmit={handleProfileSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="input-group">
                      <label htmlFor="name">Nome Completo</label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={profileData.name}
                        onChange={handleProfileInputChange}
                        required
                      />
                    </div>
                    
                    <div className="input-group">
                      <label htmlFor="email">E-mail</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={profileData.email}
                        onChange={handleProfileInputChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="input-group">
                      <label htmlFor="phone">Telefone</label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleProfileInputChange}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                    
                    <div className="input-group">
                      <label htmlFor="department">Departamento</label>
                      <select
                        id="department"
                        name="department"
                        value={profileData.department}
                        onChange={handleProfileInputChange}
                      >
                        <option value="">Selecione o departamento</option>
                        <option value="production">Produção</option>
                        <option value="quality">Qualidade</option>
                        <option value="maintenance">Manutenção</option>
                        <option value="management">Gestão</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label htmlFor="shift">Turno</label>
                    <select
                      id="shift"
                      name="shift"
                      value={profileData.shift}
                      onChange={handleProfileInputChange}
                    >
                      <option value="">Selecione o turno</option>
                      <option value="morning">Manhã (06:00-14:00)</option>
                      <option value="afternoon">Tarde (14:00-22:00)</option>
                      <option value="night">Noite (22:00-06:00)</option>
                    </select>
                  </div>
                  
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? (
                        <>
                          <div className="loading-spinner small"></div>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save"></i>
                          Salvar Alterações
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Alterar Senha</h2>
                  <p className="card-subtitle">
                    Mantenha sua conta segura com uma senha forte.
                  </p>
                </div>
                
                <form onSubmit={handlePasswordSubmit}>
                  <div className="input-group">
                    <label htmlFor="currentPassword">Senha Atual</label>
                    <input
                      type="password"
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordInputChange}
                      required
                    />
                  </div>
                  
                  <div className="input-group">
                    <label htmlFor="newPassword">Nova Senha</label>
                    <input
                      type="password"
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordInputChange}
                      minLength="6"
                      required
                    />
                    <small className="input-help">
                      A senha deve ter pelo menos 6 caracteres.
                    </small>
                  </div>
                  
                  <div className="input-group">
                    <label htmlFor="confirmPassword">Confirmar Nova Senha</label>
                    <input
                      type="password"
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordInputChange}
                      minLength="6"
                      required
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? (
                        <>
                          <div className="loading-spinner small"></div>
                          Alterando...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-key"></i>
                          Alterar Senha
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Preferências de Notificação</h2>
                  <p className="card-subtitle">
                    Configure como você deseja receber notificações.
                  </p>
                </div>
                
                <form onSubmit={handleSystemSettingsSubmit}>
                  <div className="settings-group">
                    <h3>Tipos de Notificação</h3>
                    
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="notifications.email"
                          checked={systemSettings.notifications.email}
                          onChange={handleSystemSettingsChange}
                        />
                        <span className="checkbox-text">
                          <strong>E-mail</strong>
                          <small>Receber notificações por e-mail</small>
                        </span>
                      </label>
                    </div>
                    
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="notifications.push"
                          checked={systemSettings.notifications.push}
                          onChange={handleSystemSettingsChange}
                        />
                        <span className="checkbox-text">
                          <strong>Push</strong>
                          <small>Notificações no navegador</small>
                        </span>
                      </label>
                    </div>
                    
                    <div className="checkbox-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="notifications.sound"
                          checked={systemSettings.notifications.sound}
                          onChange={handleSystemSettingsChange}
                        />
                        <span className="checkbox-text">
                          <strong>Som</strong>
                          <small>Reproduzir som nas notificações</small>
                        </span>
                      </label>
                    </div>
                  </div>
                  
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? (
                        <>
                          <div className="loading-spinner small"></div>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save"></i>
                          Salvar Preferências
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Configurações do Sistema</h2>
                  <p className="card-subtitle">
                    Personalize a aparência e comportamento do sistema.
                  </p>
                </div>
                
                <form onSubmit={handleSystemSettingsSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="input-group">
                      <label htmlFor="theme">Tema</label>
                      <select
                        id="theme"
                        name="theme"
                        value={systemSettings.theme}
                        onChange={handleSystemSettingsChange}
                      >
                        <option value="light">Claro</option>
                        <option value="dark">Escuro</option>
                        <option value="auto">Automático</option>
                      </select>
                    </div>
                    
                    <div className="input-group">
                      <label htmlFor="language">Idioma</label>
                      <select
                        id="language"
                        name="language"
                        value={systemSettings.language}
                        onChange={handleSystemSettingsChange}
                      >
                        <option value="pt-BR">Português (Brasil)</option>
                        <option value="en-US">English (US)</option>
                        <option value="es-ES">Español</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="input-group">
                    <label htmlFor="timezone">Fuso Horário</label>
                    <select
                      id="timezone"
                      name="timezone"
                      value={systemSettings.timezone}
                      onChange={handleSystemSettingsChange}
                    >
                      <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                      <option value="America/New_York">New York (GMT-5)</option>
                      <option value="Europe/London">London (GMT+0)</option>
                    </select>
                  </div>
                  
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? (
                        <>
                          <div className="loading-spinner small"></div>
                          Salvando...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save"></i>
                          Salvar Configurações
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'data' && (
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Gerenciamento de Dados</h2>
                  <p className="card-subtitle">
                    Exporte ou gerencie seus dados pessoais.
                  </p>
                </div>
                
                <div className="data-actions">
                  <div className="action-item">
                    <div className="action-info">
                      <h3>Exportar Dados</h3>
                      <p>Baixe uma cópia de todos os seus dados em formato JSON.</p>
                    </div>
                    <button className="btn btn-secondary" onClick={exportData}>
                      <i className="fas fa-download"></i>
                      Exportar
                    </button>
                  </div>
                  
                  <div className="action-item">
                    <div className="action-info">
                      <h3>Limpar Cache</h3>
                      <p>Remove dados temporários armazenados localmente.</p>
                    </div>
                    <button 
                      className="btn btn-warning"
                      onClick={() => {
                        localStorage.clear()
                        alert('Cache limpo com sucesso!')
                      }}
                    >
                      <i className="fas fa-broom"></i>
                      Limpar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsView