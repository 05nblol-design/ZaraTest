import { useState } from 'react'
import './NotificationPanel.css'

const NotificationPanel = ({ 
  show, 
  notifications, 
  onClose, 
  onMarkAsRead, 
  onMarkAllAsRead 
}) => {
  const [filter, setFilter] = useState('all')

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read
      case 'critical':
        return notification.priority === 'critical'
      default:
        return true
    }
  })

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Agora'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m atrás`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h atrás`
    return date.toLocaleDateString('pt-BR')
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'critical':
        return 'fas fa-exclamation-triangle'
      case 'warning':
        return 'fas fa-exclamation-circle'
      case 'info':
        return 'fas fa-info-circle'
      default:
        return 'fas fa-bell'
    }
  }

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'critical':
        return 'critical'
      case 'warning':
        return 'warning'
      case 'info':
        return 'info'
      default:
        return 'default'
    }
  }

  if (!show) return null

  return (
    <>
      <div className="notification-overlay" onClick={onClose}></div>
      <div className="notification-panel">
        <div className="notification-header">
          <div className="notification-title">
            <i className="fas fa-bell"></i>
            <h3>Notificações</h3>
          </div>
          <div className="notification-actions">
            <button 
              className="btn-mark-all-read" 
              onClick={onMarkAllAsRead}
              title="Marcar todas como lidas"
            >
              <i className="fas fa-check-double"></i>
            </button>
            <button 
              className="notification-close" 
              onClick={onClose}
              title="Fechar"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
        
        <div className="notification-filters">
          <button 
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Todas
          </button>
          <button 
            className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Não lidas
          </button>
          <button 
            className={`filter-btn ${filter === 'critical' ? 'active' : ''}`}
            onClick={() => setFilter('critical')}
          >
            Críticas
          </button>
        </div>
        
        <div className="notification-list">
          {filteredNotifications.length === 0 ? (
            <div className="empty-notifications">
              <i className="fas fa-bell-slash"></i>
              <p>Nenhuma notificação encontrada</p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div 
                key={notification.id}
                className={`notification-item ${!notification.read ? 'unread' : ''} ${getPriorityClass(notification.priority)}`}
                onClick={() => !notification.read && onMarkAsRead(notification.id)}
              >
                <div className="notification-icon">
                  <i className={getPriorityIcon(notification.priority)}></i>
                </div>
                <div className="notification-content">
                  <div className="notification-message">
                    {notification.message}
                  </div>
                  <div className="notification-meta">
                    <span className="notification-time">
                      {formatTime(notification.timestamp)}
                    </span>
                    {notification.source && (
                      <span className="notification-source">
                        • {notification.source}
                      </span>
                    )}
                  </div>
                </div>
                {!notification.read && (
                  <div className="notification-unread-dot"></div>
                )}
              </div>
            ))
          )}
        </div>
        
        <div className="notification-footer">
          <button className="btn-view-all">
            Ver todas as notificações
          </button>
        </div>
      </div>
    </>
  )
}

export default NotificationPanel