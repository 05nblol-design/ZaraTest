import { useState, useEffect } from 'react'
import axios from 'axios'

const ProductionView = ({ user }) => {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [machines, setMachines] = useState([])
  const [selectedMachine, setSelectedMachine] = useState('')
  const [operationActive, setOperationActive] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(120) // 2 minutos em segundos
  const [timerInterval, setTimerInterval] = useState(null)
  const [currentSession, setCurrentSession] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [sessionsResponse, machinesResponse] = await Promise.all([
        axios.get('/api/operation-session/all'),
        axios.get('/api/machines')
      ])
      setSessions(sessionsResponse.data.data || [])
      setMachines(machinesResponse.data.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setSessions([])
      setMachines([])
    } finally {
      setLoading(false)
    }
  }

  const startOperation = async () => {
    if (!selectedMachine) {
      alert('Por favor, selecione uma máquina')
      return
    }

    try {
      const response = await axios.post('/api/operation-session', {
        machine: selectedMachine,
        operator: user.id,
        status: 'active',
        startTime: new Date().toISOString()
      })
      
      setCurrentSession(response.data.data)
      setOperationActive(true)
      setTimeRemaining(120) // 2 minutos
      
      // Iniciar cronômetro
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Tempo esgotado - enviar notificação
            sendNotificationToLeaders()
            clearInterval(interval)
            setOperationActive(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      setTimerInterval(interval)
    } catch (error) {
      console.error('Erro ao iniciar operação:', error)
      alert('Erro ao iniciar operação')
    }
  }

  const completeOperation = async () => {
    if (!currentSession) return

    try {
      await axios.patch(`/api/operation-session/${currentSession._id}`, {
        status: 'completed',
        endTime: new Date().toISOString()
      })
      
      // Limpar cronômetro
      if (timerInterval) {
        clearInterval(timerInterval)
        setTimerInterval(null)
      }
      
      setOperationActive(false)
      setCurrentSession(null)
      setTimeRemaining(120)
      loadData()
    } catch (error) {
      console.error('Erro ao completar operação:', error)
      alert('Erro ao completar operação. Tente novamente.')
    }
  }

  const startQualityTest = async () => {
    if (!selectedMachine) {
      alert('Por favor, selecione uma máquina para iniciar o teste de qualidade')
      return
    }

    try {
      const lotNumber = prompt('Digite o número do lote:')
      if (!lotNumber) {
        alert('Número do lote é obrigatório')
        return
      }

      const response = await axios.post('/api/quality-tests', {
        machine: selectedMachine,
        lotNumber,
        parameters: {
          temperature: 180,
          pressure: 2.5,
          speed: 100
        },
        bathtubTest: {
          enabled: true,
          duration: 120
        }
      })

      if (response.data.success) {
        alert('Teste de qualidade iniciado com sucesso!')
        // Opcional: redirecionar para a página de testes de qualidade
        // window.location.href = '/quality-tests'
      }
    } catch (error) {
      console.error('Erro ao iniciar teste de qualidade:', error)
      alert('Erro ao iniciar teste de qualidade. Tente novamente.')
    }
  }

  const sendNotificationToLeaders = async () => {
    try {
      await axios.post('/api/notifications', {
        type: 'operation_timeout',
        message: `Operação na máquina ${selectedMachine} não foi concluída em 2 minutos`,
        targetRoles: ['leader', 'manager'],
        machineId: selectedMachine,
        operatorId: user.id
      })
    } catch (error) {
      console.error('Erro ao enviar notificação:', error)
    }
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Cleanup do timer quando componente desmonta
  useEffect(() => {
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval)
      }
    }
  }, [timerInterval])

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
          Selecione uma máquina e inicie a operação.
        </p>
      </div>

      <div className="section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Controle de Operação</h2>
          </div>
          
          <div className="card-body">
            <div className="input-group">
              <label htmlFor="machine">Máquina</label>
              <select
                id="machine"
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                disabled={operationActive}
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

            {operationActive && (
              <div className="operation-status">
                <div className="timer-display">
                  <h3>Tempo Restante</h3>
                  <div className={`timer ${timeRemaining <= 30 ? 'timer-warning' : ''}`}>
                    {formatTime(timeRemaining)}
                  </div>
                </div>
                
                <div className="operation-info">
                  <p><strong>Máquina:</strong> {machines.find(m => m._id === selectedMachine)?.name}</p>
                  <p><strong>Operador:</strong> {user.name}</p>
                  <p><strong>Status:</strong> <span className="badge badge-success">Operação Ativa</span></p>
                </div>
              </div>
            )}

            <div className="view-actions">
              {!operationActive ? (
                <>
                  <button 
                    className="btn btn-primary btn-lg"
                    onClick={startOperation}
                    disabled={!selectedMachine}
                  >
                    <i className="fas fa-play"></i>
                    Iniciar Operação
                  </button>
                  <button 
                    className="btn btn-secondary btn-lg"
                    onClick={startQualityTest}
                    disabled={!selectedMachine}
                  >
                    <i className="fas fa-vial"></i>
                    Iniciar Teste de Qualidade
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="btn btn-success btn-lg"
                    onClick={completeOperation}
                  >
                    <i className="fas fa-check"></i>
                    Concluir Operação
                  </button>
                  <button 
                    className="btn btn-secondary btn-lg"
                    onClick={startQualityTest}
                    disabled={!selectedMachine}
                  >
                    <i className="fas fa-vial"></i>
                    Iniciar Teste de Qualidade
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      
      {/* Exibir dados para líderes e gestores */}
      {(user.role === 'leader' || user.role === 'manager') && (
        <div className="section">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Sessões de Produção</h2>
            </div>
            
            <div className="card-body">
              {sessions.length === 0 ? (
                <div className="empty-state">
                  <p>Nenhuma sessão de produção encontrada.</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Máquina</th>
                        <th>Operador</th>
                        <th>Status</th>
                        <th>Início</th>
                        <th>Duração</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map(session => (
                        <tr key={session._id}>
                          <td>{session.machine?.name || 'N/A'}</td>
                          <td>{session.operator?.name || 'N/A'}</td>
                          <td>
                            <span className={`badge ${getStatusBadge(session.status)}`}>
                              {getStatusText(session.status)}
                            </span>
                          </td>
                          <td>{formatDate(session.startTime)}</td>
                          <td>{formatDuration(session.startTime, session.endTime)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default ProductionView