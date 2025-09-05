import { useAuth } from '../contexts/AuthContext'
import logo from '../assets/logo.svg'

const Header = ({ user, unreadCount, onToggleNotifications }) => {
  const { logout } = useAuth()

  const handleLogout = () => {
    if (window.confirm('Tem certeza que deseja sair?')) {
      logout()
    }
  }

  return (
    <header className="flex items-center justify-between px-6 py-4" style={{backgroundColor: '#000688', borderBottom: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)'}}>
      <div className="flex items-center">
        <img src={logo} alt="Zara Quality System" className="h-10 mr-4" />
      </div>

      <div className="flex items-center space-x-4">
        <div className="text-right">
          <div className="font-semibold text-white">{user?.name || 'Usuário'}</div>
          <div className="text-sm text-gray-200">
            {user?.role === 'operator' && 'Operador'}
            {user?.role === 'leader' && 'Líder'}
            {user?.role === 'manager' && 'Gestor'}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <button 
              className="btn-header p-2 relative" 
              onClick={onToggleNotifications}
              aria-label="Notificações"
            >
              <i className="fas fa-bell text-white"></i>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
          <button 
            className="btn-header px-4 py-2" 
            onClick={handleLogout}
            aria-label="Sair"
          >
            <i className="fas fa-sign-out-alt mr-2 text-white"></i>
            <span className="text-white">Sair</span>
          </button>
        </div>
      </div>
    </header>
  )
}

export default Header