import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { AlertTriangle, ArrowLeft, BarChart3, ClipboardList, Edit3, Gauge, Save, Send, Target, UserCheck, UserRound, X } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Card, ConfirmationDialog, CurrencyInput, DatePicker, Input, OperationAlert, RadioGroup, Select, Textarea, type OperationAlertPayload } from '../components/ui'
import type { Dga_aop_kpis, Dga_aop_kpisBase } from '../generated/models/Dga_aop_kpisModel'
import type { Dga_aop_projectses } from '../generated/models/Dga_aop_projectsesModel'
import type { Dga_project_planning_instances } from '../generated/models/Dga_project_planning_instancesModel'
import type { Systemusers } from '../generated/models/SystemusersModel'
import type { Teams } from '../generated/models/TeamsModel'
import { Dga_aop_kpisService } from '../generated/services/Dga_aop_kpisService'
import { Dga_aop_projectsesService } from '../generated/services/Dga_aop_projectsesService'
import { Dga_project_planning_instancesService } from '../generated/services/Dga_project_planning_instancesService'
import { SystemusersService } from '../generated/services/SystemusersService'
import { TeamsService } from '../generated/services/TeamsService'
import { APP_ROUTE_PATHS, EXECUTION_PLAN_KPI_DRAFT_STORAGE_KEY } from '../routes/appRoutes'
import { useAppSelector } from '../store/hooks'
import { AiSummaryPanel } from './editActivity/AiSummaryPanel'

type KpiDetailTab = 'kpi-information' | 'measurement' | 'baseline' | 'targets'

type KpiTargetSet = {
  q1?: string
  q2?: string
  q3?: string
  q4?: string
}

type KpiDraft = {
  kpiName?: string
  arabicKpiName?: string
  directorate?: string
  kpiDescription?: string
  arabicKpiDescription?: string
  calculationMethod?: string
  arabicCalculationMethod?: string
  sourceOfData?: string
  expectedImpact?: string
  strategicActivity?: string
  polarity?: string
  kpiType?: string
  unit?: string
  benchmarkable?: string
  periodicMeasurement?: string
  baselineStartDate?: string
  baselineEndDate?: string
  kpiBenchmarkableValue?: string
  benchmark?: string
  estimatedBaselineAvailable?: string
  baselineMethodology?: string
  historical2028?: string
  historical2029?: string
  historical2030?: string
  targets?: Record<string, KpiTargetSet>
  sectorName?: string
  divisionName?: string
}

const DETAIL_TABS: Array<{ id: KpiDetailTab, label: string, shortLabel: string, icon: typeof ClipboardList }> = [
  { id: 'kpi-information', label: 'KPI Information', shortLabel: 'KPI Info', icon: ClipboardList },
  { id: 'measurement', label: 'Measurement Context', shortLabel: 'Measurement', icon: Gauge },
  { id: 'baseline', label: 'Baseline & Benchmark', shortLabel: 'Baseline', icon: BarChart3 },
  { id: 'targets', label: 'Targets', shortLabel: 'Targets', icon: Target },
]

const DIRECTORATE_OPTIONS = [
  { label: 'Gov Digital', value: 'gov-digital' },
  { label: 'Gov Talent', value: 'gov-talent' },
  { label: 'Gov Academy', value: 'gov-academy' },
  { label: 'Gov Procurement', value: 'gov-procurement' },
  { label: 'TAMM', value: 'tamm' },
  { label: 'CX', value: 'cx' },
] as const

const POLARITY_OPTIONS = [
  { label: 'Ascending', value: 'ascending' },
  { label: 'Descending', value: 'descending' },
  { label: 'Closer to Target', value: 'closer-to-target' },
] as const

const BENCHMARKABLE_OPTIONS = [
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
] as const

const MEASUREMENT_OPTIONS = [
  { label: 'Quarterly', value: 'quarterly' },
  { label: 'Semi-Annually', value: 'semi-annually' },
  { label: 'Annually', value: 'annually' },
] as const

const KPI_TYPE_OPTIONS = [
  { label: 'Select KPI type', value: '' },
  { label: 'Special Reports', value: 'special-reports' },
  { label: 'Aspirations', value: 'aspirations' },
  { label: 'Foundational Strategies', value: 'foundational-strategies' },
  { label: 'Annual Plans', value: 'annual-plans' },
  { label: 'Special Strategies', value: 'special-strategies' },
  { label: 'Common', value: 'common' },
] as const

const UNIT_OPTIONS = [
  { label: 'Select unit', value: '' },
  { label: '#', value: 'number' },
  { label: '%', value: 'percent' },
  { label: 'Rate', value: 'rate' },
  { label: 'AED', value: 'aed' },
] as const

const STRATEGIC_ACTIVITY_OPTIONS = [
  { label: 'Select strategic activity', value: '' },
  { label: 'AOP New Project Two', value: 'aop-new-project-two' },
  { label: 'Digital Services Acceleration', value: 'digital-services-acceleration' },
  { label: 'Service Experience Improvement', value: 'service-experience-improvement' },
] as const

const DIRECTORATE_LABELS: Record<string, string> = {
  'gov-digital': 'Gov Digital',
  'gov-talent': 'Gov Talent',
  'gov-academy': 'Gov Academy',
  'gov-procurement': 'Gov Procurement',
  tamm: 'TAMM',
  cx: 'CX',
}

const STRATEGIC_ACTIVITY_LABELS: Record<string, string> = {
  'aop-new-project-two': 'AOP New Project Two',
  'digital-services-acceleration': 'Digital Services Acceleration',
  'service-experience-improvement': 'Service Experience Improvement',
}

