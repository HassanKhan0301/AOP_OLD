import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  MessageSquare,
  Send,
  Sparkles,
} from 'lucide-react'
import { Badge, Button, ConfirmationDialog, DirhamIcon, EmptyState, Modal, SearchInput, Select, Textarea, type SelectOption } from '../components/ui'
import type { Dga_project_planning_instances } from '../generated/models/Dga_project_planning_instancesModel'
import { Dga_aop_projectsesService } from '../generated/services/Dga_aop_projectsesService'
import { Dga_project_planning_instancesService } from '../generated/services/Dga_project_planning_instancesService'
import { SystemusersService } from '../generated/services/SystemusersService'
import { TeamsService } from '../generated/services/TeamsService'
import {
  Dga_aop_projectsesdga_project_categorized_under,
  type Dga_aop_projectsesBase,
  type Dga_aop_projectses,
} from '../generated/models/Dga_aop_projectsesModel'
import type { Systemusers } from '../generated/models/SystemusersModel'
import type { Teams } from '../generated/models/TeamsModel'
import { APP_ROUTE_PATHS } from '../routes/appRoutes'
import { fetchPlanningInstances } from '../store/appSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { getResultValue } from './editActivity/helpers/activityInfoHelpers'
import { formatDate } from './editActivity/helpers/sharedHelpers'
import { getResultArray, validatePersistedActivitySubmission } from './editActivity/helpers/submissionValidation'
import {
  approveProjectRelatedChanges,
  persistApprovedExecutionRelatedChanges,
  rejectProjectRelatedChanges,
} from './editActivity/helpers/executionApprovalHelpers'
import { createApprovalWorkflowLog } from './editActivity/helpers/approvalWorkflowLogs'
import '../styles/approvals.css'

type ApprovalPhase = 'Planning' | 'Execution'
type ApprovalBucket = 'to-approve' | 'approved'

type ApprovalRecord = {
  id: string
  planningInstanceId: string
  statusCode: number
  activityName: string
  sector: string
  division: string
  projectPhase: ApprovalPhase
  projectType: 'New' | 'Ongoing' | 'Operational'
  epmRegistered: boolean
  budgetRequired: boolean
  procurementRequired: boolean
  approvalStatus: string
  approvalBucket: ApprovalBucket
  pendingWith: string
  activityLead: string
  plannedStartDate: string
  plannedEndDate: string
  activityStatus: string
  summary: string
  scope: string
  strategies: string
  adeoRequired: boolean
  totalBudget: string
  requestedBudget: string
  createdOn: string
  modifiedOn: string
  projectRelatedChanges: string
}

type ApprovalUpdatePayload = Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>> & {
  'ownerid@odata.bind'?: string
}

type ApprovalActionPayload = {
  actionName: string
  newStatusCode: Dga_aop_projectsesBase['statuscode'] | number
  payload: ApprovalUpdatePayload
}

const PAGE_SIZE = 8
const PHASE_OPTIONS: SelectOption<string>[] = [
  { label: 'All phases', value: '' },
  { label: 'Planning', value: 'Planning' },
  { label: 'Execution', value: 'Execution' },
]

const SORT_OPTIONS: SelectOption<string>[] = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
]

const VALIDATION_SECTION_LABELS: Record<string, string> = {
  'activity-info': 'Activity Information',
  objectives: 'Objectives',
  milestones: 'Milestones',
  procurements: 'Procurement',
  budget: 'Budget',
}

const APPROVAL_STATUS_BY_ROLE: Array<{ match: string; statusCode: number }> = [
  { match: 'division director', statusCode: 776140001 },
  { match: 'strategy team', statusCode: 776140003 },
  { match: 'executive director', statusCode: 776140004 },
  { match: 'director general', statusCode: 776140002 },
  { match: 'adeo team', statusCode: 576610001 },
  { match: 'adeo', statusCode: 576610001 },
]

const EXECUTION_APPROVAL_STATUS_CODES = new Set([776140001, 776140003, 776140004])
const MIXED_APPROVAL_SELECTION_MESSAGE = 'Planning and execution approvals cannot be processed together. Please select one approval type at a time.'

const APPROVAL_PROJECT_SELECT = [
  'dga_aop_projectsid',
  'dga_name',
  '_dga_sector_value',
  '_dga_department_value',
  'dga_project_phase',
  'dga_project_type',
  'statuscode',
  '_owningteam_value',
  '_owninguser_value',
  '_dga_project_planning_instance_value',
  '_dga_activity_lead_value',
  'dga_registered_or_will_be_registered_in_epm',
  'dga_doesthisprojectrequirebudgetallocation',
  'dga_does_this_project_require_procurement',
  'dga_adeo_review_required',
  'dga_planned_start_date',
  'dga_planned_end_date',
  'dga_project_activity_status',
  'dga_description_summary',
  'dga_scope',
  'dga_project_categorized_under',
  'dga_total_project_budget',
  'dga_requested_budget',
  'dga_project_related_changes',
  'createdon',
  'modifiedon',
]

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

const ACTIVITY_STATUS_MAP: Record<number, string> = {
  776140014: 'Draft',
  776140007: 'Not Started',
  776140005: 'In Progress (Delayed)',
  776140006: 'In Progress (On Track)',
  776140009: 'On Hold',
  776140010: 'Cancelled',
  776140013: 'Completed',
  776140015: 'Submitted for Approval',
}

const PROJECT_PHASE_MAP: Record<number, ApprovalPhase> = {
  776140000: 'Planning',
  776140001: 'Execution',
}

const PROJECT_TYPE_MAP: Record<number, ApprovalRecord['projectType']> = {
  1: 'New',
  2: 'Ongoing',
  3: 'Operational',
}

const CATEGORIZED_LABEL_BY_VALUE = Object
  .entries(Dga_aop_projectsesdga_project_categorized_under)
  .reduce<Record<string, string>>((map, [value, label]) => {
    map[value] = label
    return map
  }, {})

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function normalizeRoleName(roleName: string) {
  return roleName
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s+role$/i, '')
    .trim()
}

function toEntityBind(entitySetName: string, id: string) {
  return `/${entitySetName}(${normalizeId(id)})`
}

function escapeODataValue(value: string) {
  return value.replace(/'/g, "''")
}

function getApprovalStatusForRole(roleName?: string) {
  const normalizedRole = normalizeRoleName(roleName ?? '')
  return APPROVAL_STATUS_BY_ROLE.find((role) => normalizedRole.includes(role.match))?.statusCode
}

function isExecutionApprovalRecord(approval: ApprovalRecord) {
  return approval.projectPhase === 'Execution' && EXECUTION_APPROVAL_STATUS_CODES.has(approval.statusCode)
}

function canRoleRejectExecutionUpdates(roleName?: string) {
  const normalizedRole = normalizeRoleName(roleName ?? '')
  return normalizedRole.includes('division director')
    || normalizedRole.includes('strategy team')
    || normalizedRole.includes('executive director')
}

function getOperationErrorMessage(result: unknown, fallbackMessage: string) {
  const error = (result as { error?: { message?: string } | string })?.error
  const message = typeof error === 'string' ? error : error?.message

  if (!message) return fallbackMessage

  try {
    const parsed = JSON.parse(message) as { error?: { message?: string } }
    return parsed.error?.message ?? message
  } catch {
    return message
  }
}

function assertOperationSuccess(result: unknown, fallbackMessage: string) {
  if ((result as { success?: boolean })?.success === false) {
    throw new Error(getOperationErrorMessage(result, fallbackMessage))
  }
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

function getCategorizedLabels(project: Dga_aop_projectses) {
  const labels = parseCategorizedValues(project.dga_project_categorized_under)
    .map((value) => CATEGORIZED_LABEL_BY_VALUE[value] ?? value)

  return labels.length > 0 ? labels.join(', ') : '—'
}

function formatAmount(value?: number | null) {
  if (value == null) return '—'

  return Number(value).toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })
}

function formatCurrencyDetail(value: string) {
  return value === '—' ? '—' : `AED ${value}`
}

