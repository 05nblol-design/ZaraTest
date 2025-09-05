import DashboardView from './views/DashboardView'
import QualityTestsView from './views/QualityTestsView'
import TeflonChangeView from './views/TeflonChangeView'
import ProductionView from './views/ProductionView'
import ReportsView from './views/ReportsView'
import TeamView from './views/TeamView'
import MachinesView from './views/MachinesView'
import SettingsView from './views/SettingsView'
import './MainContent.css'
import './views/Views.css'

const MainContent = ({ activeView, user }) => {
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView user={user} />
      case 'quality-tests':
        return <QualityTestsView user={user} />
      case 'teflon-change':
        return <TeflonChangeView user={user} />
      case 'production':
        return <ProductionView user={user} />
      case 'reports':
        return <ReportsView user={user} />
      case 'team':
        return <TeamView user={user} />
      case 'machines':
        return <MachinesView user={user} />
      case 'settings':
        return <SettingsView user={user} />
      default:
        return <DashboardView user={user} />
    }
  }

  return (
    <main className="main-content">
      <div className="content-wrapper">
        {renderView()}
      </div>
    </main>
  )
}

export default MainContent