const DIRECTORATE_VALUE_BY_FORM: Record<string, Dga_aop_kpisBase['dga_directorate']> = {
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

const MEASUREMENT_VALUE_BY_FORM: Record<string, Dga_aop_kpisBase['dga_periodic_measurement']> = {
  quarterly: 1,
  'semi-annually': 2,
  annually: 3,
}

const POLARITY_VALUE_BY_FORM: Record<string, Dga_aop_kpisBase['dga_polarity']> = {
  ascending: 1,
  descending: 2,
  'closer-to-target': 3,
}

const UNIT_VALUE_BY_FORM: Record<string, Dga_aop_kpisBase['dga_unit']> = {
  number: 1,
  percent: 2,
  rate: 3,
  aed: 4,
}

const KPI_PHASE_LABELS: Record<number, string> = {
  0: 'Planning',
  1: 'Execution',
}

const KPI_STATUS_LABELS: Record<number, string> = {
  1: 'Active',
  2: 'Inactive',
}

type KpiWorkflowStep = {
  actionLabel: string
  currentStageLabel: string
  requiredRole: string
  successMessage: string
  targetRoleName: string
  targetTeamName: string
}

function normalizeId(id?: string | null) {
  return (id ?? '').replace(/[{}]/g, '').toLowerCase()
}

function getResultValue<T>(result: unknown): T | undefined {
  const shaped = result as { data?: T; value?: T; result?: T; record?: T }
  return shaped.data ?? shaped.value ?? shaped.result ?? shaped.record
}

function getResultArray<T>(result: unknown): T[] {
  const shaped = result as { data?: T[]; value?: T[]; result?: T[]; records?: T[] }
  return shaped.data ?? shaped.value ?? shaped.result ?? shaped.records ?? []
}

function toEntityBind(entitySetName: string, id: string) {
  return `/${entitySetName}(${normalizeId(id)})`
}

function escapeODataValue(value: string) {
  return value.replace(/'/g, "''")
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
      'Ask the Dataverse/Power Platform admin to add Read privilege for Document Location (sharepointdocumentlocation) to the security role assigned to the target workflow team.',
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

function formValueFromDataverseValue<T extends number>(
  options: Record<string, T | undefined>,
  value: T | number | string | undefined | null,
  fallback = '',
) {
  if (value === undefined || value === null || value === '') return fallback
  const match = Object.entries(options).find(([, optionValue]) => Number(optionValue) === Number(value))
  return match?.[0] ?? fallback
}

function toDateOnly(value?: string | null) {
  return value?.split('T')[0] ?? ''
}

function toNumericDraft(value?: number | null) {
  return value == null || !Number.isFinite(value) ? '' : String(value)
}

function normalizeRoleName(roleName?: string | null) {
  return (roleName ?? '').trim().toLowerCase()
}

function roleMatches(roleName: string | undefined | null, expectedRole: string) {
  return normalizeRoleName(roleName) === normalizeRoleName(expectedRole)
}

function ownerNameMatchesRole(ownerName: string, roleName: string) {
  const normalizedOwner = normalizeRoleName(ownerName)
  const normalizedRole = normalizeRoleName(roleName).replace(/^aop - /, '')

  return normalizedOwner.includes(normalizedRole)
}

function getKpiWorkflowStep(ownerName: string, phaseCode: number): KpiWorkflowStep | null {
  const normalizedOwner = ownerName.toLowerCase()
  const isExecutionPhase = phaseCode === 1

  if (normalizedOwner.includes('adeo')) return null

  if (normalizedOwner.includes('director general') && isExecutionPhase) return null

  if (normalizedOwner.includes('director general') && !isExecutionPhase) {
    return {
      actionLabel: 'Submit to ADEO',
      currentStageLabel: 'Submitted to Director General',
      requiredRole: 'AOP - Director General',
      successMessage: 'KPI submitted to ADEO successfully.',
      targetRoleName: 'AOP - ADEO',
      targetTeamName: 'AOP - ADEO',
    }
  }

  if (normalizedOwner.includes('executive director')) {
    return isExecutionPhase
      ? {
          actionLabel: 'Submit to ADEO Team',
          currentStageLabel: 'Submitted to Executive Director',
          requiredRole: 'AOP - Executive Director',
          successMessage: 'KPI submitted to ADEO Team successfully.',
          targetRoleName: 'AOP - ADEO Team',
          targetTeamName: 'AOP - ADEO Team',
        }
      : {
          actionLabel: 'Submit to Director General',
          currentStageLabel: 'Submitted to Executive Director',
          requiredRole: 'AOP - Executive Director',
          successMessage: 'KPI submitted to Director General successfully.',
          targetRoleName: 'AOP - Director General',
          targetTeamName: 'AOP - Director General',
        }
  }

  if (normalizedOwner.includes('strategy team')) {
    return {
      actionLabel: 'Submit to Executive Director',
      currentStageLabel: 'Submitted to Strategy Team',
      requiredRole: 'AOP - Strategy Team',
      successMessage: 'KPI submitted to Executive Director successfully.',
      targetRoleName: 'AOP - Executive Director',
      targetTeamName: 'AOP - Executive Director',
    }
  }

  if (normalizedOwner.includes('division director')) {
    return {
      actionLabel: 'Submit to Strategy Team',
      currentStageLabel: 'Submitted to Division Director',
      requiredRole: 'AOP - Division Director',
      successMessage: 'KPI submitted to Strategy Team successfully.',
      targetRoleName: 'AOP - Strategy Team',
      targetTeamName: 'AOP - Strategy Team',
    }
  }

  return {
    actionLabel: 'Submit to Division Director',
    currentStageLabel: ownerName ? 'Submitted to Division Member' : 'Draft',
    requiredRole: 'AOP - Division Member',
    successMessage: 'KPI submitted to Division Director successfully.',
    targetRoleName: 'AOP - Division Director',
    targetTeamName: 'AOP - Division Director',
  }
}

function readKpiDraft(): KpiDraft {
  try {
    const rawDraft = window.sessionStorage.getItem(EXECUTION_PLAN_KPI_DRAFT_STORAGE_KEY)
    return rawDraft ? JSON.parse(rawDraft) as KpiDraft : {}
  } catch {
    return {}
  }
}

function toDisplayValue(value: string | undefined, fallback = 'Not added yet') {
  return value?.trim() || fallback
}

function formatOptionValue(value: string | undefined, fallback = 'Not selected') {
  if (!value) return fallback
  return value.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}

type ReadOnlyDetailKind = 'default' | 'identity' | 'organization' | 'classification' | 'requirement' | 'date' | 'person' | 'narrative'
type TargetQuarter = keyof KpiTargetSet

const TARGET_YEARS = ['2031', '2032', '2033'] as const
const TARGET_QUARTERS: Array<{ key: TargetQuarter, label: string }> = [
  { key: 'q1', label: 'Quarter 1' },
  { key: 'q2', label: 'Quarter 2' },
  { key: 'q3', label: 'Quarter 3' },
  { key: 'q4', label: 'Quarter 4' },
]

function normalizeKpiDraft(draft: KpiDraft): KpiDraft {
  return {
    ...draft,
    directorate: draft.directorate ?? 'tamm',
    polarity: draft.polarity ?? 'ascending',
    kpiType: draft.kpiType ?? 'aspirations',
    unit: draft.unit ?? 'percent',
    benchmarkable: draft.benchmarkable ?? 'yes',
    periodicMeasurement: draft.periodicMeasurement ?? 'semi-annually',
    targets: TARGET_YEARS.reduce<Record<string, KpiTargetSet>>((targets, year) => {
      targets[year] = {
        q1: draft.targets?.[year]?.q1 ?? '',
        q2: draft.targets?.[year]?.q2 ?? '',
        q3: draft.targets?.[year]?.q3 ?? '',
        q4: draft.targets?.[year]?.q4 ?? '',
      }
      return targets
    }, {}),
  }
}

function kpiRecordToDraft(record: Dga_aop_kpis): KpiDraft {
  return normalizeKpiDraft({
    arabicCalculationMethod: record.dga_calculation_method_arabic ?? '',
    arabicKpiDescription: record.dga_kpi_description_arabic ?? '',
    arabicKpiName: record.dga_kpi_name_arabic ?? '',
    baselineEndDate: toDateOnly(record.dga_baseline_end_date),
    baselineMethodology: record.dga_baseline_methodology ?? '',
    baselineStartDate: toDateOnly(record.dga_baseline_start_date),
    benchmark: record.dga_benchmark ?? '',
    calculationMethod: record.dga_calculation_method ?? '',
    directorate: formValueFromDataverseValue(DIRECTORATE_VALUE_BY_FORM, record.dga_directorate, 'tamm'),
    divisionName: record.dga_divisionname ?? '',
    estimatedBaselineAvailable: toNumericDraft(record.dga_estimated_baseline_available),
    expectedImpact: record.dga_expected_impact ?? '',
    kpiBenchmarkableValue: record.dga_kpi_benchmarkable ?? '',
    kpiDescription: record.dga_kpi_description ?? '',
    kpiName: record.dga_kpi_name ?? '',
    kpiType: formValueFromDataverseValue(KPI_TYPE_VALUE_BY_FORM, record.dga_kpi_type, 'aspirations'),
    periodicMeasurement: formValueFromDataverseValue(MEASUREMENT_VALUE_BY_FORM, record.dga_periodic_measurement, 'semi-annually'),
    polarity: formValueFromDataverseValue(POLARITY_VALUE_BY_FORM, record.dga_polarity, 'ascending'),
    sectorName: record.dga_sectorname ?? '',
    sourceOfData: record.dga_source_of_data ?? '',
    unit: formValueFromDataverseValue(UNIT_VALUE_BY_FORM, record.dga_unit, 'percent'),
  })
}

function buildKpiUpdatePayload(form: KpiDraft, phaseCode = 0): Partial<Omit<Dga_aop_kpisBase, 'dga_aop_kpiid'>> {
  return {
    dga_baseline_end_date: form.baselineEndDate || undefined,
    dga_baseline_methodology: form.baselineMethodology?.trim() ?? '',
    dga_baseline_start_date: form.baselineStartDate || undefined,
    dga_benchmark: form.benchmark?.trim() ?? '',
    dga_calculation_method: form.calculationMethod?.trim() ?? '',
    dga_calculation_method_arabic: form.arabicCalculationMethod?.trim() ?? '',
    dga_directorate: DIRECTORATE_VALUE_BY_FORM[form.directorate ?? ''],
    dga_estimated_baseline_available: Number((form.estimatedBaselineAvailable ?? '').replace(/,/g, '')) || 0,
    dga_expected_impact: form.expectedImpact?.trim() ?? '',
    dga_kpi_availability: 1,
    dga_kpi_benchmarkable: form.kpiBenchmarkableValue?.trim() || form.benchmarkable || '',
    dga_kpi_description: form.kpiDescription?.trim() ?? '',
    dga_kpi_description_arabic: form.arabicKpiDescription?.trim() ?? '',
    dga_kpi_name: form.kpiName?.trim() || 'Untitled KPI',
    dga_kpi_name_arabic: form.arabicKpiName?.trim() ?? '',
    dga_kpi_phase: phaseCode as Dga_aop_kpisBase['dga_kpi_phase'],
    dga_kpi_type: KPI_TYPE_VALUE_BY_FORM[form.kpiType ?? ''],
    dga_periodic_measurement: MEASUREMENT_VALUE_BY_FORM[form.periodicMeasurement ?? ''],
    dga_polarity: POLARITY_VALUE_BY_FORM[form.polarity ?? ''],
    dga_source_of_data: form.sourceOfData?.trim() ?? '',
    dga_unit: UNIT_VALUE_BY_FORM[form.unit ?? ''],
    statecode: 0,
    statuscode: 1,
  }
}

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

export function KpiDetail() {
  const navigate = useNavigate()
  const location = useLocation()
  const routeParams = useParams()
  const selectedRole = useAppSelector((state) => state.app.selectedRole)
  const selectedCycle = useAppSelector((state) => state.app.selectedCycle)
  const { currentRole, currentRoleDivisionalHierarchy, systemUser } = useAppSelector((state) => state.user)
  const kpiId = normalizeId(routeParams['*']?.split('/')[0])
  const [activeTab, setActiveTab] = useState<KpiDetailTab>('kpi-information')
  const [isEditing, setIsEditing] = useState(Boolean((location.state as { editKpi?: boolean } | null)?.editKpi))
  const [isLoadingKpi, setIsLoadingKpi] = useState(false)
  const [isSavingKpi, setIsSavingKpi] = useState(false)
  const [isSubmittingWorkflow, setIsSubmittingWorkflow] = useState(false)
  const [detailError, setDetailError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isWorkflowConfirmOpen, setIsWorkflowConfirmOpen] = useState(false)
  const [kpiRecord, setKpiRecord] = useState<Dga_aop_kpis | null>(null)
  const [ownerName, setOwnerName] = useState('')
  const initialDraft = useMemo(() => normalizeKpiDraft(readKpiDraft()), [])
  const [savedDraft, setSavedDraft] = useState<KpiDraft>(initialDraft)
  const [form, setForm] = useState<KpiDraft>(initialDraft)
  const statusCode = Number(kpiRecord?.statuscode ?? 1)
  const phaseCode = Number(kpiRecord?.dga_kpi_phase ?? 0)
  const ownerTeamId = normalizeId(kpiRecord?._owningteam_value)
  const ownerUserId = normalizeId(kpiRecord?._owninguser_value)
  const currentRoleTeamId = normalizeId(currentRole?.teamId)
  const currentUserId = normalizeId(systemUser?.systemuserid)
  const isOwnedByCurrentRoleTeam = Boolean(ownerTeamId && currentRoleTeamId && ownerTeamId === currentRoleTeamId)
  const isOwnedByCurrentUser = Boolean(ownerUserId && currentUserId && ownerUserId === currentUserId)
  const workflowOwnerName = ownerUserId ? '' : ownerName
  const workflowStep = getKpiWorkflowStep(workflowOwnerName, phaseCode)
  const isSelectedStrategyTeam = roleMatches(selectedRole, 'AOP - Strategy Team') || roleMatches(currentRole?.roleName, 'AOP - Strategy Team')
  const isSelectedDivisionMember = roleMatches(selectedRole, 'AOP - Division Member') || roleMatches(currentRole?.roleName, 'AOP - Division Member')
  const isSelectedDivisionDirector = roleMatches(selectedRole, 'AOP - Division Director') || roleMatches(currentRole?.roleName, 'AOP - Division Director')
  const hasOwnerMismatch = Boolean(
    kpiRecord
    && !isSelectedStrategyTeam
    && (
      (ownerUserId && currentUserId && !isOwnedByCurrentUser)
      || (!ownerUserId && ownerTeamId && currentRoleTeamId && !isOwnedByCurrentRoleTeam)
    ),
  )
  const isCurrentWorkflowRole = Boolean(
    workflowStep
    && (
      roleMatches(selectedRole, workflowStep.requiredRole)
      || roleMatches(currentRole?.roleName, workflowStep.requiredRole)
    ),
  )
  const isKpiPendingWithCurrentRole = Boolean(
    workflowStep
    && (
      isOwnedByCurrentRoleTeam
      || isOwnedByCurrentUser
      || ownerNameMatchesRole(workflowOwnerName, workflowStep.requiredRole)
      || (!workflowOwnerName && workflowStep.requiredRole === 'AOP - Division Member')
    ),
  )
  const canEditKpi = (
    isSelectedStrategyTeam
    || (
      isSelectedDivisionMember
      && isKpiPendingWithCurrentRole
      && workflowStep?.requiredRole === 'AOP - Division Member'
    )
    || (
      isSelectedDivisionDirector
      && isKpiPendingWithCurrentRole
      && workflowStep?.requiredRole === 'AOP - Division Director'
    )
  )
  const isEditMode = isEditing && canEditKpi && !hasOwnerMismatch
  const canUseWorkflowAction = Boolean(
    workflowStep
    && !hasOwnerMismatch
    && isCurrentWorkflowRole
    && (
      isSelectedStrategyTeam
      || isKpiPendingWithCurrentRole
    ),
  )
  const draft = isEditMode ? form : savedDraft

  const title = toDisplayValue(draft.kpiName, 'New KPI')
  const sectorName = toDisplayValue(draft.sectorName, 'Government Common Digital Platforms')
  const divisionName = toDisplayValue(draft.divisionName, 'Advanced Automation & Integration')
  const approvalStatusLabel = workflowStep?.currentStageLabel ?? (workflowOwnerName.toLowerCase().includes('adeo') ? 'Active' : KPI_STATUS_LABELS[statusCode] ?? 'Active')
  const phaseLabel = KPI_PHASE_LABELS[phaseCode] ?? 'Planning'
  const pendingWithLabel = ownerUserId ? 'Division Member' : ownerName || workflowStep?.requiredRole.replace('AOP - ', '') || 'Division Member'
  const operationAlert: OperationAlertPayload | null = isSavingKpi
    ? { kind: 'processing', title: 'Saving KPI' }
    : isSubmittingWorkflow
      ? { kind: 'processing', title: 'Submitting KPI workflow' }
      : detailError
        ? { kind: 'error', message: detailError, title: 'Action could not be completed' }
        : successMessage
          ? { kind: 'success', message: successMessage, title: 'Changes saved' }
          : null

  useEffect(() => {
    if (!kpiId) return

    let isMounted = true

    async function loadKpi() {
      setIsLoadingKpi(true)
      setDetailError('')
      try {
        const result = await Dga_aop_kpisService.get(kpiId, {
          select: [
            'dga_aop_kpiid',
            '_owningteam_value',
            '_owninguser_value',
            'dga_baseline_end_date',
            'dga_baseline_methodology',
            'dga_baseline_start_date',
            'dga_benchmark',
            'dga_calculation_method',
            'dga_calculation_method_arabic',
            'dga_directorate',
            'dga_estimated_baseline_available',
            'dga_expected_impact',
            'dga_kpi_benchmarkable',
            'dga_kpi_description',
            'dga_kpi_description_arabic',
            'dga_kpi_name',
            'dga_kpi_name_arabic',
            'dga_kpi_phase',
            'dga_kpi_type',
            'dga_periodic_measurement',
            'dga_polarity',
            'dga_source_of_data',
            '_dga_strategic_projects_value',
            'dga_unit',
            'statuscode',
          ],
        })
        assertOperationSuccess(result, 'Unable to load KPI.')
        const record = getResultValue<Dga_aop_kpis>(result)
        if (!record) throw new Error('KPI could not be found.')
        const nextDraft = kpiRecordToDraft(record)
        let nextOwnerName = ''
        const loadedOwnerTeamId = normalizeId(record._owningteam_value)
        const loadedOwnerUserId = normalizeId(record._owninguser_value)
        if (loadedOwnerTeamId) {
          const teamResult = await TeamsService.get(loadedOwnerTeamId, {
            select: ['teamid', 'name'],
          })
          assertOperationSuccess(teamResult, 'Unable to load KPI owner team.')
          nextOwnerName = getResultValue<Teams>(teamResult)?.name ?? ''
        } else if (loadedOwnerUserId) {
          const userResult = await SystemusersService.get(loadedOwnerUserId, {
            select: ['systemuserid', 'fullname', 'internalemailaddress'],
          })
          assertOperationSuccess(userResult, 'Unable to load KPI owner user.')
          const user = getResultValue<Systemusers>(userResult)
          nextOwnerName = user?.fullname ?? user?.internalemailaddress ?? ''
        }

        if (isMounted) {
          setKpiRecord(record)
          setOwnerName(nextOwnerName)
          setSavedDraft(nextDraft)
          setForm(nextDraft)
        }
      } catch (error) {
        if (isMounted) {
          setDetailError(normalizeDataverseErrorMessage(error instanceof Error ? error.message : '', 'Unable to load KPI.'))
        }
      } finally {
        if (isMounted) setIsLoadingKpi(false)
      }
    }

    loadKpi()

    return () => {
      isMounted = false
    }
  }, [kpiId])

  function updateForm(fields: Partial<KpiDraft>) {
    setForm((current) => ({ ...current, ...fields }))
  }

  function updateTarget(year: string, quarter: TargetQuarter, value: string) {
    setForm((current) => ({
      ...current,
      targets: {
        ...current.targets,
        [year]: {
          ...current.targets?.[year],
          [quarter]: value,
        },
      },
    }))
  }

  function handleEditKpi() {
    if (hasOwnerMismatch) {
      setDetailError('')
      return
    }

    setForm(savedDraft)
    setIsEditing(true)
  }

  async function handleSaveDraft() {
    if (hasOwnerMismatch) {
      setDetailError('')
      return
    }

    const nextDraft = normalizeKpiDraft({
      ...form,
      sectorName,
      divisionName,
    })
    setIsSavingKpi(true)
    setDetailError('')
    setSuccessMessage('')
    try {
      if (kpiId) {
        const result = await Dga_aop_kpisService.update(kpiId, buildKpiUpdatePayload(nextDraft, phaseCode))
        assertOperationSuccess(result, 'Unable to update KPI.')
        const updated = getResultValue<Dga_aop_kpis>(result)
        const saved = updated?.dga_aop_kpiid ? kpiRecordToDraft(updated) : nextDraft
        if (updated?.dga_aop_kpiid) setKpiRecord((current) => ({ ...current, ...updated }))
        setSavedDraft(saved)
        setForm(saved)
      } else {
        window.sessionStorage.setItem(EXECUTION_PLAN_KPI_DRAFT_STORAGE_KEY, JSON.stringify({
          ...nextDraft,
          savedAt: new Date().toISOString(),
        }))
        setSavedDraft(nextDraft)
      }
      setIsEditing(false)
      setSuccessMessage('KPI saved successfully.')
    } catch (error) {
      setDetailError(normalizeDataverseErrorMessage(error instanceof Error ? error.message : '', 'Unable to update KPI.'))
    } finally {
      setIsSavingKpi(false)
    }
  }

  function handleDiscardChanges() {
    setForm(savedDraft)
    setIsEditing(false)
  }

  function validateKpiWorkflowSubmit() {
    const missing: string[] = []
    if (!savedDraft.kpiName?.trim()) missing.push('KPI Name')
    if (!savedDraft.directorate?.trim()) missing.push('Directorate')
    if (!savedDraft.kpiDescription?.trim()) missing.push('KPI Description')
    if (!savedDraft.calculationMethod?.trim()) missing.push('Calculation Method')
    if (!savedDraft.sourceOfData?.trim()) missing.push('Source of Data')
    if (!savedDraft.expectedImpact?.trim()) missing.push('Expected Impact')
    if (!savedDraft.polarity?.trim()) missing.push('Polarity')
    if (!savedDraft.kpiType?.trim()) missing.push('KPI Type')
    if (!savedDraft.unit?.trim()) missing.push('Unit')
    if (!savedDraft.periodicMeasurement?.trim()) missing.push('Periodic Measurement')
    if (!(savedDraft.kpiBenchmarkableValue?.trim() || savedDraft.benchmarkable?.trim())) missing.push('KPI Benchmarkable')

    if (missing.length > 0) {
      setDetailError(`Complete required KPI data before submitting: ${missing.join(', ')}.`)
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

  async function resolveLinkedProjectPlanningTeam(
    teamField: '_dga_division_director_team_value' | '_dga_executive_director_team_value',
    fallbackTeamName: string,
  ) {
    const linkedProjectId = normalizeId(kpiRecord?._dga_strategic_projects_value)
    if (!linkedProjectId) return resolveCurrentPlanningTeam(teamField, fallbackTeamName)

    const projectResult = await Dga_aop_projectsesService.get(linkedProjectId, {
      select: ['dga_aop_projectsid', '_dga_project_planning_instance_value'],
    })
    assertOperationSuccess(projectResult, 'Unable to load linked Execution Plan for KPI workflow.')

    const linkedProject = getResultValue<Dga_aop_projectses>(projectResult)
    const planningInstanceId = normalizeId(linkedProject?._dga_project_planning_instance_value)
    if (!planningInstanceId) return resolveTeamByName(fallbackTeamName)

    const planningInstanceResult = await Dga_project_planning_instancesService.get(planningInstanceId, {
      select: ['dga_project_planning_instanceid', teamField],
    })
    assertOperationSuccess(planningInstanceResult, `Unable to load ${fallbackTeamName} team from the linked planning instance.`)

    const planningInstance = getResultValue<Dga_project_planning_instances>(planningInstanceResult) as Dga_project_planning_instances & Record<string, unknown>
    const teamId = normalizeId(planningInstance?.[teamField] as string | undefined)
    if (!teamId) return resolveTeamByName(fallbackTeamName)

    let teamName = fallbackTeamName
    try {
      const teamResult = await TeamsService.get(teamId, {
        select: ['teamid', 'name'],
      })
      assertOperationSuccess(teamResult, `Unable to load ${fallbackTeamName} team name.`)
      teamName = getResultValue<Teams>(teamResult)?.name || teamName
    } catch {
      // The team id is enough for owner assignment; the fallback keeps the UI readable.
    }

    return {
      id: teamId,
      name: teamName,
    }
  }

  async function resolveCurrentPlanningTeam(
    teamField: '_dga_division_director_team_value' | '_dga_executive_director_team_value',
    fallbackTeamName: string,
  ) {
    const hierarchyId = normalizeId(currentRoleDivisionalHierarchy?.hierarchyId)
    const cycleId = normalizeId(selectedCycle)

    if (!hierarchyId || !cycleId) {
      return resolveTeamByName(fallbackTeamName)
    }

    const planningResult = await Dga_project_planning_instancesService.getAll({
      filter: `_dga_assessment_cycle_value eq ${cycleId} and _dga_divisional_hierarchy_value eq ${hierarchyId}`,
      select: [
        'dga_project_planning_instanceid',
        teamField,
      ],
    })
    assertOperationSuccess(planningResult, `Unable to load ${fallbackTeamName} team from the current planning instance.`)

    const planningInstances = getResultArray<Dga_project_planning_instances>(planningResult)
    const planningInstance = planningInstances[0] as Dga_project_planning_instances & Record<string, unknown> | undefined
    const teamId = normalizeId(planningInstance?.[teamField] as string | undefined)

    if (!teamId) {
      return resolveTeamByName(fallbackTeamName)
    }

    let teamName = fallbackTeamName
    try {
      const teamResult = await TeamsService.get(teamId, {
        select: ['teamid', 'name'],
      })
      assertOperationSuccess(teamResult, `Unable to load ${fallbackTeamName} team name.`)
      teamName = getResultValue<Teams>(teamResult)?.name || teamName
    } catch {
      // The team id is enough for owner assignment; the fallback keeps the UI readable.
    }

    return {
      id: teamId,
      name: teamName,
    }
  }

  async function resolveKpiWorkflowTargetTeam(step: KpiWorkflowStep) {
    if (step.targetTeamName === 'AOP - Division Director') {
      return resolveLinkedProjectPlanningTeam('_dga_division_director_team_value', step.targetTeamName)
    }

    if (step.targetTeamName === 'AOP - Executive Director') {
      return resolveLinkedProjectPlanningTeam('_dga_executive_director_team_value', step.targetTeamName)
    }

    if (step.targetTeamName === 'AOP - ADEO') {
      return resolveTeamByCandidateNames(['AOP - ADEO', 'AOP - ADEO Team'], 'ADEO')
    }

    if (step.targetTeamName === 'AOP - ADEO Team') {
      return resolveTeamByCandidateNames(['AOP - ADEO Team', 'AOP - ADEO'], 'ADEO')
    }

    return resolveTeamByName(step.targetTeamName)
  }

  async function handleWorkflowSubmit() {
    if (!kpiId || isSubmittingWorkflow || !workflowStep) return

    setDetailError('')
    setSuccessMessage('')

    if (hasOwnerMismatch) {
      setDetailError('')
      return
    }

    if (!canUseWorkflowAction) {
      setDetailError(`Only ${workflowStep.requiredRole} can perform this action when the KPI is pending with that role.`)
      return
    }

    if (!validateKpiWorkflowSubmit()) return

    setIsSubmittingWorkflow(true)

    try {
      const nextOwner = await resolveKpiWorkflowTargetTeam(workflowStep)
      const payload = {
        'ownerid@odata.bind': toEntityBind('teams', nextOwner.id),
        statuscode: 1,
      } as unknown as Partial<Omit<Dga_aop_kpisBase, 'dga_aop_kpiid'>>
      const result = await Dga_aop_kpisService.update(kpiId, payload)
      assertOperationSuccess(result, `Unable to ${workflowStep.actionLabel.toLowerCase()}.`)
      setKpiRecord((current) => current ? {
        ...current,
        _owningteam_value: nextOwner.id,
        _owninguser_value: undefined,
        statuscode: 1,
      } : current)
      setOwnerName(nextOwner.name)
      setIsEditing(false)
      setDetailError('')
      setSuccessMessage(workflowStep.successMessage)
    } catch (error) {
      setDetailError(normalizeDataverseErrorMessage(
        error instanceof Error ? error.message : '',
        `Unable to ${workflowStep.actionLabel.toLowerCase()}.`,
      ))
    } finally {
      setIsSubmittingWorkflow(false)
    }
  }

  function renderAiSummaryCard(titleText: string) {
    return (
      <div className="create-activity__manual-ai-summary">
        <AiSummaryPanel title={titleText} />
      </div>
    )
  }

  function renderKpiInformation() {
    return (
      <>
        {renderAiSummaryCard('KPI Information')}
        <Card className="create-activity__section create-activity__section--grid-card edit-activity__activity-info-card">
          <div className="create-activity__section-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <ClipboardList size={17} />
              </span>
              <div>
                <h2>KPI Information</h2>
                <p>Review KPI identity, ownership, and descriptive context.</p>
              </div>
            </div>
          </div>
          {isEditMode ? (
            <div className="create-activity__form-stack kpi-detail__edit-form">
              <div className="create-activity__form-row create-activity__form-row--two">
                <Input label="KPI Name" onChange={(event) => updateForm({ kpiName: event.target.value })} required value={form.kpiName ?? ''} />
                <Input dir="rtl" label="Arabic KPI Name" onChange={(event) => updateForm({ arabicKpiName: event.target.value })} required value={form.arabicKpiName ?? ''} />
              </div>
              <RadioGroup label="Directorate" name="detail-kpi-directorate" onChange={(value) => updateForm({ directorate: value })} options={DIRECTORATE_OPTIONS} required value={form.directorate ?? 'tamm'} />
              <div className="create-activity__form-row create-activity__form-row--two">
                <Textarea label="KPI Description" onChange={(event) => updateForm({ kpiDescription: event.target.value })} required rows={4} value={form.kpiDescription ?? ''} />
                <Textarea dir="rtl" label="Arabic KPI Description" onChange={(event) => updateForm({ arabicKpiDescription: event.target.value })} required rows={4} value={form.arabicKpiDescription ?? ''} />
              </div>
              <div className="create-activity__form-row create-activity__form-row--two">
                <Textarea label="Calculation Method" onChange={(event) => updateForm({ calculationMethod: event.target.value })} required rows={4} value={form.calculationMethod ?? ''} />
                <Textarea dir="rtl" label="Arabic Calculation Method" onChange={(event) => updateForm({ arabicCalculationMethod: event.target.value })} required rows={4} value={form.arabicCalculationMethod ?? ''} />
              </div>
            </div>
          ) : (
            <div className="edit-activity__activity-info-readonly">
              {renderReadOnlyDetails([
                { label: 'KPI Name', value: draft.kpiName, kind: 'identity' },
                { label: 'Arabic KPI Name', value: draft.arabicKpiName, kind: 'identity' },
                { label: 'Directorate', value: DIRECTORATE_LABELS[draft.directorate ?? ''] ?? formatOptionValue(draft.directorate), kind: 'organization' },
                { label: 'Sector', value: sectorName, kind: 'organization' },
                { label: 'Division', value: divisionName, kind: 'organization' },
                { label: 'KPI Description', value: draft.kpiDescription, type: 'long', columns: 6 },
                { label: 'Arabic KPI Description', value: draft.arabicKpiDescription, type: 'long', columns: 6 },
                { label: 'Calculation Method', value: draft.calculationMethod, type: 'long', columns: 6 },
                { label: 'Arabic Calculation Method', value: draft.arabicCalculationMethod, type: 'long', columns: 6 },
              ])}
            </div>
          )}
        </Card>
      </>
    )
  }

  function renderMeasurement() {
    return (
      <>
        {renderAiSummaryCard('Measurement Context')}
        <Card className="create-activity__section create-activity__section--grid-card edit-activity__activity-info-card">
          <div className="create-activity__section-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <Gauge size={17} />
              </span>
              <div>
                <h2>Measurement Context</h2>
                <p>Review source data, impact, strategic link, and measurement classification.</p>
              </div>
            </div>
          </div>
          {isEditMode ? (
            <div className="create-activity__form-stack kpi-detail__edit-form">
              <div className="create-activity__form-row create-activity__form-row--two">
                <Textarea label="Source of Data" onChange={(event) => updateForm({ sourceOfData: event.target.value })} required rows={4} value={form.sourceOfData ?? ''} />
                <Textarea label="Expected Impact" onChange={(event) => updateForm({ expectedImpact: event.target.value })} required rows={4} value={form.expectedImpact ?? ''} />
              </div>
              <Select id="detail-kpi-strategic-activity" label="Link to Strategic Activity" onChange={(value) => updateForm({ strategicActivity: value })} options={STRATEGIC_ACTIVITY_OPTIONS} value={form.strategicActivity ?? ''} />
              <RadioGroup label="Polarity" name="detail-kpi-polarity" onChange={(value) => updateForm({ polarity: value })} options={POLARITY_OPTIONS} required value={form.polarity ?? 'ascending'} />
              <div className="create-activity__form-row create-activity__form-row--two">
                <Select id="detail-kpi-type" label="KPI Type" onChange={(value) => updateForm({ kpiType: value })} options={KPI_TYPE_OPTIONS} required value={form.kpiType ?? 'aspirations'} />
                <Select id="detail-kpi-unit" label="Unit" onChange={(value) => updateForm({ unit: value })} options={UNIT_OPTIONS} required value={form.unit ?? 'percent'} />
              </div>
            </div>
          ) : (
            <div className="edit-activity__activity-info-readonly">
              {renderReadOnlyDetails([
                { label: 'Source of Data', value: draft.sourceOfData, type: 'long', columns: 6 },
                { label: 'Expected Impact', value: draft.expectedImpact, type: 'long', columns: 6 },
                { label: 'Link to Strategic Activity', value: STRATEGIC_ACTIVITY_LABELS[draft.strategicActivity ?? ''] ?? formatOptionValue(draft.strategicActivity), kind: 'classification' },
                { label: 'Polarity', value: formatOptionValue(draft.polarity), kind: 'classification' },
                { label: 'KPI Type', value: formatOptionValue(draft.kpiType), kind: 'classification' },
                { label: 'Unit', value: draft.unit === 'percent' ? '%' : formatOptionValue(draft.unit), kind: 'classification' },
              ])}
            </div>
          )}
        </Card>
      </>
    )
  }

  function renderBaseline() {
    return (
      <>
        {renderAiSummaryCard('Baseline & Benchmark')}
        <Card className="create-activity__section create-activity__section--grid-card edit-activity__activity-info-card">
          <div className="create-activity__section-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <BarChart3 size={17} />
              </span>
              <div>
                <h2>Baseline &amp; Benchmark</h2>
                <p>Review baseline dates, benchmark settings, and historical values.</p>
              </div>
            </div>
          </div>
          {isEditMode ? (
            <div className="create-activity__form-stack kpi-detail__edit-form">
              <div className="create-activity__form-row create-activity__form-row--two">
                <RadioGroup label="KPI Benchmarkable" name="detail-kpi-benchmarkable" onChange={(value) => updateForm({ benchmarkable: value })} options={BENCHMARKABLE_OPTIONS} required value={form.benchmarkable ?? 'yes'} />
                <RadioGroup label="Periodic Measurement" name="detail-kpi-periodic-measurement" onChange={(value) => updateForm({ periodicMeasurement: value })} options={MEASUREMENT_OPTIONS} required value={form.periodicMeasurement ?? 'semi-annually'} />
              </div>
              <div className="create-activity__form-row create-activity__form-row--two">
                <DatePicker id="detail-kpi-baseline-start-date" label="Baseline Start Date" onChange={(value) => updateForm({ baselineStartDate: value })} required value={form.baselineStartDate ?? ''} />
                <DatePicker id="detail-kpi-baseline-end-date" label="Baseline End Date" min={form.baselineStartDate} onChange={(value) => updateForm({ baselineEndDate: value })} required value={form.baselineEndDate ?? ''} />
              </div>
              <div className="create-activity__form-row create-activity__form-row--two">
                <Input label="KPI Benchmarkable Value" onChange={(event) => updateForm({ kpiBenchmarkableValue: event.target.value })} required value={form.kpiBenchmarkableValue ?? ''} />
                <Input label="Benchmark (If Applicable)" onChange={(event) => updateForm({ benchmark: event.target.value })} value={form.benchmark ?? ''} />
              </div>
              <div className="create-activity__form-row create-activity__form-row--two">
                <CurrencyInput label="Estimated Baseline Available" onChange={(event) => updateForm({ estimatedBaselineAvailable: event.target.value })} required value={form.estimatedBaselineAvailable ?? ''} />
                <Textarea label="Baseline Methodology" onChange={(event) => updateForm({ baselineMethodology: event.target.value })} required rows={4} value={form.baselineMethodology ?? ''} />
              </div>
              <div className="kpi-detail__inline-panel">
                <h3>Historical Data</h3>
                <div className="create-activity__form-row create-activity__form-row--three create-kpi__history-grid">
                  <CurrencyInput label="2028" onChange={(event) => updateForm({ historical2028: event.target.value })} required value={form.historical2028 ?? ''} />
                  <CurrencyInput label="2029" onChange={(event) => updateForm({ historical2029: event.target.value })} required value={form.historical2029 ?? ''} />
                  <CurrencyInput label="2030" onChange={(event) => updateForm({ historical2030: event.target.value })} required value={form.historical2030 ?? ''} />
                </div>
              </div>
            </div>
          ) : (
            <div className="edit-activity__activity-info-readonly">
              {renderReadOnlyDetails([
                { label: 'KPI Benchmarkable', value: formatOptionValue(draft.benchmarkable), kind: 'classification' },
                { label: 'Periodic Measurement', value: formatOptionValue(draft.periodicMeasurement), kind: 'classification' },
                { label: 'Baseline Start Date', value: draft.baselineStartDate, kind: 'date' },
                { label: 'Baseline End Date', value: draft.baselineEndDate, kind: 'date' },
                { label: 'KPI Benchmarkable Value', value: draft.kpiBenchmarkableValue, kind: 'requirement' },
                { label: 'Benchmark (If Applicable)', value: draft.benchmark, kind: 'requirement' },
                { label: 'Estimated Baseline Available', value: draft.estimatedBaselineAvailable, kind: 'requirement' },
                { label: 'Baseline Methodology', value: draft.baselineMethodology, type: 'long' },
                { label: '2028 Actual Value', value: draft.historical2028, kind: 'requirement' },
                { label: '2029 Actual Value', value: draft.historical2029, kind: 'requirement' },
                { label: '2030 Actual Value', value: draft.historical2030, kind: 'requirement' },
              ], 2)}
            </div>
          )}
        </Card>
      </>
    )
  }

  function renderTargets() {
    const targets = draft.targets ?? {}

    return (
      <>
        {renderAiSummaryCard('Targets')}
        <Card className="create-activity__section create-activity__section--grid-card edit-activity__activity-info-card create-kpi__targets-card">
          <div className="create-activity__section-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <Target size={17} />
              </span>
              <div>
                <h2>Targets</h2>
                <p>Review quarterly KPI targets for upcoming years.</p>
              </div>
            </div>
          </div>
          <div className="create-activity__form-stack create-kpi__section-body">
            <div className="create-kpi__target-grid">
              {TARGET_YEARS.map((year) => {
                const target = targets[year] ?? {}

                return (
                  <div className="create-kpi__target-year" key={year}>
                    <h3>{year} Targets</h3>
                    {isEditMode ? (
                      <div className="kpi-detail__target-quarter-grid">
                        {TARGET_QUARTERS.map((quarter) => (
                          <CurrencyInput
                            key={quarter.key}
                            label={quarter.label}
                            onChange={(event) => updateTarget(year, quarter.key, event.target.value)}
                            placeholder="Enter value"
                            required
                            value={target[quarter.key] ?? ''}
                          />
                        ))}
                      </div>
                    ) : (
                      renderReadOnlyDetails([
                        { label: 'Quarter 1', value: target.q1, kind: 'requirement' },
                        { label: 'Quarter 2', value: target.q2, kind: 'requirement' },
                        { label: 'Quarter 3', value: target.q3, kind: 'requirement' },
                        { label: 'Quarter 4', value: target.q4, kind: 'requirement' },
                      ], 2)
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </Card>
      </>
    )
  }

  return (
    <div className={`edit-activity execution-plan-detail kpi-detail ${isEditMode ? 'kpi-detail--editing' : ''}`}>
      <header className="create-activity__hero execution-plan-detail__hero">
        <div className="create-activity__hero-grid">
          <div className="create-activity__hero-left">
            <button className="execution-plan-detail__back" onClick={() => navigate(APP_ROUTE_PATHS.kpis)} type="button">
              <ArrowLeft aria-hidden="true" size={16} />
              Back to KPIs
            </button>
            <nav aria-label="Breadcrumb" className="create-activity__breadcrumb">
              <Link to={APP_ROUTE_PATHS.dashboard}>Dashboard</Link>
              <span>/</span>
              <span>Execution Plan</span>
              <span>/</span>
              <span>{title}</span>
            </nav>
            <div className="create-activity__hero-body">
              <div className="create-activity__hero-icon" aria-hidden="true">
                <Gauge size={22} />
              </div>
              <div className="create-activity__hero-content">
                <h1>{title}</h1>
                <p>KPI planning for the Digital Connect Execution Plan.</p>
              </div>
            </div>
            <div className="create-activity__hero-chips">
              <span className="create-activity__chip">
                <span className="create-activity__chip-label">Status</span>
                <Badge tone={statusCode === 1 ? 'success' : undefined}>{KPI_STATUS_LABELS[statusCode] ?? 'Active'}</Badge>
              </span>
              <span className="create-activity__chip">
                <span className="create-activity__chip-label">Phase</span>
                <Badge tone="info">{phaseLabel}</Badge>
              </span>
              <span className="create-activity__chip">
                <span className="create-activity__chip-label">Approval</span>
                <Badge tone={workflowStep ? 'info' : 'success'}>{approvalStatusLabel}</Badge>
              </span>
            </div>
          </div>

          <div className="create-activity__hero-right">
            <dl className="create-activity__organization-context">
              <div>
                <dt>Sector</dt>
                <dd title={sectorName}>{sectorName}</dd>
              </div>
              <div>
                <dt>Division</dt>
                <dd title={divisionName}>{divisionName}</dd>
              </div>
            </dl>
            <div className="create-activity__hero-actions">
              <Button disabled={isEditMode || !canEditKpi || hasOwnerMismatch || isSubmittingWorkflow} icon={<Edit3 size={16} />} onClick={handleEditKpi}>
                Edit KPI
              </Button>
            </div>
          </div>
        </div>
      </header>

      {hasOwnerMismatch ? (
        <div className="edit-activity__persistent-alerts">
          <div className="edit-activity__persistent-alert edit-activity__persistent-alert--warning" role="status">
            <AlertTriangle aria-hidden="true" size={16} />
            <div>
              <strong>Pending response from another user</strong>
              <span>This KPI is pending response from another user. You cannot edit it at this stage.</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="edit-activity__stages">
        <nav aria-label="KPI detail steps" className="edit-activity__stage-tabs execution-plan-detail__tabs">
          {DETAIL_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.id === activeTab

            return (
              <button
                aria-current={isActive ? 'page' : undefined}
                className={`edit-activity__stage-tab ${isActive ? 'edit-activity__stage-tab--active' : ''}`}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon aria-hidden="true" size={16} />
                <span className="edit-activity__stage-tab-label">{tab.shortLabel}</span>
                <span className="edit-activity__stage-tab-full">{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="edit-activity__stage-content" role="tabpanel">
          {isLoadingKpi ? <p className="create-activity__helper-text">Loading KPI details...</p> : null}
          <div className="execution-plan-detail__content">
            <main className="execution-plan-detail__main edit-activity__activity-info-card-grid">
              {activeTab === 'kpi-information'
                ? renderKpiInformation()
                : activeTab === 'measurement'
                  ? renderMeasurement()
                  : activeTab === 'baseline'
                    ? renderBaseline()
                    : renderTargets()}
            </main>

            <aside className="edit-activity__right-rail execution-plan-detail__rail" aria-label="KPI side panel">
              <section className="edit-activity__rail-card edit-activity__rail-card--actions">
                <div className="edit-activity__rail-card-header">
                  <ClipboardList aria-hidden="true" size={16} />
                  <h2>Workflow Actions</h2>
                </div>
                <div className="edit-activity__workflow-panel-actions">
                  {isEditMode ? (
                    <>
                      <Button disabled={isSavingKpi || isSubmittingWorkflow} icon={<Save size={16} />} onClick={handleSaveDraft}>
                        {isSavingKpi ? 'Saving...' : 'Save Draft'}
                      </Button>
                      <Button disabled={isSavingKpi || isSubmittingWorkflow} icon={<X size={16} />} onClick={handleDiscardChanges} variant="secondary">
                        Discard Changes
                      </Button>
                    </>
                  ) : null}
                  {workflowStep && canUseWorkflowAction ? (
                    <Button disabled={isSubmittingWorkflow} icon={<Send size={16} />} onClick={() => setIsWorkflowConfirmOpen(true)}>
                      {isSubmittingWorkflow ? 'Submitting...' : workflowStep.actionLabel}
                    </Button>
                  ) : !workflowStep ? (
                    <Button disabled icon={<UserCheck size={16} />}>
                      Workflow Complete
                    </Button>
                  ) : null}
                </div>
              </section>

              <section className="edit-activity__rail-card edit-activity__rail-card--progress">
                <div className="edit-activity__rail-card-header">
                  <BarChart3 aria-hidden="true" size={16} />
                  <h2>Activity Progress</h2>
                </div>
                <div className="edit-activity__rail-progress-list">
                  <div aria-label="Planned Progress 0%" className="edit-activity__header-progress">
                    <div className="edit-activity__header-progress-copy">
                      <span>Planned Progress</span>
                      <strong>0%</strong>
                    </div>
                    <div aria-hidden="true" className="edit-activity__header-progress-ring" style={{ '--progress': '0%' } as CSSProperties}>
                      <span>0%</span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="edit-activity__rail-card">
                <div className="edit-activity__rail-card-header">
                  <UserCheck aria-hidden="true" size={16} />
                  <h2>Activity Info</h2>
                </div>
                <div className="edit-activity__activity-info-list">
                  <div className="edit-activity__activity-info-row">
                    <span>Approval Status</span>
                    <Badge tone={workflowStep ? 'info' : 'success'}>{approvalStatusLabel}</Badge>
                  </div>
                  <div className="edit-activity__activity-info-row">
                    <span>KPI Phase</span>
                    <Badge tone="info">{phaseLabel}</Badge>
                  </div>
                  <div className="edit-activity__activity-info-row edit-activity__activity-info-row--pending">
                    <span>Pending With</span>
                    <strong>
                      <UserRound size={14} />
                      {pendingWithLabel}
                    </strong>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      </div>
      <OperationAlert
        alert={operationAlert}
        onDismiss={() => {
          setDetailError('')
          setSuccessMessage('')
        }}
      />
      <ConfirmationDialog
        confirmLabel="Submit"
        description={`This action will ${workflowStep?.actionLabel.toLowerCase() ?? 'submit this KPI'} and assign it to ${workflowStep?.targetRoleName.replace('AOP - ', '') ?? 'the next reviewer'}. Are you sure you want to proceed?`}
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

