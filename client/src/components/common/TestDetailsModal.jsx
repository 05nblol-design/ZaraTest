import React from 'react'
import Modal from './Modal'

const TestDetailsModal = ({ isOpen, onClose, test }) => {
  if (!test) return null

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusInfo = (status) => {
    const statusMap = {
      'passed': { text: 'Aprovado', class: 'success', icon: 'fas fa-check-circle' },
      'failed': { text: 'Reprovado', class: 'danger', icon: 'fas fa-times-circle' },
      'pending': { text: 'Pendente', class: 'warning', icon: 'fas fa-clock' }
    }
    return statusMap[status] || { text: status, class: 'info', icon: 'fas fa-info-circle' }
  }

  const statusInfo = getStatusInfo(test.status)

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Detalhes do Teste de Qualidade"
      size="large"
    >
      <div className="test-details">
        <div className="test-details-header">
          <h3 className="test-details-title">
            {test.testType} - {test.machine?.name || 'Máquina não identificada'}
          </h3>
          <div className={`test-details-status ${statusInfo.class}`}>
            <i className={statusInfo.icon}></i>
            {statusInfo.text}
          </div>
        </div>

        <div className="test-details-grid">
          <div className="test-details-section">
            <h4 className="test-details-section-title">
              <i className="fas fa-info-circle"></i>
              Informações Gerais
            </h4>
            <div className="test-details-item">
              <span className="test-details-label">ID do Teste:</span>
              <span className="test-details-value">{test._id}</span>
            </div>
            <div className="test-details-item">
              <span className="test-details-label">Tipo de Teste:</span>
              <span className="test-details-value">{test.testType}</span>
            </div>
            <div className="test-details-item">
              <span className="test-details-label">Máquina:</span>
              <span className="test-details-value">{test.machine?.name || 'N/A'}</span>
            </div>
            <div className="test-details-item">
              <span className="test-details-label">Modelo:</span>
              <span className="test-details-value">{test.machine?.model || 'N/A'}</span>
            </div>
            <div className="test-details-item">
              <span className="test-details-label">Localização:</span>
              <span className="test-details-value">{test.machine?.location || 'N/A'}</span>
            </div>
          </div>

          <div className="test-details-section">
            <h4 className="test-details-section-title">
              <i className="fas fa-thermometer-half"></i>
              Parâmetros do Teste
            </h4>
            <div className="test-details-item">
              <span className="test-details-label">Temperatura:</span>
              <span className="test-details-value">
                {test.parameters?.temperature ? `${test.parameters.temperature}°C` : 'N/A'}
              </span>
            </div>
            <div className="test-details-item">
              <span className="test-details-label">Pressão:</span>
              <span className="test-details-value">
                {test.parameters?.pressure ? `${test.parameters.pressure} bar` : 'N/A'}
              </span>
            </div>
            <div className="test-details-item">
              <span className="test-details-label">Velocidade:</span>
              <span className="test-details-value">
                {test.parameters?.speed ? `${test.parameters.speed} rpm` : 'N/A'}
              </span>
            </div>
            <div className="test-details-item">
              <span className="test-details-label">Duração:</span>
              <span className="test-details-value">
                {test.parameters?.duration ? `${test.parameters.duration} min` : 'N/A'}
              </span>
            </div>
          </div>

          <div className="test-details-section">
            <h4 className="test-details-section-title">
              <i className="fas fa-chart-line"></i>
              Resultados
            </h4>
            <div className="test-details-item">
              <span className="test-details-label">Status:</span>
              <span className="test-details-value">
                <span className={`test-details-status ${statusInfo.class}`}>
                  <i className={statusInfo.icon}></i>
                  {statusInfo.text}
                </span>
              </span>
            </div>
            <div className="test-details-item">
              <span className="test-details-label">Qualidade:</span>
              <span className="test-details-value">
                {test.results?.quality || 'N/A'}
              </span>
            </div>
            <div className="test-details-item">
              <span className="test-details-label">Conformidade:</span>
              <span className="test-details-value">
                {test.results?.conformity ? 'Conforme' : 'Não conforme'}
              </span>
            </div>
            <div className="test-details-item">
              <span className="test-details-label">Pontuação:</span>
              <span className="test-details-value">
                {test.results?.score ? `${test.results.score}/100` : 'N/A'}
              </span>
            </div>
          </div>

          <div className="test-details-section">
            <h4 className="test-details-section-title">
              <i className="fas fa-user"></i>
              Responsável
            </h4>
            <div className="test-details-item">
              <span className="test-details-label">Operador:</span>
              <span className="test-details-value">{test.operator?.name || 'N/A'}</span>
            </div>
            <div className="test-details-item">
              <span className="test-details-label">Turno:</span>
              <span className="test-details-value">{test.operator?.shift || 'N/A'}</span>
            </div>
            <div className="test-details-item">
              <span className="test-details-label">Departamento:</span>
              <span className="test-details-value">{test.operator?.department || 'N/A'}</span>
            </div>
          </div>
        </div>

        {test.observations && (
          <div className="test-details-observations">
            <h4 className="test-details-observations-title">
              <i className="fas fa-sticky-note"></i>
              Observações
            </h4>
            <div className="test-details-observations-content">
              {test.observations}
            </div>
          </div>
        )}

        <div className="test-details-timeline">
          <h4 className="test-details-timeline-title">
            <i className="fas fa-history"></i>
            Linha do Tempo
          </h4>
          <div className="test-details-timeline-item">
            <div className="test-details-timeline-icon"></div>
            <div className="test-details-timeline-content">
              <div className="test-details-timeline-time">
                {formatDate(test.createdAt)}
              </div>
              <div className="test-details-timeline-event">
                Teste criado
              </div>
            </div>
          </div>
          {test.startedAt && (
            <div className="test-details-timeline-item">
              <div className="test-details-timeline-icon"></div>
              <div className="test-details-timeline-content">
                <div className="test-details-timeline-time">
                  {formatDate(test.startedAt)}
                </div>
                <div className="test-details-timeline-event">
                  Teste iniciado
                </div>
              </div>
            </div>
          )}
          {test.completedAt && (
            <div className="test-details-timeline-item">
              <div className="test-details-timeline-icon"></div>
              <div className="test-details-timeline-content">
                <div className="test-details-timeline-time">
                  {formatDate(test.completedAt)}
                </div>
                <div className="test-details-timeline-event">
                  Teste concluído
                </div>
              </div>
            </div>
          )}
          {test.updatedAt && test.updatedAt !== test.createdAt && (
            <div className="test-details-timeline-item">
              <div className="test-details-timeline-icon"></div>
              <div className="test-details-timeline-content">
                <div className="test-details-timeline-time">
                  {formatDate(test.updatedAt)}
                </div>
                <div className="test-details-timeline-event">
                  Última atualização
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default TestDetailsModal