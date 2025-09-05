import { useState, useEffect } from 'react'
import axios from 'axios'

const DashboardView = ({ user }) => {
  const [stats, setStats] = useState({
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    activeMachines: 0,
    productivity: 0,
    efficiency: 0
  })
  const [loading, setLoading] = useState(true)
  const [recentTests, setRecentTests] = useState([])
  const [recentSessions, setRecentSessions] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Verificar se o usuário tem permissões adequadas
      if (user && user.role !== 'manager' && user.role !== 'leader') {
        setError('Acesso limitado: Algumas funcionalidades do dashboard requerem permissões de gestor ou líder.')
      }
      
      // Carregar estatísticas
      try {
        const statsResponse = await axios.get('/api/dashboard/stats')
        setStats(statsResponse.data.success ? statsResponse.data.data : {
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          activeMachines: 0,
          productivity: 0,
          efficiency: 0
        })
      } catch (statsError) {
        console.warn('Erro ao carregar estatísticas:', statsError.response?.status === 403 ? 'Acesso negado' : statsError.message)
        setStats({
          totalTests: 0,
          passedTests: 0,
          failedTests: 0,
          activeMachines: 0,
          productivity: 0,
          efficiency: 0
        })
      }
      
      // Carregar testes recentes
      try {
        const testsResponse = await axios.get('/api/quality-tests?limit=5')
        setRecentTests(Array.isArray(testsResponse.data.data) ? testsResponse.data.data : [])
      } catch (testsError) {
        console.warn('Erro ao carregar testes recentes:', testsError.response?.status === 403 ? 'Acesso negado' : testsError.message)
        setRecentTests([])
      }
      
      // Carregar sessões recentes
      try {
        const sessionsResponse = await axios.get('/api/operation-session/all')
        setRecentSessions(Array.isArray(sessionsResponse.data.data) ? sessionsResponse.data.data : [])
      } catch (sessionsError) {
        console.warn('Erro ao carregar sessões recentes:', sessionsError.response?.status === 403 ? 'Acesso negado - apenas gestores e líderes podem ver todas as sessões' : sessionsError.message)
        setRecentSessions([])
      }
      
    } catch (error) {
      console.error('Erro geral ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
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

  const getTestStatusBadge = (status) => {
    const badges = {
      'passed': 'badge-success',
      'failed': 'badge-danger',
      'pending': 'badge-warning'
    }
    return badges[status] || 'badge-info'
  }

  const getTestStatusText = (status) => {
    const texts = {
      'passed': 'Aprovado',
      'failed': 'Reprovado',
      'pending': 'Pendente'
    }
    return texts[status] || status
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-800 mb-2">Dashboard</h1>
        <p className="text-neutral-600">
          Bem-vindo, {user?.name}! Aqui está um resumo das atividades do sistema.
        </p>
        
        {error && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-yellow-800 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card bg-white border border-neutral-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h6 className="text-sm font-medium text-neutral-600 mb-0">Total de Testes</h6>
              </div>
              <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-neutral-800 mb-1">{stats.totalTests}</h3>
            <small className="text-accent text-sm font-medium">+12% este mês</small>
          </div>
        </div>

        <div className="card bg-white border border-neutral-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h6 className="text-sm font-medium text-neutral-600 mb-0">Testes Aprovados</h6>
              </div>
              <div className="w-12 h-12 bg-accent-50 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-neutral-800 mb-1">{stats.passedTests}</h3>
            <small className="text-accent text-sm font-medium">+8% este mês</small>
          </div>
        </div>

        <div className="card bg-white border border-neutral-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h6 className="text-sm font-medium text-neutral-600 mb-0">Máquinas Ativas</h6>
              </div>
              <div className="w-12 h-12 bg-secondary-50 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-neutral-800 mb-1">{stats.activeMachines}</h3>
            <small className="text-accent text-sm font-medium">100% operacional</small>
          </div>
        </div>

        <div className="card bg-white border border-neutral-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h6 className="text-sm font-medium text-neutral-600 mb-0">Eficiência</h6>
              </div>
              <div className="w-12 h-12 bg-primary-50 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-neutral-800 mb-1">{stats.efficiency}%</h3>
            <small className="text-accent text-sm font-medium">+5% esta semana</small>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Testes recentes */}
        <div className="card bg-white border border-neutral-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <h5 className="text-lg font-semibold text-neutral-800 mb-0">Testes Recentes</h5>
            <button className="btn-outline text-sm px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Ver todos</span>
            </button>
          </div>
          <div className="p-6">
            {recentTests.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h6 className="text-neutral-600 font-medium mb-2">Nenhum teste encontrado</h6>
                <p className="text-neutral-500 text-sm mb-0">
                  Não há testes de qualidade registrados recentemente.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="space-y-3">
                  {recentTests.map(test => (
                    <div key={test._id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-neutral-800">{test.machine?.name || 'N/A'}</p>
                          <p className="text-sm text-neutral-500">{formatDate(test.createdAt)}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        test.status === 'passed' ? 'bg-accent-100 text-accent-800' :
                        test.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {getTestStatusText(test.status)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sessões recentes */}
        <div className="card bg-white border border-neutral-200 rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-neutral-200 flex items-center justify-between">
            <h5 className="text-lg font-semibold text-neutral-800 mb-0">Sessões Recentes</h5>
            <button className="btn-outline text-sm px-3 py-1.5 rounded-md border border-neutral-300 text-neutral-600 hover:bg-neutral-50 transition-colors flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>Ver todas</span>
            </button>
          </div>
          <div className="p-6">
            {recentSessions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h6 className="text-neutral-600 font-medium mb-2">Nenhuma sessão encontrada</h6>
                <p className="text-neutral-500 text-sm mb-0">
                  Não há sessões de operação registradas recentemente.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="space-y-3">
                  {recentSessions.map(session => (
                    <div key={session._id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg hover:bg-neutral-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-secondary-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-medium text-neutral-800">{session.operator?.name || 'N/A'}</p>
                          <p className="text-sm text-neutral-500">{session.machine?.name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-neutral-800">
                          {session.endTime 
                            ? `${Math.round((new Date(session.endTime) - new Date(session.startTime)) / 60000)}min`
                            : 'Em andamento'
                          }
                        </span>
                        <p className="text-xs text-neutral-500 mt-1">
                          {session.endTime ? 'Finalizada' : 'Ativa'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardView