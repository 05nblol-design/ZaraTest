import { useState, useEffect } from 'react'
import axios from 'axios'

const ReportsView = ({ user }) => {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    reportType: '',
    machine: ''
  })
  const [machines, setMachines] = useState([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [reportsResponse, machinesResponse] = await Promise.all([
        axios.get('/api/quality-tests'),
        axios.get('/api/machines')
      ])
      setReports(reportsResponse.data.data || [])
      setMachines(machinesResponse.data.data || [])
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setReports([])
      setMachines([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleGenerateReport = async (e) => {
    e.preventDefault()
    try {
      setGenerating(true)
      await axios.post('/api/quality-tests/generate', filters)
      loadData()
    } catch (error) {
      console.error('Erro ao gerar relatório:', error)
    } finally {
      setGenerating(false)
    }
  }

  const handleDownloadReport = async (reportId) => {
    try {
      const response = await axios.get(`/reports/${reportId}/download`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `relatorio_${reportId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Erro ao baixar relatório:', error)
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

  const getReportTypeBadge = (type) => {
    const badges = {
      'production': 'badge-primary',
      'quality': 'badge-success',
      'maintenance': 'badge-warning',
      'efficiency': 'badge-info'
    }
    return badges[type] || 'badge-secondary'
  }

  const getReportTypeText = (type) => {
    const texts = {
      'production': 'Produção',
      'quality': 'Qualidade',
      'maintenance': 'Manutenção',
      'efficiency': 'Eficiência'
    }
    return texts[type] || type
  }

  const getStatusBadge = (status) => {
    const badges = {
      'generating': 'badge-warning',
      'ready': 'badge-success',
      'error': 'badge-danger'
    }
    return badges[status] || 'badge-secondary'
  }

  const getStatusText = (status) => {
    const texts = {
      'generating': 'Gerando',
      'ready': 'Pronto',
      'error': 'Erro'
    }
    return texts[status] || status
  }

  if (loading) {
    return (
      <div className="view-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p className="loading-text">Carregando relatórios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h1 className="view-title">Relatórios</h1>
        <p className="view-subtitle">
          Gere e visualize relatórios de produção, qualidade e eficiência.
        </p>
      </div>

      <div className="section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Gerar Novo Relatório</h2>
          </div>
          
          <form onSubmit={handleGenerateReport}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="input-group">
                <label htmlFor="reportType">Tipo de Relatório</label>
                <select
                  id="reportType"
                  name="reportType"
                  value={filters.reportType}
                  onChange={handleFilterChange}
                  required
                >
                  <option value="">Selecione o tipo</option>
                  <option value="production">Produção</option>
                  <option value="quality">Qualidade</option>
                  <option value="maintenance">Manutenção</option>
                  <option value="efficiency">Eficiência</option>
                </select>
              </div>
              
              <div className="input-group">
                <label htmlFor="machine">Máquina (Opcional)</label>
                <select
                  id="machine"
                  name="machine"
                  value={filters.machine}
                  onChange={handleFilterChange}
                >
                  <option value="">Todas as máquinas</option>
                  {machines.map(machine => (
                    <option key={machine._id} value={machine._id}>
                      {machine.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="input-group">
                <label htmlFor="dateFrom">Data Inicial</label>
                <input
                  type="date"
                  id="dateFrom"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                  required
                />
              </div>
              
              <div className="input-group">
                <label htmlFor="dateTo">Data Final</label>
                <input
                  type="date"
                  id="dateTo"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={generating}
              >
                {generating ? (
                  <>
                    <div className="loading-spinner small"></div>
                    Gerando...
                  </>
                ) : (
                  <>
                    <i className="fas fa-file-alt"></i>
                    Gerar Relatório
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="section">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Relatórios Gerados</h2>
          </div>
          
          {reports.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <i className="fas fa-chart-bar"></i>
              </div>
              <h3 className="empty-state-title">Nenhum relatório encontrado</h3>
              <p className="empty-state-description">
                Não há relatórios gerados ainda. Use o formulário acima para gerar seu primeiro relatório.
              </p>
            </div>
          ) : (
            <div className="table-container overflow-x-auto">
              <table className="table min-w-full">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap">Tipo</th>
                    <th className="hidden md:table-cell whitespace-nowrap">Período</th>
                    <th className="hidden lg:table-cell whitespace-nowrap">Máquina</th>
                    <th className="whitespace-nowrap">Status</th>
                    <th className="hidden sm:table-cell whitespace-nowrap">Gerado em</th>
                    <th className="hidden lg:table-cell whitespace-nowrap">Gerado por</th>
                    <th className="whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map(report => (
                    <tr key={report._id}>
                      <td>
                        <span className={`badge ${getReportTypeBadge(report.type)}`}>
                          {getReportTypeText(report.type)}
                        </span>
                      </td>
                      <td className="hidden md:table-cell">
                        <div className="text-sm">
                          <div>{new Date(report.dateFrom).toLocaleDateString('pt-BR')}</div>
                          <div className="text-gray-500">até {new Date(report.dateTo).toLocaleDateString('pt-BR')}</div>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell">{report.machine?.name || 'Todas'}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(report.status)}`}>
                          {getStatusText(report.status)}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell">
                        <div className="text-sm">
                          {formatDate(report.createdAt)}
                        </div>
                      </td>
                      <td className="hidden lg:table-cell">{report.generatedBy?.name || 'N/A'}</td>
                      <td>
                        <div className="btn-group flex flex-col sm:flex-row gap-1">
                          {report.status === 'ready' && (
                            <button 
                              className="btn btn-sm btn-primary flex items-center justify-center"
                              onClick={() => handleDownloadReport(report._id)}
                              title="Baixar relatório"
                            >
                              <i className="fas fa-download"></i>
                              <span className="ml-1 hidden sm:inline">Baixar</span>
                            </button>
                          )}
                          <button 
                            className="btn btn-sm btn-secondary flex items-center justify-center" 
                            title="Ver detalhes"
                          >
                            <i className="fas fa-eye"></i>
                            <span className="ml-1 hidden sm:inline">Ver</span>
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

      <div className="section">
        <div className="grid grid-cols-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Estatísticas Rápidas</h3>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-file-alt"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-number">{reports.length}</div>
                  <div className="stat-label">Total de Relatórios</div>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-clock"></i>
                </div>
                <div className="stat-content">
                  <div className="stat-number">
                    {reports.filter(r => r.status === 'generating').length}
                  </div>
                  <div className="stat-label">Em Processamento</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Tipos Mais Gerados</h3>
            </div>
            <div className="report-types">
              {['production', 'quality', 'maintenance', 'efficiency'].map(type => {
                const count = reports.filter(r => r.type === type).length
                return (
                  <div key={type} className="report-type-item">
                    <span className={`badge ${getReportTypeBadge(type)}`}>
                      {getReportTypeText(type)}
                    </span>
                    <span className="count">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReportsView