import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Filter,
  LayoutList,
  Plus,
  RotateCcw,
  Rows,
  Scale,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { Badge, Button, DatePicker, EmptyState, Input, SearchInput, Select, Tabs } from '../components/ui'
import type { SelectOption, TabItem } from '../components/ui'
import { APP_ROUTE_PATHS, EXECUTION_PLAN_ACTIVITY_DETAIL_ROUTE } from '../routes/appRoutes'
import { fetchPlanningInstances } from '../store/appSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import '../styles/activities-list.css'
import {
  Dga_aop_projectsesService,
} from '../generated/services/Dga_aop_projectsesService'
import { SystemusersService } from '../generated/services/SystemusersService'
import { TeamsService } from '../generated/services/TeamsService'
import { Dga_aop_projectsesdga_project_categorized_under } from '../generated/models/Dga_aop_projectsesModel'
import type { Dga_aop_projectses } from '../generated/models/Dga_aop_projectsesModel'
import type { Systemusers } from '../generated/models/SystemusersModel'
import type { Teams } from '../generated/models/TeamsModel'
import { formatDate } from './editActivity/helpers/sharedHelpers'

// ── Enum Helpers ──

function readableEnumLabel(value: string) {
  const labels: Record<string, string> = {
    AbuDhabiGovernmentDigitalStrategy: 'Abu Dhabi Government Digital Strategy',
    DGECorporateStrategy: 'DGE Corporate Strategy',
    GovernmentoftheFutureStrategy: 'Government of the Future Strategy',
  }

  if (labels[value]) {
    return labels[value]
  }

  return value.replace(/([a-z])([A-Z])/g, '$1 $2')
}

const CATEGORIZED_OPTIONS: SelectOption<string>[] = Object
  .entries(Dga_aop_projectsesdga_project_categorized_under)
  .map(([value, label]) => ({
    label: readableEnumLabel(label),
    value,
  }))

const CATEGORIZED_LABEL_BY_VALUE = CATEGORIZED_OPTIONS.reduce<Record<string, string>>((map, option) => {
  map[option.value] = option.label
  return map
}, {})

const PAGE_SIZE = 10

// ── Status code label & tone mapping ──

const STATUS_CODE_MAP: Record<number, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' }> = {
  1: { label: 'Draft', tone: 'neutral' },
  576610001: { label: 'Submitted to ADEO', tone: 'info' },
  776140001: { label: 'Submitted to Division Director', tone: 'warning' },
  776140003: { label: 'Approved By Division Director', tone: 'info' },
  2: { label: 'Inactive', tone: 'neutral' },
  776140004: { label: 'Approved By Strategy Team', tone: 'warning' },
  776140002: { label: 'Approved By Executive Director', tone: 'warning' },
  776140014: { label: 'Approved By Director General', tone: 'warning' },
  776140011: { label: 'Active', tone: 'success' },
  776140012: { label: 'Pending Clarification', tone: 'warning' },
  776140015: { label: 'Deleted', tone: 'neutral' },
}

const ACTIVITY_STATUS_MAP: Record<number, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' }> = {
  776140014: { label: 'Draft', tone: 'neutral' },
  776140007: { label: 'Not Started', tone: 'info' },
  776140005: { label: 'In Progress (Delayed)', tone: 'warning' },
  776140006: { label: 'In Progress (On Track)', tone: 'success' },
  776140009: { label: 'On Hold', tone: 'warning' },
  776140010: { label: 'Cancelled', tone: 'neutral' },
  776140013: { label: 'Completed', tone: 'success' },
  776140015: { label: 'Submitted for Approval', tone: 'info' },
}

const PHASE_LABEL_MAP: Record<number, string> = {
  776140000: 'Planning',
  776140001: 'Execution',
}

const PROJECT_TYPE_LABEL_MAP: Record<number, string> = {
  1: 'Strategic',
  2: 'Operational',
}

