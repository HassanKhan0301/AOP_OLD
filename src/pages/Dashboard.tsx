import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Clock3,
  Download,
  FileText,
  Gauge,
  Landmark,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import { Button, DashboardMetricsSkeleton, DashboardSkeleton, DirhamIcon, EmptyState, Select } from '../components/ui'
import { Dga_aop_kpisService } from '../generated/services/Dga_aop_kpisService'
import { Dga_aop_projectsesService } from '../generated/services/Dga_aop_projectsesService'
import type { Dga_aop_kpis } from '../generated/models/Dga_aop_kpisModel'
import type { Dga_aop_projectses } from '../generated/models/Dga_aop_projectsesModel'
import { fetchPlanningInstances } from '../store/appSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { formatCurrencyAmount } from '../utils/formatting'

const STATUS_LABELS: Record<number, string> = {
  1: 'Draft',
  576610001: 'Submitted to ADEO',
  776140001: 'Submitted to Division Director',
  776140002: 'Executive Director Review',
  776140003: 'Strategy Team Review',
  776140004: 'Pending Executive Director Submission',
  776140011: 'Active',
  776140012: 'Clarification',
  776140014: 'Director General Review',
  776140015: 'Deleted',
}

const PHASE_LABELS: Record<number, string> = {
  776140000: 'Planning',
  776140001: 'Execution',
}

const DASHBOARD_SELECT = [
  'dga_aop_projectsid',
  'dga_name',
  '_dga_sector_value',
  '_dga_department_value',
  '_dga_project_planning_instance_value',
  'dga_project_phase',
  'dga_project_activity_status',
  'dga_requested_budget',
  'dga_total_project_budget',
  'dga_allocated_budget',
  'dga_doesthisprojectrequirebudgetallocation',
  'dga_does_this_project_require_procurement',
  'statuscode',
  'modifiedon',
] satisfies (keyof Dga_aop_projectses)[]

const KPI_SELECT = [
  'dga_aop_kpiid',
  'dga_kpi_name',
  'dga_kpi_phase',
  'dga_divisionname',
  'dga_sectorname',
  '_dga_division_value',
  '_dga_sector_value',
  'dga_kpi_typename',
  'statuscode',
] satisfies (keyof Dga_aop_kpis)[]

function normalizeText(value?: string | null) {
  return value?.trim() || 'Unassigned'
}

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function phaseLabel(value?: number | string | null) {
  if (value == null || value === '') return 'Unspecified'
  return PHASE_LABELS[Number(value)] ?? 'Unspecified'
}

function statusLabel(value?: number | string | null) {
  if (value == null || value === '') return 'Unknown'
  return STATUS_LABELS[Number(value)] ?? 'Unknown'
}

function isPendingApproval(value?: number | string | null) {
  const code = Number(value)
  return [576610001, 776140001, 776140002, 776140003, 776140004, 776140014].includes(code)
}

function isClarification(value?: number | string | null) {
  return Number(value) === 776140012
}

function hasBudgetRequired(activity: Dga_aop_projectses) {
  return activity.dga_doesthisprojectrequirebudgetallocation === 1
}

function hasProcurementRequired(activity: Dga_aop_projectses) {
  return activity.dga_does_this_project_require_procurement === 1
}

function budgetValue(activity: Dga_aop_projectses) {
  return Number(activity.dga_total_project_budget ?? activity.dga_requested_budget ?? activity.dga_allocated_budget ?? 0)
}

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000) return `${formatCurrencyAmount(value / 1_000_000)}M`
  if (value >= 1_000) return `${formatCurrencyAmount(value / 1_000)}K`
  return formatCurrencyAmount(value) || '0'
}

function selectedRoleMatches(roleName: string, selectedRole: string) {
  return selectedRole.replace('AOP - ', '').toLowerCase() === roleName.toLowerCase()
}

function buildSvgDonutRows(rows: { color: string; label: string; value: number }[]) {
  const total = Math.max(1, rows.reduce((sum, row) => sum + row.value, 0))
  const circumference = 2 * Math.PI * 42

  return {
    circumference,
    rows: rows.map((row, index) => {
      const start = rows.slice(0, index).reduce((sum, previousRow) => sum + (previousRow.value / total) * 100, 0)
      const end = start + (row.value / total) * 100
      const middle = (start + end) / 2
      const radians = ((middle - 25) / 100) * Math.PI * 2

      return {
        ...row,
        dashOffset: (start / 100) * circumference,
        labelX: 64 + Math.cos(radians) * 38,
        labelY: 64 + Math.sin(radians) * 38,
        percent: Math.round((row.value / total) * 100),
        showPercent: row.value > 0 && ((row.value / total) * 100) >= 6,
      }
    }),
    total,
  }
}

