import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { NAVIGATION_ITEMS } from './constants/app'
import { NavigationGuardProvider } from './contexts/NavigationGuardProvider'
import {
  DEFAULT_APP_ROUTE,
  APP_ROUTE_PATHS,
  EXECUTION_PLAN_ACTIVITY_DETAIL_ROUTE,
  EXECUTION_PLAN_KPI_DETAIL_ROUTE,
  UI_SHOWCASE_ROUTE,
  isExecutionPlanActivityDetailRoute,
  isExecutionPlanKpiDetailRoute,
} from './routes/appRoutes'
import { useAppSelector } from './store/hooks'
import { canViewNavigationItem } from './utils/permissions'
import './App.css'

const ActivitiesList = lazy(() => import('./pages/ActivitiesList').then((module) => ({ default: module.ActivitiesList })))
const Approvals = lazy(() => import('./pages/Approvals').then((module) => ({ default: module.Approvals })))
const CreateActivity = lazy(() => import('./pages/CreateActivity').then((module) => ({ default: module.CreateActivity })))
const CreateExecutionPlanActivity = lazy(() => import('./pages/CreateExecutionPlanActivity').then((module) => ({ default: module.CreateExecutionPlanActivity })))
const CreateKpi = lazy(() => import('./pages/CreateKpi').then((module) => ({ default: module.CreateKpi })))
const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })))
const EditActivity = lazy(() => import('./pages/EditActivity').then((module) => ({ default: module.EditActivity })))
const ExecutionPlanActivityDetail = lazy(() => import('./pages/ExecutionPlanActivityDetail').then((module) => ({ default: module.ExecutionPlanActivityDetail })))
const KpiDetail = lazy(() => import('./pages/KpiDetail').then((module) => ({ default: module.KpiDetail })))
const KpisList = lazy(() => import('./pages/KpisList').then((module) => ({ default: module.KpisList })))
const UiShowcase = lazy(() => import('./pages/UiShowcase').then((module) => ({ default: module.UiShowcase })))

type RouteGuardProps = {
  children: ReactNode
}

function RouteGuard({ children }: RouteGuardProps) {
  const location = useLocation()
  const selectedRole = useAppSelector((state) => state.app.selectedRole)
  const navigationItem = NAVIGATION_ITEMS.find((item) => item.path === location.pathname)

  if (location.pathname === UI_SHOWCASE_ROUTE || isExecutionPlanActivityDetailRoute(location.pathname) || isExecutionPlanKpiDetailRoute(location.pathname)) {
    return children
  }

  if (!navigationItem || !canViewNavigationItem(selectedRole, navigationItem)) {
    return <Navigate replace to={DEFAULT_APP_ROUTE} />
  }

  return children
}

function EmptyScreen() {
  return null
}

function ScrollToTopOnRouteChange() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname, search])

  return null
}

function App() {
  return (
    <NavigationGuardProvider>
      <AppLayout>
        <ScrollToTopOnRouteChange />
        <RouteGuard>
          <Suspense fallback={<EmptyScreen />}>
            <Routes>
              <Route element={<Dashboard />} path={APP_ROUTE_PATHS.dashboard} />
              <Route element={<CreateActivity />} path={APP_ROUTE_PATHS.createActivity} />
              <Route element={<EditActivity />} path={APP_ROUTE_PATHS.editActivity} />
              <Route element={<EmptyScreen />} path={APP_ROUTE_PATHS.overview} />
              <Route element={<EmptyScreen />} path={APP_ROUTE_PATHS.activityLeads} />
              <Route element={<ActivitiesList />} path={APP_ROUTE_PATHS.activitiesList} />
              <Route element={<Approvals />} path={APP_ROUTE_PATHS.approvals} />
              <Route element={<EmptyScreen />} path={APP_ROUTE_PATHS.procurementPlan} />
              <Route element={<EmptyScreen />} path={APP_ROUTE_PATHS.engagementPlan} />
              <Route element={<EmptyScreen />} path={APP_ROUTE_PATHS.financialSpending} />
              <Route element={<CreateExecutionPlanActivity />} path={APP_ROUTE_PATHS.createExecutionPlanActivity} />
              <Route element={<ExecutionPlanActivityDetail />} path={EXECUTION_PLAN_ACTIVITY_DETAIL_ROUTE} />
              <Route element={<ExecutionPlanActivityDetail />} path={`${EXECUTION_PLAN_ACTIVITY_DETAIL_ROUTE}/*`} />
              <Route element={<ActivitiesList variant="execution" />} path={APP_ROUTE_PATHS.executionPlanActivitiesList} />
              <Route element={<EmptyScreen />} path={APP_ROUTE_PATHS.executionPlanFinancialSpending} />
              <Route element={<CreateKpi />} path={APP_ROUTE_PATHS.createKpi} />
              <Route element={<KpiDetail />} path={EXECUTION_PLAN_KPI_DETAIL_ROUTE} />
              <Route element={<KpiDetail />} path={`${EXECUTION_PLAN_KPI_DETAIL_ROUTE}/*`} />
              <Route element={<KpisList />} path={APP_ROUTE_PATHS.kpis} />
              <Route element={<UiShowcase />} path={UI_SHOWCASE_ROUTE} />
              <Route element={<Navigate replace to={DEFAULT_APP_ROUTE} />} path="*" />
            </Routes>
          </Suspense>
        </RouteGuard>
      </AppLayout>
    </NavigationGuardProvider>
  )
}

export default App