function formatBudget(value: number | null | undefined): string {
  if (value == null) return '—'
  return `AED ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function statusCodeLabel(code: number): string {
  return STATUS_CODE_MAP[code]?.label ?? 'Unknown'
}

function statusCodeTone(code: number): 'neutral' | 'info' | 'warning' | 'success' {
  return STATUS_CODE_MAP[code]?.tone ?? 'neutral'
}

function activityStatusLabel(code: number): string {
  return ACTIVITY_STATUS_MAP[code]?.label ?? 'Unknown'
}

function activityStatusTone(code: number): 'neutral' | 'info' | 'warning' | 'success' {
  return ACTIVITY_STATUS_MAP[code]?.tone ?? 'neutral'
}

function phaseLabel(code: number): string {
  return PHASE_LABEL_MAP[code] ?? 'Unknown'
}

function projectTypeLabel(code: number | null | undefined): string {
  if (code == null) return '—'
  return PROJECT_TYPE_LABEL_MAP[Number(code)] ?? '—'
}

function yesNoLabel(value: boolean | number | null | undefined): string {
  if (value === true || value === 1) return 'Yes'
  return 'No'
}

function getColumnFilterLabel(column: ActColumnKey): string {
  const labels: Partial<Record<ActColumnKey, string>> = {
    dga_name: 'Activity / Initiative Name',
    dga_sectorname: 'Sector',
    dga_departmentname: 'Division',
    statuscode: 'Approval Status',
    dga_project_phase: 'Phase',
    dga_project_activity_status: 'Activity Status',
    dga_registered_or_will_be_registered_in_epm: 'EPM',
    dga_adeo_review_required: 'ADEO',
    dga_doesthisprojectrequirebudgetallocation: 'Budget Required',
    dga_does_this_project_require_procurement: 'Procurement Required',
    dga_total_project_budget: 'Total Budget',
    dga_allocated_budget: 'Allocated Budget',
    dga_requested_budget: 'Requested Budget',
    dga_planned_start_date: 'Start Date',
    dga_planned_end_date: 'End Date',
    dga_project_categorized_under: 'Project Categorized',
    pending_with: 'Pending With',
  }

  return labels[column] ?? column
}

function getColumnFilterSubtitle(type: ColFilterType): string {
  if (type === 'number') return 'Filter numeric values'
  if (type === 'date') return 'Filter date values'
  if (type === 'multi') return 'Choose one or more values'
  if (type === 'boolean') return 'Choose a yes or no value'
  return 'Choose operator and value'
}

function getColumnFilterPlaceholder(column: ActColumnKey, type: ColFilterType): string {
  if (type === 'number') return 'Enter amount'
  if (type === 'date') return 'Select date'
  if (column === 'dga_name') return 'Enter project name'
  return 'Filter value...'
}

function activitySummary(activity: Dga_aop_projectses): string {
  return activity.dga_description_summary || 'No summary has been provided for this activity.'
}

function activityScope(activity: Dga_aop_projectses): string {
  return activity.dga_scope || 'No scope description has been provided for this activity.'
}

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function getPendingWith(activity: Dga_aop_projectses, ownerNameById: Record<string, string> = {}): string {
  const ownerTeamId = normalizeId(activity._owningteam_value)
  const ownerUserId = normalizeId(activity._owninguser_value)

  if (ownerTeamId) {
    return ownerNameById[ownerTeamId] || 'Team'
  }

  if (ownerUserId) {
    return ownerNameById[ownerUserId] || 'User'
  }

  return '—'
}

function getLookupName(lookupId: string | null | undefined, nameById: Record<string, string>) {
  const id = normalizeId(lookupId)
  return id ? nameById[id] || '—' : '—'
}

function parseCategorizedValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  return String(value ?? '')
    .replace(/[[\]]/g, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getCategorizedLabels(activity: Dga_aop_projectses): string[] {
  return parseCategorizedValues(activity.dga_project_categorized_under)
    .map((value) => CATEGORIZED_LABEL_BY_VALUE[value] ?? value)
}

function getCategorizedExportValue(activity: Dga_aop_projectses) {
  const labels = getCategorizedLabels(activity)
  return labels.length > 0 ? labels.join(' | ') : '—'
}

async function loadOwnerNameMap(activities: Dga_aop_projectses[]) {
  const teamIds = Array.from(new Set(activities.map((activity) => normalizeId(activity._owningteam_value)).filter(Boolean)))
  const userIds = Array.from(new Set(activities.map((activity) => normalizeId(activity._owninguser_value)).filter(Boolean)))
  const ownerNameById: Record<string, string> = {}

  try {
    if (teamIds.length > 0) {
      const teamsResult = await TeamsService.getAll({
        filter: teamIds.map((id) => `teamid eq '${id}'`).join(' or '),
        select: ['teamid', 'name'],
      })

      ;((teamsResult.data ?? []) as Teams[]).forEach((team) => {
        const teamId = normalizeId(team.teamid)
        if (teamId && team.name) {
          ownerNameById[teamId] = team.name
        }
      })
    }

    if (userIds.length > 0) {
      const usersResult = await SystemusersService.getAll({
        filter: userIds.map((id) => `systemuserid eq '${id}'`).join(' or '),
        select: ['systemuserid', 'fullname', 'internalemailaddress'],
      })

      ;((usersResult.data ?? []) as Systemusers[]).forEach((user) => {
        const userId = normalizeId(user.systemuserid)
        const userName = user.fullname || user.internalemailaddress
        if (userId && userName) {
          ownerNameById[userId] = userName
        }
      })
    }
  } catch (error) {
    console.warn('Failed to resolve activity owner names:', error)
  }

  return ownerNameById
}

// ── Column Filter Types & Constants (DependenciesTab pattern) ──

type ActColumnKey =
  | 'dga_name'
  | 'dga_sectorname'
  | 'dga_departmentname'
  | 'statuscode'
  | 'dga_project_phase'
  | 'dga_project_activity_status'
  | 'dga_registered_or_will_be_registered_in_epm'
  | 'dga_adeo_review_required'
  | 'dga_doesthisprojectrequirebudgetallocation'
  | 'dga_does_this_project_require_procurement'
  | 'dga_total_project_budget'
  | 'dga_allocated_budget'
  | 'dga_requested_budget'
  | 'dga_planned_start_date'
  | 'dga_planned_end_date'
  | 'dga_project_categorized_under'
  | 'pending_with'

type FilterOperator = 'equals' | 'contains' | 'gt' | 'lt'
type ColumnFilter = { operator: FilterOperator; value: string }
type ColFilterType = 'text' | 'number' | 'date' | 'boolean' | 'multi'

const TEXT_OPERATORS: FilterOperator[] = ['contains', 'equals']
const NUMBER_OPERATORS: FilterOperator[] = ['equals', 'gt', 'lt']
const DATE_OPERATORS: FilterOperator[] = ['equals', 'gt', 'lt']
const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'Equals',
  contains: 'Contains',
  gt: 'Greater than',
  lt: 'Less than',
}

type ColumnFilterConfig = {
  type: ColFilterType
  options?: { label: string; value: string }[]
}

const COLUMN_FILTER_CONFIG: Partial<Record<ActColumnKey, ColumnFilterConfig>> = {
  dga_name: { type: 'text' },
  dga_sectorname: { type: 'text' },
  dga_departmentname: { type: 'text' },
  statuscode: {
    type: 'multi',
    options: [
      { label: 'Draft', value: '1' },
      { label: 'Submitted to ADEO', value: '576610001' },
      { label: 'Submitted to Division Director', value: '776140001' },
      { label: 'Approved By Division Director', value: '776140003' },
      { label: 'Pending Clarification', value: '776140012' },
      { label: 'Approved By Strategy Team', value: '776140004' },
      { label: 'Approved By Executive Director', value: '776140002' },
      { label: 'Approved By Director General', value: '776140014' },
      { label: 'Active', value: '776140011' },
    ],
  },
  dga_project_phase: {
    type: 'multi',
    options: [
      { label: 'Planning', value: '776140000' },
      { label: 'Execution', value: '776140001' },
    ],
  },
  dga_project_activity_status: {
    type: 'multi',
    options: [
      { label: 'Draft', value: '776140014' },
      { label: 'Not Started', value: '776140007' },
      { label: 'In Progress (Delayed)', value: '776140005' },
      { label: 'In Progress (On Track)', value: '776140006' },
      { label: 'On Hold', value: '776140009' },
      { label: 'Cancelled', value: '776140010' },
      { label: 'Completed', value: '776140013' },
      { label: 'Submitted for Approval', value: '776140015' },
    ],
  },
  dga_registered_or_will_be_registered_in_epm: { type: 'boolean' },
  dga_adeo_review_required: { type: 'boolean' },
  dga_doesthisprojectrequirebudgetallocation: { type: 'boolean' },
  dga_does_this_project_require_procurement: { type: 'boolean' },
  dga_total_project_budget: { type: 'number' },
  dga_allocated_budget: { type: 'number' },
  dga_requested_budget: { type: 'number' },
  dga_planned_start_date: { type: 'date' },
  dga_planned_end_date: { type: 'date' },
  dga_project_categorized_under: {
    type: 'multi',
    options: CATEGORIZED_OPTIONS,
  },
  pending_with: { type: 'text' },
}

// ── Main Component ──

type ActivitiesListProps = {
  variant?: 'aop' | 'execution'
}

export function ActivitiesList({ variant = 'aop' }: ActivitiesListProps) {
  const navigate = useNavigate()
  const isExecutionVariant = variant === 'execution'
  const isAopVariant = !isExecutionVariant
  const usesModernActivityExperience = isAopVariant || isExecutionVariant
  const listLabels = {
    title: 'My Activity',
    countSingular: 'Activity',
    countPlural: 'Activities',
    description: isExecutionVariant
      ? 'Monitor execution ownership, approvals, planning status, and execution readiness.'
      : 'Monitor activity ownership, approvals, planning status, and execution readiness.',
    filtersEmptyLabel: 'All activities',
    searchLabel: 'Search projects',
    searchPlaceholder: 'Search projects...',
    emptyTitle: 'No activities found',
    csvPrefix: isExecutionVariant ? 'execution-activities-list' : 'activities-list',
    nameColumn: isExecutionVariant ? 'Execution activity name' : 'Project Name',
    descriptionLabel: isExecutionVariant ? 'Execution Description' : 'Activity Description',
    filtersAria: isExecutionVariant ? 'Execution filters' : 'Activity filters',
  }

  function getActivityDetailPath(activityId?: string | null) {
    if (isExecutionVariant) {
      return activityId ? `${EXECUTION_PLAN_ACTIVITY_DETAIL_ROUTE}/${activityId}` : EXECUTION_PLAN_ACTIVITY_DETAIL_ROUTE
    }

    return `${APP_ROUTE_PATHS.editActivity}?id=${activityId ?? ''}`
  }

  // Redux
  const dispatch = useAppDispatch()
  const currentRole = useAppSelector((state) => state.user.currentRole)
  const divisionalHierarchies = useAppSelector((state) => state.user.divisionalHierarchies)
  const currentRoleDivisionalHierarchy = useAppSelector((state) => state.user.currentRoleDivisionalHierarchy)
  const selectedCycle = useAppSelector((state) => state.app.selectedCycle)
  const assessmentCycles = useAppSelector((state) => state.app.assessmentCycles)
  const planningInstances = useAppSelector((state) => state.app.planningInstances)
  const planningInstancesCycleId = useAppSelector((state) => state.app.planningInstancesCycleId)
  const planningInstancesLoading = useAppSelector((state) => state.app.planningInstancesLoading)

  // Derived role info
  const roleName = currentRole?.roleName ?? ''
  const isDivisionRole = roleName.toLowerCase().includes('division member') || roleName.toLowerCase().includes('division director')
  const isExecutiveDirector = roleName.toLowerCase().includes('executive director')
  const requiresHierarchyScope = isDivisionRole || isExecutiveDirector
  const hasRequiredHierarchyScope = !requiresHierarchyScope || Boolean(normalizeId(currentRoleDivisionalHierarchy?.hierarchyId))

  // Sector/Division options from hierarchies
  const sectorOptions = useMemo<SelectOption<string>[]>(() => {
    const sectors = divisionalHierarchies.filter((h) => Number(h.dga_type) === 776140001)
    if (isDivisionRole || isExecutiveDirector) {
      // Locked: only their assigned sector
      const assigned = currentRoleDivisionalHierarchy
      if (assigned) {
        // Find the parent sector for this division
        const division = divisionalHierarchies.find((h) => h.dga_divisional_hierarchyid === assigned.hierarchyId)
        if (division?._dga_parent_divisional_hierarchy_value) {
          const sector = sectors.find((s) => s.dga_divisional_hierarchyid === division._dga_parent_divisional_hierarchy_value)
          if (sector) return [{ label: sector.dga_name ?? '', value: sector.dga_divisional_hierarchyid }]
        }
      }
      // Fallback: if we have hierarchies with sector type, use the first one
      if (sectors.length > 0) return [{ label: sectors[0].dga_name ?? '', value: sectors[0].dga_divisional_hierarchyid }]
      return []
    }
    return sectors.map((s) => ({ label: s.dga_name ?? '', value: s.dga_divisional_hierarchyid }))
  }, [divisionalHierarchies, currentRoleDivisionalHierarchy, isDivisionRole, isExecutiveDirector])

  const divisionOptions = useMemo<SelectOption<string>[]>(() => {
    const divisions = divisionalHierarchies.filter((h) => Number(h.dga_type) === 776140002)
    if (isDivisionRole) {
      // Locked: only their assigned division
      const assigned = currentRoleDivisionalHierarchy
      if (assigned) {
        const div = divisions.find((h) => h.dga_divisional_hierarchyid === assigned.hierarchyId)
        if (div) return [{ label: div.dga_name ?? '', value: div.dga_divisional_hierarchyid }]
      }
      return []
    }
    if (isExecutiveDirector && currentRoleDivisionalHierarchy) {
      // Filter divisions by their sector
      const sectorId = currentRoleDivisionalHierarchy.hierarchyId
      return divisions
        .filter((d) => d._dga_parent_divisional_hierarchy_value === sectorId)
        .map((d) => ({ label: d.dga_name ?? '', value: d.dga_divisional_hierarchyid }))
    }
    return divisions.map((d) => ({ label: d.dga_name ?? '', value: d.dga_divisional_hierarchyid }))
  }, [divisionalHierarchies, currentRoleDivisionalHierarchy, isDivisionRole, isExecutiveDirector])

  const hierarchyNameById = useMemo(() => {
    return divisionalHierarchies.reduce<Record<string, string>>((map, hierarchy) => {
      const id = normalizeId(hierarchy.dga_divisional_hierarchyid)
      if (id && hierarchy.dga_name) {
        map[id] = hierarchy.dga_name
      }
      return map
    }, {})
  }, [divisionalHierarchies])

  // ── Planning instance IDs for cycle-based filtering ──
  const hasSelectedCyclePlanningInstances = Boolean(
    selectedCycle && normalizeId(planningInstancesCycleId) === normalizeId(selectedCycle),
  )

  const cyclePlanningInstanceIds = useMemo(() => {
    if (!selectedCycle || !hasSelectedCyclePlanningInstances || planningInstances.length === 0) return []
    return planningInstances
      .filter((pi) => normalizeId(pi._dga_assessment_cycle_value) === normalizeId(selectedCycle))
      .map((pi) => pi.dga_project_planning_instanceid)
      .map((id) => normalizeId(id))
      .filter(Boolean)
  }, [hasSelectedCyclePlanningInstances, planningInstances, selectedCycle])

  const isCycleFilterReady = Boolean(
    selectedCycle && hasSelectedCyclePlanningInstances && !planningInstancesLoading,
  )

  const roleHierarchyFilter = useMemo(() => {
    const hierarchyId = normalizeId(currentRoleDivisionalHierarchy?.hierarchyId)
    if (!hierarchyId) return ''

    const normalizedRoleName = roleName.toLowerCase()
    if (normalizedRoleName.includes('division member') || normalizedRoleName.includes('division director')) {
      return `_dga_department_value eq ${hierarchyId}`
    }
    if (normalizedRoleName.includes('executive director')) {
      return `_dga_sector_value eq ${hierarchyId}`
    }

    return ''
  }, [currentRoleDivisionalHierarchy?.hierarchyId, roleName])

  // Fetch planning instances if they aren't loaded for the current cycle
  useEffect(() => {
    if (selectedCycle && normalizeId(planningInstancesCycleId) !== normalizeId(selectedCycle)) {
      dispatch(fetchPlanningInstances(selectedCycle))
    }
  }, [dispatch, selectedCycle, planningInstancesCycleId])

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sectorFilter, setSectorFilter] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('')
  const [strategicFilter, setStrategicFilter] = useState('all')

  // ── Activity state (all records, paginated client-side) ──
  const [allActivities, setAllActivities] = useState<Dga_aop_projectses[]>([])
  const [ownerNameById, setOwnerNameById] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [displayMode, setDisplayMode] = useState<'table' | 'card'>('table')
  const [isPortfolioSummaryExpanded, setIsPortfolioSummaryExpanded] = useState(false)
  const [portfolioSummaryTab, setPortfolioSummaryTab] = useState<'flags' | 'actions' | 'budget'>('flags')


  // ── Sort state ──
  type ActSortConfig = { column: ActColumnKey; direction: 'asc' | 'desc' } | null
  const [actSort, setActSort] = useState<ActSortConfig>(null)

  // ── Column filter state (DependenciesTab pattern) ──
  const [actFilters, setActFilters] = useState<Partial<Record<ActColumnKey, ColumnFilter>>>({})
  const [openFilterColumn, setOpenFilterColumn] = useState<ActColumnKey | null>(null)
  const [filterPopoverPos, setFilterPopoverPos] = useState({ top: 0, left: 0 })
  const filterPopoverRef = useRef<HTMLDivElement>(null)
  const filterClickHandlerRef = useRef<((event: MouseEvent) => void) | null>(null)
  const tableWrapRef = useRef<HTMLDivElement>(null)
  const [editFilterOp, setEditFilterOp] = useState<FilterOperator>('contains')
  const [editFilterVal, setEditFilterVal] = useState('')
  // Track multi-select state separately (not committed until Apply)
  const [editMultiVals, setEditMultiVals] = useState<string[]>([])

  // ── Search debounce ──
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
    }, 350)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchQuery])

  // ── Categorized filter outside-click ──
  function matchesStatusTab(activity: Dga_aop_projectses, value: string) {
    const status = Number(activity.statuscode)
    if (value === 'draft') return status === 1
    if (value === 'submitted-division-director') return status === 776140001
    if (value === 'clarification-required') return status === 776140012
    if (value === 'pending-division-director') return status === 776140001
    if (value === 'submitted-strategy-team') return status === 776140003
    if (value === 'pending-strategy-team') return status === 776140003
    if (value === 'submitted-executive-director') return status === 776140004
    if (value === 'submitted') return status === 776140015
    if (value === 'to-approve') return [576610001, 776140001, 776140003, 776140002, 776140004, 776140014, 776140012].includes(status)
    if (value === 'approved') return status === 776140011
    return true
  }

  function getStatusTabCount(value: string) {
    if (value === 'all') return allActivities.length
    return allActivities.filter((activity) => matchesStatusTab(activity, value)).length
  }

  function formatStatusTabLabel(label: string, value: string) {
    return `${label}  ${getStatusTabCount(value)}`
  }

  // ── Status tabs based on role ──
  const statusTabItems: TabItem<string>[] = (() => {
    const normalizedRole = roleName.toLowerCase()
    if (usesModernActivityExperience && normalizedRole.includes('division member')) {
      return [
        { label: formatStatusTabLabel('All Activity', 'all'), value: 'all' },
        { label: formatStatusTabLabel('Needs Work / Draft', 'draft'), value: 'draft' },
        { label: formatStatusTabLabel('Submitted to Division Director', 'submitted-division-director'), value: 'submitted-division-director' },
        { label: formatStatusTabLabel('Clarification Required', 'clarification-required'), value: 'clarification-required' },
      ]
    }
    if (usesModernActivityExperience && normalizedRole.includes('division director')) {
      return [
        { label: formatStatusTabLabel('All Activity', 'all'), value: 'all' },
        { label: formatStatusTabLabel('Pending at Division Director', 'pending-division-director'), value: 'pending-division-director' },
        { label: formatStatusTabLabel('Submitted to Strategy Team', 'submitted-strategy-team'), value: 'submitted-strategy-team' },
      ]
    }
    if (usesModernActivityExperience && normalizedRole.includes('strategy team')) {
      return [
        { label: formatStatusTabLabel('All Activity', 'all'), value: 'all' },
        { label: formatStatusTabLabel('Pending at Strategy Team', 'pending-strategy-team'), value: 'pending-strategy-team' },
        { label: formatStatusTabLabel('Submitted to Executive Director', 'submitted-executive-director'), value: 'submitted-executive-director' },
      ]
    }
    if (roleName.toLowerCase().includes('division member')) {
      return [
        { label: 'All', value: 'all' },
        { label: 'My Drafts', value: 'draft' },
        { label: 'Submitted', value: 'submitted' },
      ]
    }
    return [
      { label: 'All', value: 'all' },
      { label: 'To Approve', value: 'to-approve' },
      { label: 'Approved', value: 'approved' },
    ]
  })()

  const phaseTabItems: TabItem<string>[] = [
    { label: 'All', value: 'all' },
    { label: 'Planning', value: '776140000' },
    { label: 'Execution', value: '776140001' },
  ]

  const strategicTabItems: TabItem<string>[] = [
    { label: 'All', value: 'all' },
    { label: 'Strategic', value: '1' },
    { label: 'Operations', value: '2' },
  ]

  // ── Build OData filter ──
  const odataFilter = useMemo(() => {
    const parts: string[] = []

    if (isExecutionVariant) {
      parts.push('dga_adeo_review_required eq true')
    } else {
      parts.push('(dga_adeo_review_required eq false or dga_adeo_review_required eq null)')
    }

    if (debouncedSearch) {
      parts.push(`contains(dga_name, '${debouncedSearch.replace(/'/g, "''")}')`)
    }

    if (phaseFilter !== 'all') {
      parts.push(`dga_project_phase eq ${phaseFilter}`)
    }

    // Execution tabs can stay server-filtered; AOP tabs are client-filtered so tab counts stay stable.
    if (isExecutionVariant) {
      if (statusFilter === 'draft') {
        parts.push('statuscode eq 1')
      } else if (statusFilter === 'submitted' || statusFilter === 'submitted-deleted') {
        parts.push('statuscode eq 776140015')
      } else if (statusFilter === 'submitted-division-director' || statusFilter === 'pending-division-director') {
        parts.push('statuscode eq 776140001')
      } else if (statusFilter === 'clarification-required') {
        parts.push('statuscode eq 776140012')
      } else if (statusFilter === 'submitted-strategy-team' || statusFilter === 'pending-strategy-team') {
        parts.push('statuscode eq 776140003')
      } else if (statusFilter === 'submitted-executive-director') {
        parts.push('statuscode eq 776140004')
      } else if (statusFilter === 'to-approve') {
        parts.push(
          '(statuscode eq 576610001 or statuscode eq 776140001 or statuscode eq 776140003 or statuscode eq 776140002 or statuscode eq 776140004 or statuscode eq 776140014 or statuscode eq 776140012)',
        )
      } else if (statusFilter === 'approved') {
        parts.push('statuscode eq 776140011')
      }
    }

    // Sector
    if (sectorFilter) {
      parts.push(`_dga_sector_value eq ${sectorFilter}`)
    }

    // Division
    if (divisionFilter) {
      parts.push(`_dga_department_value eq ${divisionFilter}`)
    }

    // Strategic / Operational
    if (strategicFilter !== 'all') {
      parts.push(`dga_strategic_vs_operation eq ${strategicFilter}`)
    }

    // Filter by cycle's planning instances
    if (cyclePlanningInstanceIds.length > 0) {
      parts.push(`(${cyclePlanningInstanceIds.map((id) => `_dga_project_planning_instance_value eq ${id}`).join(' or ')})`)
    }

    if (roleHierarchyFilter) {
      parts.push(roleHierarchyFilter)
    }

    return parts.join(' and ')
  }, [debouncedSearch, phaseFilter, statusFilter, sectorFilter, divisionFilter, strategicFilter, cyclePlanningInstanceIds, roleHierarchyFilter, isExecutionVariant])

  // ── Fetch activities ──
  const fetchActivities = useCallback(async () => {
    if (!selectedCycle) {
      setIsLoading(false)
      setError(null)
      setOwnerNameById({})
      setAllActivities([])
      return
    }

    if (!hasRequiredHierarchyScope) {
      setIsLoading(false)
      setError(null)
      setOwnerNameById({})
      setAllActivities([])
      return
    }

    if (!isCycleFilterReady) {
      setIsLoading(true)
      setError(null)
      setOwnerNameById({})
      setAllActivities([])
      return
    }

    if (cyclePlanningInstanceIds.length === 0) {
      setIsLoading(false)
      setError(null)
      setOwnerNameById({})
      setAllActivities([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const selectFields = [
        'dga_aop_projectsid',
        'dga_name',
        '_dga_sector_value',
        '_dga_department_value',
        'dga_registered_or_will_be_registered_in_epm',
        'dga_adeo_review_required',
        'dga_doesthisprojectrequirebudgetallocation',
        'dga_does_this_project_require_procurement',
        'dga_project_categorized_under',
        'statuscode',
        'dga_project_phase',
        'dga_project_activity_status',
        'dga_total_project_budget',
        'dga_allocated_budget',
        'dga_requested_budget',
        'dga_planned_start_date',
        'dga_planned_end_date',
        'dga_description_summary',
        'dga_scope',
        'createdon',
        'modifiedon',
        'dga_strategic_vs_operation',
        '_dga_project_planning_instance_value',
        '_owningteam_value',
        '_owninguser_value',
      ]

      const result = await Dga_aop_projectsesService.getAll({
        select: selectFields,
        filter: odataFilter || undefined,
        orderBy: ['createdon desc'],
      })

      const records = (result.data ?? []) as Dga_aop_projectses[]
      const nextOwnerNameById = await loadOwnerNameMap(records)
      setOwnerNameById(nextOwnerNameById)
      setAllActivities(records)
    } catch (err) {
      console.error('Failed to fetch activities:', err)
      setError(err instanceof Error ? err.message : 'Failed to load activities. Please try again.')
      setOwnerNameById({})
      setAllActivities([])
    } finally {
      setIsLoading(false)
    }
  }, [cyclePlanningInstanceIds.length, hasRequiredHierarchyScope, isCycleFilterReady, odataFilter, selectedCycle])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchActivities()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchActivities])

  // Reset page when filters change
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [odataFilter])

  // ── Export to CSV ──
  function exportToCsv() {
    if (activities.length === 0) return

    const headers = [
      listLabels.nameColumn, 'Sector', 'Division', 'Reported in EPM', 'ADEO Required',
      'Budget Required', 'Procurement Required', 'Project Categorized', 'Pending With',
      'Approval Status', 'Activity Phase', 'Activity Status',
      'Total Budget (AED)', 'Allocated Budget (AED)', 'Requested Budget (AED)',
      'Start Date', 'End Date',
    ]

    const rows = activities.map((a) => [
      a.dga_name ?? '',
      getLookupName(a._dga_sector_value, hierarchyNameById),
      getLookupName(a._dga_department_value, hierarchyNameById),
      a.dga_registered_or_will_be_registered_in_epm ? 'Yes' : 'No',
      a.dga_adeo_review_required ? 'Yes' : 'No',
      a.dga_doesthisprojectrequirebudgetallocation ? 'Yes' : 'No',
      a.dga_does_this_project_require_procurement === 1 ? 'Yes' : 'No',
      getCategorizedExportValue(a),
      getPendingWith(a, ownerNameById),
      a.statuscodename ?? '',
      a.dga_project_phasename ?? '',
      a.dga_project_activity_statusname ?? '',
      a.dga_total_project_budget?.toString() ?? '',
      a.dga_allocated_budget?.toString() ?? '',
      a.dga_requested_budget?.toString() ?? '',
      a.dga_planned_start_date ? formatDate(a.dga_planned_start_date) : '',
      a.dga_planned_end_date ? formatDate(a.dga_planned_end_date) : '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((r) =>
        r.map((cell) => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`
          }
          return cell
        }).join(','),
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${listLabels.csvPrefix}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // ── Sort handlers ──
  function handleSort(column: ActColumnKey) {
    setActSort((prev) => {
      if (!prev || prev.column !== column) return { column, direction: 'asc' }
      if (prev.direction === 'asc') return { column, direction: 'desc' }
      return null
    })
  }

  function getSortIcon(column: ActColumnKey) {
    if (!actSort || actSort.column !== column) {
      return <ArrowUp size={12} className="edit-activity__deps-sort-icon edit-activity__deps-sort-icon--inactive" />
    }
    if (actSort.direction === 'asc') return <ArrowUp size={12} className="edit-activity__deps-sort-icon edit-activity__deps-sort-icon--active" />
    return <ArrowDown size={12} className="edit-activity__deps-sort-icon edit-activity__deps-sort-icon--active" />
  }

  // ── Column filter handlers (DependenciesTab pattern) ──
  function handleOpenFilter(column: ActColumnKey, e: React.MouseEvent) {
    e.stopPropagation()
    if (openFilterColumn === column) {
      setOpenFilterColumn(null)
      return
    }
    if (tableWrapRef.current) {
      const cellEl = (e.currentTarget as HTMLElement).closest('[data-filter-anchor]') as HTMLElement
      const cellRect = cellEl?.getBoundingClientRect()
      if (cellRect) {
        setFilterPopoverPos({
          top: cellRect.bottom + 6,
          left: Math.max(8, Math.min(cellRect.left, window.innerWidth - 280)),
        })
      }
    }
    const config = COLUMN_FILTER_CONFIG[column]
    if (config?.type === 'multi') {
      const current = actFilters[column]
      setEditMultiVals(current ? current.value.split(',') : [])
    } else {
      const current = actFilters[column]
      const defaultOperator = config?.type === 'date' || config?.type === 'number' ? 'equals' : 'contains'
      setEditFilterOp(current?.operator ?? defaultOperator)
      setEditFilterVal(current?.value ?? '')
    }
    setOpenFilterColumn(column)
  }

  function handleApplyFilter() {
    if (!openFilterColumn) return
    const config = COLUMN_FILTER_CONFIG[openFilterColumn]
    if (config?.type === 'multi') {
      if (editMultiVals.length > 0) {
        setActFilters((prev) => ({ ...prev, [openFilterColumn]: { operator: 'equals', value: editMultiVals.join(',') } }))
      } else {
        setActFilters((prev) => { const n = { ...prev }; delete n[openFilterColumn]; return n })
      }
    } else if (editFilterVal) {
      setActFilters((prev) => ({ ...prev, [openFilterColumn]: { operator: editFilterOp, value: editFilterVal } }))
    } else {
      setActFilters((prev) => { const n = { ...prev }; delete n[openFilterColumn]; return n })
    }
    setCurrentPage(1)
    setOpenFilterColumn(null)
  }

  function handleCancelFilter() {
    setOpenFilterColumn(null)
  }

  function handleClearAllColumnFilters() {
    setActFilters({})
    setCurrentPage(1)
    setOpenFilterColumn(null)
  }

  const getColumnValue = useCallback((act: Dga_aop_projectses, column: ActColumnKey) => {
    if (column === 'pending_with') return getPendingWith(act, ownerNameById)
    if (column === 'dga_sectorname') return getLookupName(act._dga_sector_value, hierarchyNameById)
    if (column === 'dga_departmentname') return getLookupName(act._dga_department_value, hierarchyNameById)
    if (column === 'dga_project_categorized_under') return parseCategorizedValues(act.dga_project_categorized_under).join(',')
    return (act as unknown as Record<string, unknown>)[column]
  }, [hierarchyNameById, ownerNameById])

  // Close filter popover on click outside / escape
  useEffect(() => {
    if (!openFilterColumn) return
    const popover = filterPopoverRef.current
    if (!popover) return

    const raf = requestAnimationFrame(() => {
      const el = popover!
      function handleClick(e: MouseEvent) {
        if (!el.contains(e.target as Node)) {
          setOpenFilterColumn(null)
        }
      }
      document.addEventListener('mousedown', handleClick)
      filterClickHandlerRef.current = handleClick
    })

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenFilterColumn(null)
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', handleKeyDown)
      if (filterClickHandlerRef.current) {
        document.removeEventListener('mousedown', filterClickHandlerRef.current)
        filterClickHandlerRef.current = null
      }
    }
  }, [openFilterColumn])

  // ── Client-side column filter memo ──
  const columnFilteredActivities = useMemo(() => {
    const statusTabFilteredActivities = statusFilter === 'all'
      ? allActivities
      : allActivities.filter((activity) => matchesStatusTab(activity, statusFilter))
    const activeFilters = Object.entries(actFilters).filter(([, f]) => f.value !== '')
    if (activeFilters.length === 0) return statusTabFilteredActivities

    return statusTabFilteredActivities.filter((act) =>
      activeFilters.every(([column, filter]) => {
        const colKey = column as ActColumnKey
        const config = COLUMN_FILTER_CONFIG[colKey]
        if (!config) return true

        switch (config.type) {
          case 'multi': {
            const vals = filter.value.split(',').filter(Boolean)
            if (vals.length === 0) return true
            const fieldVals = String(getColumnValue(act, colKey) ?? '').split(',').map((value) => value.trim())
            return vals.some((v) => fieldVals.includes(v))
          }
          case 'boolean': {
            const fieldVal = Boolean(getColumnValue(act, colKey))
            return String(fieldVal) === filter.value
          }
          case 'number': {
            const fieldVal = Number(getColumnValue(act, colKey))
            const filterVal = Number(filter.value)
            if (isNaN(fieldVal) || isNaN(filterVal)) return true
            switch (filter.operator) {
              case 'equals': return fieldVal === filterVal
              case 'gt': return fieldVal > filterVal
              case 'lt': return fieldVal < filterVal
              default: return true
            }
          }
          case 'date': {
            const fieldVal = String(getColumnValue(act, colKey) ?? '')
            const filterVal = filter.value
            if (!fieldVal || !filterVal) return true
            switch (filter.operator) {
              case 'equals': return fieldVal.startsWith(filterVal)
              case 'gt': return fieldVal > filterVal
              case 'lt': return fieldVal < filterVal
              default: return true
            }
          }
          case 'text':
          default: {
            const fieldVal = String(getColumnValue(act, colKey) ?? '')
            const filterVal = filter.value
            if (!filterVal) return true
            switch (filter.operator) {
              case 'contains': return fieldVal.toLowerCase().includes(filterVal.toLowerCase())
              case 'equals': return fieldVal.toLowerCase() === filterVal.toLowerCase()
              default: return true
            }
          }
        }
      })
    )
  }, [actFilters, allActivities, getColumnValue, statusFilter])

  // ── Client-side sort memo (applied after column filter) ──
  const sortedActivities = useMemo(() => {
    if (!actSort) return columnFilteredActivities
    const { column, direction } = actSort
    return [...columnFilteredActivities].sort((a, b) => {
      const aVal = String(getColumnValue(a, column) ?? '')
      const bVal = String(getColumnValue(b, column) ?? '')
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true })
      return direction === 'asc' ? cmp : -cmp
    })
  }, [columnFilteredActivities, actSort, getColumnValue])

  // Update pagination to use filtered + sorted data
  const totalCount = sortedActivities.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const showPagination = totalCount > PAGE_SIZE
  const rangeStart = totalCount > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalCount)
  const activityPageStart = (currentPage - 1) * PAGE_SIZE
  const activities = sortedActivities.slice(activityPageStart, activityPageStart + PAGE_SIZE)
  const activeFilterCount = [
    searchQuery.trim(),
    phaseFilter !== 'all' ? phaseFilter : '',
    statusFilter !== 'all' ? statusFilter : '',
    sectorFilter,
    divisionFilter,
    strategicFilter !== 'all' ? strategicFilter : '',
    ...Object.values(actFilters).map((filter) => filter?.value ?? ''),
  ].filter(Boolean).length

  // ── Render skeleton rows ──
  function renderSkeletonRows() {
    return Array.from({ length: 8 }).map((_, rowIdx) => (
      <div className="activities-grid__row activities-grid__skeleton-row" key={`skel-${rowIdx}`} aria-hidden="true">
        <span><span className="activities-list__skeleton-bar activities-list__skeleton-bar--w70" /></span>
        <span><span className="activities-list__skeleton-bar activities-list__skeleton-bar--w60" /></span>
        <span><span className="activities-list__skeleton-bar activities-list__skeleton-bar--w60" /></span>
        <span><span className="activities-list__skeleton-bar activities-list__skeleton-bar--w55" /></span>
        <span><span className="activities-list__skeleton-bar activities-list__skeleton-bar--w60" /></span>
        <span><span className="activities-list__skeleton-bar activities-list__skeleton-bar--w45" /></span>
        <span><span className="activities-list__skeleton-bar activities-list__skeleton-bar--w30" /></span>
      </div>
    ))
  }

  // ── Render ──

  const sectorSelectDisabled = (isDivisionRole || isExecutiveDirector) && sectorOptions.length <= 1
  const divisionSelectDisabled = isDivisionRole
  const selectedCycleName = assessmentCycles.find((cycle) => normalizeId(cycle.dga_assessment_cycleid) === normalizeId(selectedCycle))?.dga_name
    ?? (isAopVariant ? 'Annual Operating Plan' : 'Execution Plan')
  const flaggedProjectsCount = Math.min(totalCount, 2)

  return (
    <div className={`activities-list activities-list--modern-redesign${isAopVariant ? ' activities-list--aop-redesign' : ' activities-list--execution-redesign'}`}>
      {/* ── Header ── */}
      <div className="activities-list__header">
        <div className="activities-list__header-text">
          <h1>
            {listLabels.title}
            <span className="activities-list__count-badge">{totalCount} {totalCount === 1 ? listLabels.countSingular : listLabels.countPlural}</span>
          </h1>
          <p>{isAopVariant ? selectedCycleName : listLabels.description}</p>
        </div>
        <div className="activities-list__header-actions">
          <Button
            icon={<Plus size={16} />}
            onClick={() => navigate(isExecutionVariant ? APP_ROUTE_PATHS.createExecutionPlanActivity : APP_ROUTE_PATHS.createActivity)}
          >
            New Activity
          </Button>
        </div>
      </div>

      <div className="activities-list__project-tabs">
        <Tabs items={statusTabItems} onChange={(v) => { setStatusFilter(v); setCurrentPage(1) }} value={statusFilter} />
      </div>

      {usesModernActivityExperience ? (
        <section
          className={`activities-list__portfolio-summary${isPortfolioSummaryExpanded ? ' activities-list__portfolio-summary--expanded' : ''}`}
          aria-label="AI Portfolio Summary"
        >
          <button
            className="activities-list__portfolio-head"
            onClick={() => setIsPortfolioSummaryExpanded((current) => !current)}
            type="button"
            aria-expanded={isPortfolioSummaryExpanded}
          >
            <span className="activities-list__portfolio-icon" aria-hidden="true">
              <Sparkles size={22} />
            </span>
            <div>
              <h2>AI Portfolio Summary <span>Action Required</span></h2>
              <p>
                You currently have {totalCount} activities in this planning cycle. Focus first on activities with
                high-severity issues, evidence gaps, and budget accuracy risks so they are ready for reviewer action.
              </p>
            </div>
            <div className="activities-list__portfolio-meta">
              <strong>{totalCount} activities</strong>
              <span>{flaggedProjectsCount} flagged</span>
              <ChevronDown size={15} className="activities-list__portfolio-chevron" />
            </div>
          </button>

          {isPortfolioSummaryExpanded ? (
            <div className="activities-list__portfolio-body">
              <div className="activities-list__portfolio-tabs" role="tablist" aria-label="AI portfolio summary views">
                <button
                  className={`activities-list__portfolio-tab${portfolioSummaryTab === 'flags' ? ' activities-list__portfolio-tab--active' : ''}`}
                  onClick={() => setPortfolioSummaryTab('flags')}
                  type="button"
                >
                  AI Review Flag (4)
                </button>
                <button
                  className={`activities-list__portfolio-tab${portfolioSummaryTab === 'actions' ? ' activities-list__portfolio-tab--active' : ''}`}
                  onClick={() => setPortfolioSummaryTab('actions')}
                  type="button"
                >
                  Recommended Action
                </button>
                <button
                  className={`activities-list__portfolio-tab${portfolioSummaryTab === 'budget' ? ' activities-list__portfolio-tab--active' : ''}`}
                  onClick={() => setPortfolioSummaryTab('budget')}
                  type="button"
                >
                  DGE Budget Consideration
                </button>
              </div>

              {portfolioSummaryTab === 'flags' ? (
                <div className="activities-list__portfolio-risks">
                  {[
                    {
                      icon: <ShieldCheck size={16} />,
                      title: 'Evidence Risk:',
                      count: '3 projects',
                      text: '3 projects have evidence risks where supporting documents are missing, incomplete, or not clearly linked to the described scope. You should review these projects and ensure proposals, quotations, or contracts are uploaded and clearly referenced.',
                      projects: ['BID-1189', 'BID-1188', 'BID-1190'],
                    },
                    {
                      icon: <Scale size={16} />,
                      title: 'Budget Accuracy Risk:',
                      count: '3 projects',
                      text: '3 projects have budget accuracy risks where budget account codes, requested values, or line-item totals may not match the supporting document evidence or the described phasing. These projects need closer review of GL/account code selection, value calculations, and budget justification.',
                      projects: ['BID-1189', 'BID-1188', 'BID-1190'],
                    },
                    {
                      icon: <AlertTriangle size={16} />,
                      title: 'Strategic Alignment Risk:',
                      count: '2 projects',
                      text: '2 projects show potential misalignment between the chosen strategic priority or classification and the actual nature of the work. Review these selections before submission.',
                      projects: ['BID-1189', 'BID-1190'],
                    },
                    {
                      icon: <BadgeCheck size={16} />,
                      title: 'DGE Budget Consideration Risk:',
                      count: '1 project',
                      text: '1 project may require DGE Budget Consideration due to possible conflicts with central platforms, overlapping scope, or governance dependencies.',
                      projects: ['BID-1188'],
                    },
                  ].map((risk) => (
                    <article className="activities-list__portfolio-risk-card" key={risk.title}>
                      <span className="activities-list__portfolio-card-icon" aria-hidden="true">{risk.icon}</span>
                      <div>
                        <div className="activities-list__portfolio-card-title">
                          <strong>{risk.title}</strong>
                          <span>{risk.count}</span>
                        </div>
                        <p>{risk.text}</p>
                        <small>Related Projects</small>
                        <div className="activities-list__portfolio-chips">
                          {risk.projects.map((project) => <span key={project}>{project}</span>)}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {portfolioSummaryTab === 'actions' ? (
                <div className="activities-list__portfolio-action-grid">
                  {[
                    {
                      text: 'For BID-1189 (RH Linux Support), align GL/account code and strategic classification with the RHEL software license renewal nature, confirm how VAT is budgeted, and plan to add a formal Red Hat quotation or contract as evidence.',
                      project: 'BID-1189',
                    },
                    {
                      text: 'For BID-1188 (Payment for Devices), correct the budget classification from data transmission charges to the appropriate hardware GL, validate that totals match the device plan, and upload supporting commercial documentation for the devices.',
                      project: 'BID-1188',
                    },
                  ].map((action) => (
                    <article className="activities-list__portfolio-action-card" key={action.project}>
                      <Sparkles size={16} aria-hidden="true" />
                      <p>{action.text}</p>
                      <small>Related Projects</small>
                      <div className="activities-list__portfolio-chips">
                        <span>{action.project}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}

              {portfolioSummaryTab === 'budget' ? (
                <div className="activities-list__portfolio-budget">
                  <p>
                    1 projects may require DGE Budget Consideration due to possible conflicts with central platforms,
                    overlapping scope, or governance dependencies. These should be discussed early so they do not delay
                    DGE submission.
                  </p>
                  <div className="activities-list__portfolio-budget-grid">
                    {[
                      {
                        tone: 'danger',
                        icon: <AlertTriangle size={16} />,
                        title: 'Potential Conflict',
                        count: '1',
                        text: 'These projects may have direct overlap or policy conflict with DGE-managed scope.',
                        project: 'BID-1188',
                      },
                      {
                        tone: 'warning',
                        icon: <Sparkles size={16} />,
                        title: 'Coordination Required',
                        count: '1',
                        text: 'These projects can move forward, but DGE coordination is expected before final approval.',
                        project: 'BID-1188',
                      },
                      {
                        tone: 'neutral',
                        icon: <BadgeCheck size={16} />,
                        title: 'Allowed With Conditions',
                        count: '0',
                        text: 'These projects appear supportable when the stated conditions are documented and satisfied.',
                        project: '',
                      },
                    ].map((item) => (
                      <article className={`activities-list__portfolio-budget-card activities-list__portfolio-budget-card--${item.tone}`} key={item.title}>
                        <div className="activities-list__portfolio-card-title">
                          <span className="activities-list__portfolio-card-heading">
                            {item.icon}
                            <strong>{item.title}</strong>
                          </span>
                          <span>{item.count}</span>
                        </div>
                        <p>{item.text}</p>
                        <small>Affected Projects</small>
                        {item.project ? (
                          <div className="activities-list__portfolio-chips">
                            <span>{item.project}</span>
                          </div>
                        ) : (
                          <em>No projects in this group.</em>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="activities-list__control-panel" aria-label={listLabels.filtersAria}>
        <div className="activities-list__control-header">
          <div className="activities-list__control-title">
            <span className="activities-list__control-icon" aria-hidden="true">
              <Filter size={15} />
            </span>
            <div>
              <span>Filters</span>
              <strong>{activeFilterCount > 0 ? `${activeFilterCount} active` : listLabels.filtersEmptyLabel}</strong>
            </div>
          </div>
          {activeFilterCount > 0 ? (
            <button
              className="activities-list__reset-btn"
              onClick={() => {
                setSearchQuery('')
                setPhaseFilter('all')
                setStatusFilter('all')
                setSectorFilter('')
                setDivisionFilter('')
                setStrategicFilter('all')
                handleClearAllColumnFilters()
              }}
              type="button"
            >
              <X size={14} />
              Reset
            </button>
          ) : null}
        </div>

      <div className="activities-list__filters-row">
        <SearchInput
          label={listLabels.searchLabel}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={listLabels.searchPlaceholder}
          value={searchQuery}
        />

        <Select
          id="sector-filter"
          label="Sector"
          onChange={(v) => { setSectorFilter(v); setCurrentPage(1) }}
          options={sectorOptions}
          value={sectorFilter}
          className={sectorSelectDisabled ? 'field--disabled' : ''}
        />

        <Select
          id="division-filter"
          label="Division"
          onChange={(v) => { setDivisionFilter(v); setCurrentPage(1) }}
          options={divisionOptions}
          value={divisionFilter}
          className={divisionSelectDisabled ? 'field--disabled' : ''}
        />

        {usesModernActivityExperience ? (
          <Button className="activities-list__export-btn" icon={<Download size={15} />} onClick={exportToCsv} variant="secondary">
            Export
          </Button>
        ) : null}

        {usesModernActivityExperience ? (
          <div className="activities-list__view-toggle" role="group" aria-label="View mode">
            <button
              className={`activities-list__view-btn${displayMode === 'table' ? ' activities-list__view-btn--active' : ''}`}
              onClick={() => {
                setDisplayMode('table')
              }}
              title="Table view"
              type="button"
            >
              <LayoutList size={15} />
            </button>
            <button
              className={`activities-list__view-btn${displayMode === 'card' ? ' activities-list__view-btn--active' : ''}`}
              onClick={() => {
                setDisplayMode('card')
              }}
              title="Card view"
              type="button"
            >
              <Rows size={15} />
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Tab Filters ── */}
      <div className="activities-list__tabs-row">
        {!isAopVariant ? (
          <>
            <div className="activities-list__tab-group activities-list__tab-group--phase">
              <span className="activities-list__tab-group-label">Phase</span>
              <Tabs items={phaseTabItems} onChange={(v) => { setPhaseFilter(v); setCurrentPage(1) }} value={phaseFilter} />
            </div>

            <div className="activities-list__tab-group activities-list__tab-group--status">
              <span className="activities-list__tab-group-label">Status</span>
              <Tabs items={statusTabItems} onChange={(v) => { setStatusFilter(v); setCurrentPage(1) }} value={statusFilter} />
            </div>

            <div className="activities-list__tab-group activities-list__tab-group--type">
              <span className="activities-list__tab-group-label">Type</span>
              <Tabs items={strategicTabItems} onChange={(v) => { setStrategicFilter(v); setCurrentPage(1) }} value={strategicFilter} />
            </div>
          </>
        ) : null}

        {!isAopVariant ? (
          <div className="activities-list__view-toggle" role="group" aria-label="View mode">
            <button
              className={`activities-list__view-btn${displayMode === 'table' ? ' activities-list__view-btn--active' : ''}`}
              onClick={() => {
                setDisplayMode('table')
              }}
              title="Table view"
              type="button"
            >
              <LayoutList size={15} />
            </button>
            <button
              className={`activities-list__view-btn${displayMode === 'card' ? ' activities-list__view-btn--active' : ''}`}
              onClick={() => {
                setDisplayMode('card')
              }}
              title="Card view"
              type="button"
            >
              <Rows size={15} />
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Error Banner ── */}
      </section>

      {error ? (
        <div className="activities-list__error">
          <p>{error}</p>
          <button onClick={fetchActivities} type="button">
            <RotateCcw size={13} style={{ marginRight: '0.3rem' }} />
            Retry
          </button>
        </div>
      ) : null}

      {/* ── Data Grid ── */}
      <section className={`activities-grid${usesModernActivityExperience && displayMode === 'card' ? ' activities-grid--hidden' : ''}`} ref={tableWrapRef} aria-label="Activities grid">
        <div className="activities-grid__head">
          <div className="activities-list__header-content" data-filter-anchor>
            <button className="activities-list__sort-btn" onClick={() => handleSort('dga_name')} type="button">
              <span>Activity / Initiative Name</span>
              {getSortIcon('dga_name')}
            </button>
            <button
              className={`activities-list__header-filter-btn${actFilters.dga_name ? ' activities-list__header-filter-btn--active' : ''}`}
              onClick={(e) => handleOpenFilter('dga_name', e)}
              type="button"
              aria-label="Filter by name"
            >
              <Filter size={11} />
            </button>
          </div>
          <div className="activities-list__header-content" data-filter-anchor>
            <button className="activities-list__sort-btn" onClick={() => handleSort('dga_doesthisprojectrequirebudgetallocation')} type="button">
              <span>Budget Required</span>
              {getSortIcon('dga_doesthisprojectrequirebudgetallocation')}
            </button>
            <button
              className={`activities-list__header-filter-btn${actFilters.dga_doesthisprojectrequirebudgetallocation ? ' activities-list__header-filter-btn--active' : ''}`}
              onClick={(e) => handleOpenFilter('dga_doesthisprojectrequirebudgetallocation', e)}
              type="button"
              aria-label="Filter by budget required"
            >
              <Filter size={11} />
            </button>
          </div>
          <div className="activities-list__header-content" data-filter-anchor>
            <button className="activities-list__sort-btn" onClick={() => handleSort('dga_does_this_project_require_procurement')} type="button">
              <span>Procurement Required</span>
              {getSortIcon('dga_does_this_project_require_procurement')}
            </button>
            <button
              className={`activities-list__header-filter-btn${actFilters.dga_does_this_project_require_procurement ? ' activities-list__header-filter-btn--active' : ''}`}
              onClick={(e) => handleOpenFilter('dga_does_this_project_require_procurement', e)}
              type="button"
              aria-label="Filter by procurement required"
            >
              <Filter size={11} />
            </button>
          </div>
          <div className="activities-list__header-content" data-filter-anchor>
            <button className="activities-list__sort-btn" onClick={() => handleSort('dga_project_categorized_under')} type="button">
              <span>Project Categorized</span>
              {getSortIcon('dga_project_categorized_under')}
            </button>
            <button
              className={`activities-list__header-filter-btn${actFilters.dga_project_categorized_under ? ' activities-list__header-filter-btn--active' : ''}`}
              onClick={(e) => handleOpenFilter('dga_project_categorized_under', e)}
              type="button"
              aria-label="Filter by project categorized"
            >
              <Filter size={11} />
            </button>
          </div>
          <div className="activities-list__header-content" data-filter-anchor>
            <button className="activities-list__sort-btn" onClick={() => handleSort('pending_with')} type="button">
              <span>Pending with</span>
              {getSortIcon('pending_with')}
            </button>
            <button
              className={`activities-list__header-filter-btn${actFilters.pending_with ? ' activities-list__header-filter-btn--active' : ''}`}
              onClick={(e) => handleOpenFilter('pending_with', e)}
              type="button"
              aria-label="Filter by pending with"
            >
              <Filter size={11} />
            </button>
          </div>
          <div className="activities-list__header-content" data-filter-anchor>
            <button className="activities-list__sort-btn" onClick={() => handleSort('statuscode')} type="button">
              <span>Approval status</span>
              {getSortIcon('statuscode')}
            </button>
            <button
              className={`activities-list__header-filter-btn${actFilters.statuscode ? ' activities-list__header-filter-btn--active' : ''}`}
              onClick={(e) => handleOpenFilter('statuscode', e)}
              type="button"
              aria-label="Filter by approval status"
            >
              <Filter size={11} />
            </button>
          </div>
          <div className="activities-list__header-content" data-filter-anchor>
            <button className="activities-list__sort-btn" onClick={() => handleSort('dga_project_phase')} type="button">
              <span>Phase</span>
              {getSortIcon('dga_project_phase')}
            </button>
            <button
              className={`activities-list__header-filter-btn${actFilters.dga_project_phase ? ' activities-list__header-filter-btn--active' : ''}`}
              onClick={(e) => handleOpenFilter('dga_project_phase', e)}
              type="button"
              aria-label="Filter by phase"
            >
              <Filter size={11} />
            </button>
          </div>
          <span>Action</span>
        </div>

        <div className="activities-grid__body">
          {isLoading ? (
            renderSkeletonRows()
          ) : activities.length === 0 ? (
            <div className="activities-grid__empty">
              <EmptyState
                description="Try adjusting your search or filter criteria."
                title={listLabels.emptyTitle}
              />
            </div>
          ) : (
            activities.map((act) => {
              const activityId = act.dga_aop_projectsid
              const isExpanded = false
              const strategies = getCategorizedLabels(act)

              return (
                <article className="activities-grid__record" key={activityId}>
                  <div className="activities-grid__row activities-grid__row--table">
                    <button
                      className="activities-grid__name"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(getActivityDetailPath(activityId))
                      }}
                      type="button"
                    >
                      <strong>{act.dga_name || 'Untitled Activity'}</strong>
                    </button>
                    <span>
                      <Badge tone={act.dga_doesthisprojectrequirebudgetallocation ? 'info' : 'neutral'}>
                        {yesNoLabel(act.dga_doesthisprojectrequirebudgetallocation)}
                      </Badge>
                    </span>
                    <span>
                      <Badge tone={act.dga_does_this_project_require_procurement === 1 ? 'info' : 'neutral'}>
                        {yesNoLabel(act.dga_does_this_project_require_procurement)}
                      </Badge>
                    </span>
                    <span>
                      {strategies.length > 0 ? (
                        <span className="activities-list__category-inline">
                          {strategies.join(', ')}
                        </span>
                      ) : '—'}
                    </span>
                    <span>{getPendingWith(act, ownerNameById)}</span>
                    <span className="activities-list__approval-status">
                      <Badge tone={statusCodeTone(Number(act.statuscode))}>
                        {statusCodeLabel(Number(act.statuscode))}
                      </Badge>
                    </span>
                    <span>
                      <Badge tone={act.dga_project_phase === 776140001 ? 'success' : 'info'}>
                        {phaseLabel(Number(act.dga_project_phase))}
                      </Badge>
                    </span>
                    <button
                      aria-label={`View ${act.dga_name || listLabels.countSingular.toLowerCase()}`}
                      className="activities-list__view-action"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(getActivityDetailPath(activityId))
                      }}
                      type="button"
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="activities-grid__details">
                      <div className="activities-grid__details-stack activities-grid__details-stack--summary">
                        <div className="activities-grid__details-panel activities-grid__details-panel--ai">
                          <div className="activities-grid__ai-heading">
                            <span className="activities-grid__ai-icon" aria-hidden="true">
                              <Sparkles size={15} />
                            </span>
                            <span>AI Summary</span>
                          </div>
                          <p>{activitySummary(act)}</p>
                        </div>
                        <div className="activities-grid__details-panel activities-grid__details-panel--summary">
                          <span>{listLabels.descriptionLabel}</span>
                          <p>{activitySummary(act)}</p>
                          <span>Scope</span>
                          <p>{activityScope(act)}</p>
                        </div>
                      </div>
                      <div className="activities-grid__details-panel activities-grid__details-panel--timeline">
                        <span>Timeline</span>
                        <dl>
                          <div className="activities-grid__details-inline">
                            <div><dt>Start</dt><dd>{act.dga_planned_start_date ? formatDate(act.dga_planned_start_date) : '—'}</dd></div>
                            <div><dt>End</dt><dd>{act.dga_planned_end_date ? formatDate(act.dga_planned_end_date) : '—'}</dd></div>
                          </div>
                        </dl>
                        <div className="activities-grid__yes-no-section">
                          <span>Readiness Flags</span>
                          <dl>
                            <div><dt>EPM Registered</dt><dd>{yesNoLabel(act.dga_registered_or_will_be_registered_in_epm)}</dd></div>
                            <div><dt>ADEO Required</dt><dd>{yesNoLabel(act.dga_adeo_review_required)}</dd></div>
                            <div><dt>Budget Required</dt><dd>{yesNoLabel(act.dga_doesthisprojectrequirebudgetallocation)}</dd></div>
                            <div><dt>Procurement Required</dt><dd>{yesNoLabel(act.dga_does_this_project_require_procurement)}</dd></div>
                          </dl>
                        </div>
                      </div>
                      <div className="activities-grid__details-panel">
                        <span>Planning Details</span>
                        <dl>
                          <div className="activities-grid__details-inline">
                            <div><dt>Project Type</dt><dd>{projectTypeLabel(act.dga_strategic_vs_operation)}</dd></div>
                            <div><dt>Activity Status</dt><dd>{activityStatusLabel(Number(act.dga_project_activity_status))}</dd></div>
                          </div>
                          <div>
                            <dt>Strategies</dt>
                            <dd>
                              {strategies.length > 0 ? (
                                <div className="activities-grid__strategy-chips">
                                  {strategies.map((label) => (
                                    <span className="activities-list__category-chip" key={label}>{label}</span>
                                  ))}
                                </div>
                              ) : '—'}
                            </dd>
                          </div>
                          <div className="activities-grid__details-inline">
                            <div><dt>Total Budget</dt><dd>{formatBudget(act.dga_total_project_budget)}</dd></div>
                            <div><dt>Requested Budget</dt><dd>{formatBudget(act.dga_requested_budget)}</dd></div>
                          </div>
                          <div className="activities-grid__details-inline">
                            <div><dt>Allocated Budget</dt><dd>{formatBudget(act.dga_allocated_budget)}</dd></div>
                            <div><dt>Modified</dt><dd>{act.modifiedon ? formatDate(String(act.modifiedon)) : '—'}</dd></div>
                          </div>
                        </dl>
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })
          )}
        </div>
      </section>

      {usesModernActivityExperience && displayMode === 'card' ? (
        <section className="activities-card-grid" aria-label="Activities card view">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <article className="activities-card activities-card--skeleton" key={`card-skeleton-${index}`} aria-hidden="true">
                <span className="activities-list__skeleton-bar activities-list__skeleton-bar--w45" />
                <span className="activities-list__skeleton-bar activities-list__skeleton-bar--w70" />
                <span className="activities-list__skeleton-bar activities-list__skeleton-bar--w60" />
              </article>
            ))
          ) : activities.length === 0 ? (
            <div className="activities-card-grid__empty">
              <EmptyState
                description="Try adjusting your search or filter criteria."
                title={listLabels.emptyTitle}
              />
            </div>
          ) : (
            activities.map((act) => {
              const activityId = act.dga_aop_projectsid
              const strategies = getCategorizedLabels(act)
              const primaryStrategy = strategies[0] || 'Project Categorized'
              const secondaryStrategy = strategies.slice(1).join(', ') || getLookupName(act._dga_department_value, hierarchyNameById)

              return (
                <article className="activities-card" key={`card-${activityId}`}>
                  <div className="activities-card__topline">
                    <span>{activityId ? `AOP-${activityId.slice(0, 4).toUpperCase()}` : 'AOP'}</span>
                    <Badge tone={statusCodeTone(Number(act.statuscode))}>
                      {statusCodeLabel(Number(act.statuscode))}
                    </Badge>
                  </div>
                  <h3>{act.dga_name || 'Untitled Activity'}</h3>
                  <span className={`activities-card__phase activities-card__phase--${act.dga_project_phase === 776140001 ? 'execution' : 'planning'}`}>
                    {phaseLabel(Number(act.dga_project_phase))}
                  </span>
                  <p className="activities-card__risks">
                    {strategies.length > 0 ? strategies.join(', ') : 'No project category selected'}
                  </p>
                  <div className="activities-card__strategy">
                    <span>Project Categorized</span>
                    <strong>{primaryStrategy}</strong>
                    <small>{secondaryStrategy}</small>
                  </div>
                  <div className="activities-card__metrics">
                    <div>
                      <span>Requested Budget</span>
                      <strong>{formatBudget(act.dga_requested_budget)}</strong>
                    </div>
                    <div>
                      <span>Pending With</span>
                      <strong>{getPendingWith(act, ownerNameById)}</strong>
                    </div>
                  </div>
                  <div className="activities-card__footer">
                    <span>Updated {act.modifiedon ? formatDate(act.modifiedon) : '—'}</span>
                    <button
                      className="activities-list__view-action"
                      onClick={() => navigate(getActivityDetailPath(activityId))}
                      type="button"
                    >
                      <Eye size={14} />
                      View
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </section>
      ) : null}

      <div className="data-grid activities-list__legacy-grid" aria-hidden="true" style={{ position: 'relative' }}>
        <table>
          <thead>
            <tr>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_name')} type="button">
                    <span>{listLabels.nameColumn}</span>
                    {getSortIcon('dga_name')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_name ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_name', e)}
                    type="button"
                    aria-label="Filter by name"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_sectorname')} type="button">
                    <span>Sector</span>
                    {getSortIcon('dga_sectorname')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_sectorname ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_sectorname', e)}
                    type="button"
                    aria-label="Filter by sector"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_departmentname')} type="button">
                    <span>Division</span>
                    {getSortIcon('dga_departmentname')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_departmentname ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_departmentname', e)}
                    type="button"
                    aria-label="Filter by division"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_registered_or_will_be_registered_in_epm')} type="button">
                    <span>EPM</span>
                    {getSortIcon('dga_registered_or_will_be_registered_in_epm')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_registered_or_will_be_registered_in_epm ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_registered_or_will_be_registered_in_epm', e)}
                    type="button"
                    aria-label="Filter by EPM"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_adeo_review_required')} type="button">
                    <span>ADEO</span>
                    {getSortIcon('dga_adeo_review_required')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_adeo_review_required ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_adeo_review_required', e)}
                    type="button"
                    aria-label="Filter by ADEO"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_doesthisprojectrequirebudgetallocation')} type="button">
                    <span>Budget</span>
                    {getSortIcon('dga_doesthisprojectrequirebudgetallocation')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_doesthisprojectrequirebudgetallocation ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_doesthisprojectrequirebudgetallocation', e)}
                    type="button"
                    aria-label="Filter by budget"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_does_this_project_require_procurement')} type="button">
                    <span>Procurement</span>
                    {getSortIcon('dga_does_this_project_require_procurement')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_does_this_project_require_procurement ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_does_this_project_require_procurement', e)}
                    type="button"
                    aria-label="Filter by procurement"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_project_categorized_under')} type="button">
                    <span>Categorized</span>
                    {getSortIcon('dga_project_categorized_under')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_project_categorized_under ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_project_categorized_under', e)}
                    type="button"
                    aria-label="Filter by categorized strategy"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('pending_with')} type="button">
                    <span>Pending With</span>
                    {getSortIcon('pending_with')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.pending_with ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('pending_with', e)}
                    type="button"
                    aria-label="Filter by pending with"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('statuscode')} type="button">
                    <span>Approval Status</span>
                    {getSortIcon('statuscode')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.statuscode ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('statuscode', e)}
                    type="button"
                    aria-label="Filter by approval status"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_project_phase')} type="button">
                    <span>Phase</span>
                    {getSortIcon('dga_project_phase')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_project_phase ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_project_phase', e)}
                    type="button"
                    aria-label="Filter by phase"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_project_activity_status')} type="button">
                    <span>Activity Status</span>
                    {getSortIcon('dga_project_activity_status')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_project_activity_status ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_project_activity_status', e)}
                    type="button"
                    aria-label="Filter by activity status"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_total_project_budget')} type="button">
                    <span>Total Budget</span>
                    {getSortIcon('dga_total_project_budget')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_total_project_budget ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_total_project_budget', e)}
                    type="button"
                    aria-label="Filter by total budget"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_allocated_budget')} type="button">
                    <span>Allocated Budget</span>
                    {getSortIcon('dga_allocated_budget')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_allocated_budget ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_allocated_budget', e)}
                    type="button"
                    aria-label="Filter by allocated budget"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_requested_budget')} type="button">
                    <span>Requested Budget</span>
                    {getSortIcon('dga_requested_budget')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_requested_budget ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_requested_budget', e)}
                    type="button"
                    aria-label="Filter by requested budget"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_planned_start_date')} type="button">
                    <span>Start Date</span>
                    {getSortIcon('dga_planned_start_date')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_planned_start_date ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_planned_start_date', e)}
                    type="button"
                    aria-label="Filter by start date"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_planned_end_date')} type="button">
                    <span>End Date</span>
                    {getSortIcon('dga_planned_end_date')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_planned_end_date ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_planned_end_date', e)}
                    type="button"
                    aria-label="Filter by end date"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              renderSkeletonRows()
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan={17}>
                  <EmptyState
                    description="Try adjusting your search or filter criteria."
                    title={listLabels.emptyTitle}
                  />
                </td>
              </tr>
            ) : (
              activities.map((act) => (
                <tr key={act.dga_aop_projectsid}>
                  <td className="activities-list__category-cell">
                    <button
                      className="activities-list__name-link"
                      onClick={() => navigate(getActivityDetailPath(act.dga_aop_projectsid))}
                      type="button"
                    >
                      {act.dga_name}
                    </button>
                  </td>
                  <td>{getLookupName(act._dga_sector_value, hierarchyNameById)}</td>
                  <td>{getLookupName(act._dga_department_value, hierarchyNameById)}</td>
                  <td>
                    <Badge tone={act.dga_registered_or_will_be_registered_in_epm ? 'success' : 'neutral'}>
                      {act.dga_registered_or_will_be_registered_in_epm ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={act.dga_adeo_review_required ? 'warning' : 'neutral'}>
                      {act.dga_adeo_review_required ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={act.dga_doesthisprojectrequirebudgetallocation ? 'info' : 'neutral'}>
                      {act.dga_doesthisprojectrequirebudgetallocation ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={act.dga_does_this_project_require_procurement === 1 ? 'warning' : 'neutral'}>
                      {act.dga_does_this_project_require_procurement === 1 ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td>
                    {getCategorizedLabels(act).length > 0 ? (
                      <div className="activities-list__category-chips">
                        {getCategorizedLabels(act).map((label) => (
                          <span className="activities-list__category-chip" key={label}>
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                  <td>{getPendingWith(act, ownerNameById)}</td>
                  <td className="activities-list__approval-status">
                    <Badge tone={statusCodeTone(Number(act.statuscode))}>
                      {statusCodeLabel(Number(act.statuscode))}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={act.dga_project_phase === 776140001 ? 'success' : 'info'}>
                      {phaseLabel(Number(act.dga_project_phase))}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={activityStatusTone(Number(act.dga_project_activity_status))}>
                      {activityStatusLabel(Number(act.dga_project_activity_status))}
                    </Badge>
                  </td>
                  <td className="activities-list__budget">{formatBudget(act.dga_total_project_budget)}</td>
                  <td className="activities-list__budget">{formatBudget(act.dga_allocated_budget)}</td>
                  <td className="activities-list__budget">{formatBudget(act.dga_requested_budget)}</td>
                  <td>{act.dga_planned_start_date ? formatDate(act.dga_planned_start_date) : '—'}</td>
                  <td>{act.dga_planned_end_date ? formatDate(act.dga_planned_end_date) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Inline Column Filter Popover (DependenciesTab pattern) ── */}
      {openFilterColumn ? (() => {
        const config = COLUMN_FILTER_CONFIG[openFilterColumn]
        if (!config) return null
        const columnLabel = getColumnFilterLabel(openFilterColumn)
        const operatorOptions = (config.type === 'number' ? NUMBER_OPERATORS : config.type === 'date' ? DATE_OPERATORS : TEXT_OPERATORS)

        return (
          <div
            className="activities-list__col-filter-popover"
            ref={filterPopoverRef}
            style={{ position: 'fixed', top: filterPopoverPos.top, left: filterPopoverPos.left }}
          >
            <div className="activities-list__col-filter-heading">
              <strong>Filter {columnLabel}</strong>
              <span>{getColumnFilterSubtitle(config.type)}</span>
            </div>
            {config.type === 'multi' ? (
              <div className="edit-activity__deps-filter-section">
                <div className="edit-activity__deps-filter-checkbox-group">
                  {config.options?.map((opt) => (
                    <label key={opt.value} className="edit-activity__deps-filter-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editMultiVals.includes(opt.value)}
                        onChange={() => {
                          setEditMultiVals((prev) =>
                            prev.includes(opt.value)
                              ? prev.filter((v) => v !== opt.value)
                              : [...prev, opt.value]
                          )
                        }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : config.type === 'boolean' ? (
              <div className="edit-activity__deps-filter-section">
                <Select
                  id={`filter-val-${openFilterColumn}`}
                  hideLabel
                  label="Value"
                  value={editFilterVal}
                  onChange={(value) => setEditFilterVal(value)}
                  options={[
                    { label: 'All', value: '' },
                    { label: 'Yes', value: 'true' },
                    { label: 'No', value: 'false' },
                  ]}
                />
              </div>
            ) : (
              <div className="edit-activity__deps-filter-section">
                <div className="activities-list__filter-operator-group" role="group" aria-label={`Filter operator for ${columnLabel}`}>
                  {operatorOptions.map((op) => (
                    <button
                      className={`activities-list__filter-operator${editFilterOp === op ? ' activities-list__filter-operator--active' : ''}`}
                      key={op}
                      onClick={() => setEditFilterOp(op)}
                      type="button"
                    >
                      {OPERATOR_LABELS[op]}
                    </button>
                  ))}
                </div>
                {config.type === 'date' ? (
                  <DatePicker
                    id={`filter-val-${openFilterColumn}`}
                    label=""
                    onChange={(val) => setEditFilterVal(val)}
                    value={editFilterVal}
                  />
                ) : (
                  <Input
                    id={`filter-val-${openFilterColumn}`}
                    label=""
                    onChange={(e) => setEditFilterVal(e.target.value)}
                    placeholder={getColumnFilterPlaceholder(openFilterColumn, config.type)}
                    value={editFilterVal}
                    type={config.type === 'number' ? 'number' : 'text'}
                  />
                )}
              </div>
            )}
            <span className="activities-list__filter-status">
              {actFilters[openFilterColumn] ? 'Filter applied' : 'No filter applied'}
            </span>
            <div className="edit-activity__deps-filter-actions">
              <button className="edit-activity__deps-filter-cancel" onClick={handleCancelFilter} type="button">Cancel</button>
              <button className="edit-activity__deps-filter-apply" onClick={handleApplyFilter} type="button">Apply</button>
            </div>
          </div>
        )
      })() : null}

      {/* ── Clear All Column Filters ── */}
      {Object.keys(actFilters).length > 0 ? (
        <div className="activities-list__clear-filters">
          <button onClick={handleClearAllColumnFilters} type="button">
            <X size={13} />
            <span>Clear Column Filters</span>
          </button>
        </div>
      ) : null}

      {/* ── Pagination ── */}
      {totalCount > 0 ? (
        <div className="activities-list__pagination">
          <span className="activities-list__pagination-info">
            {isLoading ? (
              'Loading...'
            ) : (
              <>
                Showing <strong>{rangeStart}–{rangeEnd}</strong> of <strong>{totalCount}</strong> {totalCount === 1 ? listLabels.countSingular.toLowerCase() : listLabels.countPlural.toLowerCase()}
              </>
            )}
          </span>
          {showPagination ? (
          <div className="activities-list__pagination-controls">
            <button
              className="activities-list__page-btn"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              type="button"
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>
            <div className="activities-list__page-numbers">
              {(() => {
                const pages: (number | 'ellipsis')[] = []
                const total = totalPages
                const current = currentPage
                const siblingCount = 1
                if (total <= 7) {
                  for (let i = 1; i <= total; i++) pages.push(i)
                } else {
                  pages.push(1)
                  if (current > siblingCount + 2) pages.push('ellipsis')
                  const start = Math.max(2, current - siblingCount)
                  const end = Math.min(total - 1, current + siblingCount)
                  for (let i = start; i <= end; i++) pages.push(i)
                  if (current < total - siblingCount - 1) pages.push('ellipsis')
                  if (total > 1) pages.push(total)
                }
                return pages.map((page, idx) =>
                  page === 'ellipsis' ? (
                    <span className="activities-list__page-ellipsis" key={`ellipsis-${idx}`}>...</span>
                  ) : (
                    <button
                      key={page}
                      className={`activities-list__page-num${page === current ? ' activities-list__page-num--active' : ''}`}
                      disabled={isLoading}
                      onClick={() => setCurrentPage(page)}
                      type="button"
                    >
                      {page}
                    </button>
                  ),
                )
              })()}
            </div>
            <button
              className="activities-list__page-btn"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              type="button"
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          ) : null}
        </div>
      ) : null}

    </div>
  )
}