function MetricCard({
  color,
  icon,
  label,
  trend,
  value,
}: {
  color: 'blue' | 'amber' | 'purple' | 'green' | 'red'
  icon: React.ReactNode
  label: string
  trend: string
  value: number
}) {
  return (
    <article className={`dashboard-metric-card dashboard-metric-card--${color}`}>
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
      <small><b>{trend}</b><em>vs last month</em></small>
    </article>
  )
}

export function Dashboard() {
  const dispatch = useAppDispatch()
  const selectedRole = useAppSelector((state) => state.app.selectedRole)
  const selectedCycle = useAppSelector((state) => state.app.selectedCycle)
  const currentRole = useAppSelector((state) => state.user.currentRole)
  const currentUserRoles = useAppSelector((state) => state.user.currentUserRoles)
  const currentRolesDivisionalHierarchies = useAppSelector((state) => state.user.currentRolesDivisionalHierarchies)
  const currentRoleDivisionalHierarchy = useAppSelector((state) => state.user.currentRoleDivisionalHierarchy)
  const divisionalHierarchies = useAppSelector((state) => state.user.divisionalHierarchies)
  const planningInstances = useAppSelector((state) => state.app.planningInstances)
  const planningInstancesCycleId = useAppSelector((state) => state.app.planningInstancesCycleId)
  const planningInstancesLoading = useAppSelector((state) => state.app.planningInstancesLoading)
  const [activities, setActivities] = useState<Dga_aop_projectses[]>([])
  const [kpis, setKpis] = useState<Dga_aop_kpis[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [approvalFilter, setApprovalFilter] = useState('all')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [divisionFilter, setDivisionFilter] = useState('all')
  const [chartTooltip, setChartTooltip] = useState<{ content: string[]; x: number; y: number } | null>(null)

  function showChartTooltip(event: React.PointerEvent<HTMLElement | SVGElement>, content: string[]) {
    setChartTooltip({
      content,
      x: event.clientX,
      y: event.clientY,
    })
  }

  function moveChartTooltip(event: React.PointerEvent<HTMLElement | SVGElement>) {
    setChartTooltip((current) => current ? { ...current, x: event.clientX, y: event.clientY } : current)
  }

  function hideChartTooltip() {
    setChartTooltip(null)
  }

  const effectiveRole = useMemo(() => {
    if (currentRole && selectedRoleMatches(currentRole.roleName, selectedRole)) return currentRole
    return currentUserRoles.find((role) => selectedRoleMatches(role.roleName, selectedRole)) ?? currentRole
  }, [currentRole, currentUserRoles, selectedRole])

  const effectiveRoleHierarchy = useMemo(() => {
    if (!effectiveRole) return currentRoleDivisionalHierarchy
    return currentRolesDivisionalHierarchies.find((hierarchy) => hierarchy.roleId === effectiveRole.roleId)
      ?? currentRoleDivisionalHierarchy
  }, [currentRoleDivisionalHierarchy, currentRolesDivisionalHierarchies, effectiveRole])

  const roleName = effectiveRole?.roleName ?? selectedRole
  const normalizedRoleName = roleName.toLowerCase()
  const roleHierarchyId = normalizeId(effectiveRoleHierarchy?.hierarchyId)

  const hierarchyNameById = useMemo(() => {
    return divisionalHierarchies.reduce<Record<string, string>>((map, hierarchy) => {
      const id = normalizeId(hierarchy.dga_divisional_hierarchyid)
      if (id && hierarchy.dga_name) map[id] = hierarchy.dga_name
      return map
    }, {})
  }, [divisionalHierarchies])

  const hasSelectedCyclePlanningInstances = Boolean(
    selectedCycle && normalizeId(planningInstancesCycleId) === normalizeId(selectedCycle),
  )

  const cyclePlanningInstanceIds = useMemo(() => {
    if (!selectedCycle || !hasSelectedCyclePlanningInstances || planningInstances.length === 0) return []
    return planningInstances
      .filter((instance) => normalizeId(instance._dga_assessment_cycle_value) === normalizeId(selectedCycle))
      .map((instance) => normalizeId(instance.dga_project_planning_instanceid))
      .filter(Boolean)
  }, [hasSelectedCyclePlanningInstances, planningInstances, selectedCycle])

  const isCycleFilterReady = Boolean(selectedCycle && hasSelectedCyclePlanningInstances && !planningInstancesLoading)

  const roleScopedPlanningInstanceIds = useMemo(() => {
    if (!roleHierarchyId) return cyclePlanningInstanceIds

    if (normalizedRoleName.includes('division member') || normalizedRoleName.includes('division director')) {
      return planningInstances
        .filter((instance) => normalizeId(instance._dga_assessment_cycle_value) === normalizeId(selectedCycle))
        .filter((instance) => normalizeId(instance._dga_divisional_hierarchy_value) === roleHierarchyId)
        .map((instance) => normalizeId(instance.dga_project_planning_instanceid))
        .filter(Boolean)
    }

    if (normalizedRoleName.includes('executive director')) {
      const sectorDivisionIds = new Set(
        divisionalHierarchies
          .filter((hierarchy) => normalizeId(hierarchy._dga_parent_divisional_hierarchy_value) === roleHierarchyId)
          .map((hierarchy) => normalizeId(hierarchy.dga_divisional_hierarchyid))
          .filter(Boolean),
      )

      return planningInstances
        .filter((instance) => normalizeId(instance._dga_assessment_cycle_value) === normalizeId(selectedCycle))
        .filter((instance) => sectorDivisionIds.has(normalizeId(instance._dga_divisional_hierarchy_value)))
        .map((instance) => normalizeId(instance.dga_project_planning_instanceid))
        .filter(Boolean)
    }

    return cyclePlanningInstanceIds
  }, [
    cyclePlanningInstanceIds,
    divisionalHierarchies,
    normalizedRoleName,
    planningInstances,
    roleHierarchyId,
    selectedCycle,
  ])

  const activityLookupRoleFilter = useMemo(() => {
    if (!roleHierarchyId) return ''
    if (normalizedRoleName.includes('division member') || normalizedRoleName.includes('division director')) {
      return `_dga_department_value eq ${roleHierarchyId}`
    }
    if (normalizedRoleName.includes('executive director')) return `_dga_sector_value eq ${roleHierarchyId}`
    return ''
  }, [normalizedRoleName, roleHierarchyId])

  const kpiRoleHierarchyFilter = useMemo(() => {
    if (!roleHierarchyId) return ''
    if (normalizedRoleName.includes('division member') || normalizedRoleName.includes('division director')) {
      return `_dga_division_value eq ${roleHierarchyId}`
    }
    if (normalizedRoleName.includes('executive director')) return `_dga_sector_value eq ${roleHierarchyId}`
    return ''
  }, [normalizedRoleName, roleHierarchyId])

  const activityOdataFilter = useMemo(() => {
    if (roleScopedPlanningInstanceIds.length === 0) return ''
    return `(${roleScopedPlanningInstanceIds.map((id) => `_dga_project_planning_instance_value eq ${id}`).join(' or ')})`
  }, [roleScopedPlanningInstanceIds])

  const scopedPlanningInstanceIdSet = useMemo(() => new Set(roleScopedPlanningInstanceIds), [roleScopedPlanningInstanceIds])
  const cyclePlanningInstanceIdSet = useMemo(() => new Set(cyclePlanningInstanceIds), [cyclePlanningInstanceIds])

  const applyClientActivityScope = useCallback((records: Dga_aop_projectses[]) => {
    const isDivisionRole = normalizedRoleName.includes('division member') || normalizedRoleName.includes('division director')
    const isExecutiveDirector = normalizedRoleName.includes('executive director')

    if (scopedPlanningInstanceIdSet.size > 0) {
      return records.filter((activity) => scopedPlanningInstanceIdSet.has(normalizeId(activity._dga_project_planning_instance_value)))
    }

    if (roleHierarchyId && isDivisionRole) {
      return records.filter((activity) => normalizeId(activity._dga_department_value) === roleHierarchyId)
    }

    if (roleHierarchyId && isExecutiveDirector) {
      return records.filter((activity) => normalizeId(activity._dga_sector_value) === roleHierarchyId)
    }

    if (cyclePlanningInstanceIdSet.size > 0) {
      return records.filter((activity) => cyclePlanningInstanceIdSet.has(normalizeId(activity._dga_project_planning_instance_value)))
    }

    return records
  }, [cyclePlanningInstanceIdSet, normalizedRoleName, roleHierarchyId, scopedPlanningInstanceIdSet])

  const getDivisionName = useCallback((activity: Dga_aop_projectses) => {
    const id = normalizeId(activity._dga_department_value)
    return normalizeText(activity.dga_departmentname || hierarchyNameById[id])
  }, [hierarchyNameById])

  const loadActivityRecords = useCallback(async (filter: string | undefined) => {
    const result = await Dga_aop_projectsesService.getAll({
      filter,
      maxPageSize: 500,
      orderBy: ['modifiedon desc'],
      select: DASHBOARD_SELECT,
    })

    return result.data ?? []
  }, [])

  const loadDashboard = useCallback(async () => {
    if (selectedCycle && !isCycleFilterReady) return

    setIsLoading(true)
    setError('')

    try {
      const shouldUsePlanningInstanceFilter = selectedCycle && roleScopedPlanningInstanceIds.length > 0
      const [activityRecords, kpiResult] = await Promise.all([
        shouldUsePlanningInstanceFilter
          ? loadActivityRecords(activityOdataFilter)
          : loadActivityRecords(activityLookupRoleFilter || undefined),
        Dga_aop_kpisService.getAll({
          filter: kpiRoleHierarchyFilter || undefined,
          maxPageSize: 500,
          orderBy: ['modifiedon desc'],
          select: KPI_SELECT,
        }),
      ])

      const fallbackActivityRecords = activityRecords.length === 0 && shouldUsePlanningInstanceFilter
        ? await loadActivityRecords(activityLookupRoleFilter || undefined)
        : activityRecords
      const unfilteredActivityRecords = fallbackActivityRecords.length === 0
        ? await loadActivityRecords(undefined)
        : fallbackActivityRecords
      const clientScopedActivityRecords = applyClientActivityScope(unfilteredActivityRecords)

      setActivities(clientScopedActivityRecords.length > 0 ? clientScopedActivityRecords : unfilteredActivityRecords)
      setKpis(kpiResult.data ?? [])
      setLastUpdated(new Date())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.')
    } finally {
      setIsLoading(false)
    }
  }, [
    activityLookupRoleFilter,
    activityOdataFilter,
    applyClientActivityScope,
    isCycleFilterReady,
    kpiRoleHierarchyFilter,
    loadActivityRecords,
    roleScopedPlanningInstanceIds.length,
    selectedCycle,
  ])

  useEffect(() => {
    if (selectedCycle && normalizeId(planningInstancesCycleId) !== normalizeId(selectedCycle)) {
      dispatch(fetchPlanningInstances(selectedCycle))
    }
  }, [dispatch, planningInstancesCycleId, selectedCycle])

  useEffect(() => {
    if (selectedCycle && !isCycleFilterReady) return
    const loadTimer = window.setTimeout(() => {
      void loadDashboard()
    }, 0)

    return () => window.clearTimeout(loadTimer)
  }, [isCycleFilterReady, loadDashboard, selectedCycle])

  const filteredActivities = activities
  const approvalOptions = useMemo(() => [
    { value: 'all', label: 'All approval statuses' },
    ...Array.from(new Set(activities.map((activity) => statusLabel(activity.statuscode))))
      .sort().map((label) => ({ value: label, label })),
  ], [activities])
  const divisionOptions = useMemo(() => [
    { value: 'all', label: 'All divisions' },
    ...Array.from(new Set(activities.map(getDivisionName))).sort()
      .map((label) => ({ value: label, label })),
  ], [activities, getDivisionName])
  const effectiveApprovalFilter = approvalOptions.some((option) => option.value === approvalFilter) ? approvalFilter : 'all'
  const effectiveDivisionFilter = divisionOptions.some((option) => option.value === divisionFilter) ? divisionFilter : 'all'
  const approvalActivities = useMemo(() => effectiveApprovalFilter === 'all' ? activities
    : activities.filter((activity) => statusLabel(activity.statuscode) === effectiveApprovalFilter), [activities, effectiveApprovalFilter])
  const phaseActivities = useMemo(() => phaseFilter === 'all' ? activities
    : activities.filter((activity) => phaseLabel(activity.dga_project_phase) === phaseFilter), [activities, phaseFilter])

  const metrics = useMemo(() => {
    const totalBudget = filteredActivities.reduce((sum, activity) => sum + budgetValue(activity), 0)
    const pendingApprovals = filteredActivities.filter((activity) => isPendingApproval(activity.statuscode)).length
    const clarifications = filteredActivities.filter((activity) => isClarification(activity.statuscode)).length
    const procurementRequired = filteredActivities.filter(hasProcurementRequired).length
    const budgetRequired = filteredActivities.filter(hasBudgetRequired).length
    const activeCount = filteredActivities.filter((activity) => Number(activity.statuscode) === 776140011).length

    return {
      activeCount,
      budgetRequired,
      clarifications,
      pendingApprovals,
      procurementRequired,
      totalActivities: filteredActivities.length,
      totalBudget,
    }
  }, [filteredActivities])

  const totalAllocatedBudget = useMemo(() => {
    return filteredActivities.reduce((sum, activity) => sum + Number(activity.dga_allocated_budget ?? 0), 0)
  }, [filteredActivities])

  const totalRequestedBudget = useMemo(() => {
    return filteredActivities.reduce((sum, activity) => sum + Number(activity.dga_requested_budget ?? 0), 0)
  }, [filteredActivities])

  const remainingBudget = Math.max(0, metrics.totalBudget - totalAllocatedBudget)

  const phaseChart = useMemo(() => {
    const rows = ['Planning', 'Execution', 'Active', 'Clarification', 'Closed'].map((label) => ({
      label,
      value: phaseActivities.filter((activity) => {
        if (label === 'Clarification') return isClarification(activity.statuscode)
        if (label === 'Active') return Number(activity.statuscode) === 776140011
        if (label === 'Closed') return Number(activity.statuscode) === 776140015
        return phaseLabel(activity.dga_project_phase) === label && !isClarification(activity.statuscode) && Number(activity.statuscode) !== 776140011
      }).length,
    }))
    return { max: Math.max(1, ...rows.map((row) => row.value)), rows }
  }, [phaseActivities])

  const statusDonut = useMemo(() => {
    const statusColors = ['#64748b', '#375efb', '#9333ea', '#44c486', '#fbbf24', '#5fb3b3']
    const statusOrder = ['Draft', 'Submitted to Division Director', 'Strategy Team Review', 'Executive Director Review', 'Approved']
    const statusCounts = new Map<string, number>()
    approvalActivities.forEach((activity) => {
      const label = statusLabel(activity.statuscode)
      statusCounts.set(label, (statusCounts.get(label) ?? 0) + 1)
    })
    const orderedRows = statusOrder
      .map((label) => [label, statusCounts.get(label) ?? 0] as const)
      .filter(([, value]) => value > 0)
    const extraRows = Array.from(statusCounts.entries())
      .filter(([label]) => !statusOrder.includes(label))
      .sort((firstRow, secondRow) => secondRow[1] - firstRow[1])
    const rows = [...orderedRows, ...extraRows].slice(0, 6).map(([label, value], index) => ({
      color: statusColors[index] ?? '#94a3b8',
      label,
      value,
    }))

    return buildSvgDonutRows(rows.length > 0 ? rows : [{ color: '#cbd5e1', label: 'No records', value: 1 }])
  }, [approvalActivities])

  const divisionBars = useMemo(() => {
    const totals = new Map<string, number>()
    filteredActivities.forEach((activity) => {
      const division = getDivisionName(activity)
      if (effectiveDivisionFilter !== 'all' && division !== effectiveDivisionFilter) return
      totals.set(division, (totals.get(division) ?? 0) + 1)
    })
    const rows = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const max = Math.max(1, ...rows.map(([, value]) => value))
    return { max, rows }
  }, [effectiveDivisionFilter, filteredActivities, getDivisionName])

  const budgetBars = useMemo(() => {
    const totals = new Map<string, { allocated: number; planned: number; spent: number }>()
    filteredActivities.forEach((activity) => {
      const division = getDivisionName(activity)
      const current = totals.get(division) ?? { allocated: 0, planned: 0, spent: 0 }
      current.planned += Number(activity.dga_total_project_budget ?? 0)
      current.allocated += Number(activity.dga_allocated_budget ?? 0)
      current.spent += Number(activity.dga_requested_budget ?? 0)
      totals.set(division, current)
    })
    const rows = Array.from(totals.entries())
      .map(([division, values]) => ({ division, ...values, total: values.planned + values.allocated + values.spent }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)
    const max = Math.max(1, ...rows.flatMap((row) => [row.planned, row.allocated, row.spent]))
    return { max, rows }
  }, [filteredActivities, getDivisionName])

  const recentActivities = useMemo(() => {
    return [...filteredActivities]
      .sort((a, b) => new Date(b.modifiedon ?? '').getTime() - new Date(a.modifiedon ?? '').getTime())
      .slice(0, 5)
  }, [filteredActivities])

  const hasRecords = filteredActivities.length > 0
  const showSkeleton = isLoading || Boolean(selectedCycle && !isCycleFilterReady)
  const lastUpdatedText = lastUpdated
    ? lastUpdated.toLocaleString('en-US', { day: '2-digit', hour: '2-digit', minute: '2-digit', month: 'short', year: 'numeric' })
    : '-'

  return (
    <main className="dashboard-page dashboard-page--reference" aria-busy={showSkeleton}>
      <span className="sr-only" role="status">{showSkeleton ? 'Loading dashboard...' : ''}</span>
      <section className="dashboard-titlebar">
        <div>
          <h1>Dashboard</h1>
          <p>Monitor division submissions, readiness gaps, budget exposure, and approval actions.</p>
        </div>
        <div className="dashboard-titlebar__actions">
          <span>Last updated<br /><strong>{lastUpdatedText}</strong></span>
          <Button className="dashboard-refresh" disabled={showSkeleton} onClick={loadDashboard} variant="secondary" icon={<RefreshCw aria-hidden="true" size={17} className={showSkeleton ? 'motion-safe:animate-spin' : ''} />}>{showSkeleton ? 'Refreshing...' : 'Refresh'}</Button>
        </div>
      </section>

      {showSkeleton ? <DashboardMetricsSkeleton /> : <section className="dashboard-metrics" aria-label="Dashboard metrics">
        <MetricCard color="blue" icon={<BriefcaseBusiness size={18} />} label="Total Activities" trend="+12%" value={metrics.totalActivities} />
        <MetricCard color="amber" icon={<Clock3 size={18} />} label="Pending Approvals" trend="+33%" value={metrics.pendingApprovals} />
        <MetricCard color="purple" icon={<AlertTriangle size={18} />} label="Clarification" trend="-100%" value={metrics.clarifications} />
        <MetricCard color="green" icon={<ShieldCheck size={18} />} label="Active Activities" trend="+50%" value={metrics.activeCount} />
      </section>}

      {showSkeleton ? (
        <DashboardSkeleton />
      ) : error ? (
        <EmptyState action={<Button onClick={loadDashboard} variant="secondary">Retry</Button>} description={error} title="Unable to load dashboard" />
      ) : !hasRecords ? (
        <EmptyState description="No accessible AOP activities were found for the selected role and cycle." title="No dashboard records found" />
      ) : (
          <section className="dashboard-content-grid" aria-label="Portfolio overview">
            <article className="dashboard-panel dashboard-panel--approval">
              <div className="dashboard-panel__head">
                <div>
                  <h2><ShieldCheck aria-hidden="true" />Activities by Approval Status</h2>
                  <p>Distribution of activities across approval stages.</p>
                </div>
                <Select className="dashboard-chart-select" id="dashboard-approval-filter" label="Approval Status" hideLabel options={approvalOptions} value={effectiveApprovalFilter} onChange={setApprovalFilter} />
              </div>
              <div className="dashboard-donut-layout">
                <figure className="dashboard-svg-donut dashboard-svg-donut--large">
                  <svg viewBox="0 0 128 128" role="img">
                    <circle className="dashboard-svg-donut__track" cx="64" cy="64" r="42" />
                    {statusDonut.rows.map((row) => (
                      <circle
                        aria-label={`${row.label}: ${row.value} activities, ${row.percent}%`}
                        className="dashboard-svg-donut__segment"
                        cx="64"
                        cy="64"
                        key={row.label}
                        onPointerEnter={(event) => showChartTooltip(event, [row.label, `${row.value} activities`, `${row.percent}% of visible activities`])}
                        onPointerLeave={hideChartTooltip}
                        onPointerMove={moveChartTooltip}
                        r="42"
                        stroke={row.color}
                        strokeDasharray={`${(row.value / statusDonut.total) * statusDonut.circumference} ${statusDonut.circumference}`}
                        strokeDashoffset={-row.dashOffset}
                        transform="rotate(-90 64 64)"
                      />
                    ))}
                    {statusDonut.rows.map((row) => (
                      row.showPercent ? (
                        <text className="dashboard-svg-donut__percent" key={`${row.label}-percent`} x={row.labelX} y={row.labelY}>{row.percent}%</text>
                      ) : null
                    ))}
                  </svg>
                  <figcaption><strong>{approvalActivities.length}</strong><span>Activities</span></figcaption>
                </figure>
                <div className="dashboard-chart-legend">
                  {statusDonut.rows.filter((row) => row.label !== 'No records').map((row) => (
                    <div key={row.label}><i style={{ background: row.color }} /><span>{row.label}</span><strong>{row.value}</strong></div>
                  ))}
                </div>
              </div>
            </article>

            <article className="dashboard-panel dashboard-panel--phase">
              <div className="dashboard-panel__head">
                <div>
                  <h2><BarChart3 aria-hidden="true" />Activities by Project Phase</h2>
                  <p>Number of activities in each project phase.</p>
                </div>
                <Select className="dashboard-chart-select" id="dashboard-phase-filter" label="Project Phase" hideLabel options={[{ value: 'all', label: 'All project phases' }, { value: 'Planning', label: 'Planning' }, { value: 'Execution', label: 'Execution' }]} value={phaseFilter} onChange={setPhaseFilter} />
              </div>
              <div className="dashboard-axis-chart">
                <div className="dashboard-axis-chart__scale">{[1, 0.75, 0.5, 0.25, 0].map((fraction) => <span key={fraction}>{Math.round(phaseChart.max * 1.35 * fraction)}</span>)}</div>
                {phaseChart.rows.map((row) => (
                  <div className="dashboard-axis-chart__item" key={row.label}>
                    <i
                      onPointerEnter={(event) => showChartTooltip(event, [row.label, `${row.value} activities`])}
                      onPointerLeave={hideChartTooltip}
                      onPointerMove={moveChartTooltip}
                      style={{ background: ['#2563eb', '#9333ea', '#44c486', '#fbbf24', '#64748b'][phaseChart.rows.indexOf(row)], height: `${(row.value / (phaseChart.max * 1.35)) * 100}%` }}
                    >
                      <strong>{row.value}</strong>
                    </i>
                    <span>{row.label}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-panel dashboard-panel--division">
              <div className="dashboard-panel__head">
                <div>
                  <h2><Users aria-hidden="true" />Activities by Division</h2>
                  <p>Activity count by division.</p>
                </div>
                <Select className="dashboard-chart-select" id="dashboard-division-filter" label="Division" hideLabel options={divisionOptions} value={effectiveDivisionFilter} onChange={setDivisionFilter} />
              </div>
              <div className="dashboard-horizontal-chart">
                {divisionBars.rows.map(([division, value], index) => (
                  <div className="dashboard-horizontal-chart__row" key={division}>
                    <div><span>{division}</span><strong>{value}</strong></div>
                    <i
                      onPointerEnter={(event) => showChartTooltip(event, [division, `${value} activities`])}
                      onPointerLeave={hideChartTooltip}
                      onPointerMove={moveChartTooltip}
                    >
                      <span style={{ background: ['#2563eb', '#9333ea', '#44c486', '#fbbf24', '#64748b'][index], width: `${Math.max(6, (value / divisionBars.max) * 100)}%` }} />
                    </i>
                  </div>
                ))}
              </div>
            </article>
            <article className="dashboard-panel dashboard-panel--budget">
              <div className="dashboard-panel__head">
                <div>
                  <h2><BriefcaseBusiness aria-hidden="true" />Budget Overview</h2>
                  <p>Planned vs Allocated vs Spent budget for the selected cycle.</p>
                </div>
                <div className="dashboard-budget-legend">
                  <span><i className="dashboard-grouped-bars__planned" />Planned</span>
                  <span><i className="dashboard-grouped-bars__allocated" />Allocated</span>
                  <span><i className="dashboard-grouped-bars__spent" />Spent</span>
                </div>
              </div>
              <div className="dashboard-grouped-bars" style={{ gridTemplateColumns: `repeat(${Math.max(1, budgetBars.rows.length)}, minmax(0, 1fr))` }}>
                <div className="dashboard-grouped-bars__axis">{[1, 0.75, 0.5, 0.25, 0].map((fraction) => <span key={fraction}>{formatCompactCurrency(budgetBars.max * fraction)}</span>)}</div>
                {budgetBars.rows.map((row) => (
                  <div className="dashboard-grouped-bars__group" key={row.division}>
                    <div>
                      <i
                        className="dashboard-grouped-bars__planned"
                        onPointerEnter={(event) => showChartTooltip(event, [row.division, `Planned: ${formatCompactCurrency(row.planned)}`])}
                        onPointerLeave={hideChartTooltip}
                        onPointerMove={moveChartTooltip}
                        style={{ height: `${Math.max(4, (row.planned / budgetBars.max) * 100)}%` }}
                      />
                      <i
                        className="dashboard-grouped-bars__allocated"
                        onPointerEnter={(event) => showChartTooltip(event, [row.division, `Allocated: ${formatCompactCurrency(row.allocated)}`])}
                        onPointerLeave={hideChartTooltip}
                        onPointerMove={moveChartTooltip}
                        style={{ height: `${Math.max(4, (row.allocated / budgetBars.max) * 100)}%` }}
                      />
                      <i
                        className="dashboard-grouped-bars__spent"
                        onPointerEnter={(event) => showChartTooltip(event, [row.division, `Spent: ${formatCompactCurrency(row.spent)}`])}
                        onPointerLeave={hideChartTooltip}
                        onPointerMove={moveChartTooltip}
                        style={{ height: `${Math.max(4, (row.spent / budgetBars.max) * 100)}%` }}
                      />
                    </div>
                    <span title={row.division}>{row.division}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-panel dashboard-panel--key">
              <div className="dashboard-panel__head"><div><h2><Gauge aria-hidden="true" />Key Metrics</h2></div></div>
              <div className="dashboard-key-metrics">
                <div><span><BriefcaseBusiness size={15} /></span><p>Total Budget (Planned)</p><strong><DirhamIcon /> {formatCompactCurrency(metrics.totalBudget)}</strong><i onPointerEnter={(event) => showChartTooltip(event, ['Total Budget (Planned)', formatCompactCurrency(metrics.totalBudget), '78%'])} onPointerLeave={hideChartTooltip} onPointerMove={moveChartTooltip}><b style={{ width: '78%' }} /></i><em>78%</em></div>
                <div><span><BriefcaseBusiness size={15} /></span><p>Allocated Budget</p><strong><DirhamIcon /> {formatCompactCurrency(totalAllocatedBudget)}</strong><i onPointerEnter={(event) => showChartTooltip(event, ['Allocated Budget', formatCompactCurrency(totalAllocatedBudget), '78%'])} onPointerLeave={hideChartTooltip} onPointerMove={moveChartTooltip}><b style={{ width: '78%' }} /></i><em>78%</em></div>
                <div><span><ShieldCheck size={15} /></span><p>Actual Spending</p><strong><DirhamIcon /> {formatCompactCurrency(totalRequestedBudget)}</strong><i onPointerEnter={(event) => showChartTooltip(event, ['Actual Spending', formatCompactCurrency(totalRequestedBudget), '50%'])} onPointerLeave={hideChartTooltip} onPointerMove={moveChartTooltip}><b style={{ width: '50%' }} /></i><em>50%</em></div>
                <div><span><Target size={15} /></span><p>Remaining Budget</p><strong><DirhamIcon /> {formatCompactCurrency(remainingBudget)}</strong><i onPointerEnter={(event) => showChartTooltip(event, ['Remaining Budget', formatCompactCurrency(remainingBudget), '50%'])} onPointerLeave={hideChartTooltip} onPointerMove={moveChartTooltip}><b style={{ width: '50%' }} /></i><em>50%</em></div>
              </div>
            </article>

            <article className="dashboard-ai-insights">
              <div className="dashboard-panel__head">
                <div className="dashboard-ai-insights__title">
                  <span><Sparkles size={20} /></span>
                  <div>
                    <h2>AI Portfolio Insights <b>Executive Insight</b></h2>
                    <p>{metrics.pendingApprovals} records are waiting in the approval path. Prioritize clarification items and high-budget activities before routing decisions.</p>
                  </div>
                </div>
                <div className="dashboard-ai-card__signals"><strong>{metrics.clarifications} clarification</strong><span>{metrics.procurementRequired} procurement required</span></div>
              </div>
              <div className="dashboard-insight-grid">
                <div><Clock3 size={18} /><strong>{metrics.pendingApprovals} activities are pending approval.</strong><span>Review these records to avoid delays in the approval path.</span></div>
                <div><BarChart3 size={18} /><strong>Budget exposure is {formatCompactCurrency(metrics.totalBudget)}.</strong><span>Monitor high-value divisions and requested allocation.</span></div>
                <div><Gauge size={18} /><strong>{metrics.procurementRequired} activities require procurement.</strong><span>Procurement review may affect execution timelines.</span></div>
                <div><Target size={18} /><strong>{kpis.length} KPI records in scope.</strong><span>Keep KPI coverage aligned with planning and execution phases.</span></div>
              </div>
            </article>

            <article className="dashboard-panel dashboard-panel--recent">
              <div className="dashboard-panel__head"><div><h2><Clock3 aria-hidden="true" />Recent Activities</h2></div><a className="dashboard-panel__link" href="#/activities">View All</a></div>
              <div className="dashboard-recent-list">
                {recentActivities.map((activity) => (
                  <div key={activity.dga_aop_projectsid}>
                    <span><BriefcaseBusiness size={15} /></span>
                    <div><strong>{activity.dga_name || 'Untitled Activity'}</strong><small>{statusLabel(activity.statuscode)} / {phaseLabel(activity.dga_project_phase)}</small></div>
                    <time>{activity.modifiedon ? new Date(activity.modifiedon).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</time>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-panel dashboard-panel--actions">
              <div className="dashboard-panel__head"><div><h2><Plus aria-hidden="true" />Quick Actions</h2></div></div>
              <div className="dashboard-actions-grid">
                <a href="#/create-activity"><Plus size={20} /><span>Create AOP Activity</span></a>
                <a href="#/approvals"><FileText size={20} /><span>View Approvals</span></a>
                <a href="#/execution-plan/create-activity"><Gauge size={20} /><span>Create Execution Activity</span></a>
                <a href="#/execution-plan/kpis"><Target size={20} /><span>Manage KPIs</span></a>
                <a href="#/financial-spending"><BarChart3 size={20} /><span>Financial Spending</span></a>
                <a href="#/overview"><Landmark size={20} /><span>Division Overview</span></a>
                <a href="#/activity-leads"><Users size={20} /><span>Activity Leads</span></a>
                <a href="#/activities"><Download size={20} /><span>Export Report</span></a>
              </div>
            </article>
          </section>
      )}
      {chartTooltip ? (
        <div
          className="dashboard-chart-tooltip"
          role="tooltip"
          style={{
            left: chartTooltip.x,
            top: chartTooltip.y,
          }}
        >
          {chartTooltip.content.map((line, index) => (
            index === 0 ? <strong key={line}>{line}</strong> : <span key={`${line}-${index}`}>{line}</span>
          ))}
        </div>
      ) : null}
    </main>
  )
}
