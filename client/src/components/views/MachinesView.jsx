import { useState, useEffect } from 'react'
import axios from 'axios'

const MachinesView = ({ user }) => {
  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMachine, setEditingMachine] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    manufacturer: '',
    serialNumber: '',
    location: '',
    status: 'active',
    specifications: {
      maxTemperature: '',
      maxPressure: '',
      maxSpeed: '',
      capacity: ''
    },
    maintenanceSchedule: {
      lastMaintenance: '',
      nextMaintenance: '',
      intervalDays: ''
    }
  })

  useEffect(() => {
    loadMachines()
  }, [])

  const loadMachines = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/machines')
      setMachines(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error('Erro ao carregar máquinas:', error)
      setMachines([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingMachine) {
        await axios.put(`/api/machines/${editingMachine._id}`, formData)
      } else {
        await axios.post('/api/machines', formData)
      }
      
      handleCancel()
      loadMachines()
    } catch (error) {
      console.error('Erro ao salvar máquina:', error)
    }
  }

  const handleEdit = (machine) => {
    setEditingMachine(machine)
    setFormData({
      name: machine.name || '',
      model: machine.model || '',
      manufacturer: machine.manufacturer || '',
      serialNumber: machine.serialNumber || '',
      location: machine.location || '',
      status: machine.status || 'active',
      specifications: {
        maxTemperature: machine.specifications?.maxTemperature || '',
        maxPressure: machine.specifications?.maxPressure || '',
        maxSpeed: machine.specifications?.maxSpeed || '',
        capacity: machine.specifications?.capacity || ''
      },
      maintenanceSchedule: {
        lastMaintenance: machine.maintenanceSchedule?.lastMaintenance ? 
          new Date(machine.maintenanceSchedule.lastMaintenance).toISOString().split('T')[0] : '',
        nextMaintenance: machine.maintenanceSchedule?.nextMaintenance ? 
          new Date(machine.maintenanceSchedule.nextMaintenance).toISOString().split('T')[0] : '',
        intervalDays: machine.maintenanceSchedule?.intervalDays || ''
      }
    })
    setShowForm(true)
  }

  const handleDelete = async (machineId) => {
    if (window.confirm('Tem certeza que deseja remover esta máquina?')) {
      try {
        await axios.delete(`/machines/${machineId}`)
        loadMachines()
      } catch (error) {
        console.error('Erro ao deletar máquina:', error)
      }
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    if (name.startsWith('specifications.')) {
      const specName = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        specifications: {
          ...prev.specifications,
          [specName]: value
        }
      }))
    } else if (name.startsWith('maintenanceSchedule.')) {
      const scheduleName = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        maintenanceSchedule: {
          ...prev.maintenanceSchedule,
          [scheduleName]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingMachine(null)
    setFormData({
      name: '',
      model: '',
      manufacturer: '',
      serialNumber: '',
      location: '',
      status: 'active',
      specifications: {
        maxTemperature: '',
        maxPressure: '',
        maxSpeed: '',
        capacity: ''
      },
      maintenanceSchedule: {
        lastMaintenance: '',
        nextMaintenance: '',
        intervalDays: ''
      }
    })
  }

  const getStatusBadge = (status) => {
    const badges = {
      'active': 'badge-success',
      'maintenance': 'badge-warning',
      'inactive': 'badge-secondary',
      'error': 'badge-danger'
    }
    return badges[status] || 'badge-secondary'
  }

  const getStatusText = (status) => {
    const texts = {
      'active': 'Ativa',
      'maintenance': 'Manutenção',
      'inactive': 'Inativa',
      'error': 'Erro'
    }
    return texts[status] || status
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getMaintenanceStatus = (nextMaintenance) => {
    if (!nextMaintenance) return { status: 'unknown', text: 'Não agendada', badge: 'badge-secondary' }
    
    const today = new Date()
    const maintenanceDate = new Date(nextMaintenance)
    const diffDays = Math.ceil((maintenanceDate - today) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return { status: 'overdue', text: 'Atrasada', badge: 'badge-danger' }
    } else if (diffDays <= 7) {
      return { status: 'due_soon', text: `${diffDays} dias`, badge: 'badge-warning' }
    } else {
      return { status: 'scheduled', text: `${diffDays} dias`, badge: 'badge-info' }
    }
  }

  if (loading) {
    return (
      <div className="view-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p className="loading-text">Carregando máquinas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Máquinas</h1>
        <p className="view-subtitle">
          Gerencie as máquinas e seus status de operação.
        </p>
        <div className="view-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            <i className="fas fa-plus"></i>
            Adicionar Máquina
          </button>
        </div>
      </div>

      {showForm && (
        <div className="section">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">
                {editingMachine ? 'Editar Máquina' : 'Nova Máquina'}
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="input-group">
                  <label htmlFor="name">Nome da Máquina</label>
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
                  <label htmlFor="model">Modelo</label>
                  <input
                    type="text"
                    id="model"
                    name="model"
                    value={formData.model}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="input-group">
                  <label htmlFor="manufacturer">Fabricante</label>
                  <input
                    type="text"
                    id="manufacturer"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="serialNumber">Número de Série</label>
                  <input
                    type="text"
                    id="serialNumber"
                    name="serialNumber"
                    value={formData.serialNumber}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="input-group">
                  <label htmlFor="location">Localização</label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Ex: Setor A, Linha 1"
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="active">Ativa</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="inactive">Inativa</option>
                    <option value="error">Erro</option>
                  </select>
                </div>
              </div>
              
              <h3>Especificações Técnicas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="input-group">
                  <label htmlFor="maxTemperature">Temperatura Máxima (°C)</label>
                  <input
                    type="number"
                    id="maxTemperature"
                    name="specifications.maxTemperature"
                    value={formData.specifications.maxTemperature}
                    onChange={handleInputChange}
                    step="0.1"
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="maxPressure">Pressão Máxima (bar)</label>
                  <input
                    type="number"
                    id="maxPressure"
                    name="specifications.maxPressure"
                    value={formData.specifications.maxPressure}
                    onChange={handleInputChange}
                    step="0.1"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="input-group">
                  <label htmlFor="maxSpeed">Velocidade Máxima (rpm)</label>
                  <input
                    type="number"
                    id="maxSpeed"
                    name="specifications.maxSpeed"
                    value={formData.specifications.maxSpeed}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="capacity">Capacidade</label>
                  <input
                    type="text"
                    id="capacity"
                    name="specifications.capacity"
                    value={formData.specifications.capacity}
                    onChange={handleInputChange}
                    placeholder="Ex: 1000 peças/hora"
                  />
                </div>
              </div>
              
              <h3>Cronograma de Manutenção</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="input-group">
                  <label htmlFor="lastMaintenance">Última Manutenção</label>
                  <input
                    type="date"
                    id="lastMaintenance"
                    name="maintenanceSchedule.lastMaintenance"
                    value={formData.maintenanceSchedule.lastMaintenance}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="nextMaintenance">Próxima Manutenção</label>
                  <input
                    type="date"
                    id="nextMaintenance"
                    name="maintenanceSchedule.nextMaintenance"
                    value={formData.maintenanceSchedule.nextMaintenance}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="intervalDays">Intervalo (dias)</label>
                  <input
                    type="number"
                    id="intervalDays"
                    name="maintenanceSchedule.intervalDays"
                    value={formData.maintenanceSchedule.intervalDays}
                    onChange={handleInputChange}
                    min="1"
                  />
                </div>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i>
                  {editingMachine ? 'Atualizar' : 'Adicionar'} Máquina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="section">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-cogs"></i>
              </div>
              <div className="stat-content">
                <div className="stat-number">{Array.isArray(machines) ? machines.length : 0}</div>
                <div className="stat-label">Total de Máquinas</div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="stat-content">
                <div className="stat-number">
                  {Array.isArray(machines) ? machines.filter(m => m.status === 'active').length : 0}
                </div>
                <div className="stat-label">Ativas</div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-tools"></i>
              </div>
              <div className="stat-content">
                <div className="stat-number">
                  {Array.isArray(machines) ? machines.filter(m => m.status === 'maintenance').length : 0}
                </div>
                <div className="stat-label">Em Manutenção</div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="stat-card">
              <div className="stat-icon">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div className="stat-content">
                <div className="stat-number">
                  {Array.isArray(machines) ? machines.filter(m => {
                    const maintenance = getMaintenanceStatus(m.maintenanceSchedule?.nextMaintenance)
                    return maintenance.status === 'overdue' || maintenance.status === 'due_soon'
                  }).length : 0}
                </div>
                <div className="stat-label">Manutenção Pendente</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Lista de Máquinas</h2>
          </div>
          
          {!Array.isArray(machines) || machines.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <i className="fas fa-cogs"></i>
              </div>
              <h3 className="empty-state-title">Nenhuma máquina encontrada</h3>
              <p className="empty-state-description">
                Não há máquinas cadastradas ainda.
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                <i className="fas fa-plus"></i>
                Adicionar Primeira Máquina
              </button>
            </div>
          ) : (
            <div className="table-container overflow-x-auto">
              <table className="table min-w-full">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th className="hidden md:table-cell">Modelo</th>
                    <th className="hidden lg:table-cell">Localização</th>
                    <th>Status</th>
                    <th className="hidden sm:table-cell">Próxima Manutenção</th>
                    <th className="hidden md:table-cell">Capacidade</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(machines) && machines.map(machine => {
                    const maintenanceStatus = getMaintenanceStatus(machine.maintenanceSchedule?.nextMaintenance)
                    return (
                      <tr key={machine._id}>
                        <td>
                          <div className="machine-info">
                            <div className="machine-name">{machine.name}</div>
                            <div className="machine-serial">{machine.serialNumber}</div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell">
                          <div className="machine-model">
                            <div>{machine.model}</div>
                            <div className="manufacturer">{machine.manufacturer}</div>
                          </div>
                        </td>
                        <td className="hidden lg:table-cell">{machine.location || '-'}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(machine.status)}`}>
                            {getStatusText(machine.status)}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell">
                          <div className="maintenance-info">
                            <span className={`badge ${maintenanceStatus.badge}`}>
                              {maintenanceStatus.text}
                            </span>
                            <div className="maintenance-date">
                              {formatDate(machine.maintenanceSchedule?.nextMaintenance)}
                            </div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell">{machine.specifications?.capacity || '-'}</td>
                        <td>
                          <div className="btn-group flex flex-col sm:flex-row gap-1">
                            <button 
                              className="btn btn-secondary"
                              onClick={() => handleEdit(machine)}
                              title="Editar máquina"
                            >
                              <i className="fas fa-edit"></i>
                              <span className="hidden sm:inline ml-1">Editar</span>
                            </button>
                            <button 
                              className="btn btn-danger"
                              onClick={() => handleDelete(machine._id)}
                              title="Remover máquina"
                            >
                              <i className="fas fa-trash"></i>
                              <span className="hidden sm:inline ml-1">Remover</span>
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

export default MachinesView