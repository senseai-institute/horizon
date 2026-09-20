import { HashRouter, Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'
import Layout from './components/Layout'
import SubNav from './components/SubNav'
import { ToastProvider } from './components/Toast'
import DiscoveryScreen from './screens/DiscoveryScreen'
import EvidenceScreen from './screens/EvidenceScreen'
import EvidenceViewerScreen from './screens/EvidenceViewerScreen'
import GoalDetailScreen from './screens/GoalDetailScreen'
import GoalsScreen from './screens/GoalsScreen'
import JournalScreen from './screens/JournalScreen'
import NewBeliefScreen from './screens/NewBeliefScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import ReviewQueueScreen from './screens/ReviewQueueScreen'
import SleevesScreen from './screens/SleevesScreen'
import ThesisDetailScreen from './screens/ThesisDetailScreen'
import ThesisMapScreen from './screens/ThesisMapScreen'
import TodayScreen from './screens/TodayScreen'
import ValuesScreen from './screens/ValuesScreen'
import { usePendingCount } from './store/derived'
import { useHorizon } from './store/useHorizon'

function BeliefsSection() {
  return (
    <div className="fill">
      <SubNav
        items={[
          { to: '/beliefs', label: 'Map', end: true },
          { to: '/beliefs/evidence', label: 'Evidence' },
          { to: '/beliefs/discovery', label: 'Find companies' },
          { to: '/beliefs/new', label: '+ New belief' },
        ]}
      />
      <Outlet />
    </div>
  )
}

function MoneySection() {
  const pending = usePendingCount()
  return (
    <div className="fill">
      <SubNav
        items={[
          { to: '/money', label: 'Allocation', end: true },
          { to: '/money/review', label: 'Review queue', badge: pending },
          { to: '/money/journal', label: 'Journal' },
        ]}
      />
      <Outlet />
    </div>
  )
}

/** Old links keep working. */
function Moved({ to }: { to: string }) {
  const params = useParams()
  return <Navigate to={to.replace(':id', params.id ?? '')} replace />
}

export default function App() {
  const onboarded = useHorizon((s) => s.onboarded)
  return (
    <HashRouter>
      <ToastProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to={onboarded ? '/today' : '/onboarding'} replace />} />
            <Route path="/onboarding" element={<OnboardingScreen />} />
            <Route path="/today" element={<TodayScreen />} />
            <Route path="/goals" element={<GoalsScreen />} />
            <Route path="/goals/:id" element={<GoalDetailScreen />} />
            <Route path="/values" element={<ValuesScreen />} />

            <Route path="/beliefs" element={<BeliefsSection />}>
              <Route index element={<ThesisMapScreen />} />
              <Route path="evidence" element={<EvidenceScreen />} />
              <Route path="evidence/:id" element={<EvidenceViewerScreen />} />
              <Route path="discovery" element={<DiscoveryScreen />} />
              <Route path="new" element={<NewBeliefScreen />} />
              <Route path=":id" element={<ThesisDetailScreen />} />
            </Route>

            <Route path="/money" element={<MoneySection />}>
              <Route index element={<SleevesScreen />} />
              <Route path="review" element={<ReviewQueueScreen />} />
              <Route path="journal" element={<JournalScreen />} />
            </Route>

            <Route path="/map" element={<Moved to="/beliefs" />} />
            <Route path="/thesis/:id" element={<Moved to="/beliefs/:id" />} />
            <Route path="/evidence" element={<Moved to="/beliefs/evidence" />} />
            <Route path="/evidence/:id" element={<Moved to="/beliefs/evidence/:id" />} />
            <Route path="/discovery" element={<Moved to="/beliefs/discovery" />} />
            <Route path="/sleeves" element={<Moved to="/money" />} />
            <Route path="/review" element={<Moved to="/money/review" />} />
            <Route path="/journal" element={<Moved to="/money/journal" />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </HashRouter>
  )
}
