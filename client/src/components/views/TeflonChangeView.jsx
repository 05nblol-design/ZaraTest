import { useState, useEffect } from 'react'
import axios from 'axios'

const TeflonChangeView = ({ user }) => {
  const [teflons, setTeflons] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [machines, setMachines] = useState([])
  const [formData, setFormData] = useState({
    machine: '',
    teflonType: '',
    reason: '',
    observations: '',
    plannedDate: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [teflonsResponse, machinesResponse] = await Promise.all([
        axios.get('/api/teflon'),
        axios.get('/api/machines')
      ])
      setTeflons(teflonsResponse.data.data || [])
      setMachines(machinesResponse.data.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setTeflons([])
      setMachines([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/teflon', formData)
      setShowForm(false)
      setFormData({
        machine: '',
        teflonType: '',
        reason: '',
        observations: '',
        plannedDate: ''
      })
      loadData()
    } catch (error) {
      console.error('Erro ao agendar troca:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleStatusChange = async (teflonId, newStatus) => {
    try {
      await axios.patch(`/teflon-changes/${teflonId}`, { status: newStatus })
      loadData()
    } catch (error) {
      console.error('Erro ao atualizar status:', error)
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

  const getStatusBadge = (status) => {
    const badges = {
      'scheduled': 'badge-warning',
      'in_progress': 'badge-info',
      'completed': 'badge-success',
      'cancelled': 'badge-danger'
    }
    return badges[status] || 'badge-secondary'
  }

  const getStatusText = (status) => {
    const texts = {
      'scheduled': 'Agendado',
      'in_progress': 'Em Andamento',
      'completed': 'Concluído',
      'cancelled': 'Cancelado'
    }
    return texts[status] || status
  }

  const getPriorityBadge = (reason) => {
    const priorities = {
      'maintenance': 'badge-warning',
      'emergency': 'badge-danger',
      'routine': 'badge-info',
      'quality': 'badge-primary'
    }
    return priorities[reason] || 'badge-secondary'
  }

  const getPriorityText = (reason) => {
    const texts = {
      'maintenance': 'Manutenção',
      'emergency': 'Emergência',
      'routine': 'Rotina',
      'quality': 'Qualidade'
    }
    return texts[reason] || reason
  }

  if (loading) {
    return (
      <div className="view-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p className="loading-text">Carregando trocas de teflon...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Troca de Teflon</h1>
        <p className="view-subtitle">
          Gerencie e agende as trocas de teflon das máquinas.
        </p>
        <div className="view-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            <i className="fas fa-plus"></i>
            Agendar Troca
          </button>
        </div>
      </div>

      {showForm && (
        <div className="section">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Agendar Troca de Teflon</h2>
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
                  <label htmlFor="teflonType">Tipo de Teflon</label>
                  <select
                    id="teflonType"
                    name="teflonType"
                    value={formData.teflonType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="standard">Padrão</option>
                    <option value="high_temp">Alta Temperatura</option>
                    <option value="food_grade">Grau Alimentício</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2">
                <div className="input-group">
                  <label htmlFor="reason">Motivo da Troca</label>
                  <select
                    id="reason"
                    name="reason"
                    value={formData.reason}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione o motivo</option>
                    <option value="routine">Manutenção Rotina</option>
                    <option value="maintenance">Manutenção Preventiva</option>
                    <option value="emergency">Emergência</option>
                    <option value="quality">Problema de Qualidade</option>
                  </select>
                </div>
                
                <div className="input-group">
                  <label htmlFor="plannedDate">Data Planejada</label>
                  <input
                    type="datetime-local"
                    id="plannedDate"
                    name="plannedDate"
                    value={formData.plannedDate}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="input-group">
                <label htmlFor="observations">Observações</label>
                <textarea
                  id="observations"
                  name="observations"
                  value={formData.observations}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Observações sobre a troca..."
                ></textarea>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-calendar-plus"></i>
                  Agendar Troca
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Trocas Agendadas</h2>
          </div>
          
          {teflons.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <i className="fas fa-tools"></i>
              </div>
              <h3 className="empty-state-title">Nenhuma troca agendada</h3>
              <p className="empty-state-description">
                Não há trocas de teflon agendadas ainda.
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                <i className="fas fa-plus"></i>
                Agendar Primeira Troca
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Máquina</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th>Status</th>
                    <th>Data Planejada</th>
                    <th>Responsável</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {teflons.map(teflon => (
                    <tr key={teflon._id}>
                      <td>{teflon.machine?.name || 'N/A'}</td>
                      <td>{teflon.teflonType}</td>
                      <td>
                        <span className={`badge ${getPriorityBadge(teflon.reason)}`}>
                          {getPriorityText(teflon.reason)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(teflon.status)}`}>
                          {getStatusText(teflon.status)}
                        </span>
                      </td>
                      <td>{formatDate(teflon.plannedDate)}</td>
                      <td>{teflon.assignedTo?.name || 'Não atribuído'}</td>
                      <td>
                        <div className="btn-group">
                          {teflon.status === 'scheduled' && (
                            <button 
                              className="btn btn-info"
                              onClick={() => handleStatusChange(teflon._id, 'in_progress')}
                              title="Iniciar troca"
                            >
                              <i className="fas fa-play"></i>
                            </button>
                          )}
                          {teflon.status === 'in_progress' && (
                            <button 
                              className="btn btn-success"
                              onClick={() => handleStatusChange(teflon._id, 'completed')}
                              title="Concluir troca"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                          )}
                          <button className="btn btn-secondary" title="Ver detalhes">
                            <i className="fas fa-eye"></i>
                          </button>
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

export default TeflonChangeView