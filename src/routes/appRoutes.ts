import type { NavigationItemId } from '../constants/app'

export const APP_ROUTE_PATHS = {
  dashboard: '/dashboard',
  createActivity: '/create-activity',
  editActivity: '/edit-activity',
  overview: '/overview',
  activityLeads: '/activity-leads',
  activitiesList: '/activities',
  approvals: '/approvals',
  procurementPlan: '/procurement-plan',
  engagementPlan: '/engagement-plan',
  financialSpending: '/financial-spending',
  createExecutionPlanActivity: '/execution-plan/create-activity',
  executionPlanActivitiesList: '/execution-plan/activities',
  executionPlanFinancialSpending: '/execution-plan/financial-spending',
  createKpi: '/execution-plan/create-kpi',
  kpis: '/execution-plan/kpis',
} as const satisfies Record<NavigationItemId, string>

export type AppRoutePath = (typeof APP_ROUTE_PATHS)[NavigationItemId]

export const DEFAULT_APP_ROUTE: AppRoutePath = APP_ROUTE_PATHS.dashboard
export const UI_SHOWCASE_ROUTE = '/ui-showcase'
export const EXECUTION_PLAN_ACTIVITY_DETAIL_ROUTE = '/execution-plan/activity'
export const EXECUTION_PLAN_DRAFT_STORAGE_KEY = 'digital-connect-execution-plan-draft'
export const EXECUTION_PLAN_KPI_DETAIL_ROUTE = '/execution-plan/kpi'
export const EXECUTION_PLAN_KPI_DRAFT_STORAGE_KEY = 'digital-connect-execution-plan-kpi-draft'

export function isExecutionPlanActivityDetailRoute(pathname: string) {
  return pathname === EXECUTION_PLAN_ACTIVITY_DETAIL_ROUTE || pathname.startsWith(`${EXECUTION_PLAN_ACTIVITY_DETAIL_ROUTE}/`)
}

export function isExecutionPlanKpiDetailRoute(pathname: string) {
  return pathname === EXECUTION_PLAN_KPI_DETAIL_ROUTE || pathname.startsWith(`${EXECUTION_PLAN_KPI_DETAIL_ROUTE}/`)
}

export const APP_ROUTE_TITLES: Record<NavigationItemId, string> = {
  dashboard: 'Dashboard',
  createActivity: 'Create Activity',
  editActivity: 'Edit Activity',
  overview: 'Overview',
  activityLeads: 'Activity Leads',
  activitiesList: 'Activities List',
  approvals: 'Approvals',
  procurementPlan: 'Procurement Plan',
  engagementPlan: 'Engagement Plan',
  financialSpending: 'Financial Spending',
  createExecutionPlanActivity: 'Create Execution Activity',
  executionPlanActivitiesList: 'Execution Activities List',
  executionPlanFinancialSpending: 'Execution Financial Spending',
  createKpi: 'Create KPI',
  kpis: 'KPIs',
}

export function getNavigationPath(id: NavigationItemId) {
  return APP_ROUTE_PATHS[id]
}
