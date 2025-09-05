import './Sidebar.css'

const Sidebar = ({ user, activeView, onViewChange }) => {
  const menuItems = {
    operator: [
      { id: 'quality-tests', label: 'Testes de Qualidade', icon: 'fas fa-clipboard-check' },
      { id: 'teflon-change', label: 'Troca de Teflon', icon: 'fas fa-exchange-alt' },
      { id: 'production', label: 'Produção', icon: 'fas fa-industry' }
    ],
    leader: [
      { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
      { id: 'quality-tests', label: 'Testes de Qualidade', icon: 'fas fa-clipboard-check' },
      { id: 'teflon-change', label: 'Troca de Teflon', icon: 'fas fa-exchange-alt' },
      { id: 'production', label: 'Produção', icon: 'fas fa-industry' },
      { id: 'reports', label: 'Relatórios', icon: 'fas fa-chart-bar' },
      { id: 'team', label: 'Equipe', icon: 'fas fa-users' }
    ],
    manager: [
      { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
      { id: 'quality-tests', label: 'Testes de Qualidade', icon: 'fas fa-clipboard-check' },
      { id: 'teflon-change', label: 'Troca de Teflon', icon: 'fas fa-exchange-alt' },
      { id: 'production', label: 'Produção', icon: 'fas fa-industry' },
      { id: 'reports', label: 'Relatórios', icon: 'fas fa-chart-bar' },
      { id: 'team', label: 'Equipe', icon: 'fas fa-users' },
      { id: 'machines', label: 'Máquinas', icon: 'fas fa-cogs' },
      { id: 'settings', label: 'Configurações', icon: 'fas fa-cog' }
    ]
  }

  const currentMenuItems = menuItems[user?.role] || menuItems.operator

  return (
    <nav className="sidebar bg-white text-dark h-100 d-flex flex-column">
      <div className="p-3">
        <h5 className="text-center mb-4">Menu</h5>
        <ul className="list-unstyled">
          {currentMenuItems.map(item => (
            <li key={item.id} className="mb-2">
              <button
                className={`btn w-100 text-start d-flex align-items-center ${
                  activeView === item.id 
                    ? 'btn-primary' 
                    : 'btn-outline-dark'
                }`}
                onClick={() => onViewChange(item.id)}
              >
                <i className={`${item.icon} me-3`}></i>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  )
}

export default Sidebar