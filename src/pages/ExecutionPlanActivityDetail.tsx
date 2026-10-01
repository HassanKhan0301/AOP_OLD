import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Edit3,
  FileText,
  Flag,
  GitBranch,
  GitCompareArrows,
  HelpCircle,
  History,
  LayoutGrid,
  Link2,
  List,
  PenLine,
  Plus,
  Save,
  Search,
  Send,
  Sparkles,
  Target,
  Trash2,
  Wallet,
  X,
  Check,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Checkbox, ConfirmationDialog, CurrencyDisplay, CurrencyInput, DatePicker, Input, OperationAlert, RadioGroup, Select, SideDrawer, Textarea, type OperationAlertPayload } from '../components/ui'
import { APP_ROUTE_PATHS, EXECUTION_PLAN_DRAFT_STORAGE_KEY } from '../routes/appRoutes'
import type { Dga_aop_project_milestone_detailses, Dga_aop_project_milestone_detailsesBase } from '../generated/models/Dga_aop_project_milestone_detailsesModel'
import type { Dga_aop_project_budgets } from '../generated/models/Dga_aop_project_budgetsModel'
import type { Dga_aop_kpis, Dga_aop_kpisBase } from '../generated/models/Dga_aop_kpisModel'
import {
  Dga_aop_projectsesdga_activity_classification,
  Dga_aop_projectsesdga_does_this_project_require_procurement,
  Dga_aop_projectsesdga_doesthisprojectrequirebudgetallocation,
  Dga_aop_projectsesdga_project_type,
  Dga_aop_projectsesdga_strategic_vs_operation,
  type Dga_aop_projectses,
  type Dga_aop_projectsesBase,
} from '../generated/models/Dga_aop_projectsesModel'
import {
  Dga_dependenciesdga_please_check_where_applicable,
  type Dga_dependencies,
} from '../generated/models/Dga_dependenciesModel'
import type { Dga_project_planning_instances } from '../generated/models/Dga_project_planning_instancesModel'
import type { Dga_divisional_hierarchies } from '../generated/models/Dga_divisional_hierarchiesModel'
import type { Systemusers } from '../generated/models/SystemusersModel'
import type { Teams } from '../generated/models/TeamsModel'
import { Dga_aop_project_milestone_detailsesService } from '../generated/services/Dga_aop_project_milestone_detailsesService'
import { Dga_aop_project_budgetsService } from '../generated/services/Dga_aop_project_budgetsService'
import { Dga_aop_kpisService } from '../generated/services/Dga_aop_kpisService'
import { Dga_aop_projectsesService } from '../generated/services/Dga_aop_projectsesService'
import { Dga_dependenciesService } from '../generated/services/Dga_dependenciesService'
import { Dga_project_planning_instancesService } from '../generated/services/Dga_project_planning_instancesService'
import { Dga_divisional_hierarchiesService } from '../generated/services/Dga_divisional_hierarchiesService'
import { SystemusersService } from '../generated/services/SystemusersService'
import { TeamsService } from '../generated/services/TeamsService'
import { useAppSelector } from '../store/hooks'
import { AiSummaryPanel } from './editActivity/AiSummaryPanel'
import { ExecutionSkeleton } from '../components/ui/ExecutionSkeleton'
import { EmptyState } from '../components/ui'
import { useExecutionAiSummary } from './execution/useExecutionAiSummary'
import { ExecutionUnsavedGuard } from './execution/ExecutionUnsavedGuard'
import { useNavigationGuard } from '../contexts/useNavigationGuard'
import { PersistentAlerts, type PersistentAlert } from './activityForm/shared/PersistentAlerts'
import {
  ActivityInfoRailCard,
  ActivityProgressRailCard,
  ActivitySideRail,
  ActivityWorkflowRailCard,
} from './activityForm/shared/SideRail'
import { BudgetTab, type BudgetHeaderAction } from './editActivity/BudgetTab'
import { ClarificationTab } from './editActivity/ClarificationTab'
import { DependenciesTab } from './editActivity/DependenciesTab'
import { LogTab } from './editActivity/LogTab'
import { calculateProjectMilestoneProgress } from './editActivity/helpers/milestoneProgress'
import { isPlainObject, isRelatedChange, mergeProjectRelatedChanges, parseProjectRelatedChanges, type ProjectRelatedChange, type ProjectRelatedChanges, type ProjectRelatedRecord } from './editActivity/helpers/projectRelatedChanges'
import type { EditActivityOperationAlertPayload } from './editActivity/types/operationAlert'

type ExecutionPlanDetailTab = 'activity-information' | 'related-activities' | 'kpis' | 'objective' | 'budgeting' | 'milestone' | 'clarifications' | 'logs'

type ExecutionPlanDraft = {
  executionPlanType?: string
  activityName?: string
  arabicName?: string
  activityLeadId?: string
  plannedStartDate?: string
  plannedEndDate?: string
  scope?: string
  summary?: string
  arabicSummary?: string
  longTermImpact?: string
  overallLongTermImpact?: string
  stakeholder?: string
  activityKpi?: string
  activityPlan?: string
  activityLeadName?: string
  risks?: string
  strategies?: string[]
  cycleName?: string
  sectorName?: string
  divisionName?: string
}

type ExecutionMilestone = {
  actualProgress?: number | string | null
  id: string
  name: string
  plannedStartDate: string
  plannedEndDate: string
  quarter: string
  budget: string
  weightage: string
  marhalaAlMashroua: string
  makhrajAlMarhala: string
  statuscode?: number | string | null
  description: string
}

type ExecutionMilestoneForm = Omit<ExecutionMilestone, 'id'>

type RelatedActivity = {
  alreadySelected?: boolean
  id: string
  isDisabled?: boolean
  name: string
  parentId?: string
  selectionStatus?: 'available' | 'already-selected' | 'already-linked'
  type: string
  plannedStartDate: string
  plannedEndDate: string
  approvalStatus: string
  totalPlannedBudget: number
  totalAllocatedBudget: number
  alreadyLinked?: boolean
}

type LinkedKpi = {
  id: string
  name: string
  description: string
  type: string
  periodicMeasurement: string
  unit: string
  polarity: string
  availability: string
  phase: string
  approvalStatus: string
  pendingWith: string
  alreadyLinked?: boolean
}

type ExecutionKpiForm = {
  arabicCalculationMethod: string
  arabicDescription: string
  arabicName: string
  benchmark: string
  benchmarkable: string
  calculationMethod: string
  description: string
  directorate: string
  expectedImpact: string
  kpiName: string
  kpiType: string
  kpiUnit: string
  periodicMeasurement: string
  polarity: string
  sourceOfData: string
}

type ExecutionKpiFormErrors = Partial<Record<keyof ExecutionKpiForm, string>>

type ExecutionPlanDetailErrors = Partial<Record<
  | 'executionPlanType'
  | 'activityName'
  | 'arabicName'
  | 'scope'
  | 'summary'
  | 'arabicSummary'
  | 'plannedStartDate'
  | 'plannedEndDate'
  | 'longTermImpact'
  | 'overallLongTermImpact'
  | 'stakeholder'
  | 'activityKpi'
  | 'risks'
  | 'corporateStrategyPillar'
  | 'digitalStrategyPillar'
  | 'digitalStrategyObjective'
  | 'strategicKpis'
  | 'budgetSource'
  | 'budgetType'
  | 'allocatedBudget'
  | 'monthlyBudgets',
  string
>>

type ExecutionMilestoneFormErrors = Partial<Record<
  'name' | 'plannedStartDate' | 'plannedEndDate',
  string
>>

type ExecutionDependencyRow = {
  applicable: string
  dateOfSupport: string
  entityName: string
  id: string
  typeOfSupport: string
}

type ClassicFieldRow = {
  label: string
  value?: ReactNode
}

const DETAIL_TABS: Array<{ id: ExecutionPlanDetailTab, label: string, shortLabel: string, icon: typeof ClipboardList }> = [
  { id: 'activity-information', label: 'Activity Information', shortLabel: 'Info', icon: ClipboardList },
  { id: 'related-activities', label: 'Related Activities', shortLabel: 'Related Activities', icon: GitBranch },
  { id: 'kpis', label: 'KPIs', shortLabel: 'KPIs', icon: Target },
  { id: 'objective', label: 'Objective', shortLabel: 'Objective', icon: Target },
  { id: 'budgeting', label: 'Budgeting', shortLabel: 'Budget', icon: Wallet },
  { id: 'milestone', label: 'Milestone', shortLabel: 'Milestone', icon: Flag },
  { id: 'clarifications', label: 'Clarifications', shortLabel: 'Clarifications', icon: HelpCircle },
  { id: 'logs', label: 'Logs', shortLabel: 'Logs', icon: History },
]

const STRATEGY_LABELS: Record<string, string> = {
  'future-government': 'Government of the Future Strategy',
  'dge-corporate': 'DGE Corporate Strategy',
  'ad-government-digital': 'Abu Dhabi Government Digital Strategy',
  '576610000': 'Government of the Future Strategy',
  '576610001': 'DGE Corporate Strategy',
  '576610002': 'Abu Dhabi Government Digital Strategy',
}

const LEAD_LABELS: Record<string, string> = {
  'abdul-hanan': 'Abdul Hanan',
  'hassan-naeem': 'Hassan Naeem',
}

const CORPORATE_STRATEGY_PILLAR_OPTIONS = [
  { label: 'Cognitive Government', value: 'cognitive-government' },
  { label: 'Resource Optimization', value: 'resource-optimization' },
] as const

const DIGITAL_STRATEGY_PILLAR_OPTIONS = [
  { label: 'Operating Model', value: 'operating-model' },
  { label: 'Artificial Intelligence', value: 'artificial-intelligence' },
  { label: 'Cloud & Infrastructure', value: 'cloud-infrastructure' },
  { label: 'Data & Analytics', value: 'data-analytics' },
  { label: 'Cybersecurity & InfoSec', value: 'cybersecurity-infosec' },
  { label: 'Common Digital Platforms', value: 'common-digital-platforms' },
] as const

const OPERATING_MODEL_OBJECTIVE_OPTIONS = [
  { label: 'Strengthen Governance & Operations Frameworks', value: 'governance-operations-frameworks' },
  { label: 'Maximize Cloud Investment', value: 'maximize-cloud-investment' },
  { label: 'Develop & Consolidate Data Center', value: 'develop-consolidate-data-center' },
  { label: 'Establish Robust Governance', value: 'establish-robust-governance' },
  { label: 'Foster Advanced Skillsets and Security Capabilities', value: 'advanced-skillsets-security-capabilities' },
  { label: 'Drive Adoption', value: 'drive-adoption' },
] as const

const OPERATING_MODEL_KPI_OPTIONS = [
  { label: 'Project Delivery On-Time Rate', value: 'project-delivery-on-time-rate' },
  { label: 'Data Quality Score', value: 'data-quality-score' },
  { label: 'Policy Compliance Rate', value: 'policy-compliance-rate' },
  { label: 'Threats Detected by SOC (vs other sources)', value: 'threats-detected-by-soc' },
  { label: 'Annual Employee Time Saved', value: 'annual-employee-time-saved' },
  { label: 'Digital Maturity Index Score', value: 'digital-maturity-index-score' },
  { label: 'Data Barometer Score', value: 'data-barometer-score' },
] as const

const BUDGET_SOURCE_OPTIONS = [
  { label: 'Strategic Budget', value: '1' },
  { label: 'Operational Budget', value: '2' },
] as const

const BUDGET_TYPE_OPTIONS = [
  { label: 'Chapter 1 - HR', value: '1' },
  { label: 'Chapter 2 - Opex', value: '2' },
  { label: 'Chapter 3 - Capex', value: '3' },
] as const

const MONTH_LABELS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const

const QUARTERS = [
  { label: 'Q1', range: 'January to March', start: 0, current: false },
  { label: 'Q2', range: 'April to June', start: 3, current: false },
  { label: 'Q3', range: 'July to September', start: 6, current: true },
  { label: 'Q4', range: 'October to December', start: 9, current: false },
] as const

const EMPTY_MILESTONE_FORM: ExecutionMilestoneForm = {
  name: '',
  plannedStartDate: '',
  plannedEndDate: '',
  quarter: '',
  budget: '0',
  weightage: '',
  marhalaAlMashroua: '',
  makhrajAlMarhala: '',
  description: '',
}

const RELATED_ACTIVITY_PARENT_LOOKUPS = [
  'dga_aop_project_dga_aop_projects',
  'dga_aop_projects_dga_aop_projects',
  'dga_AOPProject',
  'dga_aop_project',
] as const
const RELATED_ACTIVITY_PARENT_VALUE_FIELDS = [
  '_dga_aop_project_value',
  '_dga_aop_project_parent_value',
  '_dga_aop_project_parentid_value',
  '_dga_parent_aop_project_value',
  '_dga_parent_project_value',
] as const

function getRelatedActivityParentId(record: Record<string, unknown>) {
  for (const field of RELATED_ACTIVITY_PARENT_VALUE_FIELDS) {
    const value = record[field]
    if (value) return normalizeId(String(value))
  }

  return ''
}

function projectToRelatedActivity(record: Dga_aop_projectses, currentProjectId: string): RelatedActivity | null {
  if (!record.dga_aop_projectsid) return null

  const recordObject = record as unknown as Record<string, unknown>
  const id = normalizeId(record.dga_aop_projectsid)
  const parentId = getRelatedActivityParentId(recordObject)
  const currentId = normalizeId(currentProjectId)
  const alreadySelected = Boolean(parentId && parentId === currentId)
  const alreadyLinked = Boolean(parentId && parentId !== currentId)
  const selectionStatus = alreadySelected ? 'already-selected' : alreadyLinked ? 'already-linked' : 'available'

  return {
    alreadyLinked,
    alreadySelected,
    approvalStatus: AOP_APPROVAL_STATUS_LABELS[Number(record.statuscode ?? 1)] ?? 'Draft',
    id,
    isDisabled: alreadyLinked,
    name: record.dga_name ?? record.dga_project_name ?? 'Untitled Activity',
    parentId,
    plannedEndDate: formatDateLabel(record.dga_planned_end_date),
    plannedStartDate: formatDateLabel(record.dga_planned_start_date),
    selectionStatus,
    totalAllocatedBudget: Number(record.dga_allocated_budget ?? 0),
    totalPlannedBudget: Number(record.dga_total_project_budget ?? record.dga_requested_budget ?? 0),
    type: generatedChoiceLabel(Dga_aop_projectsesdga_project_type, record.dga_project_type) || 'Project',
  }
}

const KPI_TYPE_SELECT_OPTIONS = [
  { label: 'Select KPI Type', value: '' },
  { label: 'Special Reports', value: 'special-reports' },
  { label: 'Aspirations', value: 'aspirations' },
  { label: 'Foundational Strategies', value: 'foundational-strategies' },
  { label: 'Annual Plans', value: 'annual-plans' },
  { label: 'Special Strategies', value: 'special-strategies' },
  { label: 'Common', value: 'common' },
] as const

const KPI_UNIT_SELECT_OPTIONS = [
  { label: 'Select Unit', value: '' },
  { label: '#', value: 'number' },
  { label: '%', value: 'percent' },
  { label: 'Rate', value: 'rate' },
  { label: 'AED', value: 'aed' },
] as const

const KPI_DIRECTORATE_OPTIONS = [
  { label: 'Gov Digital', value: 'gov-digital' },
  { label: 'Gov Talent', value: 'gov-talent' },
  { label: 'Gov Academy', value: 'gov-academy' },
  { label: 'Gov Procurement', value: 'gov-procurement' },
  { label: 'TAMM', value: 'tamm' },
  { label: 'CX', value: 'cx' },
] as const

const KPI_POLARITY_OPTIONS = [
  { label: 'Ascending', value: 'ascending' },
  { label: 'Descending', value: 'descending' },
  { label: 'Closer to Target', value: 'closer-to-target' },
] as const

const KPI_AVAILABILITY_OPTIONS = [
  { label: 'New', value: 'new' },
  { label: 'Currently Measured', value: 'currently-measured' },
] as const

const KPI_MEASUREMENT_OPTIONS = [
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Semi-Annually', value: 'semi-annually' },
  { label: 'Annually', value: 'annually' },
] as const

const KPI_TARGET_YEARS = ['2031', '2032', '2033'] as const
const KPI_HISTORICAL_YEARS = ['2028', '2029', '2030'] as const

const AOP_APPROVAL_STATUS_LABELS: Record<number, string> = {
  1: 'Draft',
  576610001: 'Submitted to ADEO',
  776140001: 'Submitted to Division Director',
  776140003: 'Approved By Division Director',
  776140004: 'Approved By Strategy Team',
  776140002: 'Approved By Executive Director',
  776140014: 'Approved By Director General',
  776140011: 'Active',
  776140012: 'Clarification Needed',
  2: 'Inactive',
}

const AOP_ACTIVITY_STATUS_LABELS: Record<number, string> = {
  776140014: 'Draft',
  776140007: 'Not Started',
  776140006: 'In Progress - On Track',
  776140005: 'In Progress - Delayed',
  776140009: 'On Hold',
  776140010: 'Cancelled',
  776140013: 'Completed',
  776140015: 'Submitted for Approval',
}

const AOP_PHASE_LABELS: Record<number, string> = {
  776140000: 'Planning',
  776140001: 'Execution',
}

type ExecutionWorkflowStep = {
  actionLabel: string
  allowedRoles?: string[]
  requiredRole: string
  successMessage: string
  targetRoleName: string
  targetStatus: Dga_aop_projectsesBase['statuscode'] | 576610001
  targetTeamResolver: 'division-member' | 'division-director' | 'strategy-team' | 'executive-director' | 'director-general' | 'adeo' | 'adeo-team'
  targetActivityStatus?: Dga_aop_projectsesBase['dga_project_activity_status']
  targetPhase?: Dga_aop_projectsesBase['dga_project_phase']
}

const EMPTY_EXECUTION_KPI_FORM: ExecutionKpiForm = {
  arabicCalculationMethod: '',
  arabicDescription: '',
  arabicName: '',
  benchmark: '',
  benchmarkable: '',
  calculationMethod: '',
  description: '',
  directorate: 'gov-digital',
  expectedImpact: '',
  kpiName: '',
  kpiType: '',
  kpiUnit: '',
  periodicMeasurement: 'quarterly',
  polarity: 'ascending',
  sourceOfData: '',
}

const KPI_DIRECTORATE_VALUE_BY_FORM: Record<string, Dga_aop_kpisBase['dga_directorate']> = {
  'gov-digital': 1,
  'gov-talent': 2,
  'gov-academy': 3,
  'gov-procurement': 4,
  tamm: 5,
  cx: 6,
}

const KPI_TYPE_VALUE_BY_FORM: Record<string, Dga_aop_kpisBase['dga_kpi_type']> = {
  'special-reports': 1,
  aspirations: 2,
  'foundational-strategies': 3,
  'annual-plans': 4,
  'annual-plan': 4,
  'special-strategies': 5,
  common: 6,
}

const KPI_MEASUREMENT_VALUE_BY_FORM: Record<string, Dga_aop_kpisBase['dga_periodic_measurement']> = {
  quarterly: 1,
  'semi-annually': 2,
  annually: 3,
}

const KPI_POLARITY_VALUE_BY_FORM: Record<string, Dga_aop_kpisBase['dga_polarity']> = {
  ascending: 1,
  descending: 2,
  'closer-to-target': 3,
}

const KPI_UNIT_VALUE_BY_FORM: Record<string, Dga_aop_kpisBase['dga_unit']> = {
  number: 1,
  percent: 2,
  '%': 2,
  rate: 3,
  aed: 4,
}

function formValueFromDataverseValue<T extends number>(
  options: Record<string, T | undefined>,
  value: T | number | string | undefined | null,
  fallback = '',
) {
  if (value === undefined || value === null || value === '') return fallback
  const match = Object.entries(options).find(([, optionValue]) => Number(optionValue) === Number(value))
  return match?.[0] ?? fallback
}

function readDraft(): ExecutionPlanDraft {
  try {
    const rawDraft = window.sessionStorage.getItem(EXECUTION_PLAN_DRAFT_STORAGE_KEY)
    return rawDraft ? JSON.parse(rawDraft) as ExecutionPlanDraft : {}
  } catch {
    return {}
  }
}

function getResultValue<T>(result: unknown): T | undefined {
  const shaped = result as { data?: T; value?: T; result?: T; record?: T }

  return shaped.data ?? shaped.value ?? shaped.result ?? shaped.record
}

function getResultArray<T>(result: unknown): T[] {
  const shaped = result as { data?: T[]; value?: T[]; result?: T[]; records?: T[] }
  return shaped.data ?? shaped.value ?? shaped.result ?? shaped.records ?? []
}

function normalizeDataverseErrorMessage(message: string, fallbackMessage: string) {
  const source = message || fallbackMessage
  let parsedMessage = source

  try {
    const parsed = JSON.parse(source) as { error?: { message?: string } }
    parsedMessage = parsed.error?.message || source
  } catch {
    parsedMessage = source
  }

  if (parsedMessage.includes('prvReadSharePointDocumentLocation')) {
    return [
      'Dataverse security permission is missing for the target owner team.',
      'Ask the Dataverse/Power Platform admin to add Read privilege for Document Location (sharepointdocumentlocation) to the security role assigned to the Division Director team.',
      'After that privilege is added, Submit to Division Director will work.',
    ].join(' ')
  }

  return parsedMessage || fallbackMessage
}

function assertOperationSuccess(result: unknown, fallbackMessage: string) {
  if ((result as { success?: boolean })?.success === false) {
    const error = (result as { error?: { message?: string } | string })?.error
    const message = typeof error === 'string' ? error : error?.message
    throw new Error(normalizeDataverseErrorMessage(message || '', fallbackMessage))
  }
}

function normalizeId(id?: string | null) {
  return (id ?? '').replace(/[{}]/g, '').toLowerCase()
}

function toEntityBind(entitySetName: string, id: string) {
  return `/${entitySetName}(${normalizeId(id)})`
}

async function updateRelatedActivityParentLookup(
  activityId: string,
  projectId: string | null,
  fallbackMessage: string,
) {
  let lastError: unknown = null

  for (const lookupName of RELATED_ACTIVITY_PARENT_LOOKUPS) {
    try {
      const result = await Dga_aop_projectsesService.update(activityId, {
        [`${lookupName}@odata.bind`]: projectId ? toEntityBind('dga_aop_projectses', projectId) : null,
      } as unknown as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>)
      assertOperationSuccess(result, fallbackMessage)
      return
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error ? lastError : new Error(fallbackMessage)
}

function escapeODataValue(value: string) {
  return value.replace(/'/g, "''")
}

function getMonthIndex(monthName?: string | null) {
  const month = String(monthName ?? '').trim().toLowerCase()
  return MONTH_LABELS.findIndex((label) => label.toLowerCase() === month)
}

function isFutureMonth(monthName?: string | null) {
  const monthIndex = getMonthIndex(monthName)
  if (monthIndex < 0) return false
  return monthIndex > new Date().getMonth()
}

function formatBudgetZeroError(monthNames: string[]) {
  return [
    'The following months have zero actual budget but are not marked as "Zero":',
    ...monthNames.map((month) => `- ${month}`),
    '',
    'Please either update the actual budget amount or set the "Zero" toggle to "Yes" for these months before submitting.',
  ].join('\n')
}

function toDateOnly(value?: string | null) {
  return value?.split('T')[0] ?? ''
}

function optionLabel<T extends Record<number, string>>(options: T, value?: number | string | null) {
  if (value === undefined || value === null || value === '') return ''
  return options[Number(value) as keyof T] ?? ''
}

function getExecutionPlanWorkflowStep(statusCode: number, phaseCode: number): ExecutionWorkflowStep | null {
  const isExecutionPhase = phaseCode === 776140001

  if (statusCode === 1 || statusCode === 776140012) {
    return {
      actionLabel: 'Submit to Division Director',
      requiredRole: 'AOP - Division Member',
      successMessage: 'Execution Plan submitted to Division Director successfully.',
      targetRoleName: 'AOP - Division Director',
      targetStatus: 776140001,
      targetTeamResolver: 'division-director',
      targetActivityStatus: 776140015,
    }
  }

  if (statusCode === 776140001) {
    return {
      actionLabel: 'Submit to Strategy Team',
      requiredRole: 'AOP - Division Director',
      successMessage: 'Execution Plan submitted to Strategy Team successfully.',
      targetRoleName: 'AOP - Strategy Team',
      targetStatus: 776140003,
      targetTeamResolver: 'strategy-team',
    }
  }

  if (statusCode === 776140003 || statusCode === 776140004) {
    if (statusCode === 776140004) {
      return isExecutionPhase
        ? {
            actionLabel: 'Submit to ADEO Team',
            requiredRole: 'AOP - Executive Director',
            successMessage: 'Execution Plan submitted to ADEO Team successfully.',
            targetRoleName: 'AOP - ADEO Team',
            targetStatus: 576610001,
            targetTeamResolver: 'adeo-team',
          }
        : {
            actionLabel: 'Submit to Director General',
            requiredRole: 'AOP - Executive Director',
            successMessage: 'Execution Plan submitted to Director General successfully.',
            targetRoleName: 'AOP - Director General',
            targetStatus: 776140002,
            targetTeamResolver: 'director-general',
          }
    }

    return {
      actionLabel: 'Submit to Executive Director',
      requiredRole: 'AOP - Strategy Team',
      successMessage: 'Execution Plan submitted to Executive Director successfully.',
      targetRoleName: 'AOP - Executive Director',
      targetStatus: 776140004,
      targetTeamResolver: 'executive-director',
    }
  }

  if ((statusCode === 776140002 || statusCode === 776140014) && !isExecutionPhase) {
    return {
      actionLabel: 'Submit to ADEO Team',
      requiredRole: 'AOP - Director General',
      successMessage: 'Execution Plan submitted to ADEO Team successfully.',
      targetRoleName: 'AOP - ADEO Team',
      targetStatus: 576610001,
      targetTeamResolver: 'adeo-team',
      targetActivityStatus: 776140007,
    }
  }

  if (statusCode === 576610001 && !isExecutionPhase) {
    return {
      actionLabel: 'Approve & Start Execution',
      allowedRoles: ['AOP - ADEO', 'AOP - ADEO Team'],
      requiredRole: 'AOP - ADEO Team',
      successMessage: 'Execution Plan approved by ADEO Team and moved to Execution successfully.',
      targetRoleName: 'AOP - Division Member',
      targetStatus: 776140011,
      targetTeamResolver: 'division-member',
      targetActivityStatus: 776140007,
      targetPhase: 776140001,
    }
  }

  if (statusCode === 576610001 && isExecutionPhase) {
    return {
      actionLabel: 'Approve & Return to Division Member',
      allowedRoles: ['AOP - ADEO', 'AOP - ADEO Team'],
      requiredRole: 'AOP - ADEO Team',
      successMessage: 'Execution Plan approved by ADEO Team and returned to Division Member successfully.',
      targetRoleName: 'AOP - Division Member',
      targetStatus: 776140011,
      targetTeamResolver: 'division-member',
    }
  }

  return null
}

function kpiRecordToLinkedKpi(record: Dga_aop_kpis): LinkedKpi | null {
  const id = normalizeId(record.dga_aop_kpiid)
  if (!id) return null

  return {
    id,
    name: record.dga_kpi_name || 'Untitled KPI',
    description: record.dga_kpi_description || '-',
    type: optionLabel({ 1: 'Special Reports', 2: 'Aspirations', 3: 'Foundational Strategies', 4: 'Annual Plans', 5: 'Special Strategies', 6: 'Common' }, record.dga_kpi_type) || '-',
    periodicMeasurement: optionLabel({ 1: 'Quarterly', 2: 'Semi-Annually', 3: 'Annually' }, record.dga_periodic_measurement) || '-',
    unit: optionLabel({ 1: '#', 2: '%', 3: 'Rate', 4: 'AED' }, record.dga_unit) || '-',
    polarity: optionLabel({ 1: 'Ascending', 2: 'Descending', 3: 'Closer to Target' }, record.dga_polarity) || '-',
    availability: optionLabel({ 1: 'New', 2: 'Currently Measured' }, record.dga_kpi_availability) || 'New',
    phase: optionLabel({ 0: 'Planning', 1: 'Execution' }, record.dga_kpi_phase) || 'Planning',
    approvalStatus: optionLabel({ 1: 'Active', 2: 'Inactive' }, record.statuscode) || 'Draft',
    pendingWith: 'Division Member',
    alreadyLinked: true,
  }
}

function kpiRecordToExecutionKpiForm(record: Dga_aop_kpis): ExecutionKpiForm {
  return {
    ...EMPTY_EXECUTION_KPI_FORM,
    arabicCalculationMethod: record.dga_calculation_method_arabic ?? '',
    arabicDescription: record.dga_kpi_description_arabic ?? '',
    arabicName: record.dga_kpi_name_arabic ?? '',
    benchmark: record.dga_benchmark ?? '',
    benchmarkable: record.dga_kpi_benchmarkable ?? '',
    calculationMethod: record.dga_calculation_method ?? '',
    description: record.dga_kpi_description ?? '',
    directorate: formValueFromDataverseValue(KPI_DIRECTORATE_VALUE_BY_FORM, record.dga_directorate, 'gov-digital'),
    expectedImpact: record.dga_expected_impact ?? '',
    kpiName: record.dga_kpi_name ?? '',
    kpiType: formValueFromDataverseValue(KPI_TYPE_VALUE_BY_FORM, record.dga_kpi_type),
    kpiUnit: formValueFromDataverseValue(KPI_UNIT_VALUE_BY_FORM, record.dga_unit),
    periodicMeasurement: formValueFromDataverseValue(KPI_MEASUREMENT_VALUE_BY_FORM, record.dga_periodic_measurement, 'quarterly'),
    polarity: formValueFromDataverseValue(KPI_POLARITY_VALUE_BY_FORM, record.dga_polarity, 'ascending'),
    sourceOfData: record.dga_source_of_data ?? '',
  }
}

function executionKpiFormToLinkedKpi(form: ExecutionKpiForm, id: string): LinkedKpi {
  return {
    id,
    name: form.kpiName.trim() || 'Untitled KPI',
    description: form.description.trim() || '-',
    type: getOptionLabel(KPI_TYPE_SELECT_OPTIONS, form.kpiType) || '-',
    periodicMeasurement: getOptionLabel(KPI_MEASUREMENT_OPTIONS, form.periodicMeasurement) || '-',
    unit: getOptionLabel(KPI_UNIT_SELECT_OPTIONS, form.kpiUnit) || '-',
    polarity: getOptionLabel(KPI_POLARITY_OPTIONS, form.polarity) || '-',
    availability: 'New',
    phase: 'Planning',
    approvalStatus: 'Active',
    pendingWith: 'Division Member',
    alreadyLinked: true,
  }
}

function parseExecutionRelatedChanges(value?: string | null) {
  if (!value?.trim()) return {}

  try {
    const parsed = JSON.parse(value) as unknown
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    return {}
  }
}

function getRelatedChangeBucket(changes: ProjectRelatedChanges, bucketName: 'activity_change' | 'execution_change') {
  const bucket = changes[bucketName]
  return isPlainObject(bucket) && !isRelatedChange(bucket) ? bucket as ProjectRelatedChanges : {}
}

function stringifyMergedChangeBucket(
  existingValue: string | null | undefined,
  bucketName: 'activity_change' | 'execution_change',
  changes: ProjectRelatedChanges,
) {
  const existingChanges = parseProjectRelatedChanges(existingValue)
  const existingBucket = getRelatedChangeBucket(existingChanges, bucketName)
  return JSON.stringify({
    ...existingChanges,
    [bucketName]: mergeProjectRelatedChanges(existingBucket, changes),
  })
}

function createTrackedChange(previousValue: unknown, nextValue: unknown, existingChange?: ProjectRelatedChange): ProjectRelatedChange {
  return {
    old_value: existingChange && 'old_value' in existingChange ? existingChange.old_value : previousValue ?? '',
    new_value: nextValue ?? '',
    ...(existingChange?.planned_value !== undefined ? { planned_value: existingChange.planned_value } : {}),
  }
}

function getNestedRelatedChange(
  existingValue: string | null | undefined,
  bucketName: 'activity_change' | 'execution_change',
  path: string[],
): ProjectRelatedChange | undefined {
  let current: unknown = getRelatedChangeBucket(parseProjectRelatedChanges(existingValue), bucketName)

  for (const segment of path) {
    if (!isPlainObject(current)) return undefined
    current = (current as ProjectRelatedChanges)[segment]
  }

  return isRelatedChange(current) ? current : undefined
}

type DisplayTrackedChange = {
  fieldName: string
  groupLabel: string
  newValue: unknown
  oldValue: unknown
  title: string
}

const EXECUTION_CHANGE_FIELD_LABELS: Record<string, string> = {
  dga_actual_budget: 'Actual Spending',
  dga_delivered_amount: 'Delivered Values',
  dga_description_summary: 'Summary',
  dga_justification_for_activity_status: 'Activity Status Justification',
  dga_name: 'Activity / Initiative Name',
  dga_planned_end_date: 'Planned End Date',
  dga_planned_start_date: 'Planned Start Date',
  dga_project_activity_status: 'Project Activity Status',
  dga_project_kpi: 'Activity KPI',
  dga_project_name: 'Arabic Name',
  dga_project_plan_if_any: 'Activity Plan',
  dga_risks: 'Risks',
  dga_scope: 'Scope',
  dga_stakeholders: 'Stakeholders',
}

function formatChangeFieldLabel(fieldName: string) {
  return EXECUTION_CHANGE_FIELD_LABELS[fieldName] ?? formatGeneratedChoiceLabel(fieldName.replace(/^dga_/, ''))
}

function collectDirectTrackedChanges(source: unknown, groupLabel: string, title: string): DisplayTrackedChange[] {
  if (!isPlainObject(source)) return []
  const changes: DisplayTrackedChange[] = []

  for (const [fieldName, value] of Object.entries(source)) {
    if (!isRelatedChange(value)) continue
    if (String(value.old_value ?? '') === String(value.new_value ?? '')) continue

    changes.push({
      fieldName,
      groupLabel,
      newValue: value.new_value,
      oldValue: value.old_value,
      title,
    })
  }

  return changes
}

function collectRecordTrackedChanges(source: unknown, groupLabel: string, fallbackTitle: string): DisplayTrackedChange[] {
  if (!Array.isArray(source)) return []
  const changes: DisplayTrackedChange[] = []

  for (const record of source) {
    if (!isPlainObject(record)) continue
    const title = String(record.month_name ?? record.name ?? fallbackTitle)
    changes.push(...collectDirectTrackedChanges(record, groupLabel, title))
  }

  return changes
}

function getExecutionDetailState(project?: Dga_aop_projectses | null) {
  const related = parseExecutionRelatedChanges(project?.dga_project_related_changes)
  const detail = related.executionPlanDetail

  return detail && typeof detail === 'object' && !Array.isArray(detail)
    ? detail as Record<string, unknown>
    : {}
}

function mapProjectToDraft(
  project: Dga_aop_projectses,
  fallback: ExecutionPlanDraft,
  hierarchyNameById: Record<string, string> = {},
  activityLeadName = '',
): ExecutionPlanDraft {
  const isProgram = Number(project.dga_activity_type) === 4 || Number(project.dga_project_type) === 3
  const strategies = Array.isArray(project.dga_project_categorized_under)
    ? project.dga_project_categorized_under.map(String)
    : String(project.dga_project_categorized_under ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

  return {
    ...fallback,
    executionPlanType: isProgram ? 'program' : 'project',
    activityName: project.dga_name ?? fallback.activityName,
    arabicName: project.dga_project_name ?? fallback.arabicName,
    activityLeadId: project._dga_activity_lead_value ?? fallback.activityLeadId,
    activityLeadName: activityLeadName || fallback.activityLeadName,
    plannedStartDate: toDateOnly(project.dga_planned_start_date) || fallback.plannedStartDate,
    plannedEndDate: toDateOnly(project.dga_planned_end_date) || fallback.plannedEndDate,
    scope: project.dga_scope ?? fallback.scope,
    summary: project.dga_description_summary ?? fallback.summary,
    longTermImpact: project.dga_longtermimpactprojectlongtermimpact ?? fallback.longTermImpact,
    overallLongTermImpact: project.dga_project_long_term_impact ?? fallback.overallLongTermImpact,
    stakeholder: project.dga_stakeholders ?? fallback.stakeholder,
    activityKpi: project.dga_project_kpi ?? fallback.activityKpi,
    activityPlan: project.dga_project_plan_if_any ?? fallback.activityPlan,
    risks: project.dga_risks ?? fallback.risks,
    strategies: strategies.length > 0 ? strategies : fallback.strategies,
    sectorName: hierarchyNameById[normalizeId(project._dga_sector_value)] ?? fallback.sectorName,
    divisionName: hierarchyNameById[normalizeId(project._dga_department_value)] ?? fallback.divisionName,
  }
}

function toDisplayValue(value: string | undefined, fallback = 'Not added yet') {
  return value?.trim() || fallback
}

function formatOptionValue(value: string | undefined, fallback = 'Not selected') {
  if (!value) {
    return fallback
  }

  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

function getOptionLabel(options: readonly { label: string, value: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? ''
}

function formatGeneratedChoiceLabel(value?: string) {
  if (!value) return ''
  return value
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

function generatedChoiceLabel<T extends Record<number, string>>(options: T, value?: number | string | null) {
  if (value === undefined || value === null || value === '') return ''
  return formatGeneratedChoiceLabel(String(options[Number(value) as keyof T] ?? ''))
}

function yesNoLabel(value?: boolean | number | string | null) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Number(value) === 1) return 'Yes'
  if (Number(value) === 0) return 'No'
  return String(value)
}

function dependencyRecordToRow(record: Dga_dependencies): ExecutionDependencyRow | null {
  if (!record.dga_dependencyid) return null

  return {
    applicable: generatedChoiceLabel(Dga_dependenciesdga_please_check_where_applicable, record.dga_please_check_where_applicable),
    dateOfSupport: record.dga_date_of_support ?? '',
    entityName: record.dga_name_of_external_entity ?? record.dga_name ?? '',
    id: record.dga_dependencyid,
    typeOfSupport: record.dga_type_of_support ?? '',
  }
}

function parseCurrencyDraft(value: string) {
  const numericValue = Number(value.replace(/,/g, ''))
  return Number.isFinite(numericValue) ? numericValue : 0
}

function normalizeCurrencyDraft(value: string) {
  const cleanValue = value.replace(/[^\d.]/g, '')
  const [whole = '', ...decimalParts] = cleanValue.split('.')
  const trimmedWhole = whole.replace(/^0+(?=\d)/, '')
  const normalizedWhole = trimmedWhole || '0'

  if (decimalParts.length === 0) {
    return normalizedWhole
  }

  return `${normalizedWhole}.${decimalParts.join('').slice(0, 2)}`
}

function numberToCurrencyDraft(value?: number | null) {
  return value == null || !Number.isFinite(value) ? '0' : String(value)
}

function getQuarterFromDate(value: string) {
  if (!value) return ''
  const month = new Date(value).getMonth()
  if (Number.isNaN(month)) return ''
  if (month <= 2) return 'Quarter 1'
  if (month <= 5) return 'Quarter 2'
  if (month <= 8) return 'Quarter 3'
  return 'Quarter 4'
}

function milestoneToExecutionMilestone(record: Dga_aop_project_milestone_detailses): ExecutionMilestone | null {
  if (!record.dga_aop_project_milestone_detailsid) return null
  const plannedEndDate = toDateOnly(record.dga_planned_end_date)

  return {
    id: record.dga_aop_project_milestone_detailsid,
    name: record.dga_name ?? '',
    plannedStartDate: toDateOnly(record.dga_planned_start_date),
    plannedEndDate,
    quarter: getQuarterFromDate(plannedEndDate),
    budget: '0',
    actualProgress: record.dga_actual_progress,
    weightage: record.dga_weightage != null ? String(record.dga_weightage) : '',
    marhalaAlMashroua: '',
    makhrajAlMarhala: record.dga_milestone_description ?? '',
    statuscode: record.statuscode,
    description: record.dga_description ?? '',
  }
}

function buildMilestonePayload(
  milestone: ExecutionMilestone,
  projectId: string,
): Omit<Dga_aop_project_milestone_detailsesBase, 'dga_aop_project_milestone_detailsid'> {
  return {
    'dga_aop_project@odata.bind': toEntityBind('dga_aop_projectses', projectId),
    dga_description: milestone.description,
    dga_justification: '',
    dga_milestone_description: milestone.makhrajAlMarhala || milestone.description,
    dga_name: milestone.name.trim() || 'Untitled Milestone',
    dga_planned_end_date: milestone.plannedEndDate,
    dga_planned_progress: 0,
    dga_planned_start_date: milestone.plannedStartDate,
    dga_start_date: milestone.plannedStartDate,
    dga_weightage: Number(milestone.weightage || 0),
    statecode: 0,
    statuscode: 1,
  }
}

function validateExecutionKpiForm(form: ExecutionKpiForm) {
  const errors: ExecutionKpiFormErrors = {}
  if (!form.kpiName.trim()) errors.kpiName = 'KPI name is required'
  if (!form.description.trim()) errors.description = 'KPI description is required'
  if (!form.calculationMethod.trim()) errors.calculationMethod = 'Calculation method is required'
  if (!form.sourceOfData.trim()) errors.sourceOfData = 'Source of data is required'
  if (!form.expectedImpact.trim()) errors.expectedImpact = 'Expected impact is required'
  if (!form.directorate) errors.directorate = 'Directorate is required'
  if (!form.kpiType) errors.kpiType = 'KPI type is required'
  if (!form.kpiUnit) errors.kpiUnit = 'Unit is required'
  if (!form.polarity) errors.polarity = 'Polarity is required'
  if (!form.periodicMeasurement) errors.periodicMeasurement = 'Periodic measurement is required'
  if (!form.benchmarkable.trim()) errors.benchmarkable = 'KPI benchmarkable is required'
  return errors
}

function validateExecutionPlanDetailFields(values: {
  allocatedBudget: string
  budgetSource: string
  budgetType: string
  corporateStrategyPillar: string
  digitalStrategyObjective: string
  digitalStrategyPillar: string
  draft: ExecutionPlanDraft
  monthlyBudgets: string[]
  strategicKpis: string[]
}) {
  const errors: ExecutionPlanDetailErrors = {}
  const {
    allocatedBudget,
    budgetSource,
    budgetType,
    corporateStrategyPillar,
    digitalStrategyObjective,
    digitalStrategyPillar,
    draft,
    monthlyBudgets,
    strategicKpis,
  } = values

  if (!draft.executionPlanType) errors.executionPlanType = 'Select the Execution Plan Type.'
  if (!draft.activityName?.trim()) errors.activityName = 'Enter Activity / Initiative Name.'
  if (!draft.arabicName?.trim()) errors.arabicName = 'Enter Arabic Name.'
  if (!draft.scope?.trim()) errors.scope = 'Enter Scope.'
  if (!draft.summary?.trim()) errors.summary = 'Enter Summary.'
  if (!draft.arabicSummary?.trim()) errors.arabicSummary = 'Enter Arabic Summary.'
  if (!draft.plannedStartDate) errors.plannedStartDate = 'Select Planned Start Date.'
  if (!draft.plannedEndDate) errors.plannedEndDate = 'Select Planned End Date.'
  if (draft.plannedStartDate && draft.plannedEndDate && new Date(draft.plannedEndDate) < new Date(draft.plannedStartDate)) {
    errors.plannedEndDate = 'Planned End Date must be on or after Planned Start Date.'
  }
  if (!draft.longTermImpact?.trim()) errors.longTermImpact = 'Enter Long Term Impact.'
  if (!draft.overallLongTermImpact?.trim()) errors.overallLongTermImpact = 'Enter Overall Long Term Impact.'
  if (!draft.stakeholder?.trim()) errors.stakeholder = 'Enter Stakeholder.'
  if (!draft.activityKpi?.trim()) errors.activityKpi = 'Enter Activity KPI.'
  if (!draft.risks?.trim()) errors.risks = 'Enter Risks.'

  if (!corporateStrategyPillar) errors.corporateStrategyPillar = 'Select the DGE Corporate Strategy Pillar.'
  if (!digitalStrategyPillar) errors.digitalStrategyPillar = 'Select the Digital Strategy Pillar.'
  if (digitalStrategyPillar === 'operating-model' && !digitalStrategyObjective) {
    errors.digitalStrategyObjective = 'Select a Digital Strategy objective.'
  }
  if (digitalStrategyPillar === 'operating-model' && strategicKpis.length === 0) {
    errors.strategicKpis = 'Select at least one strategic KPI.'
  }

  if (!budgetSource) errors.budgetSource = 'Select Budget Source.'
  if (!budgetType) errors.budgetType = 'Select Budget Type.'
  if (!allocatedBudget || parseCurrencyDraft(allocatedBudget) < 0) errors.allocatedBudget = 'Enter a valid Allocated Budget.'
  if (monthlyBudgets.some((value) => !Number.isFinite(parseCurrencyDraft(value)) || parseCurrencyDraft(value) < 0)) {
    errors.monthlyBudgets = 'Monthly budgets must be valid non-negative amounts.'
  }

  return errors
}

function validateExecutionMilestoneForm(form: ExecutionMilestoneForm) {
  const errors: ExecutionMilestoneFormErrors = {}

  if (!form.name.trim()) errors.name = 'Enter milestone name.'
  if (!form.plannedStartDate) errors.plannedStartDate = 'Select Planned Start Date.'
  if (!form.plannedEndDate) errors.plannedEndDate = 'Select Planned End Date.'
  if (form.plannedStartDate && form.plannedEndDate && new Date(form.plannedEndDate) < new Date(form.plannedStartDate)) {
    errors.plannedEndDate = 'Planned End Date must be on or after Planned Start Date.'
  }

  return errors
}

function scrollToFirstExecutionPlanError() {
  window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      const root = document.querySelector<HTMLElement>('.execution-plan-detail')
      const invalidElement = root?.querySelector<HTMLElement>('[aria-invalid="true"], .radio-group--invalid, .checkbox-group--invalid, .field__error')
      const target = invalidElement?.closest<HTMLElement>('.field, .date-picker, .radio-group, .checkbox-group, .currency-input') ?? invalidElement

      if (!target) return

      target.scrollIntoView({ behavior: 'smooth', block: 'center' })

      const focusTarget = target.matches('input, textarea, button, [tabindex]:not([tabindex="-1"])')
        ? target
        : target.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"])')

      focusTarget?.focus({ preventScroll: true })
    })
  }, 0)
}

function buildExecutionKpiPayload(
  form: ExecutionKpiForm,
  projectId?: string,
  project?: Dga_aop_projectses | null,
): Omit<Dga_aop_kpisBase, 'dga_aop_kpiid'> {
  const payload: Omit<Dga_aop_kpisBase, 'dga_aop_kpiid'> = {
    dga_calculation_method: form.calculationMethod.trim(),
    dga_calculation_method_arabic: form.arabicCalculationMethod.trim(),
    dga_directorate: KPI_DIRECTORATE_VALUE_BY_FORM[form.directorate],
    dga_expected_impact: form.expectedImpact.trim(),
    dga_kpi_availability: 1,
    dga_kpi_benchmarkable: form.benchmarkable.trim(),
    dga_kpi_description: form.description.trim(),
    dga_kpi_description_arabic: form.arabicDescription.trim(),
    dga_kpi_name: form.kpiName.trim(),
    dga_kpi_name_arabic: form.arabicName.trim(),
    dga_kpi_phase: 0,
    dga_kpi_type: KPI_TYPE_VALUE_BY_FORM[form.kpiType],
    dga_periodic_measurement: KPI_MEASUREMENT_VALUE_BY_FORM[form.periodicMeasurement],
    dga_polarity: KPI_POLARITY_VALUE_BY_FORM[form.polarity],
    dga_source_of_data: form.sourceOfData.trim(),
    dga_unit: KPI_UNIT_VALUE_BY_FORM[form.kpiUnit],
    statecode: 0,
    statuscode: 1,
  }

  if (form.benchmark.trim()) payload.dga_benchmark = form.benchmark.trim()
  if (projectId) payload['dga_strategic_projects@odata.bind'] = toEntityBind('dga_aop_projectses', projectId)
  if (project?._dga_sector_value) payload['dga_sector@odata.bind'] = toEntityBind('dga_divisional_hierarchies', project._dga_sector_value)
  if (project?._dga_department_value) payload['dga_division@odata.bind'] = toEntityBind('dga_divisional_hierarchies', project._dga_department_value)
  return payload
}

function formatDateLabel(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

type ReadOnlyDetailKind = 'default' | 'identity' | 'organization' | 'classification' | 'requirement' | 'date' | 'person' | 'narrative'

function renderReadOnlyDetails(items: Array<{
  label: string
  value?: string | null
  kind?: ReadOnlyDetailKind
  type?: 'long'
  columns?: 3 | 4 | 6 | 9 | 12
}>, columns: 2 | 3 = 2) {
  return (
    <dl className={`create-activity__readonly-grid create-activity__readonly-grid--${columns}`}>
      {items.map((item) => {
        const kind = item.kind ?? (item.type === 'long' ? 'narrative' : 'default')
        const columnClass = item.columns ? `create-activity__readonly-item--span-${item.columns}` : ''
        const wideClass = item.type === 'long' ? 'create-activity__readonly-item--wide' : ''

        return (
          <div className={`create-activity__readonly-item create-activity__readonly-item--${kind} ${wideClass} ${columnClass}`.trim()} key={item.label}>
            <div className="create-activity__readonly-item-content">
              <dt>{item.label}</dt>
              <dd>{toDisplayValue(item.value ?? undefined, '-')}</dd>
            </div>
          </div>
        )
      })}
    </dl>
  )
}

export function ExecutionPlanActivityDetail() {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedRole = useAppSelector((state) => state.app.selectedRole)
  const { currentRole, systemUser } = useAppSelector((state) => state.user)
  const projectId = useMemo(() => {
    const tail = location.pathname.split('/').filter(Boolean).pop()
    return tail && tail !== 'activity' ? normalizeId(tail) : ''
  }, [location.pathname])
  const [activeTab, setActiveTab] = useState<ExecutionPlanDetailTab>('activity-information')
  const [isEditing, setIsEditing] = useState(false)
  const [corporateStrategyPillar, setCorporateStrategyPillar] = useState('')
  const [digitalStrategyPillar, setDigitalStrategyPillar] = useState('')
  const [digitalStrategyObjective, setDigitalStrategyObjective] = useState('')
  const [strategicKpis, setStrategicKpis] = useState<string[]>([])
  const [budgetSource, setBudgetSource] = useState('')
  const [budgetType, setBudgetType] = useState('')
  const [allocatedBudget, setAllocatedBudget] = useState('0')
  const [monthlyBudgets, setMonthlyBudgets] = useState<string[]>(Array.from({ length: 12 }, () => '0'))
  const [milestones, setMilestones] = useState<ExecutionMilestone[]>([])
  const [deletedMilestoneIds, setDeletedMilestoneIds] = useState<string[]>([])
  const [project, setProject] = useState<Dga_aop_projectses | null>(null)
  const [draft, setDraft] = useState<ExecutionPlanDraft>(() => readDraft())
  const [savedRevision, setSavedRevision] = useState(0)
  const [budgetHeaderAction, setBudgetHeaderAction] = useState<BudgetHeaderAction | null>(null)
  const { confirmNavigation } = useNavigationGuard()
  const [isLoading, setIsLoading] = useState(Boolean(projectId))
  const executionAi = useExecutionAiSummary(projectId)
  const [isSaving, setIsSaving] = useState(false)
  const [isStartingActivity, setIsStartingActivity] = useState(false)
  const [isSubmittingActivityUpdates, setIsSubmittingActivityUpdates] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [saveMessage, setSaveMessage] = useState('')
  const [persistentError, setPersistentError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ExecutionPlanDetailErrors>({})
  const [isSubmittingWorkflow, setIsSubmittingWorkflow] = useState(false)
  const [isSubmitUpdatesConfirmOpen, setIsSubmitUpdatesConfirmOpen] = useState(false)
  const [isWorkflowConfirmOpen, setIsWorkflowConfirmOpen] = useState(false)
  const [ownerName, setOwnerName] = useState('')
  const [executionActivityStatus, setExecutionActivityStatus] = useState('776140006')
  const [executionStatusJustification, setExecutionStatusJustification] = useState('')
  const [executionStatusError, setExecutionStatusError] = useState('')
  const [areExecutionChangesExpanded, setAreExecutionChangesExpanded] = useState(true)
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false)
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null)
  const [milestoneForm, setMilestoneForm] = useState<ExecutionMilestoneForm>(EMPTY_MILESTONE_FORM)
  const [milestoneFormErrors, setMilestoneFormErrors] = useState<ExecutionMilestoneFormErrors>({})
  const [milestoneViewMode, setMilestoneViewMode] = useState<'quarter' | 'list'>('list')
  const [expandedMilestoneQuarter, setExpandedMilestoneQuarter] = useState<string | null>(null)
  const [isRelatedActivitiesDrawerOpen, setIsRelatedActivitiesDrawerOpen] = useState(false)
  const [relatedActivitySearch, setRelatedActivitySearch] = useState('')
  const [relatedActivities, setRelatedActivities] = useState<RelatedActivity[]>([])
  const [isLoadingRelatedActivities, setIsLoadingRelatedActivities] = useState(false)
  const [relatedActivitiesError, setRelatedActivitiesError] = useState('')
  const [pendingRelatedActivityIds, setPendingRelatedActivityIds] = useState<string[]>([])
  const [isRelatedActivitiesPanelExpanded, setIsRelatedActivitiesPanelExpanded] = useState(true)
  const [linkedKpis, setLinkedKpis] = useState<LinkedKpi[]>([])
  const [kpiOptions, setKpiOptions] = useState<LinkedKpi[]>([])
  const [isLoadingKpis, setIsLoadingKpis] = useState(false)
  const [kpiLoadError, setKpiLoadError] = useState('')
  const [kpiToUnlink, setKpiToUnlink] = useState<string | null>(null)
  const [executionDependencies, setExecutionDependencies] = useState<ExecutionDependencyRow[]>([])
  const [pendingKpiIds, setPendingKpiIds] = useState<string[]>([])
  const [isAddKpiModalOpen, setIsAddKpiModalOpen] = useState(false)
  const [isCreateKpiModalOpen, setIsCreateKpiModalOpen] = useState(false)
  const [editingKpiId, setEditingKpiId] = useState<string | null>(null)
  const [executionKpiForm, setExecutionKpiForm] = useState<ExecutionKpiForm>(EMPTY_EXECUTION_KPI_FORM)
  const [executionKpiErrors, setExecutionKpiErrors] = useState<ExecutionKpiFormErrors>({})
  const [isSavingKpi, setIsSavingKpi] = useState(false)
  const [kpiSearch, setKpiSearch] = useState('')
  const [isKpiPanelExpanded, setIsKpiPanelExpanded] = useState(true)

  const title = toDisplayValue(draft.activityName, 'New Execution Plan Activity')
  const sectorName = toDisplayValue(draft.sectorName, 'Government Common Digital Platforms')
  const divisionName = toDisplayValue(draft.divisionName, 'Advanced Automation & Integration')
  const cycleName = toDisplayValue(draft.cycleName, 'Annual Operating Plan 2026')
  const strategies = draft.strategies?.length
    ? draft.strategies.map((strategy) => STRATEGY_LABELS[strategy] ?? formatOptionValue(strategy)).join(', ')
    : 'Not selected'
  const selectedCorporateStrategyPillar = CORPORATE_STRATEGY_PILLAR_OPTIONS.find((option) => option.value === corporateStrategyPillar)
  const selectedDigitalStrategyPillar = DIGITAL_STRATEGY_PILLAR_OPTIONS.find((option) => option.value === digitalStrategyPillar)
  const selectedDigitalStrategyObjective = OPERATING_MODEL_OBJECTIVE_OPTIONS.find((option) => option.value === digitalStrategyObjective)
  const selectedStrategicKpiLabels = strategicKpis
    .map((kpi) => OPERATING_MODEL_KPI_OPTIONS.find((option) => option.value === kpi)?.label)
    .filter(Boolean)
    .map((label) => String(label))
  const totalPlannedBudget = monthlyBudgets.reduce((total, value) => total + parseCurrencyDraft(value), 0)
  const usedMilestoneWeightage = milestones.reduce((total, milestone) => total + Number(milestone.weightage || 0), 0)
  const remainingMilestoneWeightage = Math.max(0, 100 - usedMilestoneWeightage)
  const statusCode = Number(project?.statuscode ?? 1)
  const phaseCode = Number(project?.dga_project_phase ?? 776140000)
  const isExecutionPhase = phaseCode === 776140001
  const isMilestoneProgressDisabled = Number(project?.dga_activity_classification) === 576610002
  const milestoneProjectProgress = useMemo(() => calculateProjectMilestoneProgress(
    milestones.map((milestone) => ({
      actualProgress: milestone.actualProgress,
      id: milestone.id,
      plannedEndDate: milestone.plannedEndDate,
      plannedStartDate: milestone.plannedStartDate,
      statuscode: milestone.statuscode,
    })),
    project?.dga_project_related_changes,
  ), [milestones, project?.dga_project_related_changes])
  const plannedMilestoneProgress = isMilestoneProgressDisabled ? 0 : milestoneProjectProgress.planned
  const actualMilestoneProgress = isMilestoneProgressDisabled ? 0 : milestoneProjectProgress.actual
  const displayedMilestoneProgress = isExecutionPhase ? actualMilestoneProgress : plannedMilestoneProgress
  const displayedMilestoneProgressLabel = isExecutionPhase ? 'Actual Progress' : 'Planned Progress'
  const activityStatusCode = Number(project?.dga_project_activity_status ?? 776140014)
  const approvalStatusLabel = AOP_APPROVAL_STATUS_LABELS[statusCode] ?? 'Draft'
  const phaseLabel = AOP_PHASE_LABELS[phaseCode] ?? 'Planning'
  const activityStatusLabel = AOP_ACTIVITY_STATUS_LABELS[activityStatusCode] ?? approvalStatusLabel
  const ownerTeamId = normalizeId(project?._owningteam_value)
  const ownerUserId = normalizeId(project?._owninguser_value)
  const currentRoleTeamId = normalizeId(currentRole?.teamId)
  const currentUserId = normalizeId(systemUser?.systemuserid)
  const isOwnedByCurrentRoleTeam = Boolean(ownerTeamId && currentRoleTeamId && ownerTeamId === currentRoleTeamId)
  const isOwnedByCurrentUser = Boolean(ownerUserId && currentUserId && ownerUserId === currentUserId)
  const workflowStep = getExecutionPlanWorkflowStep(statusCode, phaseCode)
  const canCurrentRoleUseWorkflowStep = workflowStep
    ? (workflowStep.allowedRoles ?? [workflowStep.requiredRole]).includes(selectedRole)
    : false
  const isStrategyTeamRole = selectedRole === 'AOP - Strategy Team'
  const hasOwnerMismatch = Boolean(
    project
    && !isStrategyTeamRole
    && (
      (ownerUserId && currentUserId && !isOwnedByCurrentUser)
      || (!ownerUserId && ownerTeamId && currentRoleTeamId && !isOwnedByCurrentRoleTeam)
    ),
  )
  const isDivisionMemberExecutionOwner = selectedRole === 'AOP - Division Member'
    && phaseCode === 776140001
    && (isOwnedByCurrentRoleTeam || isOwnedByCurrentUser)
  const canEditExecutionFields = isExecutionPhase
    && activityStatusCode !== 776140007
    && (isStrategyTeamRole || isDivisionMemberExecutionOwner)
  const canEditExecutionPlan = (
    isStrategyTeamRole
    || (
      selectedRole === 'AOP - Division Member'
      && (isOwnedByCurrentRoleTeam || isOwnedByCurrentUser)
      && (statusCode === 1 || statusCode === 776140012)
    )
    || (
      isDivisionMemberExecutionOwner
      && activityStatusCode !== 776140007
    )
    || (
      !isExecutionPhase
      && selectedRole === 'AOP - Division Director'
      && isOwnedByCurrentRoleTeam
      && statusCode === 776140001
    )
  )
  const isEditMode = isEditing && canEditExecutionPlan && !hasOwnerMismatch
  const canUseWorkflowAction = Boolean(
    workflowStep
    && !hasOwnerMismatch
    && canCurrentRoleUseWorkflowStep
    && (
      isStrategyTeamRole
      || Boolean(workflowStep.allowedRoles?.includes(selectedRole))
      || isOwnedByCurrentRoleTeam
      || isOwnedByCurrentUser
    ),
  )
  const pendingWithLabel = ownerName || workflowStep?.requiredRole.replace('AOP - ', '') || 'Division Member'
  const operationAlert: OperationAlertPayload | null = isStartingActivity
    ? { kind: 'processing', title: 'Starting activity' }
    : isSubmittingActivityUpdates
      ? { kind: 'processing', title: 'Submitting activity updates' }
      : isSubmittingWorkflow
        ? { kind: 'processing', title: 'Submitting workflow action' }
        : isSaving || isSavingKpi
          ? { kind: 'processing', title: 'Saving changes' }
          : saveMessage
            ? { kind: 'success', message: saveMessage, title: 'Changes saved' }
            : null
  const filteredRelatedActivityOptions = relatedActivities.filter((activity) => {
    if (!relatedActivitySearch.trim()) return true
    const query = relatedActivitySearch.trim().toLowerCase()
    return activity.name.toLowerCase().includes(query) || activity.type.toLowerCase().includes(query)
  })
  const selectedRelatedActivities = relatedActivities.filter((activity) => pendingRelatedActivityIds.includes(activity.id))
  const filteredKpiOptions = kpiOptions.filter((kpi) => {
    if (!kpiSearch.trim()) return true
    const query = kpiSearch.trim().toLowerCase()
    return kpi.name.toLowerCase().includes(query) || kpi.description.toLowerCase().includes(query) || kpi.type.toLowerCase().includes(query)
  })
  const pendingKpis = kpiOptions.filter((kpi) => pendingKpiIds.includes(kpi.id))
  const canShowStartActivityAction = isDivisionMemberExecutionOwner
    && statusCode === 776140011
    && activityStatusCode === 776140007
  const canEditExecutionStatusUpdate = canEditExecutionFields
  const canSubmitActivityUpdates = isDivisionMemberExecutionOwner
    && !hasOwnerMismatch
    && activityStatusCode !== 776140007
    && (executionActivityStatus === '776140006' || executionActivityStatus === '776140009')
  const visibleDetailTabs = useMemo(
    () => isExecutionPhase ? DETAIL_TABS.filter((tab) => tab.id !== 'objective') : DETAIL_TABS,
    [isExecutionPhase],
  )
  const currentActiveTab = isExecutionPhase && activeTab === 'objective' ? 'activity-information' : activeTab
  const planningFieldRows = [
    { label: 'Execution Plan Type', value: formatOptionValue(draft.executionPlanType) },
    { label: 'Project/Initiative Name', value: draft.activityName },
    { label: 'Sector', value: sectorName },
    { label: 'Division', value: divisionName },
    { label: 'Project Type', value: generatedChoiceLabel(Dga_aop_projectsesdga_strategic_vs_operation, project?.dga_strategic_vs_operation) || generatedChoiceLabel(Dga_aop_projectsesdga_project_type, project?.dga_project_type) },
    { label: 'Activity Classification', value: generatedChoiceLabel(Dga_aop_projectsesdga_activity_classification, project?.dga_activity_classification) },
    { label: 'Does this Activity require budget?', value: generatedChoiceLabel(Dga_aop_projectsesdga_doesthisprojectrequirebudgetallocation, project?.dga_doesthisprojectrequirebudgetallocation) || yesNoLabel(project?.dga_doesthisprojectrequirebudgetallocation) },
    { label: 'Does this Activity require procurement?', value: generatedChoiceLabel(Dga_aop_projectsesdga_does_this_project_require_procurement, project?.dga_does_this_project_require_procurement) || yesNoLabel(project?.dga_does_this_project_require_procurement) },
    { label: 'Activity Lead', value: draft.activityLeadName || LEAD_LABELS[draft.activityLeadId ?? ''] || formatOptionValue(draft.activityLeadId) },
    { label: 'Planned Start Date', value: formatDateLabel(draft.plannedStartDate ?? '') },
    { label: 'Planned End Date', value: formatDateLabel(draft.plannedEndDate ?? '') },
    { label: 'Scope', value: draft.scope },
    { label: 'Summary', value: draft.summary },
    { label: 'اسم المشروع', value: draft.arabicName },
    { label: 'وصف المشروع', value: draft.arabicSummary },
    { label: 'Long Term Impact', value: draft.longTermImpact },
    { label: 'Risks', value: draft.risks },
    { label: 'Stakeholder', value: draft.stakeholder },
    { label: 'Activity KPI', value: draft.activityKpi },
    { label: 'Activity Plan (If any)', value: draft.activityPlan },
    { label: 'طويلة المدى / أهداف المشروع العامة', value: draft.overallLongTermImpact },
    { label: 'Digital Strategy Pillar', value: selectedDigitalStrategyPillar?.label || selectedCorporateStrategyPillar?.label },
    { label: 'Link to Digital Strategy objectives', value: selectedDigitalStrategyObjective?.label },
    { label: 'Link to strategic KPIs', value: selectedStrategicKpiLabels.join(', ') },
  ]

  useEffect(() => {
    let isMounted = true

    async function loadExecutionPlanDetail() {
      if (!projectId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setDetailError('')
      setSaveMessage('')

      try {
        const [projectResult, milestonesResult, kpisResult, dependenciesResult] = await Promise.all([
          Dga_aop_projectsesService.get(projectId, {
            select: [
              'dga_aop_projectsid',
              'dga_name',
              '_dga_department_value',
              '_dga_sector_value',
              '_owningteam_value',
              '_owninguser_value',
              'dga_activity_type',
              'dga_activity_classification',
              '_dga_activity_lead_value',
              'dga_adeo_review_required',
              'dga_budget_source',
              'dga_budget_type',
              'dga_allocated_budget',
              'dga_total_project_budget',
              'dga_requested_budget',
              'dga_description_summary',
              'dga_does_this_project_require_procurement',
              'dga_doesthisprojectrequirebudgetallocation',
              'dga_longtermimpactprojectlongtermimpact',
              'dga_justification_for_activity_status',
              'dga_project_categorized_under',
              'dga_project_kpi',
              'dga_project_long_term_impact',
              'dga_project_name',
              'dga_project_activity_status',
              'dga_project_phase',
              '_dga_project_planning_instance_value',
              'dga_project_plan_if_any',
              'dga_project_related_changes',
              'dga_project_type',
              'dga_planned_end_date',
              'dga_planned_start_date',
              'dga_registered_or_will_be_registered_in_epm',
              'dga_risks',
              'dga_scope',
              'dga_stakeholders',
              'dga_strategic_vs_operation',
              'statuscode',
            ],
          }),
          Dga_aop_project_milestone_detailsesService.getAll({
            filter: `_dga_aop_project_value eq '${normalizeId(projectId)}'`,
            orderBy: ['dga_planned_end_date asc'],
            select: [
              'dga_aop_project_milestone_detailsid',
              'dga_description',
              'dga_milestone_description',
              'dga_name',
              'dga_actual_progress',
              'dga_planned_end_date',
              'dga_planned_progress',
              'dga_planned_start_date',
              'dga_weightage',
              'statuscode',
            ],
          }),
          Dga_aop_kpisService.getAll({
            filter: `_dga_strategic_projects_value eq ${normalizeId(projectId)}`,
            orderBy: ['createdon desc'],
            select: [
              'dga_aop_kpiid',
              'dga_kpi_name',
              'dga_kpi_description',
              'dga_kpi_type',
              'dga_periodic_measurement',
              'dga_unit',
              'dga_polarity',
              'dga_kpi_availability',
              'dga_kpi_phase',
              'statuscode',
              'createdon',
            ],
          }),
          Dga_dependenciesService.getAll({
            filter: `_dga_aop_project_value eq '${normalizeId(projectId)}'`,
            orderBy: ['createdon desc'],
            select: [
              'dga_dependencyid',
              'dga_name',
              'dga_name_of_external_entity',
              'dga_date_of_support',
              'dga_type_of_support',
              'dga_please_check_where_applicable',
              '_dga_aop_project_value',
            ],
          }),
        ])

        assertOperationSuccess(projectResult, 'Unable to load execution plan activity.')
        assertOperationSuccess(milestonesResult, 'Unable to load milestones.')
        assertOperationSuccess(kpisResult, 'Unable to load KPIs.')
        assertOperationSuccess(dependenciesResult, 'Unable to load dependencies.')

        const nextProject = getResultValue<Dga_aop_projectses>(projectResult)
        if (!nextProject) throw new Error('Execution plan activity could not be found.')

        const hierarchyIds = Array.from(new Set([
          normalizeId(nextProject._dga_sector_value),
          normalizeId(nextProject._dga_department_value),
        ].filter(Boolean)))
        const hierarchyNameById: Record<string, string> = {}
        let activityLeadName = ''
        let nextOwnerName = ''

        if (hierarchyIds.length > 0) {
          const hierarchyResult = await Dga_divisional_hierarchiesService.getAll({
            filter: hierarchyIds.map((id) => `dga_divisional_hierarchyid eq ${id}`).join(' or '),
            select: ['dga_divisional_hierarchyid', 'dga_name'],
          })
          assertOperationSuccess(hierarchyResult, 'Unable to load activity hierarchy names.')

          ;((hierarchyResult.data ?? []) as Dga_divisional_hierarchies[]).forEach((hierarchy) => {
            const id = normalizeId(hierarchy.dga_divisional_hierarchyid)
            if (id && hierarchy.dga_name) {
              hierarchyNameById[id] = hierarchy.dga_name
            }
          })
        }

        const activityLeadId = normalizeId(nextProject._dga_activity_lead_value)
        if (activityLeadId) {
          const userResult = await SystemusersService.get(activityLeadId, {
            select: ['systemuserid', 'fullname', 'internalemailaddress'],
          })
          assertOperationSuccess(userResult, 'Unable to load Activity Lead / PM Name.')
          const user = getResultValue<Systemusers>(userResult)
          activityLeadName = user?.fullname ?? user?.internalemailaddress ?? ''
        }

        const loadedOwnerTeamId = normalizeId(nextProject._owningteam_value)
        const loadedOwnerUserId = normalizeId(nextProject._owninguser_value)
        if (loadedOwnerTeamId) {
          const teamResult = await TeamsService.get(loadedOwnerTeamId, {
            select: ['teamid', 'name'],
          })
          assertOperationSuccess(teamResult, 'Unable to load current owner team.')
          nextOwnerName = getResultValue<Teams>(teamResult)?.name ?? ''
        } else if (loadedOwnerUserId) {
          const ownerUserResult = await SystemusersService.get(loadedOwnerUserId, {
            select: ['systemuserid', 'fullname', 'internalemailaddress'],
          })
          assertOperationSuccess(ownerUserResult, 'Unable to load current owner user.')
          const ownerUser = getResultValue<Systemusers>(ownerUserResult)
          nextOwnerName = ownerUser?.fullname ?? ownerUser?.internalemailaddress ?? ''
        }

        const executionDetailState = getExecutionDetailState(nextProject)
        const nextMonthlyBudgets = Array.isArray(executionDetailState.monthlyBudgets)
          ? executionDetailState.monthlyBudgets.map((value) => normalizeCurrencyDraft(String(value ?? '0'))).slice(0, 12)
          : []

        while (nextMonthlyBudgets.length < 12) nextMonthlyBudgets.push('0')

        if (!isMounted) return

        setProject(nextProject)
        setOwnerName(nextOwnerName)
        setDraft((currentDraft) => ({
          ...mapProjectToDraft(nextProject, currentDraft, hierarchyNameById, activityLeadName),
          arabicSummary: String(executionDetailState.arabicSummary ?? currentDraft.arabicSummary ?? ''),
        }))
        setCorporateStrategyPillar(String(executionDetailState.corporateStrategyPillar ?? ''))
        setDigitalStrategyPillar(String(executionDetailState.digitalStrategyPillar ?? ''))
        setDigitalStrategyObjective(String(executionDetailState.digitalStrategyObjective ?? ''))
        setStrategicKpis(Array.isArray(executionDetailState.strategicKpis) ? executionDetailState.strategicKpis.map(String) : [])
        setBudgetSource(nextProject.dga_budget_source ? String(nextProject.dga_budget_source) : '')
        setBudgetType(nextProject.dga_budget_type ? String(nextProject.dga_budget_type) : '')
        setAllocatedBudget(numberToCurrencyDraft(nextProject.dga_allocated_budget))
        setMonthlyBudgets(nextMonthlyBudgets)
        setExecutionActivityStatus(String(nextProject.dga_project_activity_status === 776140009 ? 776140009 : 776140006))
        setExecutionStatusJustification(nextProject.dga_justification_for_activity_status ?? '')
        setMilestones(((milestonesResult.data ?? []) as Dga_aop_project_milestone_detailses[])
          .map(milestoneToExecutionMilestone)
          .filter((milestone): milestone is ExecutionMilestone => Boolean(milestone)))
        setLinkedKpis(((kpisResult.data ?? []) as Dga_aop_kpis[])
          .map(kpiRecordToLinkedKpi)
          .filter((kpi): kpi is LinkedKpi => Boolean(kpi)))
        setExecutionDependencies(((dependenciesResult.data ?? []) as Dga_dependencies[])
          .map(dependencyRecordToRow)
          .filter((dependency): dependency is ExecutionDependencyRow => Boolean(dependency)))
        setDeletedMilestoneIds([])
      } catch (error) {
        if (!isMounted) return
        setDetailError(error instanceof Error ? error.message : 'Unable to load execution plan activity.')
        setExecutionDependencies([])
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    void loadExecutionPlanDetail()

    return () => {
      isMounted = false
    }
  }, [projectId])

  useEffect(() => {
    if (!projectId) return

    let isMounted = true

    async function loadRelatedActivities() {
      setIsLoadingRelatedActivities(true)
      setRelatedActivitiesError('')

      try {
        const result = await Dga_aop_projectsesService.getAll({
          filter: `statecode eq 0 and dga_adeo_review_required eq false and dga_aop_projectsid ne '${normalizeId(projectId)}'`,
          orderBy: ['dga_name asc'],
          select: [
            'dga_aop_projectsid',
            '_dga_aop_project_value',
            'dga_allocated_budget',
            'dga_name',
            'dga_planned_end_date',
            'dga_planned_start_date',
            'dga_project_name',
            'dga_project_type',
            'dga_requested_budget',
            'dga_total_project_budget',
            'statuscode',
          ],
        })
        assertOperationSuccess(result, 'Unable to load related activities.')

        if (!isMounted) return

        const activities = getResultArray<Dga_aop_projectses>(result)
          .map((record) => projectToRelatedActivity(record, projectId))
          .filter((activity): activity is RelatedActivity => Boolean(activity))

        setRelatedActivities(activities)
        setPendingRelatedActivityIds(activities.filter((activity) => activity.alreadySelected).map((activity) => activity.id))
      } catch (error) {
        if (!isMounted) return
        setRelatedActivities([])
        setPendingRelatedActivityIds([])
        setRelatedActivitiesError(error instanceof Error ? error.message : 'Unable to load related activities.')
      } finally {
        if (isMounted) setIsLoadingRelatedActivities(false)
      }
    }

    void loadRelatedActivities()

    return () => {
      isMounted = false
    }
  }, [projectId])

  function renderAiSummaryCard(title: string) {
    return (
      <div className="create-activity__manual-ai-summary">
        <AiSummaryPanel title={title} summaries={{ summary: executionAi.summaries[title] }} isLoading={executionAi.isLoading} error={executionAi.error} />
        {executionAi.error && <Button variant="secondary" onClick={() => { void executionAi.reload() }}>Retry summary</Button>}
      </div>
    )
  }

  function updateDraft(fields: Partial<ExecutionPlanDraft>) {
    setDraft((current) => ({ ...current, ...fields }))
    setFieldErrors((current) => {
      const next = { ...current }
      ;(Object.keys(fields) as Array<keyof ExecutionPlanDraft>).forEach((key) => {
        delete next[key as keyof ExecutionPlanDetailErrors]
      })
      return next
    })
    setSaveMessage('')
    setDetailError('')
    setPersistentError('')
  }

  function clearFieldError(field: keyof ExecutionPlanDetailErrors) {
    setFieldErrors((current) => {
      if (!current[field]) return current
      const next = { ...current }
      delete next[field]
      return next
    })
    setDetailError('')
    setPersistentError('')
  }

  function getFirstValidationTab(errors: ExecutionPlanDetailErrors): ExecutionPlanDetailTab {
    if (
      errors.executionPlanType
      || errors.activityName
      || errors.arabicName
      || errors.scope
      || errors.summary
      || errors.arabicSummary
      || errors.plannedStartDate
      || errors.plannedEndDate
      || errors.longTermImpact
      || errors.overallLongTermImpact
      || errors.stakeholder
      || errors.activityKpi
      || errors.risks
    ) {
      return 'activity-information'
    }

    if (
      errors.corporateStrategyPillar
      || errors.digitalStrategyPillar
      || errors.digitalStrategyObjective
      || errors.strategicKpis
    ) {
      return 'objective'
    }

    if (errors.budgetSource || errors.budgetType || errors.allocatedBudget || errors.monthlyBudgets) {
      return 'budgeting'
    }

    return currentActiveTab
  }

  function validateExecutionPlanForSave() {
    const nextErrors = validateExecutionPlanDetailFields({
      allocatedBudget,
      budgetSource,
      budgetType,
      corporateStrategyPillar,
      digitalStrategyObjective,
      digitalStrategyPillar,
      draft,
      monthlyBudgets,
      strategicKpis,
    })

    setFieldErrors(nextErrors)

    if (Object.keys(nextErrors).length === 0) return true

    setSaveMessage('')
    setDetailError('')
    setPersistentError('Please complete all required fields before saving.')
    setActiveTab(getFirstValidationTab(nextErrors))
    scrollToFirstExecutionPlanError()
    return false
  }

  function buildActivityStatusRelatedChanges(
    nextStatus: Dga_aop_projectsesBase['dga_project_activity_status'] | number,
    justification: string,
    existingRelatedChanges = project?.dga_project_related_changes,
  ) {
    return stringifyMergedChangeBucket(
      existingRelatedChanges,
      'execution_change',
      {
        activity_information: {
          dga_project_activity_status: createTrackedChange(
            project?.dga_project_activity_status ?? nextStatus,
            nextStatus,
            getNestedRelatedChange(existingRelatedChanges, 'execution_change', ['activity_information', 'dga_project_activity_status']),
          ),
          dga_justification_for_activity_status: createTrackedChange(
            project?.dga_justification_for_activity_status ?? '',
            justification,
            getNestedRelatedChange(existingRelatedChanges, 'execution_change', ['activity_information', 'dga_justification_for_activity_status']),
          ),
        },
      } as ProjectRelatedChanges,
    )
  }

  function buildStartExecutionChangeSnapshot(budgetMonths: Dga_aop_project_budgets[]) {
    return {
      activity_information: {
        dga_project_activity_status: {
          old_value: 776140006,
          new_value: 776140006,
        },
        dga_justification_for_activity_status: {
          old_value: '',
          new_value: '',
        },
      },
      milestones: milestones.map((milestone): ProjectRelatedRecord => ({
        id: milestone.id,
        name: milestone.name,
        dga_planned_start_date: {
          old_value: milestone.plannedStartDate,
          new_value: milestone.plannedStartDate,
        },
        dga_planned_end_date: {
          old_value: milestone.plannedEndDate,
          new_value: milestone.plannedEndDate,
        },
        dga_weightage: {
          old_value: milestone.weightage,
          new_value: milestone.weightage,
        },
      })),
      budget: budgetMonths.map((month): ProjectRelatedRecord => ({
        id: month.dga_aop_project_budgetid ?? '',
        month_name: month.dga_name ?? '',
        dga_actual_budget: {
          old_value: month.dga_actual_budget ?? 0,
          new_value: month.dga_actual_budget ?? 0,
        },
        dga_delivered_amount: {
          old_value: month.dga_delivered_amount ?? 0,
          new_value: month.dga_delivered_amount ?? 0,
        },
      })),
    } as ProjectRelatedChanges
  }

  function buildPlanningActivityChangesForExecution(existingRelatedChanges = project?.dga_project_related_changes) {
    const tracked = (fieldName: string, previousValue: unknown, nextValue: unknown) => createTrackedChange(
      previousValue,
      nextValue,
      getNestedRelatedChange(existingRelatedChanges, 'activity_change', ['activity_information', fieldName]),
    )

    return {
      activity_information: {
        dga_name: tracked('dga_name', project?.dga_name ?? '', draft.activityName?.trim() || 'Untitled Execution Plan Activity'),
        dga_project_name: tracked('dga_project_name', project?.dga_project_name ?? '', draft.arabicName || draft.activityName || 'Untitled Execution Plan Activity'),
        dga_planned_start_date: tracked('dga_planned_start_date', toDateOnly(project?.dga_planned_start_date) || '', draft.plannedStartDate ?? ''),
        dga_planned_end_date: tracked('dga_planned_end_date', toDateOnly(project?.dga_planned_end_date) || '', draft.plannedEndDate ?? ''),
        dga_scope: tracked('dga_scope', project?.dga_scope ?? '', draft.scope ?? ''),
        dga_description_summary: tracked('dga_description_summary', project?.dga_description_summary ?? '', draft.summary ?? ''),
        dga_stakeholders: tracked('dga_stakeholders', project?.dga_stakeholders ?? '', draft.stakeholder ?? ''),
        dga_risks: tracked('dga_risks', project?.dga_risks ?? '', draft.risks ?? ''),
        dga_project_kpi: tracked('dga_project_kpi', project?.dga_project_kpi ?? '', draft.activityKpi ?? ''),
        dga_project_plan_if_any: tracked('dga_project_plan_if_any', project?.dga_project_plan_if_any ?? '', draft.activityPlan ?? ''),
      },
    } as ProjectRelatedChanges
  }

  async function handleStartActivityClick() {
    if (!projectId || isStartingActivity || !canShowStartActivityAction) return

    setDetailError('')
    setSaveMessage('')
    setIsStartingActivity(true)

    try {
      const nextStatus = 776140006 as Dga_aop_projectsesBase['dga_project_activity_status']
      const budgetResult = await Dga_aop_project_budgetsService.getAll({
        filter: `_dga_aop_project_value eq '${normalizeId(projectId)}'`,
        orderBy: ['createdon asc'],
        select: [
          'dga_aop_project_budgetid',
          'dga_name',
          'dga_actual_budget',
          'dga_delivered_amount',
        ],
      })
      assertOperationSuccess(budgetResult, 'Unable to initialize execution change tracking.')
      const projectRelatedChanges = stringifyMergedChangeBucket(
        project?.dga_project_related_changes,
        'execution_change',
        buildStartExecutionChangeSnapshot(getResultArray<Dga_aop_project_budgets>(budgetResult)),
      )
      const payload: Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>> = {
        dga_project_activity_status: nextStatus,
        dga_justification_for_activity_status: '',
        dga_project_related_changes: projectRelatedChanges,
      }
      const result = await Dga_aop_projectsesService.update(projectId, payload)
      assertOperationSuccess(result, 'Failed to start activity.')

      setProject((currentProject) => currentProject ? {
        ...currentProject,
        dga_project_activity_status: nextStatus,
        dga_justification_for_activity_status: '',
        dga_project_related_changes: projectRelatedChanges,
      } : currentProject)
      setExecutionActivityStatus('776140006')
      setExecutionStatusJustification('')
      setSaveMessage('Activity started successfully.')
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Failed to start activity.')
    } finally {
      setIsStartingActivity(false)
    }
  }

  function handleExecutionActivityStatusChange(value: string) {
    if (value !== '776140006' && value !== '776140009') return
    setExecutionActivityStatus(value)
    if (value !== '776140009') {
      setExecutionStatusJustification('')
    }
    setExecutionStatusError('')
    setDetailError('')
    setPersistentError('')
    setSaveMessage('')
  }

  async function handleSubmitActivityUpdates() {
    if (!projectId || isSubmittingActivityUpdates || !canSubmitActivityUpdates) return

    if (executionActivityStatus === '776140009' && !executionStatusJustification.trim()) {
      const message = 'Justification is required when Activity Status is On Hold.'
      setExecutionStatusError(message)
      setDetailError('')
      setPersistentError(message)
      setActiveTab('activity-information')
      scrollToFirstExecutionPlanError()
      return
    }

    setDetailError('')
    setPersistentError('')
    setSaveMessage('')
    setIsSubmittingActivityUpdates(true)

    try {
      const budgetResult = await Dga_aop_project_budgetsService.getAll({
        filter: `_dga_aop_project_value eq '${normalizeId(projectId)}'`,
        orderBy: ['createdon asc'],
        select: [
          'dga_aop_project_budgetid',
          'dga_name',
          'dga_actual_budget',
          'dga_is_zero',
          '_dga_aop_project_value',
        ],
      })
      assertOperationSuccess(budgetResult, 'Unable to validate budget execution updates.')

      const zeroActualMonths = getResultArray<Dga_aop_project_budgets>(budgetResult)
        .filter((month) => !isFutureMonth(month.dga_name))
        .filter((month) => Number(month.dga_actual_budget ?? 0) === 0 && !month.dga_is_zero)
        .map((month) => String(month.dga_name ?? '').trim())
        .filter(Boolean)

      if (zeroActualMonths.length > 0) {
        setDetailError(formatBudgetZeroError(zeroActualMonths))
        setActiveTab('budgeting')
        return
      }

      const nextOwner = await resolvePlanningInstanceTeam('_dga_division_director_team_value', 'AOP - Division Director')
      const nextStatus = Number(executionActivityStatus) as Dga_aop_projectsesBase['dga_project_activity_status']
      const nextJustification = executionActivityStatus === '776140009' ? executionStatusJustification.trim() : ''
      const projectRelatedChanges = buildActivityStatusRelatedChanges(nextStatus, nextJustification)
      const payload: Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>> & { 'ownerid@odata.bind': string } = {
        'ownerid@odata.bind': toEntityBind('teams', nextOwner.id),
        dga_is_rejected: false,
        dga_justification_for_activity_status: nextJustification,
        dga_project_activity_status: nextStatus,
        dga_project_related_changes: projectRelatedChanges,
        dga_rejection_reason: '',
        statuscode: 776140001,
      }
      const result = await Dga_aop_projectsesService.update(projectId, payload)
      assertOperationSuccess(result, 'Failed to submit activity updates.')

      setProject((currentProject) => currentProject ? {
        ...currentProject,
        _owningteam_value: nextOwner.id,
        _owninguser_value: undefined,
        dga_is_rejected: false,
        dga_justification_for_activity_status: nextJustification,
        dga_project_activity_status: nextStatus,
        dga_project_related_changes: projectRelatedChanges,
        dga_rejection_reason: '',
        statuscode: 776140001,
      } : currentProject)
      setOwnerName(nextOwner.name)
      setSaveMessage('Activity updates submitted to Division Director successfully.')
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Failed to submit activity updates.')
    } finally {
      setIsSubmittingActivityUpdates(false)
    }
  }

  function handleDependencyOperationAlert(payload: EditActivityOperationAlertPayload | null) {
    if (!payload) {
      setSaveMessage('')
      setDetailError('')
      setPersistentError('')
      return
    }

    if (payload.kind === 'error') {
      setSaveMessage('')
      setDetailError(payload.message ? `${payload.title}: ${payload.message}` : payload.title)
      setPersistentError('')
      return
    }

    setDetailError('')
    setPersistentError('')
    setSaveMessage(payload.message ? `${payload.title}: ${payload.message}` : payload.title)
  }

  function handleTabOperationAlert(payload: EditActivityOperationAlertPayload | null) {
    if (!payload) {
      setSaveMessage('')
      setDetailError('')
      setPersistentError('')
      return
    }

    if (payload.kind === 'error') {
      setSaveMessage('')
      setDetailError(payload.message ? `${payload.title}: ${payload.message}` : payload.title)
      setPersistentError('')
      return
    }

    setDetailError('')
    setPersistentError('')
    setSaveMessage(payload.message ? `${payload.title}: ${payload.message}` : payload.title)
  }

  function handleProjectRelatedChangesUpdate(projectRelatedChanges: string) {
    setProject((currentProject) => currentProject ? {
      ...currentProject,
      dga_project_related_changes: projectRelatedChanges,
    } : currentProject)
  }

  function handleRequestClarification() {
    setActiveTab('clarifications')
  }

  function renderClassicFieldTableCard(title: string, rows: ClassicFieldRow[], className = '') {
    return (
      <Card className={`execution-plan-detail__classic-card ${className}`.trim()}>
        <div className="execution-plan-detail__classic-card-header">
          <h2>{title}</h2>
        </div>
        <div className="execution-plan-detail__field-table" role="table" aria-label={title}>
          <div className="execution-plan-detail__field-table-body">
            {rows.map((row) => (
              <div className="execution-plan-detail__field-table-row" role="row" key={row.label}>
                <div className="execution-plan-detail__field-table-label" role="cell">{row.label}</div>
                <div className="execution-plan-detail__field-table-value" role="cell">
                  {typeof row.value === 'string' || typeof row.value === 'number'
                    ? toDisplayValue(String(row.value), '-')
                    : row.value ?? '-'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  function renderExecutionPhasePlanningFields() {
    return renderClassicFieldTableCard('Planning Fields', planningFieldRows, 'execution-plan-detail__planning-fields-card')
  }

  function renderExecutionActivityStatusCard() {
    if (!isExecutionPhase) return null

    return (
      <Card className="execution-plan-detail__classic-card execution-plan-detail__status-card">
        <div className="execution-plan-detail__classic-card-header">
          <h2>Activity Status</h2>
        </div>
        <div className="execution-plan-detail__status-body">
          <RadioGroup
            className="execution-plan-detail__status-radio"
            disabled={!canEditExecutionStatusUpdate}
            label="Activity Status"
            name="execution-activity-status"
            onChange={handleExecutionActivityStatusChange}
            options={[
              { label: 'Not started', value: '776140007', disabled: true },
              { label: 'In progress (on track)', value: '776140006' },
              { label: 'In progress (delayed)', value: '776140005', disabled: true },
              { label: 'On Hold', value: '776140009' },
              { label: 'Completed', value: '776140013', disabled: true },
              { label: 'Cancelled', value: '776140010', disabled: true },
            ]}
            value={executionActivityStatus}
          />
          {executionActivityStatus === '776140009' ? (
            <Textarea
              disabled={!canEditExecutionStatusUpdate}
              error={executionStatusError}
              label="Justification"
              onChange={(event) => {
                setExecutionStatusJustification(event.target.value)
                setExecutionStatusError('')
                setDetailError('')
                setSaveMessage('')
              }}
              placeholder="Enter Justification"
              required
              value={executionStatusJustification}
            />
          ) : null}
        </div>
      </Card>
    )
  }

  function renderExecutionPhaseDependencies() {
    return (
      <div className="edit-activity__dependencies card create-activity__section edit-activity__dependencies--embedded execution-plan-detail__dependencies-readonly">
        <div className="create-activity__section-header edit-activity__dependencies-header">
          <div className="edit-activity__dependencies-header-main">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <GitBranch size={18} />
              </span>
              <div>
                <h2>Dependencies</h2>
                <p>Track external support required for this activity.</p>
              </div>
            </div>
          </div>
        </div>

        {executionDependencies.length > 0 ? (
          <div className="edit-activity__deps-table-container">
            <div className="edit-activity__deps-table">
              <div className="edit-activity__deps-table-row edit-activity__deps-table-row--header">
                <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--check">
                  <label className="edit-activity__deps-check-label" aria-label="Select all dependencies">
                    <input className="edit-activity__deps-check-input" disabled type="checkbox" />
                    <span className="edit-activity__deps-check-visual" />
                  </label>
                </div>
                <div className="edit-activity__deps-table-cell">External Entity Name</div>
                <div className="edit-activity__deps-table-cell">Date of Support</div>
                <div className="edit-activity__deps-table-cell">Type of Support</div>
                <div className="edit-activity__deps-table-cell">Applicable</div>
                <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--actions">Actions</div>
              </div>

              {executionDependencies.map((dependency) => (
                <div className="edit-activity__deps-table-row" key={dependency.id}>
                  <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--check">
                    <label className="edit-activity__deps-check-label" aria-label={`Select ${dependency.entityName}`}>
                      <input className="edit-activity__deps-check-input" disabled type="checkbox" />
                      <span className="edit-activity__deps-check-visual" />
                    </label>
                  </div>
                  <button
                    className="edit-activity__deps-table-cell edit-activity__deps-table-cell--entity"
                    disabled
                    title={dependency.entityName}
                    type="button"
                  >
                    {toDisplayValue(dependency.entityName, '-')}
                  </button>
                  <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--date">
                    {formatDateLabel(dependency.dateOfSupport)}
                  </div>
                  <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--type" title={dependency.typeOfSupport}>
                    {toDisplayValue(dependency.typeOfSupport, '-')}
                  </div>
                  <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--applicable">
                    <span className={`edit-activity__dependency-status ${dependency.applicable === 'Agreed' ? 'edit-activity__dependency-status--agreed' : 'edit-activity__dependency-status--discussed'}`}>
                      {toDisplayValue(dependency.applicable, '-')}
                    </span>
                  </div>
                  <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--actions" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="edit-activity__members-empty">
            <GitBranch size={40} strokeWidth={1.2} />
            <h3>No dependencies added yet</h3>
            <p>No external dependencies are linked to this activity.</p>
          </div>
        )}
      </div>
    )
  }

  function renderExecutionPhaseActivityInformation() {
    return (
      <div className="execution-plan-detail__classic-stack">
        {renderExecutionActivityStatusCard()}
        {renderExecutionPhasePlanningFields()}
        {renderExecutionPhaseDependencies()}
      </div>
    )
  }

  function renderExecutionChangeValue(value: ReactNode, tone: 'old' | 'new') {
    return (
      <span className={`execution-plan-detail__change-value execution-plan-detail__change-value--${tone}`}>
        {value}
      </span>
    )
  }

  function renderTrackedChangeValue(fieldName: string, value: unknown) {
    if (fieldName === 'dga_project_activity_status') {
      return AOP_ACTIVITY_STATUS_LABELS[Number(value)] ?? toDisplayValue(String(value ?? ''), '-')
    }

    if (fieldName.toLowerCase().includes('budget') || fieldName === 'dga_delivered_amount') {
      return <CurrencyDisplay value={Number(value ?? 0)} />
    }

    return toDisplayValue(String(value ?? ''), '-')
  }

  function renderExecutionReviewChanges() {
    if (!isExecutionPhase) return null

    const relatedChanges = parseProjectRelatedChanges(project?.dga_project_related_changes)
    const activityChangeBucket = getRelatedChangeBucket(relatedChanges, 'activity_change')
    const executionChangeBucket = {
      ...('activity_information' in relatedChanges ? { activity_information: relatedChanges.activity_information } : {}),
      ...('milestones' in relatedChanges ? { milestones: relatedChanges.milestones } : {}),
      ...('budget' in relatedChanges ? { budget: relatedChanges.budget } : {}),
      ...('procurements' in relatedChanges ? { procurements: relatedChanges.procurements } : {}),
      ...getRelatedChangeBucket(relatedChanges, 'execution_change'),
    } as ProjectRelatedChanges
    const savedStatusChange = getNestedRelatedChange(
      project?.dga_project_related_changes,
      'execution_change',
      ['activity_information', 'dga_project_activity_status'],
    )
    const liveStatusChange = Number(executionActivityStatus) !== activityStatusCode
      ? {
          fieldName: 'dga_project_activity_status',
          groupLabel: 'Activity Information',
          newValue: Number(executionActivityStatus),
          oldValue: activityStatusCode,
          title: 'Activity Information',
        } satisfies DisplayTrackedChange
      : null
    const reviewChanges = [
      liveStatusChange
      ?? (savedStatusChange && String(savedStatusChange.old_value ?? '') !== String(savedStatusChange.new_value ?? '')
        ? {
            fieldName: 'dga_project_activity_status',
            groupLabel: 'Activity Information',
            newValue: savedStatusChange.new_value,
            oldValue: savedStatusChange.old_value,
            title: 'Activity Information',
          } satisfies DisplayTrackedChange
        : null),
      ...collectDirectTrackedChanges(activityChangeBucket.activity_information, 'Activity Information', 'Activity Information'),
    ].filter((change): change is DisplayTrackedChange => Boolean(change))
    const executionChanges = [
      ...collectRecordTrackedChanges(executionChangeBucket.budget, 'Budget', 'Budget Month'),
      ...collectRecordTrackedChanges(executionChangeBucket.milestones, 'Milestone', 'Milestone'),
      ...collectRecordTrackedChanges(executionChangeBucket.procurements, 'Procurement', 'Procurement'),
    ]

    return (
      <section className="execution-plan-detail__changes-grid" aria-label="Execution plan submitted changes">
        <Card className="execution-plan-detail__changes-card">
          <div className="execution-plan-detail__changes-header">
            <div className="execution-plan-detail__changes-title">
              <span className="execution-plan-detail__changes-icon" aria-hidden="true">
                <GitCompareArrows size={17} />
              </span>
              <div>
                <h2>Review Changes</h2>
                <p>Review submitted execution updates before approving or rejecting them.</p>
              </div>
            </div>
            <button
              aria-expanded={areExecutionChangesExpanded}
              className="execution-plan-detail__changes-toggle"
              onClick={() => setAreExecutionChangesExpanded((isExpanded) => !isExpanded)}
              type="button"
            >
              <span>{areExecutionChangesExpanded ? 'Hide changes' : 'Show changes'}</span>
              {areExecutionChangesExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>

          {areExecutionChangesExpanded ? (
            <div className="execution-plan-detail__change-list">
              {reviewChanges.length > 0 ? reviewChanges.slice(0, 6).map((reviewChange) => (
                <article className="execution-plan-detail__change-item" key={`${reviewChange.groupLabel}-${reviewChange.title}-${reviewChange.fieldName}`}>
                  <span className="execution-plan-detail__change-item-icon" aria-hidden="true">
                    <ClipboardList size={15} />
                  </span>
                  <div className="execution-plan-detail__change-copy">
                    <strong>{formatChangeFieldLabel(reviewChange.fieldName)}</strong>
                    <span>{reviewChange.groupLabel}</span>
                  </div>
                  <div className="execution-plan-detail__change-flow">
                    {renderExecutionChangeValue(renderTrackedChangeValue(reviewChange.fieldName, reviewChange.oldValue), 'old')}
                    <span className="execution-plan-detail__change-arrow" aria-hidden="true">
                      <ArrowRight size={14} />
                    </span>
                    {renderExecutionChangeValue(renderTrackedChangeValue(reviewChange.fieldName, reviewChange.newValue), 'new')}
                  </div>
                </article>
              )) : (
                <article className="execution-plan-detail__change-item">
                  <span className="execution-plan-detail__change-item-icon" aria-hidden="true">
                    <ClipboardList size={15} />
                  </span>
                  <div className="execution-plan-detail__change-copy">
                    <strong>No planning changes captured</strong>
                    <span>Activity Information</span>
                  </div>
                </article>
              )}
            </div>
          ) : null}
        </Card>

        <Card className="execution-plan-detail__changes-card">
          <div className="execution-plan-detail__changes-header">
            <div className="execution-plan-detail__changes-title">
              <span className="execution-plan-detail__changes-icon" aria-hidden="true">
                <ClipboardList size={17} />
              </span>
              <div>
                <h2>Activity Changes</h2>
                <p>Track execution updates recorded while the activity moves through approval.</p>
              </div>
            </div>
            <button
              aria-expanded={areExecutionChangesExpanded}
              className="execution-plan-detail__changes-toggle"
              onClick={() => setAreExecutionChangesExpanded((isExpanded) => !isExpanded)}
              type="button"
            >
              <span>{areExecutionChangesExpanded ? 'Hide changes' : 'Show changes'}</span>
              {areExecutionChangesExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>

          {areExecutionChangesExpanded ? (
            <div className="execution-plan-detail__change-list">
              {executionChanges.length > 0 ? executionChanges.slice(0, 6).map((executionChange) => (
                <article className="execution-plan-detail__change-item execution-plan-detail__change-item--stacked" key={`${executionChange.groupLabel}-${executionChange.title}-${executionChange.fieldName}`}>
                  <span className="execution-plan-detail__change-item-icon" aria-hidden="true">
                    <ClipboardList size={15} />
                  </span>
                  <div className="execution-plan-detail__change-copy">
                    <strong>{`${executionChange.groupLabel} Updated in Execution - ${executionChange.title}`}</strong>
                    <span>{formatChangeFieldLabel(executionChange.fieldName)}</span>
                  </div>
                  <div className="execution-plan-detail__change-flow">
                    {renderExecutionChangeValue(renderTrackedChangeValue(executionChange.fieldName, executionChange.oldValue), 'old')}
                    <span className="execution-plan-detail__change-arrow" aria-hidden="true">
                      <ArrowRight size={14} />
                    </span>
                    {renderExecutionChangeValue(renderTrackedChangeValue(executionChange.fieldName, executionChange.newValue), 'new')}
                  </div>
                </article>
              )) : (
                <article className="execution-plan-detail__change-item execution-plan-detail__change-item--stacked">
                  <span className="execution-plan-detail__change-item-icon" aria-hidden="true">
                    <ClipboardList size={15} />
                  </span>
                  <div className="execution-plan-detail__change-copy">
                    <strong>No execution changes captured</strong>
                    <span>Execution updates</span>
                  </div>
                </article>
              )}
            </div>
          ) : null}
        </Card>
      </section>
    )
  }

  function renderActivityInformation() {
    if (isExecutionPhase) {
      return renderExecutionPhaseActivityInformation()
    }

    return (
      <>
        {renderAiSummaryCard('Activity Information')}
        <Card className="create-activity__section create-activity__section--grid-card edit-activity__activity-info-card">
          <div className="create-activity__section-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <ClipboardList size={17} />
              </span>
              <div>
                <h2>Overview</h2>
                <p>Review the activity identity, organizational context, and strategic alignment.</p>
              </div>
            </div>
          </div>
          {isEditMode ? (
            <div className="create-activity__form-stack">
              <div className="create-activity__form-row create-activity__form-row--two">
                <RadioGroup
                  error={fieldErrors.executionPlanType}
                  label="Execution Plan Type"
                  name="detail-execution-plan-type"
                  onChange={(value) => updateDraft({ executionPlanType: value })}
                  options={[
                    { label: 'Project', value: 'project' },
                    { label: 'Program', value: 'program' },
                  ]}
                  required
                  value={draft.executionPlanType ?? ''}
                />
                <Input
                  error={fieldErrors.activityName}
                  label="Activity / Initiative Name"
                  onChange={(event) => updateDraft({ activityName: event.target.value })}
                  required
                  value={draft.activityName ?? ''}
                />
              </div>
              <div className="create-activity__form-row create-activity__form-row--two">
                <Input
                  dir="rtl"
                  error={fieldErrors.arabicName}
                  label="Arabic Name"
                  onChange={(event) => updateDraft({ arabicName: event.target.value })}
                  required
                  value={draft.arabicName ?? ''}
                />
                <Input disabled label="Categorized Strategy" value={strategies} />
              </div>
              <div className="create-activity__form-row create-activity__form-row--two">
                <Input disabled label="Sector" value={sectorName} />
                <Input disabled label="Division" value={divisionName} />
              </div>
            </div>
          ) : (
            <div className="edit-activity__activity-info-readonly">
              {renderReadOnlyDetails([
                { label: 'Activity Type', value: formatOptionValue(draft.executionPlanType), kind: 'classification' },
                { label: 'Activity / Initiative Name', value: draft.activityName, kind: 'identity' },
                { label: 'Arabic Name', value: draft.arabicName, kind: 'identity' },
                { label: 'Categorized Strategy', value: strategies, kind: 'classification' },
                { label: 'Sector', value: sectorName, kind: 'organization' },
                { label: 'Division', value: divisionName, kind: 'organization' },
              ])}
            </div>
          )}
        </Card>

        <Card className="create-activity__section create-activity__section--grid-card edit-activity__activity-info-card">
          <div className="create-activity__section-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <FileText size={17} />
              </span>
              <div>
                <h2>Scope &amp; Summary</h2>
                <p>Activity boundaries and expected outcome captured during draft creation.</p>
              </div>
            </div>
          </div>
          {isEditMode ? (
            <div className="create-activity__form-stack">
              <Textarea
                error={fieldErrors.scope}
                label="Scope"
                onChange={(event) => updateDraft({ scope: event.target.value })}
                required
                value={draft.scope ?? ''}
              />
              <div className="create-activity__form-row create-activity__form-row--two">
                <Textarea
                  error={fieldErrors.summary}
                  label="Summary"
                  onChange={(event) => updateDraft({ summary: event.target.value })}
                  required
                  value={draft.summary ?? ''}
                />
                <Textarea
                  dir="rtl"
                  error={fieldErrors.arabicSummary}
                  label="Arabic Summary"
                  onChange={(event) => updateDraft({ arabicSummary: event.target.value })}
                  required
                  value={draft.arabicSummary ?? ''}
                />
              </div>
            </div>
          ) : (
            <div className="edit-activity__activity-info-readonly">
              {renderReadOnlyDetails([
                { label: 'Scope', value: draft.scope, type: 'long', columns: 12 },
                { label: 'Summary', value: draft.summary, type: 'long', columns: 6 },
                { label: 'Arabic Summary', value: draft.arabicSummary, type: 'long', columns: 6 },
              ])}
            </div>
          )}
        </Card>

        <Card className="create-activity__section create-activity__section--grid-card edit-activity__activity-info-card">
          <div className="create-activity__section-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <BarChart3 size={17} />
              </span>
              <div>
                <h2>Execution Details</h2>
                <p>Ownership and planned execution dates.</p>
              </div>
            </div>
          </div>
          {isEditMode ? (
            <div className="create-activity__form-stack">
              <Input disabled label="Activity Lead / PM Name" value={draft.activityLeadName || LEAD_LABELS[draft.activityLeadId ?? ''] || ''} />
              <div className="create-activity__form-row create-activity__form-row--two">
                <DatePicker
                  error={fieldErrors.plannedStartDate}
                  id="detail-planned-start-date"
                  label="Planned Start Date"
                  onChange={(value) => updateDraft({ plannedStartDate: value })}
                  required
                  value={draft.plannedStartDate ?? ''}
                />
                <DatePicker
                  error={fieldErrors.plannedEndDate}
                  id="detail-planned-end-date"
                  label="Planned End Date"
                  min={draft.plannedStartDate}
                  onChange={(value) => updateDraft({ plannedEndDate: value })}
                  required
                  value={draft.plannedEndDate ?? ''}
                />
              </div>
            </div>
          ) : (
            <div className="edit-activity__activity-info-readonly">
              {renderReadOnlyDetails([
                { label: 'Activity Lead / PM Name', value: draft.activityLeadName || LEAD_LABELS[draft.activityLeadId ?? ''] || formatOptionValue(draft.activityLeadId), kind: 'person' },
                { label: 'Planned Start Date', value: draft.plannedStartDate, kind: 'date' },
                { label: 'Planned End Date', value: draft.plannedEndDate, kind: 'date' },
              ])}
            </div>
          )}
        </Card>

        <Card className="create-activity__section create-activity__section--grid-card edit-activity__activity-info-card">
          <div className="create-activity__section-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <Target size={17} />
              </span>
              <div>
                <h2>ADEO Activity Overview</h2>
                <p>ADEO reporting details required for this activity.</p>
              </div>
            </div>
          </div>
          {isEditMode ? (
            <div className="create-activity__form-stack">
              <div className="create-activity__form-row create-activity__form-row--two">
                <Textarea error={fieldErrors.longTermImpact} label="Long Term Impact" onChange={(event) => updateDraft({ longTermImpact: event.target.value })} required value={draft.longTermImpact ?? ''} />
                <Textarea dir="rtl" error={fieldErrors.overallLongTermImpact} label="Overall Long Term Impact" onChange={(event) => updateDraft({ overallLongTermImpact: event.target.value })} required value={draft.overallLongTermImpact ?? ''} />
              </div>
              <div className="create-activity__form-row create-activity__form-row--two">
                <Input error={fieldErrors.stakeholder} label="Stakeholder" onChange={(event) => updateDraft({ stakeholder: event.target.value })} required value={draft.stakeholder ?? ''} />
                <Input error={fieldErrors.activityKpi} label="Activity KPI" onChange={(event) => updateDraft({ activityKpi: event.target.value })} required value={draft.activityKpi ?? ''} />
              </div>
              <div className="create-activity__form-row create-activity__form-row--two">
                <Input label="Activity Plan (If any)" onChange={(event) => updateDraft({ activityPlan: event.target.value })} value={draft.activityPlan ?? ''} />
                <Textarea error={fieldErrors.risks} label="Risks" onChange={(event) => updateDraft({ risks: event.target.value })} required value={draft.risks ?? ''} />
              </div>
            </div>
          ) : (
            <div className="edit-activity__activity-info-readonly">
              {renderReadOnlyDetails([
                { label: 'Long Term Impact', value: draft.longTermImpact, type: 'long', columns: 6 },
                { label: 'Overall Long Term Impact', value: draft.overallLongTermImpact, type: 'long', columns: 6 },
                { label: 'Stakeholder', value: draft.stakeholder, kind: 'person' },
                { label: 'Activity KPI', value: draft.activityKpi, kind: 'classification' },
                { label: 'Activity Plan', value: draft.activityPlan, type: 'long', columns: 6 },
                { label: 'Risks', value: draft.risks, type: 'long', columns: 6 },
              ])}
            </div>
          )}
        </Card>

        {projectId ? (
          <DependenciesTab
            embedded
            isReadOnly={!isEditMode}
            onActivityDataChanged={() => { setSaveMessage('Dependencies updated successfully.'); void executionAi.reload(true) }}
            onOperationAlert={handleDependencyOperationAlert}
            projectId={projectId}
          />
        ) : null}
      </>
    )
  }

  function renderPlaceholderStep() {
    const tab = DETAIL_TABS.find((item) => item.id === activeTab)
    const Icon = tab?.icon ?? ClipboardList

    return (
      <>
        {renderAiSummaryCard(tab?.label ?? 'Execution Plan')}
        <Card className="execution-plan-detail__section execution-plan-detail__empty-step">
          <span className="execution-plan-detail__section-icon" aria-hidden="true">
            <Icon size={18} />
          </span>
          <div>
            <h2>{tab?.label}</h2>
            <p>This step is ready for the {tab?.label.toLowerCase()} interface.</p>
          </div>
        </Card>
      </>
    )
  }

  function renderObjectives() {
    if (!isEditMode) {
      return (
        <div className="edit-activity__objectives execution-plan-detail__objectives">
          {renderAiSummaryCard('Objectives')}

          <div className="execution-plan-detail__classic-stack">
            {renderClassicFieldTableCard(
              'DGE Corporate Strategy Pillar',
              [
                {
                  label: 'Corporate Strategy Pillar',
                  value: selectedCorporateStrategyPillar?.label ?? 'Not selected',
                },
              ],
              'execution-plan-detail__objective-fields-card',
            )}

            {renderClassicFieldTableCard(
              'Digital Strategy Alignment',
              [
                {
                  label: 'Digital Strategy Pillar',
                  value: selectedDigitalStrategyPillar?.label ?? 'Not selected',
                },
                {
                  label: 'Digital Strategy Objective',
                  value: selectedDigitalStrategyObjective?.label ?? 'Not selected',
                },
                {
                  label: 'Strategic KPI',
                  value: selectedStrategicKpiLabels.length > 0 ? selectedStrategicKpiLabels.join(', ') : 'Not selected',
                },
              ],
              'execution-plan-detail__objective-fields-card',
            )}
          </div>
        </div>
      )
    }

    return (
      <div className="edit-activity__objectives execution-plan-detail__objectives">
        {renderAiSummaryCard('Objectives')}

        <div className="edit-activity__members-header">
          <div className="edit-activity__members-header-text">
            <h2>Objectives</h2>
            <p>Review and manage the strategic alignment for this activity.</p>
          </div>
        </div>

        <Card className="create-activity__section edit-activity__objective-card edit-activity__objective-card--guided">
          <div className="create-activity__section-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <Target size={17} />
              </span>
              <div>
                <h2>DGE Corporate Strategy Pillar</h2>
                <p>Select the corporate strategy pillar this activity supports.</p>
              </div>
            </div>
          </div>
          <div className="create-activity__form-stack">
            <RadioGroup
              className="radio-group--corporate-strategy"
              error={fieldErrors.corporateStrategyPillar}
              label="Select the DGE Corporate Strategy Pillar this activity aligns to"
              name="execution-dge-corporate-strategy-pillar"
              onChange={(value) => {
                setCorporateStrategyPillar(value)
                clearFieldError('corporateStrategyPillar')
              }}
              options={CORPORATE_STRATEGY_PILLAR_OPTIONS}
              required
              value={corporateStrategyPillar}
            />
          </div>
        </Card>

        <Card className="create-activity__section edit-activity__objective-card edit-activity__objective-card--guided">
          <div className="create-activity__section-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <GitBranch size={17} />
              </span>
              <div>
                <h2>Digital Strategy Pillar</h2>
                <p>Choose the digital strategy pillar that drives downstream objectives and KPIs.</p>
              </div>
            </div>
          </div>
          <div className="create-activity__form-stack">
            <RadioGroup
              className="radio-group--digital-pillar"
              error={fieldErrors.digitalStrategyPillar}
              label="Select the Digital Strategy Pillar this activity falls under"
              name="execution-digital-strategy-pillar"
              onChange={(value) => {
                setDigitalStrategyPillar(value)
                clearFieldError('digitalStrategyPillar')
                if (value !== 'operating-model') {
                  setDigitalStrategyObjective('')
                  setStrategicKpis([])
                  clearFieldError('digitalStrategyObjective')
                  clearFieldError('strategicKpis')
                }
              }}
              options={DIGITAL_STRATEGY_PILLAR_OPTIONS}
              required
              value={digitalStrategyPillar}
            />
          </div>
        </Card>

        {digitalStrategyPillar === 'operating-model' ? (
          <>
            <Card className="create-activity__section edit-activity__objective-card edit-activity__objective-card--guided">
              <div className="create-activity__section-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true">
                    <Target size={17} />
                  </span>
                  <div>
                    <h2>Link to Digital Strategy Objectives</h2>
                    <p>Select the objective mapped to the selected Digital Strategy Pillar.</p>
                  </div>
                </div>
              </div>
              <div className="create-activity__form-stack">
              <RadioGroup
                className="radio-group--link-objective"
                error={fieldErrors.digitalStrategyObjective}
                label="Link to Digital Strategy objectives"
                name="execution-link-digital-strategy-objective"
                onChange={(value) => {
                  setDigitalStrategyObjective(value)
                  clearFieldError('digitalStrategyObjective')
                }}
                options={OPERATING_MODEL_OBJECTIVE_OPTIONS}
                required
                value={digitalStrategyObjective}
              />
              </div>
            </Card>

            <Card className="create-activity__section edit-activity__objective-card edit-activity__objective-card--guided">
              <div className="create-activity__section-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true">
                    <GitBranch size={17} />
                  </span>
                  <div>
                    <h2>Link to Strategic KPIs</h2>
                    <p>Select the strategic KPI measures connected to this objective.</p>
                  </div>
                </div>
              </div>
              <div className="create-activity__form-stack">
              <fieldset className={`checkbox-group execution-plan-detail__kpi-group${fieldErrors.strategicKpis ? ' checkbox-group--invalid' : ''}`}>
                <legend className="field__label">
                  Link to strategic KPIs
                  <span aria-hidden="true" className="field__required"> *</span>
                </legend>
                <div className="checkbox-group__options">
                  {OPERATING_MODEL_KPI_OPTIONS.map((option) => (
                    <Checkbox
                      checked={strategicKpis.includes(option.value)}
                      key={option.value}
                      label={option.label}
                      onChange={() => {
                        setStrategicKpis((current) => (
                          current.includes(option.value)
                            ? current.filter((item) => item !== option.value)
                            : [...current, option.value]
                        ))
                        clearFieldError('strategicKpis')
                      }}
                    />
                  ))}
                </div>
                {fieldErrors.strategicKpis ? <span className="field__error">{fieldErrors.strategicKpis}</span> : null}
              </fieldset>
              </div>
            </Card>
          </>
        ) : null}
      </div>
    )
  }

  function updateMonthlyBudget(monthIndex: number, value: string) {
    setMonthlyBudgets((current) => {
      const next = [...current]
      next[monthIndex] = normalizeCurrencyDraft(value)
      return next
    })
  }

  function openRelatedActivitiesDrawer() {
    setPendingRelatedActivityIds(relatedActivities.filter((activity) => activity.alreadySelected).map((activity) => activity.id))
    setRelatedActivitySearch('')
    setIsRelatedActivitiesDrawerOpen(true)
  }

  function closeRelatedActivitiesDrawer() {
    setIsRelatedActivitiesDrawerOpen(false)
    setRelatedActivitySearch('')
    setPendingRelatedActivityIds([])
  }

  function togglePendingRelatedActivity(id: string) {
    const activity = relatedActivities.find((item) => item.id === id)
    if (!activity || activity.isDisabled || activity.alreadySelected) return

    setPendingRelatedActivityIds((current) => (
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    ))
  }

  async function handleAddRelatedActivities() {
    if (!projectId) return

    const activitiesToLink = relatedActivities.filter((activity) => (
      pendingRelatedActivityIds.includes(activity.id)
      && !activity.alreadySelected
      && !activity.isDisabled
    ))

    try {
      setDetailError('')
      setSaveMessage('')
      await Promise.all(activitiesToLink.map((activity) => updateRelatedActivityParentLookup(
        activity.id,
        projectId,
        `Unable to link ${activity.name}.`,
      )))

      setRelatedActivities((current) => current.map((activity) => (
        pendingRelatedActivityIds.includes(activity.id) && !activity.isDisabled
          ? {
              ...activity,
              alreadyLinked: false,
              alreadySelected: true,
              isDisabled: false,
              parentId: normalizeId(projectId),
              selectionStatus: 'already-selected',
            }
          : activity
      )))
      setSaveMessage('Related activities updated successfully.')
      closeRelatedActivitiesDrawer()
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Unable to update related activities.')
    }
  }

  function handleEditRelatedActivity() {
    openRelatedActivitiesDrawer()
  }

  async function handleDeleteRelatedActivity(id: string) {
    try {
      setDetailError('')
      setSaveMessage('')
      await updateRelatedActivityParentLookup(id, null, 'Unable to unlink related activity.')

      setRelatedActivities((current) => current.map((activity) => (
        activity.id === id
          ? {
              ...activity,
              alreadyLinked: false,
              alreadySelected: false,
              isDisabled: false,
              parentId: '',
              selectionStatus: 'available',
            }
          : activity
      )))
      setPendingRelatedActivityIds((current) => current.filter((pendingId) => pendingId !== id))
      setSaveMessage('Related activity unlinked successfully.')
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Unable to unlink related activity.')
    }
  }

  function openAddKpiModal() {
    setPendingKpiIds(linkedKpis.map((kpi) => kpi.id))
    setKpiSearch('')
    setIsAddKpiModalOpen(true)
    void loadAvailableKpis()
  }

  function closeAddKpiModal() {
    if (isSavingKpi) return
    setIsAddKpiModalOpen(false)
    setKpiSearch('')
    setPendingKpiIds([])
  }

  function togglePendingKpi(id: string) {
    setPendingKpiIds((current) => (
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    ))
  }

  async function loadAvailableKpis() {
    if (!projectId || !project) return
    setIsLoadingKpis(true)
    setKpiLoadError('')
    try {
      const divisionId = normalizeId(project._dga_department_value)
      const linkedFilter = `_dga_strategic_projects_value eq ${normalizeId(projectId)}`
      const result = await Dga_aop_kpisService.getAll({
        filter: divisionId ? `(${linkedFilter} or (_dga_strategic_projects_value eq null and _dga_division_value eq ${divisionId}))` : linkedFilter,
        orderBy: ['dga_kpi_name asc'],
        select: ['dga_aop_kpiid', 'dga_kpi_name', 'dga_kpi_description', 'dga_kpi_type', 'dga_periodic_measurement', 'dga_unit', 'dga_polarity', 'dga_kpi_availability', 'dga_kpi_phase', 'statuscode', '_dga_strategic_projects_value'],
      })
      assertOperationSuccess(result, 'Unable to load available KPIs.')
      const options = (result.data ?? []).flatMap((record) => {
        const kpi = kpiRecordToLinkedKpi(record)
        return kpi ? [{ ...kpi, alreadyLinked: normalizeId(record._dga_strategic_projects_value) === normalizeId(projectId) }] : []
      })
      setKpiOptions(options)
    } catch (error) {
      setKpiLoadError(error instanceof Error ? error.message : 'Unable to load KPIs.')
    } finally {
      setIsLoadingKpis(false)
    }
  }

  async function updateKpiLink(id: string, attach: boolean) {
    const current = await Dga_aop_kpisService.get(id, { select: ['_dga_strategic_projects_value'] })
    assertOperationSuccess(current, 'Unable to verify KPI link.')
    const owner = normalizeId(current.data?._dga_strategic_projects_value)
    if (owner && owner !== normalizeId(projectId)) throw new Error('This KPI is linked to another activity. Refresh the KPI list.')
    const result = await Dga_aop_kpisService.update(id, {
      'dga_strategic_projects@odata.bind': attach ? `/dga_aop_projectses(${normalizeId(projectId)})` : null,
    } as unknown as Partial<Dga_aop_kpisBase>)
    assertOperationSuccess(result, 'Unable to update KPI link.')
  }

  async function handleAddExistingKpis() {
    if (!projectId || !canEditExecutionPlan || isSavingKpi || isLoadingKpis || kpiLoadError) return
    setIsSavingKpi(true)
    setDetailError('')
    try {
      for (const kpi of kpiOptions) {
        const attach = pendingKpiIds.includes(kpi.id)
        if (attach === Boolean(kpi.alreadyLinked)) continue
        await updateKpiLink(kpi.id, attach)
        setLinkedKpis((current) => attach ? [...current.filter((item) => item.id !== kpi.id), { ...kpi, alreadyLinked: true }] : current.filter((item) => item.id !== kpi.id))
      }
      setIsAddKpiModalOpen(false)
      setSaveMessage('KPI links saved successfully.')
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Unable to save KPI links.')
      await loadAvailableKpis()
    } finally {
      setIsSavingKpi(false)
    }
  }

  async function handleEditKpi(kpi: LinkedKpi) {
    setEditingKpiId(kpi.id)
    setExecutionKpiForm({
      ...EMPTY_EXECUTION_KPI_FORM,
      benchmarkable: 'Yes',
      description: kpi.description === '-' ? '' : kpi.description,
      kpiName: kpi.name,
      kpiType: KPI_TYPE_SELECT_OPTIONS.find((option) => option.label === kpi.type)?.value ?? '',
      kpiUnit: KPI_UNIT_SELECT_OPTIONS.find((option) => option.label === kpi.unit)?.value ?? '',
      periodicMeasurement: KPI_MEASUREMENT_OPTIONS.find((option) => option.label === kpi.periodicMeasurement)?.value ?? 'quarterly',
      polarity: KPI_POLARITY_OPTIONS.find((option) => option.label === kpi.polarity)?.value ?? 'ascending',
    })
    setExecutionKpiErrors({})
    setIsCreateKpiModalOpen(true)
    setIsSavingKpi(true)
    setDetailError('')
    try {
      const result = await Dga_aop_kpisService.get(kpi.id, {
        select: [
          'dga_aop_kpiid',
          'dga_benchmark',
          'dga_calculation_method',
          'dga_calculation_method_arabic',
          'dga_directorate',
          'dga_expected_impact',
          'dga_kpi_benchmarkable',
          'dga_kpi_description',
          'dga_kpi_description_arabic',
          'dga_kpi_name',
          'dga_kpi_name_arabic',
          'dga_kpi_type',
          'dga_periodic_measurement',
          'dga_polarity',
          'dga_source_of_data',
          'dga_unit',
        ],
      })
      assertOperationSuccess(result, 'Unable to load KPI for editing.')
      const record = getResultValue<Dga_aop_kpis>(result)
      if (record) setExecutionKpiForm(kpiRecordToExecutionKpiForm(record))
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Unable to load KPI for editing.')
    } finally {
      setIsSavingKpi(false)
    }
  }

  async function handleDeleteKpi(id: string) {
    if (!canEditExecutionPlan || isSavingKpi) return
    setIsSavingKpi(true)
    setDetailError('')
    try {
      await updateKpiLink(id, false)
      setLinkedKpis((current) => current.filter((kpi) => kpi.id !== id))
      setSaveMessage('KPI unlinked. The KPI record has been retained.')
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Unable to unlink KPI.')
    } finally {
      setIsSavingKpi(false)
    }
  }

  function updateExecutionKpiForm(fields: Partial<ExecutionKpiForm>) {
    setExecutionKpiForm((current) => ({ ...current, ...fields }))
    setExecutionKpiErrors((current) => {
      const next = { ...current }
      ;(Object.keys(fields) as Array<keyof ExecutionKpiForm>).forEach((key) => {
        delete next[key]
      })
      return next
    })
  }

  function openCreateKpiDrawer() {
    setEditingKpiId(null)
    setExecutionKpiForm(EMPTY_EXECUTION_KPI_FORM)
    setExecutionKpiErrors({})
    setIsCreateKpiModalOpen(true)
  }

  async function handleCreateKpiConfirm() {
    const errors = validateExecutionKpiForm(executionKpiForm)
    if (Object.keys(errors).length > 0) {
      setExecutionKpiErrors(errors)
      scrollToFirstExecutionPlanError()
      return
    }

    setIsSavingKpi(true)
    setDetailError('')
    try {
      if (editingKpiId) {
        const result = await Dga_aop_kpisService.update(
          editingKpiId,
          buildExecutionKpiPayload(executionKpiForm, projectId, project),
        )
        assertOperationSuccess(result, 'Unable to update KPI.')
        const updated = getResultValue<Dga_aop_kpis>(result)
        const linked = updated ? kpiRecordToLinkedKpi(updated) : executionKpiFormToLinkedKpi(executionKpiForm, editingKpiId)
        if (linked) {
          setLinkedKpis((current) => current.map((kpi) => (kpi.id === editingKpiId ? linked : kpi)))
        }
        setEditingKpiId(null)
        setExecutionKpiForm(EMPTY_EXECUTION_KPI_FORM)
        setIsCreateKpiModalOpen(false)
        setSaveMessage('KPI updated successfully.')
        return
      }

      const result = await Dga_aop_kpisService.create(buildExecutionKpiPayload(executionKpiForm, projectId, project))
      assertOperationSuccess(result, 'Unable to create KPI.')
      const created = getResultValue<Dga_aop_kpis>(result)
      const linked = created ? kpiRecordToLinkedKpi(created) : null
      if (linked) {
        setLinkedKpis((current) => [linked, ...current.filter((kpi) => kpi.id !== linked.id)])
      }
      setExecutionKpiForm(EMPTY_EXECUTION_KPI_FORM)
      setIsCreateKpiModalOpen(false)
      setSaveMessage('KPI created successfully.')
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Unable to create KPI.')
    } finally {
      setIsSavingKpi(false)
    }
  }

  function renderRelatedActivities() {
    const linkedRelatedActivities = relatedActivities.filter((activity) => activity.alreadySelected)
    const totalPlannedBudget = linkedRelatedActivities.reduce((total, activity) => total + activity.totalPlannedBudget, 0)
    const totalAllocatedBudget = linkedRelatedActivities.reduce((total, activity) => total + activity.totalAllocatedBudget, 0)
    const planningActivitiesCount = linkedRelatedActivities.filter((activity) => activity.approvalStatus === 'Planning').length

    const renderRelatedActivityPanelRow = (activity: RelatedActivity) => (
      <div className="execution-plan-detail__kpi-panel-row execution-plan-detail__related-panel-row" key={activity.id}>
        <div className="execution-plan-detail__kpi-panel-cell execution-plan-detail__kpi-panel-cell--name" data-label="Activity Name">
          <strong>{activity.name}</strong>
          <span>{activity.type} activity linked to this execution plan.</span>
        </div>
        <div className="execution-plan-detail__kpi-panel-cell execution-plan-detail__kpi-panel-cell--measurement" data-label="Timeline">
          <span>{activity.plannedStartDate} - {activity.plannedEndDate}</span>
          <small>{activity.type}</small>
        </div>
        <div className="execution-plan-detail__kpi-panel-cell execution-plan-detail__kpi-panel-cell--status" data-label="Budget">
          <span className="execution-plan-detail__related-budget-line"><CurrencyDisplay value={activity.totalPlannedBudget} /> planned</span>
          <small><CurrencyDisplay value={activity.totalAllocatedBudget} /> allocated</small>
        </div>
        <div className="execution-plan-detail__kpi-panel-cell execution-plan-detail__kpi-panel-cell--status" data-label="Status">
          <div className="execution-plan-detail__kpi-status-badges">
            <Badge tone={activity.approvalStatus === 'Planning' ? 'info' : undefined}>{activity.approvalStatus}</Badge>
          </div>
          <small>Supporting activity</small>
        </div>
        <div className="execution-plan-detail__kpi-panel-cell execution-plan-detail__kpi-panel-cell--actions" data-label="Actions">
          <div className="edit-activity__milestone-card-actions">
            <button
              aria-label={`Edit ${activity.name}`}
              className="edit-activity__milestone-action-btn"
              onClick={handleEditRelatedActivity}
              type="button"
            >
              <Edit3 size={14} />
            </button>
            <button
              aria-label={`Delete ${activity.name}`}
              className="edit-activity__milestone-action-btn edit-activity__milestone-action-btn--danger"
              onClick={() => { void handleDeleteRelatedActivity(activity.id) }}
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    )

    return (
      <>
        {renderAiSummaryCard('Related Activities')}

        <div className={`execution-plan-detail__related execution-plan-detail__related-activities${!isEditMode ? ' execution-plan-detail__related--readonly' : ''}`}>
          <div className="edit-activity__milestone-viewbar execution-plan-detail__related-viewbar">
            <div className="edit-activity__members-header-text">
              <h2>Related Activities</h2>
              <p>Associate supporting activities under this execution plan.</p>
            </div>
            <div className="execution-plan-detail__kpi-actions">
              <Button icon={<Plus size={16} />} onClick={openRelatedActivitiesDrawer}>
                Add Related Activities
              </Button>
            </div>
          </div>

          <section className={`edit-activity__milestone-quarter execution-plan-detail__kpi-panel execution-plan-detail__related-panel${isRelatedActivitiesPanelExpanded ? ' edit-activity__milestone-quarter--expanded execution-plan-detail__kpi-panel--expanded' : ''}`}>
            <div
              aria-expanded={isRelatedActivitiesPanelExpanded}
              aria-label="Related activities summary"
              className="edit-activity__milestone-quarter-summary execution-plan-detail__kpi-panel-summary"
              onClick={() => setIsRelatedActivitiesPanelExpanded((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setIsRelatedActivitiesPanelExpanded((current) => !current)
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="edit-activity__milestone-quarter-top">
                <div className="edit-activity__milestone-quarter-heading">
                  <span className="edit-activity__milestone-quarter-number">
                    <GitBranch size={15} />
                  </span>
                  <div>
                    <h3>Related Activities Register</h3>
                    <span className="edit-activity__milestone-quarter-range">Supporting activities associated with this execution plan.</span>
                  </div>
                </div>
                <div className="edit-activity__milestone-quarter-controls">
                  <span className="edit-activity__milestone-quarter-status edit-activity__milestone-quarter-status--no-milestones">
                    {linkedRelatedActivities.length ? `${linkedRelatedActivities.length} Activit${linkedRelatedActivities.length > 1 ? 'ies' : 'y'}` : 'No Activities'}
                  </span>
                  <button
                    aria-label={`${isRelatedActivitiesPanelExpanded ? 'Collapse' : 'Expand'} related activities`}
                    className="edit-activity__milestone-quarter-toggle"
                    onClick={(event) => {
                      event.stopPropagation()
                      setIsRelatedActivitiesPanelExpanded((current) => !current)
                    }}
                    type="button"
                  >
                    {isRelatedActivitiesPanelExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              <div className="edit-activity__milestone-quarter-ai-summary">
                <div className="edit-activity__milestone-quarter-ai-icon" aria-hidden="true">
                  <Sparkles size={14} />
                </div>
                <div className="edit-activity__milestone-quarter-ai-copy">
                  <span className="edit-activity__milestone-quarter-ai-label">Related Activities AI Summary</span>
                  <p>AI summary is not available for related activities yet.</p>
                </div>
              </div>

              <div className="edit-activity__milestone-quarter-insights edit-activity__milestone-quarter-insights--no-weightage execution-plan-detail__kpi-panel-insights">
                <div className="edit-activity__milestone-quarter-metrics">
                  <span className="edit-activity__milestone-quarter-metric">
                    <small>Total Activities</small>
                    <strong>{linkedRelatedActivities.length}</strong>
                  </span>
                  <span className="edit-activity__milestone-quarter-metric">
                    <small>Planning</small>
                    <strong>{planningActivitiesCount}</strong>
                  </span>
                </div>
                <div className="edit-activity__milestone-quarter-metrics">
                  <span className="edit-activity__milestone-quarter-metric">
                    <small>Planned Budget</small>
                    <strong><CurrencyDisplay value={totalPlannedBudget} /></strong>
                  </span>
                  <span className="edit-activity__milestone-quarter-metric">
                    <small>Allocated Budget</small>
                    <strong><CurrencyDisplay value={totalAllocatedBudget} /></strong>
                  </span>
                </div>
              </div>
            </div>

            {isRelatedActivitiesPanelExpanded ? (
              <div className="edit-activity__milestone-quarter-body execution-plan-detail__kpi-panel-body">
                {isLoadingRelatedActivities ? (
                  <ExecutionSkeleton compact />
                ) : relatedActivitiesError ? (
                  <div className="edit-activity__milestone-quarter-empty execution-plan-detail__kpi-panel-empty">
                    <FileText size={22} strokeWidth={1.5} />
                    <strong>Unable to load related activities</strong>
                    <span>{relatedActivitiesError}</span>
                  </div>
                ) : linkedRelatedActivities.length > 0 ? (
                  <div className="execution-plan-detail__kpi-panel-scroll">
                    <div className="execution-plan-detail__kpi-panel-table execution-plan-detail__related-panel-table">
                      <div className="execution-plan-detail__kpi-panel-row execution-plan-detail__related-panel-row execution-plan-detail__kpi-panel-row--head">
                        <div>Activity Name</div>
                        <div>Timeline</div>
                        <div>Budget</div>
                        <div>Status</div>
                        <div>Actions</div>
                      </div>
                      {linkedRelatedActivities.map(renderRelatedActivityPanelRow)}
                    </div>
                  </div>
                ) : (
                  <div className="edit-activity__milestone-quarter-empty execution-plan-detail__kpi-panel-empty">
                    <FileText size={22} strokeWidth={1.5} />
                    <strong>No related activities yet</strong>
                    <span>Add a supporting activity to associate it with this execution plan.</span>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        </div>

        <SideDrawer
          actions={(
            <div className="edit-activity__milestones-drawer-actions">
              <Button className="edit-activity__milestones-drawer-button" onClick={closeRelatedActivitiesDrawer} variant="secondary">
                Cancel
              </Button>
              <Button className="edit-activity__milestones-drawer-button" disabled={isLoadingRelatedActivities} icon={<Link2 size={15} />} onClick={() => { void handleAddRelatedActivities() }}>
                Add Related Activities
              </Button>
            </div>
          )}
          isOpen={isRelatedActivitiesDrawerOpen}
          onClose={closeRelatedActivitiesDrawer}
          title="Add Related Activities"
        >
          <div className="edit-activity__milestones-drawer execution-plan-detail__related-drawer">
            <div className="edit-activity__milestones-drawer-card">
              <div className="create-activity__section-header edit-activity__milestones-drawer-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true">
                    <GitBranch size={16} />
                  </span>
                  <div>
                    <h2>Add Related Activities</h2>
                    <p>Select activities to associate with this execution plan.</p>
                  </div>
                </div>
              </div>

              <div className="edit-activity__milestones-drawer-section execution-plan-detail__related-drawer-section">
                <label className="execution-plan-detail__related-search">
                  <span>
                    <Search size={14} />
                    Search Activities
                  </span>
                  <input
                    onChange={(event) => setRelatedActivitySearch(event.target.value)}
                    placeholder="Type to search..."
                    type="text"
                    value={relatedActivitySearch}
                  />
                </label>

                <div className="execution-plan-detail__related-picker">
                  <div className="execution-plan-detail__related-picker-title">
                    <List size={14} />
                    <span>Select Related Activities</span>
                  </div>
                  <div className="execution-plan-detail__related-picker-list">
                    {isLoadingRelatedActivities ? (
                      <ExecutionSkeleton compact />
                    ) : relatedActivitiesError ? (
                      <div className="execution-plan-detail__related-picker-empty">{relatedActivitiesError}</div>
                    ) : filteredRelatedActivityOptions.length > 0 ? filteredRelatedActivityOptions.map((activity) => {
                      const isChecked = pendingRelatedActivityIds.includes(activity.id)
                      const badgeLabel = activity.alreadySelected
                        ? 'Already Selected'
                        : activity.alreadyLinked
                          ? 'Already Linked'
                          : ''

                      return (
                        <label className={`execution-plan-detail__related-picker-row${activity.isDisabled || activity.alreadySelected ? ' execution-plan-detail__related-picker-row--disabled' : ''}`} key={activity.id}>
                          <input
                            checked={isChecked}
                            disabled={activity.isDisabled || activity.alreadySelected}
                            onChange={() => togglePendingRelatedActivity(activity.id)}
                            type="checkbox"
                          />
                          <span className="execution-plan-detail__related-picker-check" aria-hidden="true" />
                          <span className="execution-plan-detail__related-picker-name">{activity.name}</span>
                          {badgeLabel ? <span className="execution-plan-detail__related-picker-badge">{badgeLabel}</span> : null}
                        </label>
                      )
                    }) : (
                      <div className="execution-plan-detail__related-picker-empty">No available activities found.</div>
                    )}
                  </div>
                </div>

                <div className="execution-plan-detail__related-selected">
                  <div className="execution-plan-detail__related-selected-head">
                    <span>
                      <Link2 size={14} />
                      Selected Activities
                    </span>
                    <strong>{selectedRelatedActivities.length}</strong>
                  </div>
                  <div className="execution-plan-detail__related-selected-body">
                    {selectedRelatedActivities.length > 0 ? (
                      selectedRelatedActivities.map((activity) => (
                        <span className="execution-plan-detail__related-selected-pill" key={activity.id}>
                          {activity.name}
                        </span>
                      ))
                    ) : (
                      <span>No activities selected</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SideDrawer>
      </>
    )
  }

  function renderKpis() {
    const newKpisCount = linkedKpis.filter((kpi) => kpi.availability === 'New').length
    const activeKpisCount = linkedKpis.filter((kpi) => kpi.approvalStatus === 'Active' || kpi.approvalStatus === 'Draft').length
    const quarterlyKpisCount = linkedKpis.filter((kpi) => kpi.periodicMeasurement === 'Quarterly').length

    const renderKpiPanelRow = (kpi: LinkedKpi) => {
      return (
        <div className="execution-plan-detail__kpi-panel-row" key={kpi.id}>
          <div className="execution-plan-detail__kpi-panel-cell execution-plan-detail__kpi-panel-cell--name" data-label="KPI Name">
            <strong>{kpi.name}</strong>
            <span>{kpi.description}</span>
          </div>
          <div className="execution-plan-detail__kpi-panel-cell execution-plan-detail__kpi-panel-cell--measurement" data-label="Measurement">
            <span>{kpi.type}</span>
            <small>
              {kpi.periodicMeasurement} / {kpi.unit} / {kpi.polarity}
            </small>
          </div>
          <div className="execution-plan-detail__kpi-panel-cell execution-plan-detail__kpi-panel-cell--status" data-label="Status">
            <div className="execution-plan-detail__kpi-status-badges">
              <Badge tone={kpi.availability === 'New' ? 'warning' : 'neutral'}>{kpi.availability}</Badge>
              <Badge>{kpi.approvalStatus}</Badge>
            </div>
            <small>Pending with {kpi.pendingWith}</small>
          </div>
          <div className="execution-plan-detail__kpi-panel-cell execution-plan-detail__kpi-panel-cell--actions" data-label="Actions">
            <div className="edit-activity__milestone-card-actions">
              <button
                aria-label={`Edit ${kpi.name}`}
                className="edit-activity__milestone-action-btn"
                onClick={() => handleEditKpi(kpi)}
                type="button"
              >
                <Edit3 size={14} />
              </button>
              <button
                aria-label={`Delete ${kpi.name}`}
                className="edit-activity__milestone-action-btn edit-activity__milestone-action-btn--danger"
                onClick={() => setKpiToUnlink(kpi.id)}
                type="button"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <>
        {renderAiSummaryCard('KPIs')}

        <div className={`execution-plan-detail__related execution-plan-detail__kpis${!isEditMode ? ' execution-plan-detail__related--readonly' : ''}`}>
          <div className="edit-activity__milestone-viewbar execution-plan-detail__related-viewbar">
            <div className="edit-activity__members-header-text">
              <h2>KPIs</h2>
              <p>Link existing KPIs or create KPI placeholders for this execution plan.</p>
            </div>
            <div className="execution-plan-detail__kpi-actions">
              {isEditMode ? (
                <Button icon={<Link2 size={16} />} onClick={openAddKpiModal}>
                  Add Existing KPIs
                </Button>
              ) : null}
              <Button icon={<Plus size={16} />} onClick={openCreateKpiDrawer}>
                Add KPI
              </Button>
            </div>
          </div>

          <section className={`edit-activity__milestone-quarter execution-plan-detail__kpi-panel${isKpiPanelExpanded ? ' edit-activity__milestone-quarter--expanded execution-plan-detail__kpi-panel--expanded' : ''}`}>
            <div
              aria-expanded={isKpiPanelExpanded}
              aria-label="KPI summary"
              className="edit-activity__milestone-quarter-summary execution-plan-detail__kpi-panel-summary"
              onClick={() => setIsKpiPanelExpanded((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setIsKpiPanelExpanded((current) => !current)
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="edit-activity__milestone-quarter-top">
                <div className="edit-activity__milestone-quarter-heading">
                  <span className="edit-activity__milestone-quarter-number">
                    <Target size={15} />
                  </span>
                  <div>
                    <h3>KPI Register</h3>
                    <span className="edit-activity__milestone-quarter-range">Performance indicators linked to this execution plan.</span>
                  </div>
                </div>
                <div className="edit-activity__milestone-quarter-controls">
                  <span className="edit-activity__milestone-quarter-status edit-activity__milestone-quarter-status--no-milestones">
                    {linkedKpis.length ? `${linkedKpis.length} KPI${linkedKpis.length > 1 ? 's' : ''}` : 'No KPI'}
                  </span>
                  <button
                    aria-label={`${isKpiPanelExpanded ? 'Collapse' : 'Expand'} KPIs`}
                    className="edit-activity__milestone-quarter-toggle"
                    onClick={(event) => {
                      event.stopPropagation()
                      setIsKpiPanelExpanded((current) => !current)
                    }}
                    type="button"
                  >
                    {isKpiPanelExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              <div className="edit-activity__milestone-quarter-ai-summary">
                <div className="edit-activity__milestone-quarter-ai-icon" aria-hidden="true">
                  <Sparkles size={14} />
                </div>
                <div className="edit-activity__milestone-quarter-ai-copy">
                  <span className="edit-activity__milestone-quarter-ai-label">KPI AI Summary</span>
                  <p>AI summary is not available for linked KPIs yet.</p>
                </div>
              </div>

              <div className="edit-activity__milestone-quarter-insights edit-activity__milestone-quarter-insights--no-weightage execution-plan-detail__kpi-panel-insights">
                <div className="edit-activity__milestone-quarter-metrics">
                  <span className="edit-activity__milestone-quarter-metric">
                    <small>Total KPIs</small>
                    <strong>{linkedKpis.length}</strong>
                  </span>
                  <span className="edit-activity__milestone-quarter-metric">
                    <small>New KPIs</small>
                    <strong>{newKpisCount}</strong>
                  </span>
                </div>
                <div className="edit-activity__milestone-quarter-metrics">
                  <span className="edit-activity__milestone-quarter-metric">
                    <small>Quarterly</small>
                    <strong>{quarterlyKpisCount}</strong>
                  </span>
                  <span className="edit-activity__milestone-quarter-metric">
                    <small>Active/Draft</small>
                    <strong>{activeKpisCount}</strong>
                  </span>
                </div>
              </div>
            </div>

            {isKpiPanelExpanded ? (
              <div className="edit-activity__milestone-quarter-body execution-plan-detail__kpi-panel-body">
                {linkedKpis.length > 0 ? (
                  <div className="execution-plan-detail__kpi-panel-scroll">
                    <div className="execution-plan-detail__kpi-panel-table">
                      <div className="execution-plan-detail__kpi-panel-row execution-plan-detail__kpi-panel-row--head">
                        <div>KPI Name</div>
                        <div>Measurement</div>
                        <div>Status</div>
                        <div>Actions</div>
                      </div>
                      {linkedKpis.map(renderKpiPanelRow)}
                    </div>
                  </div>
                ) : (
                  <div className="edit-activity__milestone-quarter-empty execution-plan-detail__kpi-panel-empty">
                    <FileText size={22} strokeWidth={1.5} />
                    <strong>No KPI records yet</strong>
                    <span>Link an existing KPI or create a KPI placeholder for this execution plan.</span>
                  </div>
                )}
              </div>
            ) : null}
          </section>
        </div>

        <SideDrawer
          actions={(
            <div className="edit-activity__milestones-drawer-actions">
              <Button className="edit-activity__milestones-drawer-button" onClick={closeAddKpiModal} variant="secondary">Cancel</Button>
              <Button className="edit-activity__milestones-drawer-button" disabled={isLoadingKpis || isSavingKpi || Boolean(kpiLoadError)} icon={<Check size={15} />} onClick={() => { void handleAddExistingKpis() }}>{isSavingKpi ? 'Saving...' : 'Save KPI Links'}</Button>
            </div>
          )}
          isOpen={isAddKpiModalOpen}
          onClose={closeAddKpiModal}
          title="Add Existing KPIs"
        >
          <div className="edit-activity__milestones-drawer execution-plan-detail__kpi-link-drawer">
            <div className="edit-activity__milestones-drawer-card">
              <div className="create-activity__section-header edit-activity__milestones-drawer-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true">
                    <Link2 size={16} />
                  </span>
                  <div>
                    <h2>Add Existing KPIs</h2>
                    <p>Select KPIs to link with this execution plan activity.</p>
                  </div>
                </div>
              </div>

              <div className="edit-activity__milestones-drawer-section execution-plan-detail__kpi-link-modal">
                <label className="execution-plan-detail__related-search">
                  <span>
                    <Search size={14} />
                    Search KPIs
                  </span>
                  <input
                    onChange={(event) => setKpiSearch(event.target.value)}
                    placeholder="Type to search..."
                    type="text"
                    value={kpiSearch}
                  />
                </label>

                <div className="execution-plan-detail__related-picker">
                  <div className="execution-plan-detail__related-picker-title">
                    <List size={14} />
                    <span>Select KPIs</span>
                  </div>
                  <div className="execution-plan-detail__related-picker-list">
                    {isLoadingKpis ? <ExecutionSkeleton compact /> : kpiLoadError ? <div role="alert">{kpiLoadError}<Button onClick={() => { void loadAvailableKpis() }} variant="secondary">Retry</Button></div> : filteredKpiOptions.length === 0 ? <p>No available KPIs found.</p> : null}
                    {!isLoadingKpis && !kpiLoadError && filteredKpiOptions.map((kpi) => (
                      <label className="execution-plan-detail__related-picker-row" key={kpi.id}>
                        <input
                          checked={pendingKpiIds.includes(kpi.id)}
                          disabled={isSavingKpi}
                          onChange={() => togglePendingKpi(kpi.id)}
                          type="checkbox"
                        />
                        <span className="execution-plan-detail__related-picker-check" aria-hidden="true" />
                        <span className="execution-plan-detail__related-picker-name">{kpi.name}</span>
                        {kpi.alreadyLinked ? <span className="execution-plan-detail__related-picker-badge">Already Linked</span> : null}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="execution-plan-detail__related-selected">
                  <div className="execution-plan-detail__related-selected-head">
                    <span>
                      <Link2 size={14} />
                      Selected KPIs
                    </span>
                    <strong>{pendingKpis.length}</strong>
                  </div>
                  <div className="execution-plan-detail__related-selected-body">
                    {pendingKpis.length > 0 ? pendingKpis.map((kpi) => (
                      <span className="execution-plan-detail__related-selected-pill" key={kpi.id}>
                        {kpi.name}
                      </span>
                    )) : <span>No KPIs selected</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SideDrawer>

        <SideDrawer
          actions={(
            <div className="edit-activity__milestones-drawer-actions">
              <Button className="edit-activity__milestones-drawer-button" disabled={isSavingKpi} onClick={() => setIsCreateKpiModalOpen(false)} variant="secondary">Cancel</Button>
              <Button className="edit-activity__milestones-drawer-button" disabled={isSavingKpi} onClick={handleCreateKpiConfirm}>{isSavingKpi ? 'Saving...' : editingKpiId ? 'Update KPI' : 'Confirm'}</Button>
            </div>
          )}
          isOpen={isCreateKpiModalOpen}
          onClose={() => setIsCreateKpiModalOpen(false)}
          title={editingKpiId ? 'Edit KPI' : 'Create KPI'}
        >
          <div className="edit-activity__procurement-drawer execution-plan-detail__kpi-create-drawer">
            <div className="edit-activity__procurement-section edit-activity__procurement-drawer-card execution-plan-detail__kpi-create-card">
              <div className="create-activity__section-header edit-activity__procurement-drawer-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true">
                    <Target size={16} />
                  </span>
                  <div>
                    <h2>KPI Information</h2>
                    <p>Capture KPI details, measurement rules, history, and targets.</p>
                  </div>
                </div>
              </div>

              <div className="edit-activity__procurement-drawer-section execution-plan-detail__kpi-create-modal">
                <div className="create-activity__form-row create-activity__form-row--two">
                  <Input error={executionKpiErrors.kpiName} label="KPI Name" onChange={(event) => updateExecutionKpiForm({ kpiName: event.target.value })} required value={executionKpiForm.kpiName} />
                  <Input dir="rtl" label="اسم مؤشر" required />
                </div>
                <RadioGroup error={executionKpiErrors.directorate} label="Directorate" name="execution-detail-kpi-directorate" onChange={(value) => updateExecutionKpiForm({ directorate: value })} options={KPI_DIRECTORATE_OPTIONS} required value={executionKpiForm.directorate} />
                <div className="create-activity__form-row create-activity__form-row--two">
                  <Textarea error={executionKpiErrors.description} label="KPI Description" onChange={(event) => updateExecutionKpiForm({ description: event.target.value })} required rows={4} value={executionKpiForm.description} />
                  <Textarea dir="rtl" label="وصف مؤشر الأداء الرئيسي" required rows={4} />
                </div>
              </div>
            </div>

            <div className="edit-activity__procurement-section edit-activity__procurement-drawer-card execution-plan-detail__kpi-create-card">
              <div className="create-activity__section-header edit-activity__procurement-drawer-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true">
                    <BarChart3 size={16} />
                  </span>
                  <div>
                    <h2>Measurement Rules</h2>
                    <p>Define calculation, source data, polarity, unit, and frequency.</p>
                  </div>
                </div>
              </div>

              <div className="edit-activity__procurement-drawer-section execution-plan-detail__kpi-create-modal">
                <div className="create-activity__form-row create-activity__form-row--two">
                  <Textarea error={executionKpiErrors.calculationMethod} label="Calculation Method" onChange={(event) => updateExecutionKpiForm({ calculationMethod: event.target.value })} required rows={4} value={executionKpiForm.calculationMethod} />
                  <Textarea dir="rtl" label="طريقة الحساب" required rows={4} />
                </div>
                <div className="create-activity__form-row create-activity__form-row--two">
                  <Textarea error={executionKpiErrors.sourceOfData} label="Source of Data" onChange={(event) => updateExecutionKpiForm({ sourceOfData: event.target.value })} required rows={4} value={executionKpiForm.sourceOfData} />
                  <Textarea error={executionKpiErrors.expectedImpact} label="Expected Impact" onChange={(event) => updateExecutionKpiForm({ expectedImpact: event.target.value })} required rows={4} value={executionKpiForm.expectedImpact} />
                </div>
                <RadioGroup error={executionKpiErrors.polarity} label="Polarity" name="execution-detail-kpi-polarity" onChange={(value) => updateExecutionKpiForm({ polarity: value })} options={KPI_POLARITY_OPTIONS} required value={executionKpiForm.polarity} />
                <div className="create-activity__form-row create-activity__form-row--two">
                  <Select error={executionKpiErrors.kpiType} id="execution-detail-kpi-type" label="KPI Type" onChange={(value) => updateExecutionKpiForm({ kpiType: value })} options={KPI_TYPE_SELECT_OPTIONS} required value={executionKpiForm.kpiType} />
                  <Select error={executionKpiErrors.kpiUnit} id="execution-detail-kpi-unit" label="Unit" onChange={(value) => updateExecutionKpiForm({ kpiUnit: value })} options={KPI_UNIT_SELECT_OPTIONS} required value={executionKpiForm.kpiUnit} />
                </div>
                <div className="create-activity__form-row create-activity__form-row--two">
                  <RadioGroup disabled label="KPI Availability" name="execution-detail-kpi-availability" onChange={() => undefined} options={KPI_AVAILABILITY_OPTIONS} required value="new" />
                  <RadioGroup error={executionKpiErrors.periodicMeasurement} label="Periodic Measurement" name="execution-detail-kpi-periodic" onChange={(value) => updateExecutionKpiForm({ periodicMeasurement: value })} options={KPI_MEASUREMENT_OPTIONS} required value={executionKpiForm.periodicMeasurement} />
                </div>
                <div className="create-activity__form-row create-activity__form-row--two">
                  <Input error={executionKpiErrors.benchmarkable} label="KPI Benchmarkable" onChange={(event) => updateExecutionKpiForm({ benchmarkable: event.target.value })} required value={executionKpiForm.benchmarkable} />
                  <Input label="Benchmark (If Applicable)" onChange={(event) => updateExecutionKpiForm({ benchmark: event.target.value })} value={executionKpiForm.benchmark} />
                </div>

              </div>
            </div>

            <div className="edit-activity__procurement-section edit-activity__procurement-drawer-card execution-plan-detail__kpi-create-card">
              <div className="create-activity__section-header edit-activity__procurement-drawer-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true">
                    <History size={16} />
                  </span>
                  <div>
                    <h2>Historical Data</h2>
                    <p>Record actual historical values used for KPI context.</p>
                  </div>
                </div>
              </div>

              <div className="edit-activity__procurement-drawer-section execution-plan-detail__kpi-create-modal">
                <section className="execution-plan-detail__kpi-modal-section">
                  <h3>Historical Data (Actual Value)</h3>
                  <div className="create-activity__form-row create-activity__form-row--three">
                    {KPI_HISTORICAL_YEARS.map((year) => (
                      <CurrencyInput defaultValue="" key={year} label={year} required />
                    ))}
                  </div>
                </section>
              </div>
            </div>

            <div className="edit-activity__procurement-section edit-activity__procurement-drawer-card execution-plan-detail__kpi-create-card">
              <div className="create-activity__section-header edit-activity__procurement-drawer-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true">
                    <Flag size={16} />
                  </span>
                  <div>
                    <h2>Targets</h2>
                    <p>Set quarterly KPI targets for upcoming years.</p>
                  </div>
                </div>
              </div>

              <div className="edit-activity__procurement-drawer-section execution-plan-detail__kpi-create-modal">
                <section className="execution-plan-detail__kpi-modal-section">
                  <h3>Targets</h3>
                  <div className="create-kpi__target-grid">
                    {KPI_TARGET_YEARS.map((year) => (
                      <div className="create-kpi__target-year" key={year}>
                        <h3>{year} Targets</h3>
                        {[1, 2, 3, 4].map((quarter) => (
                          <CurrencyInput defaultValue="" key={`${year}-${quarter}`} label={`Quarter ${quarter}`} required />
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </div>
        </SideDrawer>
      </>
    )
  }

  function validateWorkflowSubmit() {
    if (!validateExecutionPlanForSave()) return false

    const missing: string[] = []

    if (!draft.activityLeadId?.trim()) missing.push('Activity Lead / PM Name')
    if (linkedKpis.length === 0) missing.push('KPIs')
    if (milestones.length === 0) missing.push('Milestones')

    if (missing.length > 0) {
      setDetailError('')
      setPersistentError(`Complete required Execution Plan data before submitting: ${missing.join(', ')}.`)
      if (linkedKpis.length === 0) {
        setActiveTab('kpis')
      } else if (milestones.length === 0) {
        setActiveTab('milestone')
      }
      scrollToFirstExecutionPlanError()
      return false
    }

    return true
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
    if (!teamId) throw new Error(`${teamName} team could not be found.`)

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
        // Try the next configured candidate before falling back to a broader lookup.
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

  async function resolvePlanningInstanceTeam(
    teamField: '_dga_division_member_team_value' | '_dga_division_director_team_value' | '_dga_executive_director_team_value',
    fallbackName: string,
  ) {
    const planningInstanceId = normalizeId(project?._dga_project_planning_instance_value)
    if (!planningInstanceId) {
      throw new Error('Planning instance could not be resolved for this Execution Plan activity.')
    }

    const result = await Dga_project_planning_instancesService.get(planningInstanceId, {
      select: ['dga_project_planning_instanceid', teamField],
    })
    assertOperationSuccess(result, `Unable to load ${fallbackName} team from the planning instance.`)

    const planningInstance = getResultValue<Dga_project_planning_instances>(result) as Dga_project_planning_instances & Record<string, unknown>
    const teamId = normalizeId(planningInstance?.[teamField] as string | undefined)
    if (!teamId) throw new Error(`${fallbackName} team could not be resolved from the current planning instance.`)

    let teamName = fallbackName
    try {
      const teamResult = await TeamsService.get(teamId, {
        select: ['teamid', 'name'],
      })
      assertOperationSuccess(teamResult, `Unable to load ${fallbackName} team name.`)
      teamName = getResultValue<Teams>(teamResult)?.name || teamName
    } catch {
      // Owner assignment can still proceed with the resolved team id.
    }

    return {
      id: teamId,
      name: teamName,
    }
  }

  async function resolveWorkflowTargetTeam(step: ExecutionWorkflowStep) {
    if (step.targetTeamResolver === 'division-member') {
      return resolvePlanningInstanceTeam('_dga_division_member_team_value', 'AOP - Division Member')
    }

    if (step.targetTeamResolver === 'division-director') {
      return resolvePlanningInstanceTeam('_dga_division_director_team_value', 'AOP - Division Director')
    }

    if (step.targetTeamResolver === 'executive-director') {
      return resolvePlanningInstanceTeam('_dga_executive_director_team_value', 'AOP - Executive Director')
    }

    if (step.targetTeamResolver === 'strategy-team') return resolveTeamByName('AOP - Strategy Team')
    if (step.targetTeamResolver === 'director-general') return resolveTeamByName('AOP - Director General')
    if (step.targetTeamResolver === 'adeo') {
      return resolveTeamByCandidateNames(['AOP - ADEO', 'AOP - ADEO Team'], 'ADEO')
    }
    return resolveTeamByCandidateNames(['AOP - ADEO Team', 'AOP - ADEO'], 'ADEO')
  }

  async function handleWorkflowSubmit() {
    if (!projectId || isSubmittingWorkflow || !workflowStep) return

    setDetailError('')
    setSaveMessage('')

    if (hasOwnerMismatch) {
      setPersistentError('This project is pending response from another user. You cannot edit it at this stage.')
      return
    }

    if (!canUseWorkflowAction) {
      const allowedRoleLabel = workflowStep.allowedRoles?.join(' or ') ?? workflowStep.requiredRole
      setDetailError(`Only ${allowedRoleLabel} can perform this action when the activity is pending with that role.`)
      return
    }

    if (!validateWorkflowSubmit()) return

    setIsSubmittingWorkflow(true)

    try {
      const nextOwner = await resolveWorkflowTargetTeam(workflowStep)
      const shouldUseSelectedExecutionStatus = isExecutionPhase
        && statusCode === 576610001
        && !workflowStep.targetActivityStatus
      const selectedExecutionStatus = Number(executionActivityStatus) as Dga_aop_projectsesBase['dga_project_activity_status']
      const nextActivityStatus = workflowStep.targetActivityStatus
        ?? (shouldUseSelectedExecutionStatus ? selectedExecutionStatus : undefined)
      const payload: Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>> & { 'ownerid@odata.bind': string } = {
        'ownerid@odata.bind': toEntityBind('teams', nextOwner.id),
        dga_is_rejected: false,
        dga_rejection_reason: '',
        statuscode: workflowStep.targetStatus as Dga_aop_projectsesBase['statuscode'],
      }

      if (nextActivityStatus) {
        payload.dga_project_activity_status = nextActivityStatus
      }

      if (workflowStep.targetPhase) {
        payload.dga_project_phase = workflowStep.targetPhase
      }

      const result = await Dga_aop_projectsesService.update(projectId, payload)
      assertOperationSuccess(result, `Unable to ${workflowStep.actionLabel.toLowerCase()}.`)

      setProject((currentProject) => currentProject ? {
        ...currentProject,
        _owningteam_value: nextOwner.id,
        _owninguser_value: undefined,
        dga_is_rejected: false,
        dga_rejection_reason: '',
        dga_project_activity_status: nextActivityStatus ?? currentProject.dga_project_activity_status,
        dga_project_phase: workflowStep.targetPhase ?? currentProject.dga_project_phase,
        statuscode: workflowStep.targetStatus as Dga_aop_projectsesBase['statuscode'],
      } : currentProject)
      setOwnerName(nextOwner.name)
      setIsEditing(false)
      setSaveMessage(workflowStep.successMessage)
    } catch (error) {
      setDetailError(normalizeDataverseErrorMessage(
        error instanceof Error ? error.message : '',
        `Unable to ${workflowStep.actionLabel.toLowerCase()}.`,
      ))
    } finally {
      setIsSubmittingWorkflow(false)
    }
  }

  async function handleSaveDraft(): Promise<boolean> {
    if (!projectId || isSaving || !canEditExecutionPlan) return false
    if (hasOwnerMismatch) {
      setPersistentError('This project is pending response from another user. You cannot edit it at this stage.')
      return false
    }

    if (budgetHeaderAction?.hasUnsavedChanges) {
      setActiveTab('budgeting')
      const budgetSaved = await budgetHeaderAction.onSave()
      if (!budgetSaved) {
        scrollToFirstExecutionPlanError()
        return false
      }
    }

    if (!validateExecutionPlanForSave()) return false

    setIsSaving(true)
    setDetailError('')
    setPersistentError('')
    setSaveMessage('')

    try {
      const existingRelatedChanges = project?.dga_project_related_changes
      const relatedChanges = parseExecutionRelatedChanges(existingRelatedChanges)
      const executionDetailChanges = {
        ...relatedChanges,
        executionPlanDetail: {
          arabicSummary: draft.arabicSummary ?? '',
          corporateStrategyPillar,
          digitalStrategyPillar,
          digitalStrategyObjective,
          monthlyBudgets,
          strategicKpis,
        },
      }
      const nextRelatedChanges = isExecutionPhase
        ? parseProjectRelatedChanges(stringifyMergedChangeBucket(
          JSON.stringify(executionDetailChanges),
          'activity_change',
          buildPlanningActivityChangesForExecution(existingRelatedChanges),
        ))
        : executionDetailChanges
      const totalPlanned = monthlyBudgets.reduce((total, value) => total + parseCurrencyDraft(value), 0)
      const isProgram = draft.executionPlanType === 'program'
      const projectPayload: Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>> = {
        dga_activity_type: isProgram ? 4 : 1,
        dga_allocated_budget: parseCurrencyDraft(allocatedBudget),
        dga_budget_source: budgetSource ? Number(budgetSource) as Dga_aop_projectsesBase['dga_budget_source'] : undefined,
        dga_budget_type: budgetType ? Number(budgetType) as Dga_aop_projectsesBase['dga_budget_type'] : undefined,
        dga_description_summary: draft.summary ?? '',
        dga_longtermimpactprojectlongtermimpact: draft.longTermImpact ?? '',
        dga_name: draft.activityName?.trim() || 'Untitled Execution Plan Activity',
        dga_planned_end_date: draft.plannedEndDate ?? '',
        dga_planned_start_date: draft.plannedStartDate ?? '',
        dga_project_description: draft.scope ?? '',
        dga_project_kpi: draft.activityKpi ?? '',
        dga_project_long_term_impact: draft.overallLongTermImpact ?? '',
        dga_project_name: draft.arabicName || draft.activityName || 'Untitled Execution Plan Activity',
        dga_project_plan_if_any: draft.activityPlan ?? '',
        dga_project_type: isProgram ? 3 : 1,
        dga_project_related_changes: JSON.stringify(nextRelatedChanges),
        dga_requested_budget: totalPlanned,
        dga_risks: draft.risks ?? '',
        dga_scope: draft.scope ?? '',
        dga_stakeholders: draft.stakeholder ?? '',
        dga_total_project_budget: totalPlanned,
      }
      const projectResult = await Dga_aop_projectsesService.update(projectId, projectPayload)
      assertOperationSuccess(projectResult, 'Unable to save execution plan activity.')

      for (const deletedId of deletedMilestoneIds) {
        await Dga_aop_project_milestone_detailsesService.delete(deletedId)
      }

      const savedMilestones: ExecutionMilestone[] = []
      for (const milestone of milestones) {
        const payload = buildMilestonePayload(milestone, projectId)
        if (milestone.id.startsWith('execution-milestone-')) {
          const result = await Dga_aop_project_milestone_detailsesService.create(payload)
          assertOperationSuccess(result, 'Unable to create milestone.')
          const created = getResultValue<Dga_aop_project_milestone_detailses>(result)
          savedMilestones.push({
            ...milestone,
            id: created?.dga_aop_project_milestone_detailsid ?? milestone.id,
          })
        } else {
          const result = await Dga_aop_project_milestone_detailsesService.update(milestone.id, payload)
          assertOperationSuccess(result, 'Unable to update milestone.')
          savedMilestones.push(milestone)
        }
      }

      const nextProject = getResultValue<Dga_aop_projectses>(projectResult)
      setProject(nextProject ? { ...nextProject, dga_project_related_changes: JSON.stringify(nextRelatedChanges) } : project)
      setMilestones(savedMilestones)
      setDeletedMilestoneIds([])
      setIsEditing(false)
      setFieldErrors({})
      setPersistentError('')
      setSaveMessage('Execution plan activity saved successfully.')
      setSavedRevision((value) => value + 1)
      void executionAi.reload(true)
      return true
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : 'Unable to save execution plan activity.')
      return false
    } finally {
      setIsSaving(false)
    }
  }

  function renderBudgetReadOnlyTiles(items: Array<{ label: string, value: ReactNode, variant?: 'success' }>) {
    return (
      <dl className="edit-activity__budget-readonly-tiles">
        {items.map((item) => (
          <div
            className={`edit-activity__budget-readonly-tile${item.variant ? ` edit-activity__budget-readonly-tile--${item.variant}` : ''}`}
            key={item.label}
          >
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    )
  }

  function renderBudgetMonthCards(months: readonly string[], label: string) {
    return (
      <div className="edit-activity__budget-readonly-months">
        <span className="edit-activity__budget-item-months-title">{label}</span>
        <div className="edit-activity__budget-readonly-month-grid">
          {MONTH_LABELS.map((month, monthIndex) => (
            <div className="edit-activity__budget-readonly-month" key={month}>
              <span>{month.slice(0, 3)}</span>
              <strong><CurrencyDisplay value={parseCurrencyDraft(months[monthIndex] ?? '0')} /></strong>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderSingleBudgetReadOnlyCard() {
    const allocatedBudgetValue = parseCurrencyDraft(allocatedBudget)
    const delta = totalPlannedBudget - allocatedBudgetValue
    const budgetSourceLabel = getOptionLabel(BUDGET_SOURCE_OPTIONS, budgetSource) || '-'
    const budgetTypeLabel = getOptionLabel(BUDGET_TYPE_OPTIONS, budgetType) || '-'

    return (
      <section className="edit-activity__budget-readonly-card" aria-label="Budget allocation summary">
        <div className="edit-activity__budget-readonly-card-header">
          <div className="edit-activity__budget-readonly-card-main">
            <span className="edit-activity__budget-item-number">B1</span>
            <strong>Budget Allocation</strong>
            <span className="edit-activity__budget-item-pill">{budgetSourceLabel}</span>
            <span className="edit-activity__budget-item-pill">{budgetTypeLabel}</span>
          </div>
          <div className="edit-activity__budget-item-total">
            <span>Total Planned Budget</span>
            <CurrencyDisplay value={totalPlannedBudget} />
          </div>
        </div>

        {renderBudgetReadOnlyTiles([
          { label: 'Budget Source', value: budgetSourceLabel },
          { label: 'Budget Type', value: budgetTypeLabel },
          { label: 'Allocated Budget', value: <CurrencyDisplay value={allocatedBudgetValue} /> },
          { label: 'Delta', value: <CurrencyDisplay value={delta} />, variant: 'success' },
        ])}

        {renderBudgetMonthCards(monthlyBudgets, 'Planned Cash Flow - Jan to Dec')}
      </section>
    )
  }

  function renderBudgeting() {
    if (isExecutionPhase && projectId) {
      const budgetActivityScope = String(project?.dga_strategic_vs_operation ?? '')

      return (
        <BudgetTab
          activityScope={budgetActivityScope === '1' || budgetActivityScope === '2' ? budgetActivityScope : ''}
          canEditExecutionBudget={canEditExecutionFields}
          hierarchyId={normalizeId(project?._dga_department_value)}
          isEditing={canEditExecutionFields}
          isExecutionPhase={isExecutionPhase}
          isReadOnly={!canEditExecutionFields}
          onActivityDataChanged={() => { setSaveMessage('Budget information updated successfully.'); void executionAi.reload(true) }}
          onHeaderActionChange={setBudgetHeaderAction}
          aiSummaryBlocks={{ summary: executionAi.summaries.Budget }}
          aiSummaryError={executionAi.error}
          isAiSummaryLoading={executionAi.isLoading}
          onOperationAlert={handleTabOperationAlert}
          onProjectRelatedChangesChange={handleProjectRelatedChangesUpdate}
          plannedEndDate={draft.plannedEndDate ?? ''}
          plannedStartDate={draft.plannedStartDate ?? ''}
          projectId={projectId}
          projectRelatedChanges={project?.dga_project_related_changes}
          statusCode={statusCode}
        />
      )
    }

    return (
      <>
        {renderAiSummaryCard('Budget')}

        <Card className="create-activity__section edit-activity__budget-allocation-card execution-plan-detail__budget-edit-card">
          <div className="create-activity__section-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <Wallet size={18} />
              </span>
              <div>
                <span>Budget Allocation</span>
                <h2>Source, type, and amounts</h2>
                <p>Select the budget source, budget type, and allocated amount for this execution activity.</p>
              </div>
            </div>
          </div>

          {!isEditMode ? (
            renderSingleBudgetReadOnlyCard()
          ) : (
          <div className="create-activity__form-stack">
            <div className="edit-activity__budget-choice-stack">
              <RadioGroup
                className="edit-activity__budget-source"
                error={fieldErrors.budgetSource}
                label="Budget Source"
                name="execution-budget-source"
                onChange={(value) => {
                  setBudgetSource(value)
                  clearFieldError('budgetSource')
                }}
                options={BUDGET_SOURCE_OPTIONS}
                required
                value={budgetSource}
              />
              <RadioGroup
                className="edit-activity__budget-type"
                error={fieldErrors.budgetType}
                label="Budget Type"
                name="execution-budget-type"
                onChange={(value) => {
                  setBudgetType(value)
                  clearFieldError('budgetType')
                }}
                options={BUDGET_TYPE_OPTIONS}
                required
                value={budgetType}
              />
            </div>

            <div className="create-activity__form-row create-activity__form-row--two">
              <CurrencyInput
                className="edit-activity__budget-disabled-currency"
                disabled
                label="Total Planned Budget"
                required
                value={String(totalPlannedBudget)}
                hint="Auto-calculated from monthly budgets"
              />
              <CurrencyInput
                error={fieldErrors.allocatedBudget}
                label="Allocated Budget"
                onChange={(event) => {
                  setAllocatedBudget(normalizeCurrencyDraft(event.target.value))
                  clearFieldError('allocatedBudget')
                }}
                required
                value={allocatedBudget}
              />
            </div>
          </div>
          )}
        </Card>

        {isEditMode ? <Card className="create-activity__section edit-activity__monthly-budget-section">
          <div className="create-activity__section-header edit-activity__budget-breakdown-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <Wallet size={18} />
              </span>
              <div>
                <span>Monthly Budget Breakdown</span>
                <h2>12-month allocation grid</h2>
                <p>Review and update the monthly budget distribution for the execution plan.</p>
              </div>
            </div>
          </div>

          <div className="create-activity__form-stack edit-activity__monthly-body">
            <div className="edit-activity__monthly-overview">
              <div className="edit-activity__monthly-intro">
                <span className="edit-activity__monthly-icon" aria-hidden="true">
                  <CalendarDays size={17} />
                </span>
                <div>
                  <strong>Fiscal year allocation</strong>
                  <span>Update the planned budget on the 12 monthly rows created by the activity plugin.</span>
                </div>
              </div>
              <div className="edit-activity__monthly-metrics">
                <div className="edit-activity__monthly-metric">
                  <span>Annual planned total</span>
                  <CurrencyDisplay value={totalPlannedBudget} />
                </div>
                <div className="edit-activity__monthly-metric edit-activity__monthly-metric--progress">
                  <span>Rows loaded</span>
                  <strong>12/12 months</strong>
                </div>
              </div>
              <div aria-hidden="true" className="edit-activity__monthly-progress-track">
                <span style={{ width: '100%' }} />
              </div>
            </div>

            <div className="edit-activity__monthly-quarter-grid">
              {QUARTERS.map((quarter) => {
                const quarterMonths = MONTH_LABELS.slice(quarter.start, quarter.start + 3)
                const quarterTotal = monthlyBudgets
                  .slice(quarter.start, quarter.start + 3)
                  .reduce((total, value) => total + parseCurrencyDraft(value), 0)

                return (
                  <div className={`edit-activity__monthly-quarter${quarter.current ? ' edit-activity__monthly-quarter--current' : ''}`} key={quarter.label}>
                    <div className="edit-activity__monthly-quarter-header">
                      <div className="edit-activity__monthly-quarter-title">
                        <span className="edit-activity__monthly-quarter-number">{quarter.label}</span>
                        <span className="edit-activity__monthly-quarter-range">{quarter.range}</span>
                        {quarter.current ? <span className="edit-activity__monthly-current-badge">Current</span> : null}
                      </div>
                      <div className="edit-activity__monthly-quarter-total">
                        <span>Quarter total</span>
                        <CurrencyDisplay value={quarterTotal} />
                      </div>
                    </div>
                    <div className="edit-activity__monthly-quarter-fields">
                      {quarterMonths.map((month, offset) => {
                        const monthIndex = quarter.start + offset

                        return (
                          <CurrencyInput
                            className="edit-activity__monthly-field"
                            error={fieldErrors.monthlyBudgets}
                            key={month}
                            label={month}
                            onChange={(event) => {
                              updateMonthlyBudget(monthIndex, event.target.value)
                              clearFieldError('monthlyBudgets')
                            }}
                            required
                            value={monthlyBudgets[monthIndex]}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card> : null}
      </>
    )
  }

  function updateMilestoneForm(fields: Partial<ExecutionMilestoneForm>) {
    setMilestoneForm((current) => ({ ...current, ...fields }))
    setMilestoneFormErrors((current) => {
      const next = { ...current }
      ;(Object.keys(fields) as Array<keyof ExecutionMilestoneForm>).forEach((key) => {
        delete next[key as keyof ExecutionMilestoneFormErrors]
      })
      return next
    })
  }

  function openMilestoneModal() {
    setEditingMilestoneId(null)
    setMilestoneForm(EMPTY_MILESTONE_FORM)
    setMilestoneFormErrors({})
    setIsMilestoneModalOpen(true)
  }

  function openEditMilestoneDrawer(milestone: ExecutionMilestone) {
    setEditingMilestoneId(milestone.id)
    setMilestoneForm({
      name: milestone.name,
      plannedStartDate: milestone.plannedStartDate,
      plannedEndDate: milestone.plannedEndDate,
      quarter: milestone.quarter,
      budget: milestone.budget,
      weightage: milestone.weightage,
      marhalaAlMashroua: milestone.marhalaAlMashroua,
      makhrajAlMarhala: milestone.makhrajAlMarhala,
      description: milestone.description,
    })
    setMilestoneFormErrors({})
    setIsMilestoneModalOpen(true)
  }

  function closeMilestoneDrawer() {
    setIsMilestoneModalOpen(false)
    setEditingMilestoneId(null)
    setMilestoneForm(EMPTY_MILESTONE_FORM)
    setMilestoneFormErrors({})
  }

  function handleConfirmMilestone() {
    const nextErrors = validateExecutionMilestoneForm(milestoneForm)
    setMilestoneFormErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      scrollToFirstExecutionPlanError()
      return
    }

    const plannedEndQuarter = getQuarterFromDate(milestoneForm.plannedEndDate)
    if (editingMilestoneId) {
      setMilestones((current) => current.map((milestone) => (
        milestone.id === editingMilestoneId
          ? {
              ...milestone,
              ...milestoneForm,
              quarter: milestoneForm.quarter || plannedEndQuarter || milestone.quarter || 'Quarter 1',
            }
          : milestone
      )))
      closeMilestoneDrawer()
      return
    }

    setMilestones((current) => [
      ...current,
      {
        ...milestoneForm,
        id: `execution-milestone-${Date.now()}`,
        quarter: milestoneForm.quarter || plannedEndQuarter || 'Quarter 1',
      },
    ])
    closeMilestoneDrawer()
  }

  function renderQuarterMilestoneRow(milestone: ExecutionMilestone) {
    return (
      <div className="edit-activity__milestone-item" key={milestone.id}>
        <div className="edit-activity__milestone-card">
          <div className="edit-activity__milestone-card-top">
            <div className="edit-activity__milestone-card-date">
              {formatDateLabel(milestone.plannedStartDate)} → {formatDateLabel(milestone.plannedEndDate)}
            </div>
          </div>
          <h3 className="edit-activity__milestone-card-title">
            <button
              className="edit-activity__milestone-card-name-btn"
              onClick={() => openEditMilestoneDrawer(milestone)}
              type="button"
            >
              {milestone.name || 'Untitled milestone'}
            </button>
          </h3>
          <div className="edit-activity__milestone-progress edit-activity__milestone-progress--compact">
            <div className="edit-activity__milestone-progress-meta">
              <span>Planned</span>
              <strong>0%</strong>
            </div>
            <div className="edit-activity__milestone-progress-track" aria-hidden="true">
              <span style={{ width: '0%' }} />
            </div>
          </div>
          <div className="edit-activity__milestone-card-bottom">
            <p className="edit-activity__milestone-card-desc">{milestone.description || ''}</p>
            <div className="edit-activity__milestone-card-actions">
              <button
                aria-label="Edit milestone"
                className="edit-activity__milestone-action-btn"
                onClick={() => openEditMilestoneDrawer(milestone)}
                type="button"
              >
                <Edit3 size={14} />
              </button>
              <button
                aria-label="Delete milestone"
                className="edit-activity__milestone-action-btn edit-activity__milestone-action-btn--danger"
                onClick={() => {
                  if (!milestone.id.startsWith('execution-milestone-')) {
                    setDeletedMilestoneIds((current) => Array.from(new Set([...current, milestone.id])))
                  }
                  setMilestones((current) => current.filter((item) => item.id !== milestone.id))
                }}
                type="button"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderMilestoneQuarter(quarter: string, index: number) {
    const quarterMilestones = milestones.filter((milestone) => milestone.quarter === quarter)
    const quarterRanges = ['Jan - Mar', 'Apr - Jun', 'Jul - Sep', 'Oct - Dec']
    const isExpanded = expandedMilestoneQuarter === quarter
    const plannedProgress = 0

    function toggleQuarter() {
      setExpandedMilestoneQuarter((currentQuarter) => (currentQuarter === quarter ? null : quarter))
    }

    return (
      <section className={`edit-activity__milestone-quarter${isExpanded ? ' edit-activity__milestone-quarter--expanded' : ''}`} key={quarter}>
        <div
          aria-expanded={isExpanded}
          aria-label={`${quarter} summary`}
          className="edit-activity__milestone-quarter-summary"
          onClick={toggleQuarter}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              toggleQuarter()
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="edit-activity__milestone-quarter-top">
            <div className="edit-activity__milestone-quarter-heading">
              <span className="edit-activity__milestone-quarter-number">Q{index + 1}</span>
              <div>
                <h3>{quarter}</h3>
                <span className="edit-activity__milestone-quarter-range">{quarterRanges[index]}</span>
              </div>
            </div>
            <div className="edit-activity__milestone-quarter-controls">
              <span className="edit-activity__milestone-quarter-status edit-activity__milestone-quarter-status--no-milestones">
                {quarterMilestones.length ? `${quarterMilestones.length} Milestone${quarterMilestones.length > 1 ? 's' : ''}` : 'No Milestones'}
              </span>
              <button
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${quarter}`}
                className="edit-activity__milestone-quarter-toggle"
                onClick={(event) => {
                  event.stopPropagation()
                  toggleQuarter()
                }}
                type="button"
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          <div className="edit-activity__milestone-quarter-ai-summary">
            <div className="edit-activity__milestone-quarter-ai-icon" aria-hidden="true">
              <Sparkles size={14} />
            </div>
            <div className="edit-activity__milestone-quarter-ai-copy">
              <span className="edit-activity__milestone-quarter-ai-label">Quarterly AI Summary</span>
              <p>AI summary is not available for this quarter yet.</p>
            </div>
          </div>

          <div className="edit-activity__milestone-quarter-insights edit-activity__milestone-quarter-insights--no-weightage">
            <div className="edit-activity__milestone-quarter-metrics">
              <span className="edit-activity__milestone-quarter-metric">
                <small>Milestones</small>
                <strong>{quarterMilestones.length}</strong>
              </span>
              <span className="edit-activity__milestone-quarter-metric">
                <small>Due Soon</small>
                <strong>0</strong>
              </span>
            </div>
            <div className="edit-activity__milestone-quarter-progress-layout">
              <div className="edit-activity__milestone-quarter-progress">
                <div className="edit-activity__milestone-quarter-progress-meta">
                  <span>Planned Progress</span>
                  <strong>{plannedProgress}%</strong>
                </div>
                <div aria-hidden="true"><i style={{ width: `${plannedProgress}%` }} /></div>
              </div>
            </div>
          </div>
        </div>

        {isExpanded ? (
          <div className="edit-activity__milestone-quarter-body">
            {quarterMilestones.length > 0 ? (
              <div className="edit-activity__milestone-quarter-table edit-activity__milestone-quarter-table--no-weightage">
                <div className="edit-activity__milestone-quarter-row edit-activity__milestone-quarter-row--head">
                  <div>Milestone</div>
                  <div>Timeline</div>
                  <div>Planned Progress</div>
                  <div>Actions</div>
                </div>
                {quarterMilestones.map(renderQuarterMilestoneRow)}
              </div>
            ) : (
              <div className="edit-activity__milestone-quarter-empty">
                <Flag size={22} strokeWidth={1.5} />
                <strong>No milestones yet</strong>
                <span>Add a milestone with a planned end date in this quarter.</span>
              </div>
            )}
          </div>
        ) : null}
      </section>
    )
  }

  function renderMilestonesListView() {
    return renderMilestonesQuarterView()
  }

  function renderMilestonesQuarterView() {
    return (
      <div className="edit-activity__milestone-quarter-grid">
        {['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'].map(renderMilestoneQuarter)}
      </div>
    )
  }

  function renderMilestones() {
    return (
      <>
        {renderAiSummaryCard('Milestone')}

        <div className="edit-activity__milestones">
          <div className="edit-activity__milestone-viewbar">
            <div className="edit-activity__members-header-text">
              <h2>Milestones</h2>
              <p>Track project milestones and key deliverables.</p>
            </div>
            <div className="edit-activity__milestone-header-actions">
              <Button icon={<Plus size={16} />} onClick={openMilestoneModal}>
                Add Milestone
              </Button>
              <div className="edit-activity__milestone-view-switch" aria-label="Milestone view switch">
                <button
                  aria-label="Quarter view"
                  aria-pressed={milestoneViewMode === 'quarter'}
                  className={`edit-activity__milestone-view-switch-btn ${milestoneViewMode === 'quarter' ? 'edit-activity__milestone-view-switch-btn--active' : ''}`}
                  onClick={() => setMilestoneViewMode('quarter')}
                  type="button"
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  aria-label="List view"
                  aria-pressed={milestoneViewMode === 'list'}
                  className={`edit-activity__milestone-view-switch-btn ${milestoneViewMode === 'list' ? 'edit-activity__milestone-view-switch-btn--active' : ''}`}
                  onClick={() => setMilestoneViewMode('list')}
                  type="button"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {isEditMode ? (
            <div className="edit-activity__milestones-weightage-remaining">
              <span className="edit-activity__milestones-weightage-remaining-label">Weightage remaining</span>
              <span className="edit-activity__milestones-weightage-remaining-value">{remainingMilestoneWeightage}%</span>
            </div>
          ) : null}

          {milestoneViewMode === 'quarter' ? renderMilestonesQuarterView() : renderMilestonesListView()}
        </div>

        <SideDrawer
          actions={(
            <div className="edit-activity__milestones-drawer-actions">
              <Button className="edit-activity__milestones-drawer-button" onClick={closeMilestoneDrawer} variant="secondary">
                Cancel
              </Button>
              <Button className="edit-activity__milestones-drawer-button" onClick={handleConfirmMilestone}>
                {editingMilestoneId ? 'Update Milestone' : 'Create Milestone'}
              </Button>
            </div>
          )}
          isOpen={isMilestoneModalOpen}
          onClose={closeMilestoneDrawer}
          title={editingMilestoneId ? 'Edit Milestone' : 'Create Milestone'}
        >
          <div className="edit-activity__milestones-drawer">
            <div className="edit-activity__milestones-drawer-card">
              <div className="create-activity__section-header edit-activity__milestones-drawer-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true">
                    <Flag size={16} />
                  </span>
                  <div>
                    <h2>Milestone Details</h2>
                    <p>Define the milestone name, quarter, and delivery description.</p>
                  </div>
                </div>
              </div>

              <div className="edit-activity__milestones-drawer-section">
            <Input
              error={milestoneFormErrors.name}
              label="Name of Milestone"
              onChange={(event) => updateMilestoneForm({ name: event.target.value })}
              required
              value={milestoneForm.name}
            />
                <div className="edit-activity__milestone-drawer-subhead">
                  <h3>Timeline</h3>
                  <p>Set the planned start and end dates for this milestone.</p>
                </div>

            <div className="create-activity__date-range">
              <DatePicker
                error={milestoneFormErrors.plannedStartDate}
                id="execution-milestone-start-date"
                label="Planned Start Date"
                onChange={(value) => updateMilestoneForm({ plannedStartDate: value })}
                required
                value={milestoneForm.plannedStartDate}
              />
              <span className="create-activity__date-connector" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
              <DatePicker
                error={milestoneFormErrors.plannedEndDate}
                id="execution-milestone-end-date"
                label="Planned End Date"
                min={milestoneForm.plannedStartDate}
                onChange={(value) => updateMilestoneForm({ plannedEndDate: value, quarter: getQuarterFromDate(value) })}
                required
                value={milestoneForm.plannedEndDate}
              />
            </div>
            <Input
              disabled
              label="Quarter"
              value={milestoneForm.quarter || 'Quarter'}
            />
            <div className="create-activity__form-row create-activity__form-row--two" hidden>
              <Input
                dir="rtl"
                label="مرحلة المشروع"
                onChange={(event) => updateMilestoneForm({ marhalaAlMashroua: event.target.value })}
                placeholder="Enter مرحلة المشروع"
                required
                value={milestoneForm.marhalaAlMashroua}
              />
              <Input
                dir="rtl"
                label="مخرجات المرحلة"
                onChange={(event) => updateMilestoneForm({ makhrajAlMarhala: event.target.value })}
                placeholder="Enter مخرجات المرحلة"
                required
                value={milestoneForm.makhrajAlMarhala}
              />
            </div>
            <Textarea
              label="Description"
              onChange={(event) => updateMilestoneForm({ description: event.target.value })}
              placeholder="Enter milestone description"
              value={milestoneForm.description}
            />
              </div>
            </div>
          </div>
        </SideDrawer>
      </>
    )
  }

  if (isLoading) return <ExecutionSkeleton />
  if (!project && detailError) return <EmptyState title="Unable to load execution activity" description={detailError} action={<Button variant="secondary" onClick={() => window.location.reload()}>Retry</Button>} />

  const persistentAlerts: PersistentAlert[] = [
    hasOwnerMismatch
      ? {
          id: 'owner-mismatch',
          lines: ['This project is pending response from another user. You cannot edit it at this stage.'],
          title: 'Pending response from another user',
          type: 'warning',
        }
      : null,
    persistentError
      ? {
          id: 'persistent-error',
          lines: persistentError.split('\n'),
          title: 'Action could not be completed',
          type: 'error',
        }
      : null,
  ].filter((alert): alert is PersistentAlert => Boolean(alert))

  return (
    <div className="edit-activity execution-plan-detail">
      <ExecutionUnsavedGuard key={`${projectId}-${savedRevision}-${project?.dga_project_activity_status}`} additionalDirty={budgetHeaderAction?.hasUnsavedChanges} isSaving={isSaving || isSavingKpi || isSubmittingActivityUpdates || isSubmittingWorkflow || Boolean(budgetHeaderAction?.isSaving)} snapshot={{ draft, corporateStrategyPillar, digitalStrategyPillar, digitalStrategyObjective, strategicKpis, budgetSource, budgetType, allocatedBudget, monthlyBudgets, milestones, deletedMilestoneIds, executionActivityStatus, executionStatusJustification }} onSave={async (hasFormChanges) => {
        const savedStatus = String(project?.dga_project_activity_status === 776140009 ? 776140009 : 776140006)
        if (executionActivityStatus !== savedStatus || executionStatusJustification !== (project?.dga_justification_for_activity_status ?? '')) {
          setDetailError('Submit Activity Updates to save status changes, or discard them before leaving.')
          return false
        }
        if (budgetHeaderAction?.hasUnsavedChanges) {
          if (!await budgetHeaderAction.onSave()) return false
          if (!hasFormChanges) return true
          setDetailError('Budget saved. Select Save and Continue again to save the remaining activity changes.')
          return false
        }
        return handleSaveDraft()
      }} onRestore={(value) => {
        budgetHeaderAction?.discardChanges?.()
        setDraft(value.draft); setCorporateStrategyPillar(value.corporateStrategyPillar); setDigitalStrategyPillar(value.digitalStrategyPillar); setDigitalStrategyObjective(value.digitalStrategyObjective); setStrategicKpis(value.strategicKpis)
        setBudgetSource(value.budgetSource); setBudgetType(value.budgetType); setAllocatedBudget(value.allocatedBudget); setMonthlyBudgets(value.monthlyBudgets); setMilestones(value.milestones); setDeletedMilestoneIds(value.deletedMilestoneIds); setExecutionActivityStatus(value.executionActivityStatus); setExecutionStatusJustification(value.executionStatusJustification); setIsEditing(false)
        setFieldErrors({})
        setPersistentError('')
      }} />
      <header className="create-activity__hero execution-plan-detail__hero">
        <div className="edit-activity__hero-top">
          <button className="execution-plan-detail__back edit-activity__back-link" onClick={() => confirmNavigation(() => navigate(APP_ROUTE_PATHS.executionPlanActivitiesList))} type="button">
            <ArrowLeft aria-hidden="true" size={16} />
            Back to Activities
          </button>
          <dl className="create-activity__organization-context edit-activity__organization-context">
            <div>
              <dt>Sector</dt>
              <dd title={sectorName}>{sectorName}</dd>
            </div>
            <div>
              <dt>Division</dt>
              <dd title={divisionName}>{divisionName}</dd>
            </div>
          </dl>
        </div>

        <nav aria-label="Breadcrumb" className="create-activity__breadcrumb">
          <Link to={APP_ROUTE_PATHS.dashboard}>Dashboard</Link>
          <span>/</span>
          <span>Execution Plan</span>
          <span>/</span>
          <span>{title}</span>
        </nav>

        <div className="edit-activity__hero-main">
          <div className="edit-activity__hero-title-row">
              <div className="create-activity__hero-icon" aria-hidden="true">
                <PenLine size={22} />
              </div>
              <div className="create-activity__hero-content">
                <h1>{title}</h1>
                <p>{cycleName} &mdash; Activity planning for the Digital Connect Execution Plan.</p>
              </div>
            </div>
            <div className="create-activity__hero-chips">
              <span className="create-activity__chip">
                <span className="create-activity__chip-label">Status</span>
                <Badge>{activityStatusLabel}</Badge>
              </span>
              <span className="create-activity__chip">
                <span className="create-activity__chip-label">Phase</span>
                <Badge tone="info">{phaseLabel}</Badge>
              </span>
              <span className="create-activity__chip">
                <span className="create-activity__chip-label">Approval</span>
                <Badge tone={statusCode === 776140011 ? 'success' : 'info'}>{approvalStatusLabel}</Badge>
              </span>
            </div>
          </div>
          <div className="create-activity__hero-footer edit-activity__hero-footer">
            <div className="create-activity__hero-actions edit-activity__hero-actions">
                {canShowStartActivityAction && !hasOwnerMismatch ? (
                  <Button disabled={isStartingActivity} icon={<CheckCircle2 size={16} />} onClick={handleStartActivityClick}>
                    {isStartingActivity ? 'Starting...' : 'Start Activity'}
                  </Button>
                ) : (
                  <>
                    {canEditExecutionPlan && !hasOwnerMismatch ? (
                      <Button className="edit-activity__card-btn edit-activity__edit-btn" disabled={isSubmittingWorkflow} icon={<PenLine size={16} />} onClick={() => setIsEditing(true)} variant="ghost">
                        {isEditMode ? 'Editing' : 'Edit Activity'}
                      </Button>
                    ) : null}
                    {!isDivisionMemberExecutionOwner || !canEditExecutionPlan ? (
                      <Button className="edit-activity__card-btn" icon={<FileText size={16} />} variant="ghost">
                        Activity Card
                      </Button>
                    ) : null}
                  </>
                )}
            </div>
          </div>
      </header>

      <PersistentAlerts alerts={persistentAlerts} />

      {isLoading ? (
        <div className="create-activity__notice">
          Loading execution plan activity...
        </div>
      ) : null}

      <div className="edit-activity__stages">
        <nav aria-label="Execution plan steps" className="edit-activity__stage-tabs execution-plan-detail__tabs">
          {visibleDetailTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.id === currentActiveTab

            return (
              <button
                aria-current={isActive ? 'page' : undefined}
                className={`edit-activity__stage-tab ${isActive ? 'edit-activity__stage-tab--active' : ''}`}
                key={tab.id}
                onClick={() => confirmNavigation(() => setActiveTab(tab.id))}
                type="button"
              >
                <Icon aria-hidden="true" size={16} />
                <span className="edit-activity__stage-tab-label">{tab.shortLabel}</span>
                <span className="edit-activity__stage-tab-full">{tab.label}</span>
              </button>
            )
          })}
        </nav>

        {isExecutionPhase ? renderExecutionReviewChanges() : null}

        <div className="edit-activity__stage-content" role="tabpanel">
          <div className="execution-plan-detail__content">
            <main className="execution-plan-detail__main edit-activity__activity-info-card-grid">
              {currentActiveTab === 'activity-information'
                ? renderActivityInformation()
                : currentActiveTab === 'related-activities'
                  ? renderRelatedActivities()
                  : currentActiveTab === 'kpis'
                    ? renderKpis()
                    : currentActiveTab === 'objective'
                      ? renderObjectives()
                      : currentActiveTab === 'budgeting'
                        ? renderBudgeting()
                      : currentActiveTab === 'milestone'
                        ? renderMilestones()
                        : currentActiveTab === 'clarifications'
                          ? <ClarificationTab />
                          : currentActiveTab === 'logs'
                            ? <LogTab isExecutionPhase projectId={projectId} />
                            : renderPlaceholderStep()}
            </main>

            <ActivitySideRail className="execution-plan-detail__rail" label="Execution plan side panel">
              <ActivityWorkflowRailCard>
                  {isEditMode ? (
                    <>
                      <Button disabled={isSaving || !canEditExecutionPlan} icon={<Save size={16} />} onClick={handleSaveDraft}>
                        {isSaving ? 'Saving...' : 'Save Draft'}
                      </Button>
                      <Button icon={<X size={16} />} onClick={() => confirmNavigation(() => setIsEditing(false))} variant="secondary">
                        Discard Changes
                      </Button>
                    </>
                  ) : null}
                  {canSubmitActivityUpdates ? (
                    <>
                      <Button disabled={isSubmittingActivityUpdates} icon={<Send size={16} />} onClick={() => setIsSubmitUpdatesConfirmOpen(true)}>
                        {isSubmittingActivityUpdates ? 'Submitting...' : 'Submit Activity Updates'}
                      </Button>
                      <Button icon={<HelpCircle size={16} />} onClick={handleRequestClarification} variant="secondary">
                        Request Clarification
                      </Button>
                    </>
                  ) : workflowStep && canUseWorkflowAction ? (
                    <>
                      <Button disabled={isSubmittingWorkflow} icon={<Send size={16} />} onClick={() => setIsWorkflowConfirmOpen(true)}>
                        {isSubmittingWorkflow ? 'Submitting...' : workflowStep.actionLabel}
                      </Button>
                      <Button icon={<HelpCircle size={16} />} onClick={handleRequestClarification} variant="secondary">
                        Request Clarification
                      </Button>
                    </>
                  ) : !workflowStep ? (
                    <Button disabled icon={<Check size={16} />}>
                      Workflow Complete
                    </Button>
                  ) : null}
              </ActivityWorkflowRailCard>

              <ActivityProgressRailCard>
                <div className="edit-activity__rail-progress-list">
                  {isExecutionPhase ? (
                    <>
                      <div
                        aria-disabled={isMilestoneProgressDisabled}
                        aria-label={isMilestoneProgressDisabled ? 'Planned Progress unavailable' : `Planned Progress ${Math.round(plannedMilestoneProgress)}%`}
                        className={`edit-activity__header-progress${isMilestoneProgressDisabled ? ' edit-activity__header-progress--disabled' : ''}`}
                      >
                        <div className="edit-activity__header-progress-copy">
                          <span>Planned Progress</span>
                          <strong>{isMilestoneProgressDisabled ? 'Unavailable' : `${Math.round(plannedMilestoneProgress)}%`}</strong>
                        </div>
                        <div
                          aria-hidden="true"
                          className="edit-activity__header-progress-ring"
                          style={{ '--progress': `${plannedMilestoneProgress}%` } as CSSProperties}
                        >
                          <span>{isMilestoneProgressDisabled ? '-' : `${Math.round(plannedMilestoneProgress)}%`}</span>
                        </div>
                      </div>
                      <div
                        aria-disabled={isMilestoneProgressDisabled}
                        aria-label={isMilestoneProgressDisabled ? 'Actual Progress unavailable' : `Actual Progress ${Math.round(actualMilestoneProgress)}%`}
                        className={`edit-activity__header-progress${isMilestoneProgressDisabled ? ' edit-activity__header-progress--disabled' : ''}`}
                      >
                        <div className="edit-activity__header-progress-copy">
                          <span>Actual Progress</span>
                          <strong>{isMilestoneProgressDisabled ? 'Unavailable' : `${Math.round(actualMilestoneProgress)}%`}</strong>
                        </div>
                        <div
                          aria-hidden="true"
                          className="edit-activity__header-progress-ring edit-activity__header-progress-ring--actual"
                          style={{ '--progress': `${actualMilestoneProgress}%` } as CSSProperties}
                        >
                          <span>{isMilestoneProgressDisabled ? '-' : `${Math.round(actualMilestoneProgress)}%`}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      aria-disabled={isMilestoneProgressDisabled}
                      aria-label={isMilestoneProgressDisabled ? `${displayedMilestoneProgressLabel} unavailable` : `${displayedMilestoneProgressLabel} ${Math.round(displayedMilestoneProgress)}%`}
                      className={`edit-activity__header-progress${isMilestoneProgressDisabled ? ' edit-activity__header-progress--disabled' : ''}`}
                    >
                      <div className="edit-activity__header-progress-copy">
                        <span>{displayedMilestoneProgressLabel}</span>
                        <strong>{isMilestoneProgressDisabled ? 'Unavailable' : `${Math.round(displayedMilestoneProgress)}%`}</strong>
                      </div>
                      <div
                        aria-hidden="true"
                        className="edit-activity__header-progress-ring"
                        style={{ '--progress': `${displayedMilestoneProgress}%` } as CSSProperties}
                      >
                        <span>{isMilestoneProgressDisabled ? '-' : `${Math.round(displayedMilestoneProgress)}%`}</span>
                      </div>
                    </div>
                  )}
                </div>
              </ActivityProgressRailCard>

              <ActivityInfoRailCard
                pendingWith={pendingWithLabel}
                phaseLabel={phaseLabel}
                rows={[
                  {
                    label: 'Approval Status',
                    value: <Badge tone={statusCode === 776140011 ? 'success' : 'info'}>{approvalStatusLabel}</Badge>,
                  },
                ]}
                statusLabel={activityStatusLabel}
              />
            </ActivitySideRail>
          </div>
        </div>
      </div>
      <OperationAlert
        alert={operationAlert}
        onDismiss={() => {
          setDetailError('')
          setSaveMessage('')
        }}
      />
      <ConfirmationDialog isOpen={Boolean(kpiToUnlink)} title="Unlink KPI" description="Remove this KPI from the activity? The KPI record will not be deleted." confirmLabel="Unlink" onCancel={() => setKpiToUnlink(null)} onConfirm={() => { const id = kpiToUnlink; setKpiToUnlink(null); if (id) void handleDeleteKpi(id) }} />
      <ConfirmationDialog
        confirmLabel="Submit"
        description="This action will submit the latest execution activity updates for review. Once submitted, the assigned reviewer will continue the workflow."
        isOpen={isSubmitUpdatesConfirmOpen}
        onCancel={() => setIsSubmitUpdatesConfirmOpen(false)}
        onConfirm={() => {
          setIsSubmitUpdatesConfirmOpen(false)
          void handleSubmitActivityUpdates()
        }}
        title="Submit Activity Updates"
      />
      <ConfirmationDialog
        confirmLabel="Submit"
        description={`This action will ${workflowStep?.actionLabel.toLowerCase() ?? 'submit this item'} and assign it to ${workflowStep?.targetRoleName.replace('AOP - ', '') ?? 'the next reviewer'}. Are you sure you want to proceed?`}
        isOpen={isWorkflowConfirmOpen}
        onCancel={() => setIsWorkflowConfirmOpen(false)}
        onConfirm={() => {
          setIsWorkflowConfirmOpen(false)
          void handleWorkflowSubmit()
        }}
        title="Submit for Approval"
      />
    </div>
  )
}