function parseFormattedAmount(value: string) {
  if (!value || value === 'â€”') return 0
  const parsed = Number(value.replace(/,/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

function formatCompactBudget(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(value >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, '')}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function getQueueHeaderContent(roleName?: string) {
  const normalizedRole = normalizeRoleName(roleName ?? '')

  if (normalizedRole.includes('division director')) {
    return {
      breadcrumb: 'Home / Division Director Queue',
      title: 'Division Director Queue',
      description: 'Review respondent submissions, complete reviewer assessment, raise clarifications, and then submit ready items to the approver.',
    }
  }

  if (normalizedRole.includes('strategy team')) {
    return {
      breadcrumb: 'Home / Strategy Team Queue',
      title: 'Strategy Team Queue',
      description: 'Review division-approved submissions, confirm strategic alignment, and prepare eligible items for executive review.',
    }
  }

  if (normalizedRole.includes('executive director')) {
    return {
      breadcrumb: 'Home / Executive Director Queue',
      title: 'Executive Director Queue',
      description: 'Review escalated activities, assess readiness, and submit approved items for final governance review.',
    }
  }

  if (normalizedRole.includes('director general')) {
    return {
      breadcrumb: 'Home / Director General Queue',
      title: 'Director General Queue',
      description: 'Review final submissions, confirm approval readiness, and complete the final decision for selected activities.',
    }
  }

  if (normalizedRole.includes('adeo')) {
    return {
      breadcrumb: 'Home / ADEO Queue',
      title: 'ADEO Queue',
      description: 'Review ADEO submissions, inspect supporting details, and complete the assigned approval action.',
    }
  }

  return {
    breadcrumb: 'Home / Review Queue',
    title: 'Review Queue',
    description: 'Review submitted AOP activities, inspect key details, and prepare bulk approvals.',
  }
}

function getBulkSubmitLabel(roleName?: string) {
  const normalizedRole = normalizeRoleName(roleName ?? '')

  if (normalizedRole.includes('division director')) return 'Submit to Division Director'
  if (normalizedRole.includes('strategy team')) return 'Submit to Strategy Team'
  if (normalizedRole.includes('executive director')) return 'Submit to Executive Director'
  if (normalizedRole.includes('director general')) return 'Submit to Director General'
  if (normalizedRole.includes('adeo')) return 'Submit to ADEO'

  return 'Submit to Approver'
}

function formatLookupName(lookupId: string | null | undefined, nameById: Record<string, string>) {
  const id = normalizeId(lookupId)
  return id ? nameById[id] || '—' : '—'
}

function getPendingWith(project: Dga_aop_projectses, ownerNameById: Record<string, string>) {
  const ownerTeamId = normalizeId(project._owningteam_value)
  const ownerUserId = normalizeId(project._owninguser_value)

  if (ownerTeamId) return ownerNameById[ownerTeamId] || 'Team'
  if (ownerUserId) return ownerNameById[ownerUserId] || 'User'

  return '—'
}

async function loadDisplayNameMaps(projects: Dga_aop_projectses[]) {
  const teamIds = Array.from(new Set(projects.map((project) => normalizeId(project._owningteam_value)).filter(Boolean)))
  const userIds = Array.from(new Set(projects.flatMap((project) => [
    normalizeId(project._owninguser_value),
    normalizeId(project._dga_activity_lead_value),
  ]).filter(Boolean)))

  const ownerNameById: Record<string, string> = {}
  const userNameById: Record<string, string> = {}

  if (teamIds.length > 0) {
    const teamsResult = await TeamsService.getAll({
      filter: teamIds.map((id) => `teamid eq '${id}'`).join(' or '),
      select: ['teamid', 'name'],
    })
    assertOperationSuccess(teamsResult, 'Could not load approval owner teams.')

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
    assertOperationSuccess(usersResult, 'Could not load approval users.')

    ;((usersResult.data ?? []) as Systemusers[]).forEach((user) => {
      const userId = normalizeId(user.systemuserid)
      const userName = user.fullname || user.internalemailaddress
      if (userId && userName) {
        ownerNameById[userId] = userName
        userNameById[userId] = userName
      }
    })
  }

  return { ownerNameById, userNameById }
}

function mapProjectToApproval(
  project: Dga_aop_projectses,
  hierarchyNameById: Record<string, string>,
  ownerNameById: Record<string, string>,
  userNameById: Record<string, string>,
): ApprovalRecord {
  const statusCode = Number(project.statuscode)
  const phase = PROJECT_PHASE_MAP[Number(project.dga_project_phase)] ?? 'Planning'

  return {
    id: project.dga_aop_projectsid,
    planningInstanceId: normalizeId(project._dga_project_planning_instance_value),
    statusCode,
    activityName: project.dga_name || project.dga_project_name || 'Untitled activity',
    sector: formatLookupName(project._dga_sector_value, hierarchyNameById),
    division: formatLookupName(project._dga_department_value, hierarchyNameById),
    projectPhase: phase,
    projectType: PROJECT_TYPE_MAP[Number(project.dga_project_type)] ?? 'New',
    epmRegistered: Boolean(project.dga_registered_or_will_be_registered_in_epm),
    budgetRequired: Number(project.dga_doesthisprojectrequirebudgetallocation) === 1,
    procurementRequired: Number(project.dga_does_this_project_require_procurement) === 1,
    approvalStatus: STATUS_CODE_MAP[statusCode]?.label ?? 'Unknown',
    approvalBucket: statusCode === 776140011 ? 'approved' : 'to-approve',
    pendingWith: getPendingWith(project, ownerNameById),
    activityLead: formatLookupName(project._dga_activity_lead_value, userNameById),
    plannedStartDate: project.dga_planned_start_date ?? '',
    plannedEndDate: project.dga_planned_end_date ?? '',
    activityStatus: ACTIVITY_STATUS_MAP[Number(project.dga_project_activity_status)] ?? '—',
    summary: project.dga_description_summary || 'No summary has been provided for this activity.',
    scope: project.dga_scope || 'No scope description has been provided for this activity.',
    strategies: getCategorizedLabels(project),
    adeoRequired: Boolean(project.dga_adeo_review_required),
    totalBudget: formatAmount(project.dga_total_project_budget),
    requestedBudget: formatAmount(project.dga_requested_budget),
    createdOn: project.createdon ?? '',
    modifiedOn: project.modifiedon ?? project.createdon ?? '',
    projectRelatedChanges: project.dga_project_related_changes ?? '',
  }
}

export function Approvals() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const currentRole = useAppSelector((state) => state.user.currentRole)
  const divisionalHierarchies = useAppSelector((state) => state.user.divisionalHierarchies)
  const currentRoleDivisionalHierarchy = useAppSelector((state) => state.user.currentRoleDivisionalHierarchy)
  const selectedCycle = useAppSelector((state) => state.app.selectedCycle)
  const planningInstances = useAppSelector((state) => state.app.planningInstances)
  const planningInstancesCycleId = useAppSelector((state) => state.app.planningInstancesCycleId)
  const planningInstancesLoading = useAppSelector((state) => state.app.planningInstancesLoading)
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [isApprovalConfirmOpen, setIsApprovalConfirmOpen] = useState(false)
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionError, setRejectionError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('')
  const [approvalFilter, setApprovalFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [notice, setNotice] = useState('')

  const roleApprovalStatus = useMemo(() => getApprovalStatusForRole(currentRole?.roleName), [currentRole?.roleName])
  const hasApprovalQueue = roleApprovalStatus != null
  const hasSelectedCyclePlanningInstances = Boolean(
    selectedCycle && normalizeId(planningInstancesCycleId) === normalizeId(selectedCycle),
  )
  const cyclePlanningInstanceIds = useMemo(() => {
    if (!selectedCycle || !hasSelectedCyclePlanningInstances || planningInstances.length === 0) return []

    return planningInstances
      .filter((planningInstance) => normalizeId(planningInstance._dga_assessment_cycle_value) === normalizeId(selectedCycle))
      .map((planningInstance) => normalizeId(planningInstance.dga_project_planning_instanceid))
      .filter(Boolean)
  }, [hasSelectedCyclePlanningInstances, planningInstances, selectedCycle])
  const isCycleFilterReady = Boolean(
    selectedCycle && hasSelectedCyclePlanningInstances && !planningInstancesLoading,
  )
  const roleHierarchyFilter = useMemo(() => {
    const hierarchyId = normalizeId(currentRoleDivisionalHierarchy?.hierarchyId)
    if (!hierarchyId) return ''

    const normalizedRole = normalizeRoleName(currentRole?.roleName ?? '')
    if (normalizedRole.includes('division member') || normalizedRole.includes('division director')) {
      return `_dga_department_value eq ${hierarchyId}`
    }
    if (normalizedRole.includes('executive director')) {
      return `_dga_sector_value eq ${hierarchyId}`
    }

    return ''
  }, [currentRole?.roleName, currentRoleDivisionalHierarchy?.hierarchyId])
  const requiresHierarchyScope = useMemo(() => {
    const normalizedRole = normalizeRoleName(currentRole?.roleName ?? '')
    return normalizedRole.includes('division member')
      || normalizedRole.includes('division director')
      || normalizedRole.includes('executive director')
  }, [currentRole?.roleName])
  const hasRequiredHierarchyScope = !requiresHierarchyScope || Boolean(normalizeId(currentRoleDivisionalHierarchy?.hierarchyId))
  const selectedApprovals = useMemo(
    () => approvals.filter((approval) => selectedIds.includes(approval.id)),
    [approvals, selectedIds],
  )
  const selectedExecutionCount = selectedApprovals.filter(isExecutionApprovalRecord).length
  const selectedPlanningCount = selectedApprovals.length - selectedExecutionCount
  const hasMixedApprovalSelection = selectedExecutionCount > 0 && selectedPlanningCount > 0
  const selectedApprovalMode: 'planning' | 'execution' | null = selectedApprovals.length === 0 || hasMixedApprovalSelection
    ? null
    : selectedExecutionCount > 0
      ? 'execution'
      : 'planning'
  const canRejectSelectedExecutionApprovals = selectedApprovalMode === 'execution'
    && canRoleRejectExecutionUpdates(currentRole?.roleName)
  const approvalActionDisabled = selectedIds.length === 0
    || loading
    || isApproving
    || isRejecting
    || !hasApprovalQueue
    || hasMixedApprovalSelection
  const rejectActionDisabled = approvalActionDisabled || !canRejectSelectedExecutionApprovals
  const mixedSelectionNotice = hasMixedApprovalSelection ? MIXED_APPROVAL_SELECTION_MESSAGE : ''
  const hierarchyNameById = useMemo(() => {
    return divisionalHierarchies.reduce<Record<string, string>>((map, hierarchy) => {
      const id = normalizeId(hierarchy.dga_divisional_hierarchyid)
      if (id) {
        map[id] = hierarchy.dga_name || hierarchy.dga_short_name || '—'
      }
      return map
    }, {})
  }, [divisionalHierarchies])

  const resetGridView = useCallback(() => {
    setCurrentPage(1)
    setSelectedIds([])
    setNotice('')
    setActionError('')
  }, [])

  useEffect(() => {
    if (selectedCycle && normalizeId(planningInstancesCycleId) !== normalizeId(selectedCycle)) {
      dispatch(fetchPlanningInstances(selectedCycle))
    }
  }, [dispatch, planningInstancesCycleId, selectedCycle])

  const loadApprovals = useCallback(async () => {
    resetGridView()

    if (!roleApprovalStatus || !selectedCycle) {
      setApprovals([])
      setError(null)
      setLoading(false)
      return
    }

    if (!hasRequiredHierarchyScope) {
      setApprovals([])
      setError(null)
      setLoading(false)
      return
    }

    if (!isCycleFilterReady) {
      setApprovals([])
      setError(null)
      setLoading(true)
      return
    }

    if (cyclePlanningInstanceIds.length === 0) {
      setApprovals([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const filterParts = [
        `statuscode eq ${roleApprovalStatus}`,
        `(${cyclePlanningInstanceIds.map((id) => `_dga_project_planning_instance_value eq ${id}`).join(' or ')})`,
      ]

      if (roleHierarchyFilter) {
        filterParts.push(roleHierarchyFilter)
      }

      const result = await Dga_aop_projectsesService.getAll({
        filter: filterParts.join(' and '),
        orderBy: ['modifiedon desc'],
        select: APPROVAL_PROJECT_SELECT,
      })
      assertOperationSuccess(result, 'Could not load approvals.')

      const projects = ((result.data ?? []) as Dga_aop_projectses[])
      const { ownerNameById, userNameById } = await loadDisplayNameMaps(projects)
      setApprovals(projects.map((project) => mapProjectToApproval(project, hierarchyNameById, ownerNameById, userNameById)))
    } catch (err) {
      console.error('Failed to load approvals:', err)
      setApprovals([])
      setError(err instanceof Error ? err.message : 'Could not load approvals.')
    } finally {
      setLoading(false)
    }
  }, [
    cyclePlanningInstanceIds,
    hasRequiredHierarchyScope,
    hierarchyNameById,
    isCycleFilterReady,
    resetGridView,
    roleApprovalStatus,
    roleHierarchyFilter,
    selectedCycle,
  ])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadApprovals()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadApprovals])

  const filteredApprovals = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    const filtered = approvals.filter((approval) => {
      if (phaseFilter && approval.projectPhase !== phaseFilter) return false
      if (approvalFilter === 'sent-to-approver' && approval.approvalBucket !== 'approved') return false
      if (approvalFilter === 'clarification' && !approval.approvalStatus.toLowerCase().includes('clarification')) return false

      if (!normalizedSearch) return true

      return [
        approval.activityName,
        approval.sector,
        approval.division,
        approval.approvalStatus,
        approval.pendingWith,
      ].some((value) => value.toLowerCase().includes(normalizedSearch))
    })

    return filtered.sort((a, b) => {
      const firstDate = new Date(a.modifiedOn || a.createdOn || '').getTime() || 0
      const secondDate = new Date(b.modifiedOn || b.createdOn || '').getTime() || 0
      return sortOrder === 'oldest' ? firstDate - secondDate : secondDate - firstDate
    })
  }, [approvalFilter, approvals, phaseFilter, searchQuery, sortOrder])

  const totalCount = filteredApprovals.length
  const queueHeader = getQueueHeaderContent(currentRole?.roleName)
  const bulkSubmitLabel = getBulkSubmitLabel(currentRole?.roleName)
  const totalBudgetValue = filteredApprovals.reduce((sum, approval) => sum + parseFormattedAmount(approval.totalBudget), 0)
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const visibleApprovals = filteredApprovals.slice(pageStart, pageStart + PAGE_SIZE)
  const visibleIds = visibleApprovals.map((approval) => approval.id)
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.includes(id)).length
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length
  const showPagination = totalCount > PAGE_SIZE
  const rangeStart = totalCount > 0 ? pageStart + 1 : 0
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, totalCount)
  const reviewQueueTabs = [
    { label: 'All', value: '', count: approvals.length },
    { label: 'Sent to Approver', value: 'sent-to-approver', count: approvals.filter((approval) => approval.approvalBucket === 'approved').length },
    { label: 'Clarification', value: 'clarification', count: approvals.filter((approval) => approval.approvalStatus.toLowerCase().includes('clarification')).length },
  ]

  function toggleSelected(id: string) {
    setNotice('')
    setActionError('')
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    )
  }

  function toggleVisibleSelection() {
    setNotice('')
    setActionError('')
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id))
      }

      return Array.from(new Set([...current, ...visibleIds]))
    })
  }

  function handleApproveSelected() {
    setNotice('')
    setActionError('')
    if (hasMixedApprovalSelection) {
      setActionError(MIXED_APPROVAL_SELECTION_MESSAGE)
      return
    }

    if (selectedIds.length > 0 && hasApprovalQueue) {
      setIsApprovalConfirmOpen(true)
    }
  }

  function handleRejectSelected() {
    setNotice('')
    setActionError('')
    setRejectionError('')

    if (hasMixedApprovalSelection) {
      setActionError(MIXED_APPROVAL_SELECTION_MESSAGE)
      return
    }

    if (!canRejectSelectedExecutionApprovals || selectedIds.length === 0 || !hasApprovalQueue) return

    setRejectionReason('')
    setIsRejectModalOpen(true)
  }

  function handleSubmitSingle(approval: ApprovalRecord) {
    setSelectedIds([approval.id])
    setNotice('')
    setActionError('')
    window.setTimeout(() => {
      setIsApprovalConfirmOpen(true)
    }, 0)
  }

  function handleRaiseClarificationSingle(approval: ApprovalRecord) {
    setSelectedIds([approval.id])
    setNotice('')
    setActionError('')
    setRejectionError('')
    setRejectionReason('')
    window.setTimeout(() => {
      setIsRejectModalOpen(true)
    }, 0)
  }

  async function resolveTeamByName(teamName: string) {
    const result = await TeamsService.getAll({
      filter: `name eq '${escapeODataValue(teamName)}'`,
      select: ['teamid', 'name'],
      top: 1,
    })
    assertOperationSuccess(result, `Unable to resolve ${teamName} owner.`)

    const team = getResultArray<Teams>(result)[0]
    const teamId = normalizeId(team?.teamid)
    if (!teamId) {
      throw new Error(`${teamName} team could not be found.`)
    }

    return {
      id: teamId,
      name: team.name || teamName,
    }
  }

  async function resolveTeamByCandidateNames(teamNames: string[], fallbackSearchTerm?: string) {
    for (const teamName of teamNames) {
      try {
        return await resolveTeamByName(teamName)
      } catch {
        // Continue through configured names before using a broader lookup.
      }
    }

    if (fallbackSearchTerm) {
      const result = await TeamsService.getAll({
        filter: `contains(name, '${escapeODataValue(fallbackSearchTerm)}')`,
        select: ['teamid', 'name'],
        top: 10,
      })
      assertOperationSuccess(result, `Unable to resolve ${teamNames[0]} owner.`)

      const teams = getResultArray<Teams>(result)
      const preferredTeam = teams.find((team) => {
        const teamName = (team.name || '').toLowerCase()
        return teamName.includes('aop') && teamName.includes(fallbackSearchTerm.toLowerCase())
      }) || teams[0]
      const teamId = normalizeId(preferredTeam?.teamid)
      if (teamId) {
        return {
          id: teamId,
          name: preferredTeam?.name || teamNames[0],
        }
      }
    }

    throw new Error(`${teamNames.join(' / ')} team could not be found.`)
  }

  async function resolvePlanningTeam(planningInstanceId: string, teamField: '_dga_executive_director_team_value' | '_dga_division_member_team_value') {
    if (!planningInstanceId) {
      throw new Error('Planning instance could not be resolved for the selected activity.')
    }

    const result = await Dga_project_planning_instancesService.get(planningInstanceId, {
      select: [
        'dga_project_planning_instanceid',
        teamField,
      ],
    })
    assertOperationSuccess(result, 'Unable to load owner team from the planning instance.')

    const planningInstance = getResultValue<Dga_project_planning_instances>(result)
    const teamId = normalizeId(planningInstance?.[teamField])
    if (!teamId) {
      throw new Error('Required owner team could not be resolved from the planning instance.')
    }

    let teamName = 'Team'
    try {
      const teamResult = await TeamsService.get(teamId, {
        select: ['teamid', 'name'],
      })
      assertOperationSuccess(teamResult, 'Unable to load owner team name.')
      teamName = getResultValue<Teams>(teamResult)?.name || teamName
    } catch {
      // Owner id is enough for the workflow update; log display can fall back.
    }

    return {
      id: teamId,
      name: teamName,
    }
  }

  async function buildPlanningApprovalPayload(approval: ApprovalRecord): Promise<ApprovalActionPayload> {
    const normalizedRole = normalizeRoleName(currentRole?.roleName ?? '')

    if (normalizedRole.includes('division director')) {
      const strategyTeam = await resolveTeamByName('AOP - Strategy Team')
      return {
        actionName: 'Approve Activity',
        newStatusCode: 776140003,
        payload: {
          statuscode: 776140003,
          'ownerid@odata.bind': toEntityBind('teams', strategyTeam.id),
        },
      }
    }

    if (normalizedRole.includes('strategy team')) {
      const executiveDirectorTeam = await resolvePlanningTeam(approval.planningInstanceId, '_dga_executive_director_team_value')
      return {
        actionName: 'Approve Activity',
        newStatusCode: 776140004,
        payload: {
          statuscode: 776140004,
          'ownerid@odata.bind': toEntityBind('teams', executiveDirectorTeam.id),
        },
      }
    }

    if (normalizedRole.includes('executive director')) {
      const directorGeneralTeam = await resolveTeamByName('AOP - Director General')
      return {
        actionName: 'Approve Activity',
        newStatusCode: 776140002,
        payload: {
          statuscode: 776140002,
          'ownerid@odata.bind': toEntityBind('teams', directorGeneralTeam.id),
        },
      }
    }

    if (normalizedRole.includes('director general')) {
      const adeoTeam = await resolveTeamByCandidateNames(['AOP - ADEO Team', 'AOP - ADEO'], 'ADEO')
      return {
        actionName: 'Approve Activity',
        newStatusCode: 576610001,
        payload: {
          dga_project_activity_status: 776140007,
          statuscode: 576610001 as Dga_aop_projectsesBase['statuscode'],
          'ownerid@odata.bind': toEntityBind('teams', adeoTeam.id),
        },
      }
    }

    if (normalizedRole.includes('adeo')) {
      const divisionMemberTeam = await resolvePlanningTeam(approval.planningInstanceId, '_dga_division_member_team_value')
      return {
        actionName: 'Approve Activity',
        newStatusCode: 776140011,
        payload: {
          dga_project_activity_status: 776140007,
          dga_project_phase: 776140001,
          statuscode: 776140011,
          'ownerid@odata.bind': toEntityBind('teams', divisionMemberTeam.id),
        },
      }
    }

    throw new Error('No approval transition is configured for the current role.')
  }

  async function buildExecutionApprovalPayload(approval: ApprovalRecord): Promise<ApprovalActionPayload> {
    const normalizedRole = normalizeRoleName(currentRole?.roleName ?? '')

    if (normalizedRole.includes('division director')) {
      const strategyTeam = await resolveTeamByName('AOP - Strategy Team')
      return {
        actionName: 'Approve Activity Updates',
        newStatusCode: 776140003,
        payload: {
          statuscode: 776140003,
          'ownerid@odata.bind': toEntityBind('teams', strategyTeam.id),
        },
      }
    }

    if (normalizedRole.includes('strategy team')) {
      const executiveDirectorTeam = await resolvePlanningTeam(approval.planningInstanceId, '_dga_executive_director_team_value')
      return {
        actionName: 'Approve Activity Updates',
        newStatusCode: 776140004,
        payload: {
          statuscode: 776140004,
          'ownerid@odata.bind': toEntityBind('teams', executiveDirectorTeam.id),
        },
      }
    }

    if (normalizedRole.includes('executive director')) {
      const adeoTeam = await resolveTeamByCandidateNames(['AOP - ADEO Team', 'AOP - ADEO'], 'ADEO')
      return {
        actionName: 'Approve Activity Updates',
        newStatusCode: 576610001,
        payload: {
          ...(await persistApprovedExecutionRelatedChanges(approval.projectRelatedChanges)),
          dga_is_rejected: false,
          dga_project_related_changes: approveProjectRelatedChanges(approval.projectRelatedChanges),
          dga_rejection_reason: '',
          dga_project_activity_status: 776140007,
          statuscode: 576610001 as Dga_aop_projectsesBase['statuscode'],
          'ownerid@odata.bind': toEntityBind('teams', adeoTeam.id),
        },
      }
    }

    throw new Error('No execution approval transition is configured for the current role.')
  }

  async function buildExecutionRejectPayload(approval: ApprovalRecord): Promise<ApprovalActionPayload> {
    const divisionMemberTeam = await resolvePlanningTeam(approval.planningInstanceId, '_dga_division_member_team_value')
    return {
      actionName: 'Reject Activity Updates',
      newStatusCode: 776140011,
      payload: {
        dga_is_rejected: true,
        dga_project_related_changes: rejectProjectRelatedChanges(approval.projectRelatedChanges),
        dga_rejection_reason: rejectionReason.trim(),
        statuscode: 776140011,
        'ownerid@odata.bind': toEntityBind('teams', divisionMemberTeam.id),
      },
    }
  }

  async function handleConfirmBulkApproval() {
    if (isApproving) return
    if (!roleApprovalStatus || selectedApprovals.length === 0) return
    if (!selectedApprovalMode) return

    setIsApproving(true)
    setNotice('')
    setActionError('')

    try {
      if (hasMixedApprovalSelection) {
        throw new Error(MIXED_APPROVAL_SELECTION_MESSAGE)
      }

      for (const approval of selectedApprovals) {
        if (approval.statusCode !== roleApprovalStatus) {
          throw new Error(`${approval.activityName}: this activity is no longer in your current approval queue.`)
        }

        if (selectedApprovalMode === 'planning') {
          const validation = await validatePersistedActivitySubmission(approval.id)
          if (!validation.valid) {
            throw new Error(`${approval.activityName}: ${VALIDATION_SECTION_LABELS[validation.section] ?? 'Validation'} - ${validation.message}`)
          }
        } else if (!isExecutionApprovalRecord(approval)) {
          throw new Error(`${approval.activityName}: this is not an execution update approval.`)
        }
      }

      const payloads = await Promise.all(selectedApprovals.map(async (approval) => ({
        approval,
        action: selectedApprovalMode === 'execution'
          ? await buildExecutionApprovalPayload(approval)
          : await buildPlanningApprovalPayload(approval),
      })))

      for (const { approval, action } of payloads) {
        const result = await Dga_aop_projectsesService.update(approval.id, action.payload)
        assertOperationSuccess(result, `Unable to approve ${approval.activityName}.`)
        void createApprovalWorkflowLog({
          actionName: action.actionName,
          newStatusCode: action.newStatusCode,
          oldStatusCode: approval.statusCode,
          projectId: approval.id,
        })
      }

      const approvedCount = selectedApprovals.length
      setIsApprovalConfirmOpen(false)
      setSelectedIds([])
      await loadApprovals()
      setNotice(selectedApprovalMode === 'execution'
        ? `${approvedCount} activity update request(s) approved successfully.`
        : `${approvedCount} project(s) approved successfully.`)
    } catch (err) {
      console.error('Failed to approve selected activities:', err)
      setIsApprovalConfirmOpen(false)
      setActionError(err instanceof Error ? err.message : 'Unable to approve selected project(s).')
    } finally {
      setIsApproving(false)
    }
  }

  async function handleConfirmBulkReject() {
    if (isRejecting) return
    if (!roleApprovalStatus || selectedApprovals.length === 0) return

    const trimmedReason = rejectionReason.trim()
    if (!trimmedReason) {
      setRejectionError('Enter a rejection reason before confirming.')
      return
    }

    setIsRejecting(true)
    setNotice('')
    setActionError('')
    setRejectionError('')

    try {
      if (hasMixedApprovalSelection) {
        throw new Error(MIXED_APPROVAL_SELECTION_MESSAGE)
      }

      if (!canRejectSelectedExecutionApprovals) {
        throw new Error('Reject is available only for execution update approvals.')
      }

      for (const approval of selectedApprovals) {
        if (approval.statusCode !== roleApprovalStatus) {
          throw new Error(`${approval.activityName}: this activity is no longer in your current approval queue.`)
        }

        if (!isExecutionApprovalRecord(approval)) {
          throw new Error(`${approval.activityName}: this is not an execution update approval.`)
        }
      }

      const payloads = await Promise.all(selectedApprovals.map(async (approval) => ({
        approval,
        action: await buildExecutionRejectPayload(approval),
      })))

      for (const { approval, action } of payloads) {
        const result = await Dga_aop_projectsesService.update(approval.id, action.payload)
        assertOperationSuccess(result, `Unable to reject ${approval.activityName}.`)
        void createApprovalWorkflowLog({
          actionName: action.actionName,
          newStatusCode: action.newStatusCode,
          oldStatusCode: approval.statusCode,
          projectId: approval.id,
        })
      }

      const rejectedCount = selectedApprovals.length
      setIsRejectModalOpen(false)
      setRejectionReason('')
      setSelectedIds([])
      await loadApprovals()
      setNotice(`${rejectedCount} activity update request(s) rejected successfully.`)
    } catch (err) {
      console.error('Failed to reject selected activities:', err)
      setIsRejectModalOpen(false)
      setActionError(err instanceof Error ? err.message : 'Unable to reject selected activity update request(s).')
    } finally {
      setIsRejecting(false)
    }
  }

  function renderSkeletonRows() {
    return Array.from({ length: PAGE_SIZE }).map((_, rowIndex) => (
      <div className="approvals-grid__row approvals-grid__skeleton-row" key={`approval-skeleton-${rowIndex}`} aria-hidden="true">
        <div className="approvals-grid__select-cell">
          <span className="approvals-grid__skeleton-check" />
        </div>
        <span><span className="approvals-grid__skeleton-bar approvals-grid__skeleton-bar--w70" /></span>
        <span><span className="approvals-grid__skeleton-bar approvals-grid__skeleton-bar--w60" /></span>
        <span><span className="approvals-grid__skeleton-bar approvals-grid__skeleton-bar--w60" /></span>
        <span><span className="approvals-grid__skeleton-bar approvals-grid__skeleton-bar--w45" /></span>
        <span><span className="approvals-grid__skeleton-bar approvals-grid__skeleton-bar--w70" /></span>
        <span><span className="approvals-grid__skeleton-bar approvals-grid__skeleton-bar--w55" /></span>
        <span><span className="approvals-grid__skeleton-bar approvals-grid__skeleton-bar--w35" /></span>
      </div>
    ))
  }

  const approvalConfirmDescription = selectedApprovalMode === 'execution'
    ? `Are you sure you want to approve ${selectedIds.length} activity update request(s)?`
    : `This action will approve ${selectedIds.length} project(s) and move them to the next workflow owner for ${currentRole?.roleName ?? 'the current role'}. Are you sure you want to proceed?`

  return (
    <div className="approvals-page">
      <header className="approvals-page__header">
        <div className="approvals-page__header-text">
          <span className="approvals-page__breadcrumb">{queueHeader.breadcrumb}</span>
          <h1>
            {queueHeader.title}
            <span className="approvals-page__count-badge">{totalCount} Records</span>
          </h1>
          <p>{queueHeader.description}</p>
        </div>
        <div className="approvals-page__header-side">
          <div className="approvals-page__budget-card" aria-label="Total budget">
            <span>Total Budget</span>
            <strong><DirhamIcon />{formatCompactBudget(totalBudgetValue)}</strong>
          </div>
        </div>
      </header>

      {mixedSelectionNotice ? (
        <div className="approvals-page__notice approvals-page__notice--error">
          <AlertTriangle size={15} />
          <span>{mixedSelectionNotice}</span>
        </div>
      ) : actionError ? (
        <div className="approvals-page__notice approvals-page__notice--error">
          <AlertTriangle size={15} />
          <span>{actionError}</span>
        </div>
      ) : null}

      {notice ? (
        <div className="approvals-page__notice">
          <Check size={15} />
          <span>{notice}</span>
        </div>
      ) : null}

      <section className="approvals-page__toolbar">
        <div className="approvals-page__queue-tabs" role="tablist" aria-label="Review queue filters">
          {reviewQueueTabs.map((tab) => (
            <button
              className={`approvals-page__queue-tab${approvalFilter === tab.value ? ' approvals-page__queue-tab--active' : ''}`}
              key={tab.label}
              onClick={() => {
                setApprovalFilter(tab.value)
                resetGridView()
              }}
              type="button"
            >
              <span>{tab.label}</span>
              <strong>{tab.count}</strong>
            </button>
          ))}
        </div>
        <SearchInput
          label="Search approvals"
          onChange={(event) => {
            setSearchQuery(event.target.value)
            resetGridView()
          }}
          placeholder="Search by project name"
          value={searchQuery}
        />
        <Select
          id="approval-phase-filter"
          label="Project Phase"
          onChange={(value) => {
            setPhaseFilter(value)
            resetGridView()
          }}
          options={PHASE_OPTIONS}
          value={phaseFilter}
        />
        <Select
          id="approval-sort-filter"
          label="Sort"
          onChange={(value) => {
            setSortOrder(value)
            resetGridView()
          }}
          options={SORT_OPTIONS}
          value={sortOrder}
        />
      </section>

      <section className="approvals-page__bulk-card" aria-label="Bulk selection actions">
        <button
          aria-label={allVisibleSelected ? 'Clear visible selection' : 'Select visible approvals'}
          className={`approvals-page__bulk-select${allVisibleSelected ? ' approvals-page__bulk-select--active' : ''}`}
          onClick={toggleVisibleSelection}
          type="button"
        >
          {allVisibleSelected ? <Check size={15} /> : null}
        </button>
        <div className="approvals-page__bulk-copy">
          <strong>Bulk Selection</strong>
          <span>{selectedVisibleCount} selected / {visibleIds.length} visible</span>
        </div>
        <div className="approvals-page__bulk-actions">
          <Button
            disabled={rejectActionDisabled}
            icon={<MessageSquare size={15} />}
            onClick={handleRejectSelected}
            variant="secondary"
          >
            Raise Clarification
          </Button>
          <Button
            disabled={approvalActionDisabled}
            icon={<Send size={15} />}
            onClick={handleApproveSelected}
          >
            {isApproving ? 'Submitting...' : bulkSubmitLabel}
          </Button>
        </div>
      </section>

      {error ? (
        <EmptyState
          action={<Button onClick={loadApprovals} variant="secondary">Retry</Button>}
          description={error}
          title="Could not load approvals"
        />
      ) : !hasApprovalQueue ? (
        <EmptyState
          description="No approvals available for this role."
          title="No approval queue"
        />
      ) : (
        <section className="approvals-review-list" aria-label="Approvals review queue">
          <div className="approvals-review-list__body">
            {loading ? (
              renderSkeletonRows()
            ) : visibleApprovals.length === 0 ? (
              <div className="approvals-review-card__empty">
                <EmptyState
                  action={(
                    <Button
                      onClick={() => {
                        setSearchQuery('')
                        setPhaseFilter('')
                        setApprovalFilter('')
                        resetGridView()
                      }}
                      variant="secondary"
                    >
                      Clear filters
                    </Button>
                  )}
                  description="Try changing your search or approval filters."
                  title="No approvals found"
                />
              </div>
            ) : visibleApprovals.map((approval) => {
              const isSelected = selectedIds.includes(approval.id)
              const canClarifyRecord = isExecutionApprovalRecord(approval) && canRoleRejectExecutionUpdates(currentRole?.roleName)

              return (
                <article className={`approvals-review-card${isSelected ? ' approvals-review-card--selected' : ''}`} key={approval.id}>
                  <div className="approvals-review-card__top">
                    <button
                      aria-label={`Select ${approval.activityName}`}
                      className={`approvals-review-card__selector${isSelected ? ' approvals-review-card__selector--active' : ''}`}
                      onClick={() => toggleSelected(approval.id)}
                      type="button"
                    >
                      {isSelected ? <Check size={14} /> : null}
                    </button>
                    <div className="approvals-review-card__title">
                      <div className="approvals-review-card__eyebrow">
                        <span>{approval.id ? `BID-${approval.id.slice(0, 4).toUpperCase()}` : 'BID'}</span>
                        <Badge tone="info">To Review</Badge>
                        <Badge tone="warning">Medium Risk</Badge>
                      </div>
                      <h2>{approval.activityName}</h2>
                      <p>{approval.projectPhase} / {approval.approvalStatus} / Updated {formatDate(approval.modifiedOn)}</p>
                    </div>
                    <aside className="approvals-review-card__budget">
                      <div className="approvals-review-card__budget-head">
                        <strong>Budget Summary</strong>
                        <span aria-hidden="true">↗</span>
                      </div>
                      <div>
                        <span>Requested</span>
                        <strong>{formatCurrencyDetail(approval.requestedBudget)}</strong>
                      </div>
                    </aside>
                  </div>

                  <section className="approvals-review-card__insights">
                    <div className="approvals-review-card__insights-head">
                      <Sparkles size={15} />
                      <strong>Review Insights</strong>
                    </div>
                    <div className="approvals-review-card__insights-body">
                      <p className="approvals-review-card__summary">{approval.summary}</p>
                      <div className="approvals-review-card__score-grid">
                        <div>
                          <strong>Document Evidence</strong>
                          <span><i style={{ width: '90%' }} />90%</span>
                        </div>
                        <div>
                          <strong>Project Fields</strong>
                          <span><i style={{ width: '75%' }} />75%</span>
                        </div>
                        <div>
                          <strong>Budget Account</strong>
                          <em>Partial</em>
                        </div>
                        <div>
                          <strong>Strategic Fit</strong>
                          <em>Close</em>
                        </div>
                      </div>
                      <div className="approvals-review-card__risk-row">
                        <span>Evidence Risk</span>
                        <span>Strategic Alignment Risk</span>
                      </div>
                      <div className="approvals-review-card__budget-note">
                        <Sparkles size={15} />
                        <strong>AI Budget Consideration</strong>
                      </div>
                    </div>
                  </section>

                  <footer className="approvals-review-card__actions">
                    <Button
                      disabled={!canClarifyRecord}
                      icon={<MessageSquare size={15} />}
                      onClick={() => handleRaiseClarificationSingle(approval)}
                      variant="secondary"
                    >
                      Raise Clarification
                    </Button>
                    <Button
                      icon={<Eye size={15} />}
                      onClick={() => navigate(`${APP_ROUTE_PATHS.editActivity}?id=${approval.id}`)}
                      variant="secondary"
                    >
                      View Details
                    </Button>
                    <Button
                      disabled={loading || isApproving || isRejecting || !hasApprovalQueue}
                      icon={<Send size={15} />}
                      onClick={() => handleSubmitSingle(approval)}
                    >
                      {bulkSubmitLabel}
                    </Button>
                  </footer>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {totalCount > 0 ? (
        <footer className="approvals-page__pagination">
          <span>
            Showing <strong>{rangeStart}-{rangeEnd}</strong> of <strong>{totalCount}</strong> approval{totalCount === 1 ? '' : 's'}
          </span>
          {showPagination ? (
            <div className="approvals-page__pagination-controls">
              <button
                aria-label="Previous page"
                className="approvals-page__page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                type="button"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="approvals-page__page-numbers">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    className={`approvals-page__page-num${page === currentPage ? ' approvals-page__page-num--active' : ''}`}
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    type="button"
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                aria-label="Next page"
                className="approvals-page__page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                type="button"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          ) : null}
        </footer>
      ) : null}

      <ConfirmationDialog
        confirmLabel={isApproving ? 'Approving...' : 'Approve'}
        description={approvalConfirmDescription}
        isOpen={isApprovalConfirmOpen}
        onCancel={() => {
          if (!isApproving) setIsApprovalConfirmOpen(false)
        }}
        onConfirm={handleConfirmBulkApproval}
        title={selectedApprovalMode === 'execution' ? 'Approve Activity Updates' : 'Approve Selected Projects'}
      />

      <Modal
        actions={(
          <>
            <Button
              disabled={isRejecting}
              onClick={() => {
                if (!isRejecting) setIsRejectModalOpen(false)
              }}
              variant="secondary"
            >
              Cancel
            </Button>
            <Button
              className="button--danger"
              disabled={isRejecting}
              onClick={handleConfirmBulkReject}
            >
              {isRejecting ? 'Rejecting...' : 'Confirm Reject'}
            </Button>
          </>
        )}
        isOpen={isRejectModalOpen}
        onClose={() => {
          if (!isRejecting) setIsRejectModalOpen(false)
        }}
        title="Reject Activity Updates"
      >
        <div className="approvals-page__reject-body">
          <p className="confirm-dialog__description">
            Please provide a rejection reason. The selected execution updates will be discarded and returned to the Division Member.
          </p>
          <Textarea
            disabled={isRejecting}
            error={rejectionError}
            label="Rejection Reason"
            onChange={(event) => {
              setRejectionReason(event.target.value)
              if (rejectionError) setRejectionError('')
            }}
            required
            rows={5}
            value={rejectionReason}
          />
        </div>
      </Modal>
    </div>
  )
}
