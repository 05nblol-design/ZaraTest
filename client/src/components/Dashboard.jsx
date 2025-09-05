import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Header from './Header'
import Sidebar from './Sidebar'
import MainContent from './MainContent'
import NotificationPanel from './NotificationPanel'
import './Dashboard.css'

const Dashboard = () => {
  const { user } = useAuth()
  const [activeView, setActiveView] = useState('dashboard')
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Inicializar dados do dashboard
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      // Aqui você pode carregar dados iniciais
      console.log('Carregando dados iniciais do dashboard...')
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
    }
  }

  const handleViewChange = (view) => {
    setActiveView(view)
  }

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications)
  }

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev])
    if (!notification.read) {
      setUnreadCount(prev => prev + 1)
    }
  }

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    )
    setUnreadCount(0)
  }

  return (
    <div className="app-container">
      <Header 
        user={user}
        unreadCount={unreadCount}
        onToggleNotifications={toggleNotifications}
      />
      
      <NotificationPanel 
        show={showNotifications}
        notifications={notifications}
        onClose={toggleNotifications}
        onMarkAsRead={markNotificationAsRead}
        onMarkAllAsRead={markAllNotificationsAsRead}
      />
      
      <div className="main-layout">
        <Sidebar 
          user={user}
          activeView={activeView}
          onViewChange={handleViewChange}
        />
        
        <MainContent 
          activeView={activeView}
          user={user}
        />
      </div>
    </div>
  )
}

export default Dashboard