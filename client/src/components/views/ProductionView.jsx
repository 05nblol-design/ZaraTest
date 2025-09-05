import { useState, useEffect } from 'react'
import axios from 'axios'

const ProductionView = ({ user }) => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [machines, setMachines] = useState([])
  const [operators, setOperators] = useState([])
  const [formData, setFormData] = useState({
    machine: '',
    operator: '',
    shift: '',
    productType: '',
    targetQuantity: '',
    startTime: '',
    observations: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [sessionsResponse, machinesResponse, operatorsResponse] = await Promise.all([
        axios.get('/api/operation-session/all'),
        axios.get('/api/machines'),
        axios.get('/api/users?role=operator')
      ])
      setSessions(sessionsResponse.data.data || [])
      setMachines(machinesResponse.data.data || [])
      setOperators(operatorsResponse.data.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setSessions([])
      setMachines([])
      setOperators([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/operation-session', formData)
      setShowForm(false)
      setFormData({
        machine: '',
        operator: '',
        shift: '',
        productType: '',
        targetQuantity: '',
        startTime: '',
        observations: ''
      })
      loadData()
    } catch (error) {
      console.error('Erro ao criar sessão:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleEndSession = async (sessionId) => {
    try {
      await axios.patch(`/production-sessions/${sessionId}/end`)
      loadData()
    } catch (error) {
      console.error('Erro ao finalizar sessão:', error)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (startTime, endTime) => {
    if (!endTime) return 'Em andamento'
    
    const start = new Date(startTime)
    const end = new Date(endTime)
    const diffMs = end - start
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    
    return `${diffHours}h ${diffMinutes}m`
  }

  const getStatusBadge = (status) => {
    const badges = {
      'active': 'badge-success',
      'completed': 'badge-info',
      'paused': 'badge-warning',
      'cancelled': 'badge-danger'
    }
    return badges[status] || 'badge-secondary'
  }

  const getStatusText = (status) => {
    const texts = {
      'active': 'Ativa',
      'completed': 'Concluída',
      'paused': 'Pausada',
      'cancelled': 'Cancelada'
    }
    return texts[status] || status
  }

  const getEfficiencyColor = (efficiency) => {
    if (efficiency >= 90) return 'text-success'
    if (efficiency >= 70) return 'text-warning'
    return 'text-danger'
  }

  const calculateEfficiency = (produced, target) => {
    if (!target || target === 0) return 0
    return Math.round((produced / target) * 100)
  }

  if (loading) {
    return (
      <div className="view-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p className="loading-text">Carregando sessões de produção...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Produção</h1>
        <p className="view-subtitle">
          Gerencie e monitore as sessões de produção das máquinas.
        </p>
        <div className="view-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            <i className="fas fa-plus"></i>
            Nova Sessão
          </button>
        </div>
      </div>

      {showForm && (
        <div className="section">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Nova Sessão de Produção</h2>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
              >
                <i className="fas fa-times"></i>
                Cancelar
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2">
                <div className="input-group">
                  <label htmlFor="machine">Máquina</label>
                  <select
                    id="machine"
                    name="machine"
                    value={formData.machine}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione uma máquina</option>
                    {machines.map(machine => (
                      <option key={machine._id} value={machine._id}>
                        {machine.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="input-group">
                  <label htmlFor="operator">Operador</label>
                  <select
                    id="operator"
                    name="operator"
                    value={formData.operator}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione um operador</option>
                    {operators.map(operator => (
                      <option key={operator._id} value={operator._id}>
                        {operator.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-3">
                <div className="input-group">
                  <label htmlFor="shift">Turno</label>
                  <select
                    id="shift"
                    name="shift"
                    value={formData.shift}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione o turno</option>
                    <option value="morning">Manhã (06:00-14:00)</option>
                    <option value="afternoon">Tarde (14:00-22:00)</option>
                    <option value="night">Noite (22:00-06:00)</option>
                  </select>
                </div>
                
                <div className="input-group">
                  <label htmlFor="productType">Tipo de Produto</label>
                  <input
                    type="text"
                    id="productType"
                    name="productType"
                    value={formData.productType}
                    onChange={handleInputChange}
                    placeholder="Ex: Peça A, Componente B"
                    required
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="targetQuantity">Meta de Produção</label>
                  <input
                    type="number"
                    id="targetQuantity"
                    name="targetQuantity"
                    value={formData.targetQuantity}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div className="input-group">
                <label htmlFor="startTime">Horário de Início</label>
                <input
                  type="datetime-local"
                  id="startTime"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="observations">Observações</label>
                <textarea
                  id="observations"
                  name="observations"
                  value={formData.observations}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Observações sobre a sessão..."
                ></textarea>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-play"></i>
                  Iniciar Sessão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Sessões de Produção</h2>
          </div>
          
          {sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <i className="fas fa-industry"></i>
              </div>
              <h3 className="empty-state-title">Nenhuma sessão encontrada</h3>
              <p className="empty-state-description">
                Não há sessões de produção registradas ainda.
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                <i className="fas fa-plus"></i>
                Criar Primeira Sessão
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Máquina</th>
                    <th>Operador</th>
                    <th>Produto</th>
                    <th>Status</th>
                    <th>Progresso</th>
                    <th>Eficiência</th>
                    <th>Duração</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => {
                    const efficiency = calculateEfficiency(session.producedQuantity, session.targetQuantity)
                    return (
                      <tr key={session._id}>
                        <td>{session.machine?.name || 'N/A'}</td>
                        <td>{session.operator?.name || 'N/A'}</td>
                        <td>{session.productType}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(session.status)}`}>
                            {getStatusText(session.status)}
                          </span>
                        </td>
                        <td>
                          <div className="progress-info">
                            <span>{session.producedQuantity || 0}/{session.targetQuantity}</span>
                            <div className="progress-bar">
                              <div 
                                className="progress-fill"
                                style={{ width: `${Math.min(efficiency, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={getEfficiencyColor(efficiency)}>
                            {efficiency}%
                          </span>
                        </td>
                        <td>{formatDuration(session.startTime, session.endTime)}</td>
                        <td>
                          <div className="btn-group">
                            {session.status === 'active' && (
                              <button 
                                className="btn btn-warning"
                                onClick={() => handleEndSession(session._id)}
                                title="Finalizar sessão"
                              >
                                <i className="fas fa-stop"></i>
                              </button>
                            )}
                            <button className="btn btn-secondary" title="Ver detalhes">
                              <i className="fas fa-eye"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductionView