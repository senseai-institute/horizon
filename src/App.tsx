import { Navigate, Route, Routes, HashRouter } from 'react-router-dom'
import Layout from './components/Layout'
import { ToastProvider } from './components/Toast'
import DiscoveryScreen from './screens/DiscoveryScreen'
import EvidenceScreen from './screens/EvidenceScreen'
import EvidenceViewerScreen from './screens/EvidenceViewerScreen'
import JournalScreen from './screens/JournalScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import ReviewQueueScreen from './screens/ReviewQueueScreen'
import SleevesScreen from './screens/SleevesScreen'
import ThesisDetailScreen from './screens/ThesisDetailScreen'
import ThesisMapScreen from './screens/ThesisMapScreen'
import { useHorizon } from './store/useHorizon'

export default function App() {
  const onboarded = useHorizon((s) => s.onboarded)
  return (
    <HashRouter>
      <ToastProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to={onboarded ? '/map' : '/onboarding'} replace />} />
            <Route path="/onboarding" element={<OnboardingScreen />} />
            <Route path="/map" element={<ThesisMapScreen />} />
            <Route path="/thesis/:id" element={<ThesisDetailScreen />} />
            <Route path="/discovery" element={<DiscoveryScreen />} />
            <Route path="/evidence" element={<EvidenceScreen />} />
            <Route path="/evidence/:id" element={<EvidenceViewerScreen />} />
            <Route path="/sleeves" element={<SleevesScreen />} />
            <Route path="/review" element={<ReviewQueueScreen />} />
            <Route path="/journal" element={<JournalScreen />} />
            <Route path="*" element={<Navigate to="/map" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </HashRouter>
  )
}
