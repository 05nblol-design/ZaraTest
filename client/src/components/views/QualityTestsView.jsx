import React, { useState, useEffect } from 'react'
import axios from 'axios'
import Tooltip from '../common/Tooltip'
import TestDetailsModal from '../common/TestDetailsModal'
import './Views.css'

const QualityTestsView = ({ user }) => {
  const [tests, setTests] = useState([])
  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedTest, setSelectedTest] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    machine: '',
    testType: '',
    parameters: {
      temperature: '',
      pressure: '',
      speed: ''
    },
    observations: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [testsResponse, machinesResponse] = await Promise.all([
        axios.get('/api/quality-tests'),
        axios.get('/api/machines')
      ])
      setTests(Array.isArray(testsResponse.data) ? testsResponse.data : [])
      setMachines(Array.isArray(machinesResponse.data) ? machinesResponse.data : [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setTests([])
      setMachines([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/quality-tests', formData)
      setShowForm(false)
      setFormData({
        machine: '',
        testType: '',
        parameters: { temperature: '', pressure: '', speed: '' },
        observations: ''
      })
      loadData()
    } catch (error) {
      console.error('Erro ao criar teste:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('parameters.')) {
      const paramName = name.split('.')[1]
      setFormData(prev => ({
        ...prev,
        parameters: {
          ...prev.parameters,
          [paramName]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
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
      'passed': 'badge-success',
      'failed': 'badge-danger',
      'pending': 'badge-warning'
    }
    return badges[status] || 'badge-info'
  }

  const getStatusText = (status) => {
    const texts = {
      'passed': 'Aprovado',
      'failed': 'Reprovado',
      'pending': 'Pendente'
    }
    return texts[status] || status
  }

  const openTestDetails = (test) => {
    setSelectedTest(test)
    setShowModal(true)
  }

  const closeTestDetails = () => {
    setSelectedTest(null)
    setShowModal(false)
  }

  const createTooltipContent = (test) => {
    const statusInfo = {
      'passed': { text: 'Aprovado', class: 'success' },
      'failed': { text: 'Reprovado', class: 'danger' },
      'pending': { text: 'Pendente', class: 'warning' }
    }
    const status = statusInfo[test.status] || { text: test.status, class: 'info' }
    
    return (
      <div className="tooltip-content">
        <div className="tooltip-title">{test.testType}</div>
        <div className="tooltip-divider"></div>
        <div className="tooltip-detail">
          <span className="label">Máquina:</span>
          <span className="value">{test.machine?.name || 'N/A'}</span>
        </div>
        <div className="tooltip-detail">
          <span className="label">Status:</span>
          <span className={`tooltip-status ${status.class}`}>{status.text}</span>
        </div>
        <div className="tooltip-detail">
          <span className="label">Temperatura:</span>
          <span className="value">{test.parameters?.temperature || '-'}°C</span>
        </div>
        <div className="tooltip-detail">
          <span className="label">Pressão:</span>
          <span className="value">{test.parameters?.pressure || '-'} bar</span>
        </div>
        <div className="tooltip-detail">
          <span className="label">Velocidade:</span>
          <span className="value">{test.parameters?.speed || '-'} rpm</span>
        </div>
        <div className="tooltip-detail">
          <span className="label">Data:</span>
          <span className="value">{formatDate(test.createdAt)}</span>
        </div>
        {test.observations && (
          <>
            <div className="tooltip-divider"></div>
            <div className="tooltip-detail">
              <span className="label">Observações:</span>
              <span className="value">{test.observations.substring(0, 50)}{test.observations.length > 50 ? '...' : ''}</span>
            </div>
          </>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="view-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p className="loading-text">Carregando testes de qualidade...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Testes de Qualidade</h1>
        <p className="view-subtitle">
          Gerencie e monitore os testes de qualidade das máquinas.
        </p>
        <div className="view-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowForm(true)}
          >
            <i className="fas fa-plus"></i>
            Novo Teste
          </button>
        </div>
      </div>

      {showForm && (
        <div className="section">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Novo Teste de Qualidade</h2>
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
                  <label htmlFor="testType">Tipo de Teste</label>
                  <select
                    id="testType"
                    name="testType"
                    value={formData.testType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Selecione o tipo</option>
                    <option value="routine">Rotina</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="quality">Qualidade</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-3">
                <div className="input-group">
                  <label htmlFor="temperature">Temperatura (°C)</label>
                  <input
                    type="number"
                    id="temperature"
                    name="parameters.temperature"
                    value={formData.parameters.temperature}
                    onChange={handleInputChange}
                    step="0.1"
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="pressure">Pressão (bar)</label>
                  <input
                    type="number"
                    id="pressure"
                    name="parameters.pressure"
                    value={formData.parameters.pressure}
                    onChange={handleInputChange}
                    step="0.1"
                  />
                </div>
                
                <div className="input-group">
                  <label htmlFor="speed">Velocidade (rpm)</label>
                  <input
                    type="number"
                    id="speed"
                    name="parameters.speed"
                    value={formData.parameters.speed}
                    onChange={handleInputChange}
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
                  placeholder="Observações sobre o teste..."
                ></textarea>
              </div>
              
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <i className="fas fa-save"></i>
                  Salvar Teste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Lista de Testes</h2>
          </div>
          
          {tests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <i className="fas fa-clipboard-check"></i>
              </div>
              <h3 className="empty-state-title">Nenhum teste encontrado</h3>
              <p className="empty-state-description">
                Não há testes de qualidade registrados ainda.
              </p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowForm(true)}
              >
                <i className="fas fa-plus"></i>
                Criar Primeiro Teste
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Máquina</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Temperatura</th>
                    <th>Pressão</th>
                    <th>Data</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map(test => (
                    <Tooltip 
                      key={test._id}
                      content={createTooltipContent(test)}
                      position="top"
                      delay={500}
                    >
                      <tr className="tooltip-trigger">
                        <td>{test.machine?.name || 'N/A'}</td>
                        <td>{test.testType}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(test.status)}`}>
                            {getStatusText(test.status)}
                          </span>
                        </td>
                        <td>{test.parameters?.temperature || '-'}°C</td>
                        <td>{test.parameters?.pressure || '-'} bar</td>
                        <td>{formatDate(test.createdAt)}</td>
                        <td>
                          <button 
                            className="btn btn-secondary" 
                            title="Ver detalhes completos"
                            onClick={() => openTestDetails(test)}
                          >
                            <i className="fas fa-eye"></i>
                          </button>
                        </td>
                      </tr>
                    </Tooltip>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      <TestDetailsModal 
        isOpen={showModal}
        onClose={closeTestDetails}
        test={selectedTest}
      />
    </div>
  )
}

export default QualityTestsView