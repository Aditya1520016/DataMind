import { useEffect } from 'react'
import { useStore } from '../store'
import { getModels } from '../utils/api'
import Sidebar from '../components/Sidebar'
import Header from '../components/Header'
import HomePage from './HomePage'
import UploadPage from './UploadPage'
import DashboardPage from './DashboardPage'
import EDAPage from './EDAPage'
import ReportPage from './ReportPage'
import ChatPage from './ChatPage'

const PAGES = {
  home: HomePage,
  upload: UploadPage,
  dashboard: DashboardPage,
  eda: EDAPage,
  report: ReportPage,
  chat: ChatPage,
}

export default function Layout() {
  const { view, setAvailableModels, setSelectedModel } = useStore()

  useEffect(() => {
    getModels().then(data => {
      setAvailableModels(data.models || [])
      if (data.models?.length > 0) setSelectedModel(data.models[0])
    }).catch(() => {})
  }, [])

  const Page = PAGES[view] || HomePage

  return (
    <div className="flex h-screen overflow-hidden bg-[#07090F]">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Page />
        </main>
      </div>
    </div>
  )
}
