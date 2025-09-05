import { useState, useEffect } from 'react'
import axios from 'axios'

const TeamView = ({ user }) => {
  const [team, setTeam] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    shift: '',
    phone: '',
    department: ''
  })

  useEffect(() => {
    loadTeam()
  }, [])

  const loadTeam = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/users')
      setTeam(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Erro ao carregar equipe:', error)
      setTeam([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingUser) {
        await axios.put(`/users/${editingUser._id}`, formData)
      } else {
        await axios.post('/api/users', formData)
      }
      
      setShowForm(false)
      setEditingUser(null)
      setFormData({
        name: '',
        email: '',
        role: '',
        shift: '',
        phone: '',
        department: ''
      })
      loadTeam()
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setFormData({
      name: user.name || '',
      email: user.email || '',
      role: user.role || '',
      shift: user.shift || '',
      phone: user.phone || '',
      department: user.department || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (userId) => {
    if (window.confirm('Tem certeza que deseja remover este usuário?')) {
      try {
        await axios.delete(`/users/${userId}`)
        loadTeam()
      } catch (error) {
        console.error('Erro ao deletar usuário:', error)
      }
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingUser(null)
    setFormData({
      name: '',
      email: '',
      role: '',
      shift: '',
      phone: '',
      department: ''
    })
  }

  const getRoleBadge = (role) => {
    const badges = {
      'operator': 'badge-primary',
      'leader': 'badge-warning',
      'manager': 'badge-success',
      'admin': 'badge-danger'
    }
    return badges[role] || 'badge-secondary'
  }

  const getRoleText = (role) => {
    const texts = {
      'operator': 'Operador',
      'leader': 'Líder',
      'manager': 'Gerente',
      'admin': 'Administrador'
    }
    return texts[role] || role
  }

  const getShiftText = (shift) => {
    const texts = {
      'morning': 'Manhã',
      'afternoon': 'Tarde',
      'night': 'Noite'
    }
    return texts[shift] || shift
  }

  const getStatusBadge = (isActive) => {
    return isActive ? 'badge-success' : 'badge-secondary'
  }

  const getStatusText = (isActive) => {
    return isActive ? 'Ativo' : 'Inativo'
  }

  if (loading) {
    return (
      <div className="view-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p className="loading-text">Carregando equipe...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Equipe</h1>
        <p className="view-subtitle">
          Gerencie os membros da equipe e suas informações.
        </p>
        <div className="view-actions">
          <button 
            className="btn btn-primary"
            onClick={() => {
              setEditingUser(null);
              setFormData({
                name: '',
                email: '',
                role: 'operador',
                shift: 'manha',
                phone: '',
                department: ''
              });
              setShowForm(true);
            }}
          >
            <i className="fas fa-user-plus"></i>
            Adicionar Membro
          </button>
        </div>
      </div>

      {showForm && (
        <div className="section">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                {editingUser ? 'Editar Membro' : 'Novo Membro da Equipe'}
              </h2>
              <button 
                className="btn btn-secondary"
                onClick={handleCancel}
              >
                <i className="fas fa-times"></i>
                Cancelar
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="input-group">
                  <label htmlFor="name">Nome Completo</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="email">E-mail</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="input-group">
                  <label htmlFor="role">Função</label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione a função</option>
                    <option value="operator">Operador</option>
                    <option value="leader">Líder</option>
                    <option value="manager">Gerente</option>
                    {user.role === 'admin' && (
                      <option value="admin">Administrador</option>
                    )}
                  </select>
                </div>
                
                <div className="input-group">
                  <label htmlFor="shift">Turno</label>
                  <select
                    id="shift"
                    name="shift"
                    value={formData.shift}
                    onChange={handleInputChange}
                  >
                    <option value="">Selecione o turno</option>
                    <option value="morning">Manhã (06:00-14:00)</option>
                    <option value="afternoon">Tarde (14:00-22:00)</option>
                    <option value="night">Noite (22:00-06:00)</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="input-group">
                  <label htmlFor="phone">Telefone</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="department">Departamento</label>
                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                  >
                    <option value="">Selecione o departamento</option>
                    <option value="production">Produção</option>
                    <option value="quality">Qualidade</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="management">Gestão</option>
                  </select>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i>
                  {editingUser ? 'Atualizar' : 'Adicionar'} Membro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="section">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Estatísticas da Equipe</h3>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-number">{team.length}</div>
                  <div className="stat-label">Total de Membros</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-user-check"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-number">
                    {team.filter(member => member.isActive).length}
                  </div>
                  <div className="stat-label">Membros Ativos</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Por Função</h3>
            </div>
            <div className="role-distribution">
              {['operator', 'leader', 'manager', 'admin'].map(role => {
                const count = team.filter(member => member.role === role).length
                return count > 0 ? (
                  <div key={role} className="role-item">
                    <span className={`badge ${getRoleBadge(role)}`}>
                      {getRoleText(role)}
                    </span>
                    <span className="count">{count}</span>
                  </div>
                ) : null
              })}
            </div>
          </div>
          
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Por Turno</h3>
            </div>
            <div className="shift-distribution">
              {['morning', 'afternoon', 'night'].map(shift => {
                const count = team.filter(member => member.shift === shift).length
                return count > 0 ? (
                  <div key={shift} className="shift-item">
                    <span className="shift-name">{getShiftText(shift)}</span>
                    <span className="count">{count}</span>
                  </div>
                ) : null
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Membros da Equipe</h2>
          </div>
          
          {team.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <i className="fas fa-users"></i>
              </div>
              <h3 className="empty-state-title">Nenhum membro encontrado</h3>
              <p className="empty-state-description">
                Não há membros da equipe cadastrados ainda.
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                <i className="fas fa-user-plus"></i>
                Adicionar Primeiro Membro
              </button>
            </div>
          ) : (
            <div className="table-container overflow-x-auto">
              <table className="table min-w-full">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap">Nome</th>
                    <th className="hidden md:table-cell whitespace-nowrap">E-mail</th>
                    <th className="whitespace-nowrap">Função</th>
                    <th className="hidden lg:table-cell whitespace-nowrap">Turno</th>
                    <th className="hidden lg:table-cell whitespace-nowrap">Departamento</th>
                    <th className="hidden sm:table-cell whitespace-nowrap">Status</th>
                    <th className="whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map(member => (
                    <tr key={member._id}>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar">
                            <i className="fas fa-user"></i>
                          </div>
                          <div className="user-details">
                            <div className="user-name">{member.name}</div>
                            {member.phone && (
                              <div className="user-phone">{member.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell">{member.email}</td>
                      <td>
                        <span className={`badge ${getRoleBadge(member.role)}`}>
                          {getRoleText(member.role)}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell">{member.shift ? getShiftText(member.shift) : '-'}</td>
                      <td className="hidden lg:table-cell">{member.department || '-'}</td>
                      <td className="hidden sm:table-cell">
                        <span className={`badge ${getStatusBadge(member.isActive)}`}>
                          {getStatusText(member.isActive)}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group flex flex-col sm:flex-row gap-1">
                          <button 
                            className="btn btn-sm btn-outline flex items-center justify-center"
                            onClick={() => handleEdit(member)}
                            title="Editar"
                          >
                            <i className="fas fa-edit"></i>
                            <span className="ml-1 hidden sm:inline">Editar</span>
                          </button>
                          {user.role === 'admin' && member._id !== user._id && (
                            <button 
                              className="btn btn-sm btn-danger flex items-center justify-center"
                              onClick={() => handleDelete(member._id)}
                              title="Remover"
                            >
                              <i className="fas fa-trash"></i>
                              <span className="ml-1 hidden sm:inline">Remover</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TeamView