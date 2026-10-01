import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  CalendarRange,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  List,
  LockKeyhole,
  Plus,
  Trash2,
  Wallet,
  Pencil,
} from 'lucide-react'
import {
  Button,
  Card,
  ConfirmationDialog,
  CurrencyDisplay,
  CurrencyInput,
  DataGrid,
  DirhamIcon,
  Input,
  RadioGroup,
  Select,
  SideDrawer,
  Textarea,
  type DataGridColumn,
  type SelectOption,
} from '../../components/ui'
import type { Dga_account_codes } from '../../generated/models/Dga_account_codesModel'
import type {
  Dga_aop_project_budget_detailses,
  Dga_aop_project_budget_detailsesBase,
} from '../../generated/models/Dga_aop_project_budget_detailsesModel'
import type { Dga_aop_project_budgets } from '../../generated/models/Dga_aop_project_budgetsModel'
import type { Dga_aop_projectses, Dga_aop_projectsesBase } from '../../generated/models/Dga_aop_projectsesModel'
import {
  Dga_sub_activitiesesdga_budget_source,
  Dga_sub_activitiesesdga_budget_type,
  type Dga_sub_activitieses,
  type Dga_sub_activitiesesBase,
} from '../../generated/models/Dga_sub_activitiesesModel'
import { Dga_account_codesService } from '../../generated/services/Dga_account_codesService'
import { Dga_aop_project_budget_detailsesService } from '../../generated/services/Dga_aop_project_budget_detailsesService'
import { Dga_aop_project_budgetsService } from '../../generated/services/Dga_aop_project_budgetsService'
import { Dga_aop_projectsesService } from '../../generated/services/Dga_aop_projectsesService'
import { Dga_sub_activitiesesService } from '../../generated/services/Dga_sub_activitiesesService'
import { useAppSelector } from '../../store/hooks'
import { assertOperationSuccess, getResultValue } from './helpers/activityInfoHelpers'
import {
  BUDGET_SOURCE_OPTIONS,
  BUDGET_TYPE_OPTIONS,
  INITIAL_BUDGET_FORM,
  MONTH_LABELS,
  type BudgetFieldErrors,
  type BudgetFormData,
} from './data/budgetData'
import {
  cleanRecordId,
  getProjectRelatedRecordChange,
  isEmptyRelatedValue,
  parseProjectRelatedChanges,
  resolveProjectRelatedValue,
  stringifyMergedProjectRelatedChanges,
  type ProjectRelatedChanges,
} from './helpers/projectRelatedChanges'
import { createExecutionFieldLogs, EXECUTION_LOG_TYPES } from './helpers/approvalWorkflowLogs'
import { AiSummaryPanel } from './AiSummaryPanel'
import type { AiSummaryBlocks, AiSummaryMeta } from './types/aiSummaryTypes'
import type { EditActivityOperationNotifier } from './types/operationAlert'

export type BudgetHeaderAction = {
  canSave: boolean
  discardChanges?: () => void
  hasUnsavedChanges?: boolean
  isSaving: boolean
  label: string
  onSave: () => Promise<boolean> | boolean
  savingLabel: string
}

type ActivityScopeValue = '' | '1' | '2'
type BudgetViewMode = 'table' | 'graph'

type BudgetMonthRecord = {
  id: string
  monthName: string
  plannedBudget: number
  actualBudget: number
  deliveredAmount: number
  isZero: boolean
  details: BudgetDetailRecord[]
}

type BudgetDetailRecord = {
  accountCodeId: string
  accountCodeLabel: string
  amount: number
  grn: string
  id?: string
  localId: string
  monthId?: string
}

type BudgetDetailDraft = {
  accountCodeId: string
  amount: string
  grn: string
}

type BudgetDetailDraftErrors = Partial<Record<keyof BudgetDetailDraft, string>> & {
  submit?: string
}

type BudgetProjectPayload = Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>

type BudgetDrawerMonth = {
  actualBudget: number
  deliveredAmount: number
  details: BudgetDetailRecord[]
  id: string
  isFuture: boolean
  isZero: boolean
  monthIndex: number
  monthName: string
  plannedBudget: number
}

type BudgetDetailGridRow = BudgetDetailRecord & {
  index: number
}

type SubActivityBudgetSourceValue = '' | `${Dga_sub_activitiesesBase['dga_budget_source']}`
type SubActivityBudgetTypeValue = '' | `${Dga_sub_activitiesesBase['dga_budget_type']}`

type BudgetItemForm = {
  allocatedBudget: string
  budgetSource: SubActivityBudgetSourceValue
  budgetType: SubActivityBudgetTypeValue
  description: string
  id?: string
  isCollapsed: boolean
  localId: string
  monthlyActuals: BudgetFormData['monthlyBudgets']
  monthlyBudgets: BudgetFormData['monthlyBudgets']
  monthlyDelivered: BudgetFormData['monthlyBudgets']
  name: string
}

type BudgetItemFieldErrors = Partial<Record<
  'allocatedBudget' | 'budgetSource' | 'budgetType' | 'monthlyBudgets' | 'name',
  string
>>

type BudgetWizardStep = 1 | 2 | 3

interface BudgetTabProps {
  activityScope: ActivityScopeValue
  aiSummaryBlocks?: AiSummaryBlocks
  aiSummaryError?: string
  aiSummaryMeta?: AiSummaryMeta
  canEditExecutionBudget?: boolean
  hierarchyId?: string
  isAiSummaryLoading?: boolean
  isEditing?: boolean
  isExecutionPhase?: boolean
  isReadOnly?: boolean
  onActivityDataChanged?: () => void
  onHeaderActionChange?: (action: BudgetHeaderAction | null) => void
  onOperationAlert?: EditActivityOperationNotifier
  onProjectRelatedChangesChange?: (relatedChanges: string) => void
  plannedEndDate: string
  plannedStartDate: string
  projectId: string
  projectRelatedChanges?: string | null
  statusCode?: number
}

const BUDGET_PROJECT_SELECT_FIELDS = [
  'dga_aop_projectsid',
  'dga_budget_source',
  'dga_budget_type',
  'dga_total_project_budget',
  'dga_allocated_budget',
  'dga_requested_budget',
  'dga_budget_review_comments',
  'dga_project_related_changes',
] as const

const BUDGET_MONTH_SELECT_FIELDS = [
  'dga_aop_project_budgetid',
  'dga_name',
  'dga_planned_budget',
  'dga_actual_budget',
  'dga_delivered_amount',
  'dga_is_zero',
  '_dga_aop_project_value',
] as const

const BUDGET_DETAIL_SELECT_FIELDS = [
  'dga_aop_project_budget_detailsid',
  'dga_name',
  'dga_amount',
  'dga_grn',
  '_dga_account_code_value',
  '_dga_aop_project_budget_value',
] as const

const ACCOUNT_CODE_SELECT_FIELDS = [
  'dga_account_codeid',
  'dga_name',
  'dga_description',
  'dga_strategicvsoperational',
  'statecode',
] as const

const SUB_ACTIVITY_SELECT_FIELDS = [
  'dga_sub_activitiesid',
  'dga_name',
  'dga_description',
  'dga_budget_source',
  'dga_budget_type',
  'dga_allocated_budget',
  'dga_total_project_budget',
  'dga_budgetreviewed',
  '_dga_aopproject_value',
  'statecode',
  'statuscode',
  'createdon',
  'dga_january_planned',
  'dga_february_planned',
  'dga_march_planned',
  'dga_april_planned',
  'dga_may_planned',
  'dga_june_planned',
  'dga_july_planned',
  'dga_august_planned',
  'dga_september_planned',
  'dga_october_planned',
  'dga_november_planned',
  'dga_december_planned',
  'dga_january_actual',
  'dga_february_actual',
  'dga_march_actual',
  'dga_april_actual',
  'dga_may_actual',
  'dga_june_actual',
  'dga_july_actual',
  'dga_august_actual',
  'dga_september_actual',
  'dga_october_actual',
  'dga_november_actual',
  'dga_december_actual',
  'dga_january_delivered',
  'dga_february_delivered',
  'dga_march_delivered',
  'dga_april_delivered',
  'dga_may_delivered',
  'dga_june_delivered',
  'dga_july_delivered',
  'dga_august_delivered',
  'dga_september_delivered',
  'dga_october_delivered',
  'dga_november_delivered',
  'dga_december_delivered',
] as const

const SUB_ACTIVITY_BUDGET_SOURCE_OPTIONS = Object.entries(Dga_sub_activitiesesdga_budget_source).map(([value, label]) => ({
  label,
  value,
})) as SelectOption<SubActivityBudgetSourceValue>[]

const SUB_ACTIVITY_BUDGET_TYPE_OPTIONS = Object.entries(Dga_sub_activitiesesdga_budget_type).map(([value, label]) => ({
  label,
  value,
})) as SelectOption<SubActivityBudgetTypeValue>[]

const SUB_ACTIVITY_MONTH_PLANNED_FIELDS = [
  'dga_january_planned',
  'dga_february_planned',
  'dga_march_planned',
  'dga_april_planned',
  'dga_may_planned',
  'dga_june_planned',
  'dga_july_planned',
  'dga_august_planned',
  'dga_september_planned',
  'dga_october_planned',
  'dga_november_planned',
  'dga_december_planned',
] as const satisfies readonly (keyof Dga_sub_activitiesesBase)[]

const SUB_ACTIVITY_MONTH_ACTUAL_FIELDS = [
  'dga_january_actual',
  'dga_february_actual',
  'dga_march_actual',
  'dga_april_actual',
  'dga_may_actual',
  'dga_june_actual',
  'dga_july_actual',
  'dga_august_actual',
  'dga_september_actual',
  'dga_october_actual',
  'dga_november_actual',
  'dga_december_actual',
] as const satisfies readonly (keyof Dga_sub_activitiesesBase)[]

const SUB_ACTIVITY_MONTH_DELIVERED_FIELDS = [
  'dga_january_delivered',
  'dga_february_delivered',
  'dga_march_delivered',
  'dga_april_delivered',
  'dga_may_delivered',
  'dga_june_delivered',
  'dga_july_delivered',
  'dga_august_delivered',
  'dga_september_delivered',
  'dga_october_delivered',
  'dga_november_delivered',
  'dga_december_delivered',
] as const satisfies readonly (keyof Dga_sub_activitiesesBase)[]

const PROJECT_TO_SUB_ACTIVITY_BUDGET_TYPE: Record<string, SubActivityBudgetTypeValue> = {
  1: '776140000',
  2: '576610001',
  3: '776140002',
}

const SUB_ACTIVITY_TO_PROJECT_BUDGET_TYPE: Record<string, BudgetFormData['budgetType']> = {
  776140000: '1',
  576610001: '2',
  776140002: '3',
}

const DETAIL_CONFIRM_WARNING =
  'You have entered budget details that haven\'t been added yet. Please click “Add Entry” to include them before confirming or click Cancel to discard.'

const EMPTY_DETAIL_DRAFT: BudgetDetailDraft = {
  accountCodeId: '',
  amount: '',
  grn: '',
}

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function normalizeMonth(value?: string | null) {
  return String(value ?? '').trim().toLowerCase()
}

function stripCommas(value: string): string {
  return value.replace(/,/g, '')
}

function normalizeCurrencyDraft(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''

  return trimmed.replace(/^0+(?=\d)/, '')
}

function addCommas(value: string): string {
  if (!value) return value
  const parts = value.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

function getOptionLabel(options: readonly { label: string; value: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value
}

function renderBudgetReadOnlyValue(value?: string | number | null): string {
  const text = String(value ?? '').trim()
  return text || '—'
}

function renderBudgetReadOnlyDetails(items: Array<{
  label: string
  value: ReactNode
  kind?: 'classification' | 'requirement' | 'date' | 'identity'
  columns?: 3 | 4 | 6 | 9 | 12
}>) {
  return (
    <dl className="create-activity__readonly-grid create-activity__readonly-grid--3">
      {items.map((item) => {
        const columnClass = item.columns ? `create-activity__readonly-item--span-${item.columns}` : ''
        const kind = item.kind ?? 'identity'

        return (
          <div
            className={`create-activity__readonly-item create-activity__readonly-item--${kind} ${columnClass}`.trim()}
            key={item.label}
          >
            <div className="create-activity__readonly-item-content">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          </div>
        )
      })}
    </dl>
  )
}

function parseNum(value: string): number {
  const parsed = Number(stripCommas(value).trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function numberToString(value?: number | null): string {
  if (value == null) return ''
  return String(value)
}

function optionalCurrencyNumber(value: string): number | undefined {
  const normalized = stripCommas(value).trim()
  if (!normalized) return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function sumMonthly(months: readonly string[]): number {
  return months.reduce((sum, month) => sum + parseNum(month), 0)
}

function calcDelta(allocated: string, totalPlanned: string): string {
  return String(parseNum(allocated) - parseNum(totalPlanned))
}

function sumDetailAmounts(details: readonly BudgetDetailRecord[]) {
  return details.reduce((sum, detail) => sum + detail.amount, 0)
}

function isInvalidCurrency(value: string) {
  if (!value.trim()) return false
  const parsed = Number(stripCommas(value))
  return !Number.isFinite(parsed) || parsed < 0
}

function projectLookupFilter(projectId: string) {
  return `_dga_aop_project_value eq '${normalizeId(projectId)}'`
}

function toEntityBind(entitySetName: string, id: string) {
  return `/${entitySetName}(${normalizeId(id)})`
}

function buildMonthDetailsFilter(monthIds: string[]) {
  return monthIds.map((monthId) => `_dga_aop_project_budget_value eq '${normalizeId(monthId)}'`).join(' or ')
}

function createTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getMonthIndex(monthName: string) {
  return MONTH_LABELS.findIndex((month) => normalizeMonth(month) === normalizeMonth(monthName))
}

function isFutureMonth(monthName: string) {
  const monthIndex = getMonthIndex(monthName)
  return monthIndex > new Date().getMonth()
}

function toChoice<TValue extends string>(value: unknown, allowed: readonly TValue[]): TValue | '' {
  const normalized = String(value ?? '')
  return allowed.includes(normalized as TValue) ? (normalized as TValue) : ''
}

function buildAccountCodeLabel(accountCode: Dga_account_codes) {
  const code = accountCode.dga_name ?? ''
  const description = accountCode.dga_description?.trim() ?? ''

  if (code && description) {
    return `${code} - ${description}`
  }

  return description || code
}

function buildAccountCodeOption(accountCode: Dga_account_codes): SelectOption<string> | null {
  if (!accountCode.dga_account_codeid) return null

  return {
    description: accountCode.dga_description ?? undefined,
    label: buildAccountCodeLabel(accountCode),
    value: accountCode.dga_account_codeid,
  }
}

function buildBudgetDetailName(accountCodeLabel: string, grn: string) {
  const trimmedGrn = grn.trim()
  const trimmedLabel = accountCodeLabel.trim()

  if (!trimmedLabel) {
    return trimmedGrn
  }

  if (!trimmedGrn) {
    return trimmedLabel
  }

  return `${trimmedLabel} - ${trimmedGrn}`
}

function recordToMonth(record: Dga_aop_project_budgets): BudgetMonthRecord | null {
  if (!record.dga_aop_project_budgetid || !record.dga_name) return null

  return {
    actualBudget: record.dga_actual_budget ?? 0,
    deliveredAmount: record.dga_delivered_amount ?? 0,
    details: [],
    id: record.dga_aop_project_budgetid,
    isZero: Boolean(record.dga_is_zero),
    monthName: record.dga_name,
    plannedBudget: record.dga_planned_budget ?? 0,
  }
}

function getBudgetMonthRelatedValue(
  relatedChanges: string | null | undefined,
  monthId: string,
  fieldName: string,
): unknown {
  const parsedChanges = parseProjectRelatedChanges(relatedChanges)
  const executionChanges = parsedChanges.execution_change && typeof parsedChanges.execution_change === 'object' && !Array.isArray(parsedChanges.execution_change)
    ? parsedChanges.execution_change as ProjectRelatedChanges
    : {}

  return resolveProjectRelatedValue(getProjectRelatedRecordChange(
    executionChanges,
    'budget',
    cleanRecordId(monthId),
    fieldName,
  )) ?? resolveProjectRelatedValue(getProjectRelatedRecordChange(
    parsedChanges,
    'budget',
    cleanRecordId(monthId),
    fieldName,
  ))
}

function applyBudgetRelatedChangesToMonth(
  month: BudgetMonthRecord,
  relatedChanges: string | null | undefined,
): BudgetMonthRecord {
  const actualBudget = getBudgetMonthRelatedValue(relatedChanges, month.id, 'dga_actual_budget')
  const deliveredAmount = getBudgetMonthRelatedValue(relatedChanges, month.id, 'dga_delivered_amount')

  return {
    ...month,
    actualBudget: isEmptyRelatedValue(actualBudget) ? month.actualBudget : Number(actualBudget),
    deliveredAmount: isEmptyRelatedValue(deliveredAmount) ? month.deliveredAmount : Number(deliveredAmount),
  }
}

function buildBudgetMonthRelatedChanges(
  month: BudgetMonthRecord | BudgetDrawerMonth,
  actualBudget: number,
  deliveredAmount: number,
): ProjectRelatedChanges {
  return {
    execution_change: {
      budget: [{
        id: cleanRecordId(month.id),
        month_name: month.monthName,
        dga_actual_budget: {
          old_value: month.actualBudget ?? 0,
          new_value: actualBudget,
        },
        dga_delivered_amount: {
          old_value: month.deliveredAmount ?? 0,
          new_value: deliveredAmount,
        },
      }],
    },
  }
}

function recordToBudgetDetail(
  record: Dga_aop_project_budget_detailses,
  accountCodeOptions: Map<string, SelectOption<string>>,
): BudgetDetailRecord | null {
  if (!record.dga_aop_project_budget_detailsid) return null

  const accountCodeId = record._dga_account_code_value ?? ''
  const option = accountCodeOptions.get(normalizeId(accountCodeId))

  return {
    accountCodeId,
    accountCodeLabel: option?.label ?? record.dga_name ?? '',
    amount: record.dga_amount ?? 0,
    grn: record.dga_grn ?? '',
    id: record.dga_aop_project_budget_detailsid,
    localId: record.dga_aop_project_budget_detailsid,
    monthId: record._dga_aop_project_budget_value ?? '',
  }
}

function buildForm(project: Dga_aop_projectses, months: BudgetMonthRecord[]): BudgetFormData {
  const monthlyBudgets = MONTH_LABELS.map((month) => {
    const record = months.find((item) => normalizeMonth(item.monthName) === normalizeMonth(month))
    return numberToString(record?.plannedBudget ?? 0)
  }) as BudgetFormData['monthlyBudgets']

  const totalPlannedBudget = String(sumMonthly(monthlyBudgets))
  const allocatedBudget = numberToString(project.dga_allocated_budget)

  return {
    allocatedBudget,
    budgetReviewComment: project.dga_budget_review_comments ?? '',
    budgetSource: toChoice(project.dga_budget_source, ['1', '2'] as const),
    budgetType: toChoice(project.dga_budget_type, ['1', '2', '3'] as const),
    delta: calcDelta(allocatedBudget, totalPlannedBudget),
    monthlyBudgets,
    totalActivityBudget: numberToString(project.dga_total_project_budget),
    totalPlannedBudget,
  }
}

function buildProjectPayload(form: BudgetFormData, showTotalActivityBudget: boolean): BudgetProjectPayload {
  const totalPlannedBudget = sumMonthly(form.monthlyBudgets)

  return {
    dga_allocated_budget: optionalCurrencyNumber(form.allocatedBudget),
    dga_budget_review_comments: form.budgetReviewComment.trim(),
    dga_budget_source: Number(form.budgetSource) as Dga_aop_projectsesBase['dga_budget_source'],
    dga_budget_type: Number(form.budgetType) as Dga_aop_projectsesBase['dga_budget_type'],
    dga_requested_budget: totalPlannedBudget,
    dga_total_project_budget: showTotalActivityBudget
      ? optionalCurrencyNumber(form.totalActivityBudget)
      : totalPlannedBudget,
  }
}

function validateBudgetForm(
  form: BudgetFormData,
  showTotalActivityBudget: boolean,
  hasAllMonthlyRows: boolean,
  requireBudgetReviewComment: boolean,
) {
  const errors: BudgetFieldErrors = {}

  if (!form.budgetSource) errors.budgetSource = 'Select a Budget Source.'
  if (!form.budgetType) errors.budgetType = 'Select a Budget Type.'
  if (showTotalActivityBudget && !form.totalActivityBudget.trim()) {
    errors.totalActivityBudget = 'Enter Total Activity Budget.'
  }
  if (!form.allocatedBudget.trim()) errors.allocatedBudget = 'Enter Allocated Budget.'
  if (requireBudgetReviewComment && !form.budgetReviewComment.trim()) errors.budgetReviewComment = 'Enter Budget Review Comment.'
  if (!hasAllMonthlyRows) {
    errors.monthlyBudgets = 'Monthly budget rows are incomplete. Please refresh after the budget plugin creates all 12 month rows.'
  }

  if (isInvalidCurrency(form.totalActivityBudget)) errors.totalActivityBudget = 'Enter a valid non-negative amount.'
  if (isInvalidCurrency(form.allocatedBudget)) errors.allocatedBudget = 'Enter a valid non-negative amount.'

  const invalidMonth = form.monthlyBudgets.some(isInvalidCurrency)
  if (invalidMonth) errors.monthlyBudgets = 'Monthly planned budgets must be valid non-negative amounts.'

  return errors
}

function validateDetailDraft(draft: BudgetDetailDraft) {
  const errors: BudgetDetailDraftErrors = {}

  if (!draft.accountCodeId) errors.accountCodeId = 'Select an Account Code.'
  if (!draft.grn.trim()) errors.grn = 'Enter GRN.'
  if (!draft.amount.trim()) {
    errors.amount = 'Enter Amount.'
  } else if (isInvalidCurrency(draft.amount)) {
    errors.amount = 'Enter a valid non-negative amount.'
  }

  return errors
}

function isSameBudgetForm(left: BudgetFormData, right: BudgetFormData) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function createEmptyMonthlyBudgets(): BudgetFormData['monthlyBudgets'] {
  return ['', '', '', '', '', '', '', '', '', '', '', '']
}

function sumBudgetItemMonthly(item: Pick<BudgetItemForm, 'monthlyBudgets'>) {
  return sumMonthly(item.monthlyBudgets)
}

function calcBudgetItemDelta(item: Pick<BudgetItemForm, 'allocatedBudget' | 'monthlyBudgets'>) {
  return String(sumBudgetItemMonthly(item) - parseNum(item.allocatedBudget))
}

function toSubActivityChoice<TValue extends string>(value: unknown, allowedValues: readonly TValue[]): TValue | '' {
  const normalized = String(value ?? '')
  return allowedValues.includes(normalized as TValue) ? normalized as TValue : ''
}

function projectBudgetTypeToSubActivityBudgetType(value: string): SubActivityBudgetTypeValue {
  return PROJECT_TO_SUB_ACTIVITY_BUDGET_TYPE[value] ?? ''
}

function createBlankBudgetItem(): BudgetItemForm {
  return {
    allocatedBudget: '',
    budgetSource: '',
    budgetType: '',
    description: '',
    isCollapsed: false,
    localId: createTempId(),
    monthlyActuals: createEmptyMonthlyBudgets(),
    monthlyBudgets: createEmptyMonthlyBudgets(),
    monthlyDelivered: createEmptyMonthlyBudgets(),
    name: '',
  }
}

function legacyFormToBudgetItem(form: BudgetFormData): BudgetItemForm {
  return {
    allocatedBudget: form.allocatedBudget,
    budgetSource: toSubActivityChoice(form.budgetSource, ['1', '2'] as const),
    budgetType: projectBudgetTypeToSubActivityBudgetType(form.budgetType),
    description: '',
    isCollapsed: false,
    localId: createTempId(),
    monthlyActuals: createEmptyMonthlyBudgets(),
    monthlyBudgets: [...form.monthlyBudgets] as BudgetFormData['monthlyBudgets'],
    monthlyDelivered: createEmptyMonthlyBudgets(),
    name: '',
  }
}

function hasLegacyBudgetValues(form: BudgetFormData) {
  return Boolean(
    form.budgetSource
    || form.budgetType
    || parseNum(form.allocatedBudget) > 0
    || parseNum(form.totalPlannedBudget) > 0
    || form.monthlyBudgets.some((value) => parseNum(value) > 0),
  )
}

function recordToBudgetItem(record: Dga_sub_activitieses): BudgetItemForm | null {
  if (!record.dga_sub_activitiesid) return null

  const monthlyBudgets = SUB_ACTIVITY_MONTH_PLANNED_FIELDS.map((field) => (
    numberToString(record[field] as number | undefined)
  )) as BudgetFormData['monthlyBudgets']
  const monthlyActuals = SUB_ACTIVITY_MONTH_ACTUAL_FIELDS.map((field) => (
    numberToString(record[field] as number | undefined)
  )) as BudgetFormData['monthlyBudgets']
  const monthlyDelivered = SUB_ACTIVITY_MONTH_DELIVERED_FIELDS.map((field) => (
    numberToString(record[field] as number | undefined)
  )) as BudgetFormData['monthlyBudgets']

  return {
    allocatedBudget: numberToString(record.dga_allocated_budget),
    budgetSource: toSubActivityChoice(record.dga_budget_source, ['1', '2'] as const),
    budgetType: toSubActivityChoice(record.dga_budget_type, ['776140000', '576610001', '776140002'] as const),
    description: record.dga_description ?? '',
    id: record.dga_sub_activitiesid,
    isCollapsed: true,
    localId: record.dga_sub_activitiesid,
    monthlyActuals,
    monthlyBudgets,
    monthlyDelivered,
    name: record.dga_name ?? '',
  }
}

function buildBudgetItemPayload(item: BudgetItemForm, projectId: string): Omit<Dga_sub_activitiesesBase, 'dga_sub_activitiesid'> {
  const payload: Omit<Dga_sub_activitiesesBase, 'dga_sub_activitiesid'> = {
    dga_allocated_budget: optionalCurrencyNumber(item.allocatedBudget) ?? 0,
    'dga_AOPProject@odata.bind': toEntityBind('dga_aop_projectses', projectId),
    dga_budget_source: Number(item.budgetSource) as Dga_sub_activitiesesBase['dga_budget_source'],
    dga_budget_type: Number(item.budgetType) as Dga_sub_activitiesesBase['dga_budget_type'],
    dga_description: item.description.trim(),
    dga_name: item.name.trim() || 'N/A',
    dga_total_project_budget: sumBudgetItemMonthly(item),
    statecode: 0,
    statuscode: 1,
  }

  SUB_ACTIVITY_MONTH_PLANNED_FIELDS.forEach((field, index) => {
    payload[field] = parseNum(item.monthlyBudgets[index])
  })

  return payload
}

function validateBudgetItems(items: BudgetItemForm[]) {
  const errors: Record<string, BudgetItemFieldErrors> = {}

  items.forEach((item) => {
    const itemErrors: BudgetItemFieldErrors = {}
    if (!item.name.trim()) itemErrors.name = 'Enter Sub Activity Name.'
    if (!item.budgetSource) itemErrors.budgetSource = 'Select a Budget Source.'
    if (!item.budgetType) itemErrors.budgetType = 'Select a Budget Type.'
    if (!item.allocatedBudget.trim()) itemErrors.allocatedBudget = 'Enter Allocated Budget.'
    if (isInvalidCurrency(item.allocatedBudget)) itemErrors.allocatedBudget = 'Enter a valid non-negative amount.'
    if (item.monthlyBudgets.some(isInvalidCurrency)) {
      itemErrors.monthlyBudgets = 'Monthly planned budgets must be valid non-negative amounts.'
    }

    if (Object.keys(itemErrors).length > 0) {
      errors[item.localId] = itemErrors
    }
  })

  return errors
}

function budgetItemsAggregateForm(items: BudgetItemForm[], reviewComment: string): BudgetFormData {
  const allocatedBudget = String(items.reduce((sum, item) => sum + parseNum(item.allocatedBudget), 0))
  const monthlyBudgets = MONTH_LABELS.map((_, monthIndex) => (
    String(items.reduce((sum, item) => sum + parseNum(item.monthlyBudgets[monthIndex]), 0))
  )) as BudgetFormData['monthlyBudgets']
  const totalPlannedBudget = String(sumMonthly(monthlyBudgets))
  const firstItem = items[0]

  return {
    allocatedBudget,
    budgetReviewComment: reviewComment,
    budgetSource: firstItem?.budgetSource === '1' || firstItem?.budgetSource === '2' ? firstItem.budgetSource : '',
    budgetType: '',
    delta: calcDelta(allocatedBudget, totalPlannedBudget),
    monthlyBudgets,
    totalActivityBudget: totalPlannedBudget,
    totalPlannedBudget,
  }
}

function isSameBudgetItems(left: BudgetItemForm[], right: BudgetItemForm[]) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function BudgetTab({
  activityScope,
  aiSummaryBlocks,
  aiSummaryError,
  aiSummaryMeta,
  canEditExecutionBudget = false,
  hierarchyId = '',
  isAiSummaryLoading = false,
  isEditing = false,
  isExecutionPhase = false,
  isReadOnly = false,
  onActivityDataChanged,
  onHeaderActionChange,
  onOperationAlert,
  onProjectRelatedChangesChange,
  plannedEndDate,
  plannedStartDate,
  projectId,
  projectRelatedChanges,
  statusCode = 1,
}: BudgetTabProps) {
  const selectedRole = useAppSelector((state) => state.app.selectedRole)
  const currentRole = useAppSelector((state) => state.user.currentRole)
  const [form, setForm] = useState<BudgetFormData>(INITIAL_BUDGET_FORM)
  const [savedForm, setSavedForm] = useState<BudgetFormData>(INITIAL_BUDGET_FORM)
  const [budgetItems, setBudgetItems] = useState<BudgetItemForm[]>([])
  const [savedBudgetItems, setSavedBudgetItems] = useState<BudgetItemForm[]>([])
  const [budgetItemErrors, setBudgetItemErrors] = useState<Record<string, BudgetItemFieldErrors>>({})
  const [budgetWizardItem, setBudgetWizardItem] = useState<BudgetItemForm | null>(null)
  const [budgetWizardErrors, setBudgetWizardErrors] = useState<BudgetItemFieldErrors>({})
  const [budgetWizardStep, setBudgetWizardStep] = useState<BudgetWizardStep>(1)
  const [budgetWizardMode, setBudgetWizardMode] = useState<'create' | 'edit'>('create')
  const [deletedBudgetItemIds, setDeletedBudgetItemIds] = useState<string[]>([])
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false)
  const [deleteBudgetItemTarget, setDeleteBudgetItemTarget] = useState<BudgetItemForm | null>(null)
  const [monthRecords, setMonthRecords] = useState<BudgetMonthRecord[]>([])
  const [accountCodeOptions, setAccountCodeOptions] = useState<SelectOption<string>[]>([])
  const [errors, setErrors] = useState<BudgetFieldErrors & { context?: string; submit?: string }>({})
  const [inlineDeliveredDrafts, setInlineDeliveredDrafts] = useState<Record<string, string>>({})
  const [inlineDeliveredErrors, setInlineDeliveredErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingExecutionMonth, setIsSavingExecutionMonth] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerMonthId, setDrawerMonthId] = useState<string | null>(null)
  const [drawerRows, setDrawerRows] = useState<BudgetDetailRecord[]>([])
  const [originalDrawerRows, setOriginalDrawerRows] = useState<BudgetDetailRecord[]>([])
  const [detailDraft, setDetailDraft] = useState<BudgetDetailDraft>(EMPTY_DETAIL_DRAFT)
  const [detailDraftErrors, setDetailDraftErrors] = useState<BudgetDetailDraftErrors>({})
  const [isDetailFormOpen, setIsDetailFormOpen] = useState(false)
  const [editingDetailLocalId, setEditingDetailLocalId] = useState<string | null>(null)
  const [isSavingDrawer, setIsSavingDrawer] = useState(false)
  const [budgetViewMode, setBudgetViewMode] = useState<BudgetViewMode>('table')
  const currentQuarterIndex = Math.floor(new Date().getMonth() / 3)

  const showTotalActivityBudget = useMemo(() => {
    if (!plannedStartDate || !plannedEndDate) return false
    return new Date(plannedStartDate).getFullYear() !== new Date(plannedEndDate).getFullYear()
  }, [plannedEndDate, plannedStartDate])

  const orderedMonthRecords = useMemo(() => {
    return MONTH_LABELS
      .map((month) => monthRecords.find((item) => normalizeMonth(item.monthName) === normalizeMonth(month)))
      .filter((item): item is BudgetMonthRecord => Boolean(item))
  }, [monthRecords])

  const missingMonths = useMemo(() => {
    const existing = new Set(monthRecords.map((item) => normalizeMonth(item.monthName)))
    return MONTH_LABELS.filter((month) => !existing.has(normalizeMonth(month)))
  }, [monthRecords])

  const hasAllMonthlyRows = missingMonths.length === 0
  const hasMultiBudgetItems = !isExecutionPhase && budgetItems.length > 0
  const allBudgetItemsExpanded = hasMultiBudgetItems && budgetItems.every((item) => !item.isCollapsed)
  const hasBudgetItemUnsavedChanges = !isSameBudgetItems(budgetItems, savedBudgetItems) || deletedBudgetItemIds.length > 0
  const saveLabel = statusCode === 1 ? 'Save Draft' : 'Save Changes'
  const isDraftStatus = Number(statusCode) === 1
  const activeRoleName = currentRole?.roleName || selectedRole || ''
  const isStrategyTeamRole = activeRoleName.toLowerCase().includes('strategy team')
  const isStrategyTeamReviewStatus = Number(statusCode) === 776140003
  const showBudgetReviewComment = !isDraftStatus
  const canEditBudgetReviewComment = showBudgetReviewComment && isStrategyTeamRole && isStrategyTeamReviewStatus
  const hasBudgetReviewCommentUnsavedChanges = canEditBudgetReviewComment && form.budgetReviewComment !== savedForm.budgetReviewComment
  const hasUnsavedChanges = hasMultiBudgetItems
    ? hasBudgetReviewCommentUnsavedChanges || hasBudgetItemUnsavedChanges
    : (
        canEditBudgetReviewComment
          ? !isSameBudgetForm(form, savedForm)
          : !isSameBudgetForm({ ...form, budgetReviewComment: savedForm.budgetReviewComment }, savedForm)
      )
  const isFormReadOnly = !isEditing || isReadOnly
  const isBudgetReviewCommentReadOnly = !canEditBudgetReviewComment || isFormReadOnly
  const budgetItemAllocatedTotal = budgetItems.reduce((sum, item) => sum + parseNum(item.allocatedBudget), 0)
  const budgetItemActualTotal = budgetItems.reduce((sum, item) => (
    sum + item.monthlyActuals.reduce((monthSum, value) => monthSum + parseNum(value), 0)
  ), 0)
  const budgetItemDeliveredTotal = budgetItems.reduce((sum, item) => (
    sum + item.monthlyDelivered.reduce((monthSum, value) => monthSum + parseNum(value), 0)
  ), 0)
  const actualBudgetSpent = hasMultiBudgetItems
    ? budgetItemActualTotal
    : monthRecords.reduce((sum, record) => sum + record.actualBudget, 0)
  const totalDeliveredValues = hasMultiBudgetItems
    ? budgetItemDeliveredTotal
    : monthRecords.reduce((sum, record) => sum + record.deliveredAmount, 0)
  const remainingBudget = (hasMultiBudgetItems ? budgetItemAllocatedTotal : parseNum(form.allocatedBudget)) - actualBudgetSpent
  const showBudgetOverviewCard = isExecutionPhase || showBudgetReviewComment
  const accountCodeOptionMap = useMemo(
    () => new Map(accountCodeOptions.map((option) => [normalizeId(option.value), option])),
    [accountCodeOptions],
  )
  const accountCodeSelectOptions = useMemo<SelectOption<string>[]>(
    () => [
      {
        disabled: true,
        label: 'Select Account Code',
        value: '',
      },
      ...accountCodeOptions,
    ],
    [accountCodeOptions],
  )
  const executionMonthlyEditAllowed = isEditing && isExecutionPhase && canEditExecutionBudget
  const selectedDrawerMonth = useMemo<BudgetDrawerMonth | null>(() => {
    if (!drawerMonthId) return null
    const month = monthRecords.find((record) => normalizeId(record.id) === normalizeId(drawerMonthId))
    if (!month) return null

    return {
      ...month,
      isFuture: isFutureMonth(month.monthName),
      monthIndex: getMonthIndex(month.monthName),
    }
  }, [drawerMonthId, monthRecords])
  const drawerActualTotal = useMemo(() => sumDetailAmounts(drawerRows), [drawerRows])
  const drawerAllocatedBudget = parseNum(form.allocatedBudget)
  const drawerRemainingBudget = drawerAllocatedBudget - drawerActualTotal
  const visibleDrawerRows = useMemo<BudgetDetailGridRow[]>(
    () => drawerRows.map((row, index) => ({ ...row, index: index + 1 })),
    [drawerRows],
  )
  const graphicalQuarters = useMemo(() => {
    return Array.from({ length: 4 }, (_, quarterIndex) => {
      const startIndex = quarterIndex * 3
      const quarterMonths = MONTH_LABELS.slice(startIndex, startIndex + 3)
      const records = quarterMonths
        .map((monthName) => monthRecords.find((item) => normalizeMonth(item.monthName) === normalizeMonth(monthName)))
        .filter((record): record is BudgetMonthRecord => Boolean(record))

      const plannedSpent = records.reduce((sum, record) => sum + record.plannedBudget, 0)
      const actualSpent = records.reduce((sum, record) => sum + record.actualBudget, 0)
      const progress = plannedSpent > 0 ? Math.min(100, Math.round((actualSpent / plannedSpent) * 100)) : 0

      return {
        actualSpent,
        label: `Quarter ${quarterIndex + 1}`,
        plannedSpent,
        progress,
        range: `${quarterMonths[0]} - ${quarterMonths[quarterMonths.length - 1]}`,
      }
    })
  }, [monthRecords])
  const graphicalMonths = useMemo(() => {
    return MONTH_LABELS.map((monthName) => {
      const record = monthRecords.find((item) => normalizeMonth(item.monthName) === normalizeMonth(monthName))

      return {
        actualBudget: record?.actualBudget ?? 0,
        deliveredAmount: record?.deliveredAmount ?? 0,
        monthName,
        plannedBudget: record?.plannedBudget ?? 0,
      }
    })
  }, [monthRecords])
  const graphicalMaxValue = Math.max(
    1,
    ...graphicalQuarters.flatMap((quarter) => [quarter.plannedSpent, quarter.actualSpent]),
  )
  const monthlyGraphicalMaxValue = Math.max(
    1,
    ...graphicalMonths.flatMap((month) => [month.plannedBudget, month.actualBudget, month.deliveredAmount]),
  )
  const overallPlannedSpent = graphicalQuarters.reduce((sum, quarter) => sum + quarter.plannedSpent, 0)
  const overallActualSpent = graphicalQuarters.reduce((sum, quarter) => sum + quarter.actualSpent, 0)
  const overallProgress = overallPlannedSpent > 0 ? Math.min(100, Math.round((overallActualSpent / overallPlannedSpent) * 100)) : 0

  useEffect(() => {
    let isMounted = true

    async function loadBudget() {
      setIsLoading(true)
      setErrors({})

      if (!projectId) {
        setErrors({ context: 'Activity id is missing from the edit URL.' })
        setIsLoading(false)
        return
      }

      try {
        const [projectResult, monthsResult, accountCodesResult, subActivitiesResult] = await Promise.all([
          Dga_aop_projectsesService.get(projectId, {
            select: [...BUDGET_PROJECT_SELECT_FIELDS],
          }),
          Dga_aop_project_budgetsService.getAll({
            filter: projectLookupFilter(projectId),
            select: [...BUDGET_MONTH_SELECT_FIELDS],
          }),
          isExecutionPhase
            ? Dga_account_codesService.getAll({
                filter: [
                  'statecode eq 0',
                  activityScope ? `dga_strategicvsoperational eq ${activityScope}` : '',
                  hierarchyId ? `_dga_divisional_hierarchy_value eq '${normalizeId(hierarchyId)}'` : '',
                ].filter(Boolean).join(' and '),
                orderBy: ['dga_name asc'],
                select: [...ACCOUNT_CODE_SELECT_FIELDS],
              })
            : Promise.resolve({ data: [], success: true }),
          !isExecutionPhase
            ? Dga_sub_activitiesesService.getAll({
                filter: `_dga_aopproject_value eq '${normalizeId(projectId)}'`,
                orderBy: ['createdon asc'],
                select: [...SUB_ACTIVITY_SELECT_FIELDS],
              })
            : Promise.resolve({ data: [], success: true }),
        ])

        if (!isMounted) return

        assertOperationSuccess(projectResult, 'Failed to load project budget.')
        assertOperationSuccess(monthsResult, 'Failed to load monthly budget rows.')
        assertOperationSuccess(accountCodesResult, 'Failed to load account codes.')
        assertOperationSuccess(subActivitiesResult, 'Failed to load budget items.')

        const project = getResultValue<Dga_aop_projectses>(projectResult)
        if (!project) throw new Error('Project budget could not be found.')
        const subActivityItems = ((subActivitiesResult.data ?? []) as Dga_sub_activitieses[])
          .map(recordToBudgetItem)
          .filter((item): item is BudgetItemForm => Boolean(item))

        const accountCodes = ((accountCodesResult.data ?? []) as Dga_account_codes[])
          .filter((accountCode) => accountCode.dga_account_codeid)
        const nextAccountCodeOptions = accountCodes
          .map(buildAccountCodeOption)
          .filter((option): option is SelectOption<string> => Boolean(option))
        const nextAccountCodeOptionMap = new Map(
          nextAccountCodeOptions.map((option) => [normalizeId(option.value), option]),
        )

        const months = ((monthsResult.data ?? []) as Dga_aop_project_budgets[])
          .map(recordToMonth)
          .filter((record): record is BudgetMonthRecord => Boolean(record))
          .map((month) => applyBudgetRelatedChangesToMonth(
            month,
            project.dga_project_related_changes ?? projectRelatedChanges,
          ))

        const monthIds = months.map((record) => record.id).filter(Boolean)
        let details: BudgetDetailRecord[] = []

        if (isExecutionPhase && monthIds.length > 0) {
          const detailsResult = await Dga_aop_project_budget_detailsesService.getAll({
            filter: buildMonthDetailsFilter(monthIds),
            orderBy: ['createdon asc'],
            select: [...BUDGET_DETAIL_SELECT_FIELDS],
          })

          if (!isMounted) return

          assertOperationSuccess(detailsResult, 'Failed to load budget details.')
          const detailRecords = ((detailsResult.data ?? []) as Dga_aop_project_budget_detailses[])
          details = detailRecords
            .map((record) => recordToBudgetDetail(record, nextAccountCodeOptionMap))
            .filter((record): record is BudgetDetailRecord => Boolean(record))

          const detailsByMonthId = new Map<string, BudgetDetailRecord[]>()
          details.forEach((detail) => {
            const monthId = normalizeId(detail.monthId)
            if (!monthId) return
            const existingRows = detailsByMonthId.get(monthId) ?? []
            existingRows.push(detail)
            detailsByMonthId.set(monthId, existingRows)
          })

          const monthsWithDetails = months.map((month) => {
            const detailRows = detailsByMonthId.get(normalizeId(month.id)) ?? []
            const detailTotal = sumDetailAmounts(detailRows)

            return {
              ...month,
              actualBudget: detailRows.length > 0 ? detailTotal : month.actualBudget,
              deliveredAmount: detailRows.length > 0 ? detailTotal : month.deliveredAmount,
              details: detailRows,
            }
          })

          const nextForm = buildForm(project, monthsWithDetails)
          const nextDeliveredDrafts = Object.fromEntries(
            monthsWithDetails.map((month) => [month.id, numberToString(month.deliveredAmount)]),
          )

          setAccountCodeOptions(nextAccountCodeOptions)
          setBudgetItems([])
          setSavedBudgetItems([])
          setBudgetItemErrors({})
          setDeletedBudgetItemIds([])
          setInlineDeliveredDrafts(nextDeliveredDrafts)
          setInlineDeliveredErrors({})
          setMonthRecords(monthsWithDetails)
          setForm(nextForm)
          setSavedForm(nextForm)
          return
        }

        setAccountCodeOptions(nextAccountCodeOptions)
        setBudgetItems(subActivityItems)
        setSavedBudgetItems(subActivityItems.map((item) => ({ ...item, monthlyBudgets: [...item.monthlyBudgets] as BudgetFormData['monthlyBudgets'] })))
        setBudgetItemErrors({})
        setDeletedBudgetItemIds([])
        setInlineDeliveredDrafts(
          Object.fromEntries(months.map((month) => [month.id, numberToString(month.deliveredAmount)])),
        )
        setInlineDeliveredErrors({})
        setMonthRecords(months)
        const nextForm = buildForm(project, months)
        setForm(nextForm)
        setSavedForm(nextForm)
      } catch (error) {
        if (isMounted) {
          setErrors({
            context: error instanceof Error ? error.message : 'Failed to load budget information.',
          })
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadBudget()
    return () => {
      isMounted = false
    }
  }, [activityScope, hierarchyId, isExecutionPhase, projectId, projectRelatedChanges])

  function handleFieldChange(fields: Partial<BudgetFormData>) {
    if (isFormReadOnly) return

    setForm((prev) => {
      const next = { ...prev, ...fields }

      if ('monthlyBudgets' in fields && fields.monthlyBudgets) {
        next.totalPlannedBudget = String(sumMonthly(fields.monthlyBudgets))
      }

      if ('allocatedBudget' in fields || 'totalPlannedBudget' in fields || 'monthlyBudgets' in fields) {
        next.delta = calcDelta(next.allocatedBudget, next.totalPlannedBudget)
      }

      return next
    })

    const changedKey = Object.keys(fields)[0] as keyof BudgetFormData
    setErrors((prev) => {
      const copy = { ...prev }
      if (changedKey) delete copy[changedKey]
      delete copy.submit

      if (changedKey === 'monthlyBudgets' && fields.monthlyBudgets?.some(isInvalidCurrency)) {
        copy.monthlyBudgets = 'Monthly planned budgets must be valid non-negative amounts.'
      }

      if (changedKey && changedKey !== 'monthlyBudgets') {
        const value = String(fields[changedKey] ?? '')
        if (['allocatedBudget', 'totalActivityBudget'].includes(changedKey) && isInvalidCurrency(value)) {
          copy[changedKey] = 'Enter a valid non-negative amount.'
        }
      }

      return copy
    })
  }

  function handleMonthlyChange(index: number, value: string) {
    const nextMonthly = [...form.monthlyBudgets] as BudgetFormData['monthlyBudgets']
    nextMonthly[index] = normalizeCurrencyDraft(value)
    handleFieldChange({ monthlyBudgets: nextMonthly })
  }

  function cloneBudgetItem(item: BudgetItemForm): BudgetItemForm {
    return {
      ...item,
      monthlyActuals: [...item.monthlyActuals] as BudgetFormData['monthlyBudgets'],
      monthlyBudgets: [...item.monthlyBudgets] as BudgetFormData['monthlyBudgets'],
      monthlyDelivered: [...item.monthlyDelivered] as BudgetFormData['monthlyBudgets'],
    }
  }

  function handleAddBudgetItem() {
    if (isFormReadOnly || isExecutionPhase) return

    if (budgetItems.length === 0 && hasLegacyBudgetValues(form)) {
      setIsConvertDialogOpen(true)
      return
    }

    setBudgetWizardItem(createBlankBudgetItem())
    setBudgetWizardErrors({})
    setBudgetWizardStep(1)
    setBudgetWizardMode('create')
  }

  function handleConfirmConvertToMultiBudget() {
    const blankItem = createBlankBudgetItem()
    setBudgetItems([
      { ...legacyFormToBudgetItem(form), isCollapsed: true },
      { ...blankItem, isCollapsed: true },
    ])
    setBudgetWizardItem(blankItem)
    setBudgetWizardErrors({})
    setBudgetWizardStep(1)
    setBudgetWizardMode('edit')
    setBudgetItemErrors({})
    setIsConvertDialogOpen(false)
  }

  function openBudgetItemWizard(item: BudgetItemForm) {
    if (isFormReadOnly || isExecutionPhase) return

    setBudgetWizardItem(cloneBudgetItem(item))
    setBudgetWizardErrors({})
    setBudgetWizardStep(1)
    setBudgetWizardMode('edit')
  }

  function closeBudgetItemWizard() {
    setBudgetWizardItem(null)
    setBudgetWizardErrors({})
    setBudgetWizardStep(1)
    setBudgetWizardMode('create')
  }

  function updateBudgetWizardItem(fields: Partial<BudgetItemForm>) {
    setBudgetWizardItem((current) => (current ? { ...current, ...fields } : current))
    setBudgetWizardErrors((current) => {
      const next = { ...current }
      Object.keys(fields).forEach((key) => {
        delete next[key as keyof BudgetItemFieldErrors]
      })
      return next
    })
  }

  function updateBudgetWizardMonth(monthIndex: number, value: string) {
    setBudgetWizardItem((current) => {
      if (!current) return current

      const monthlyBudgets = [...current.monthlyBudgets] as BudgetFormData['monthlyBudgets']
      monthlyBudgets[monthIndex] = normalizeCurrencyDraft(value)
      return { ...current, monthlyBudgets }
    })
    setBudgetWizardErrors((current) => {
      const next = { ...current }
      delete next.monthlyBudgets
      return next
    })
  }

  function getBudgetWizardValidationErrors(item: BudgetItemForm) {
    return validateBudgetItems([item])[item.localId] ?? {}
  }

  function handleBudgetWizardNext() {
    if (!budgetWizardItem) return

    const nextErrors = getBudgetWizardValidationErrors(budgetWizardItem)
    if (budgetWizardStep === 1 && (nextErrors.name || nextErrors.budgetSource || nextErrors.budgetType || nextErrors.allocatedBudget)) {
      setBudgetWizardErrors(nextErrors)
      return
    }

    if (budgetWizardStep === 2 && nextErrors.monthlyBudgets) {
      setBudgetWizardErrors(nextErrors)
      return
    }

    setBudgetWizardErrors({})
    setBudgetWizardStep((current) => Math.min(3, current + 1) as BudgetWizardStep)
  }

  function handleSaveBudgetWizardItem() {
    if (!budgetWizardItem) return

    const nextErrors = getBudgetWizardValidationErrors(budgetWizardItem)
    if (Object.keys(nextErrors).length > 0) {
      setBudgetWizardErrors(nextErrors)
      setBudgetWizardStep(nextErrors.name || nextErrors.budgetSource || nextErrors.budgetType || nextErrors.allocatedBudget ? 1 : 2)
      return
    }

    const itemToSave = { ...cloneBudgetItem(budgetWizardItem), isCollapsed: true }
    setBudgetItems((current) => {
      const existingIndex = current.findIndex((item) => item.localId === itemToSave.localId)
      if (existingIndex >= 0) {
        return current.map((item) => (item.localId === itemToSave.localId ? itemToSave : item))
      }
      return [...current.map((item) => ({ ...item, isCollapsed: true })), itemToSave]
    })
    setBudgetItemErrors((current) => {
      const next = { ...current }
      delete next[itemToSave.localId]
      return next
    })
    closeBudgetItemWizard()
  }

  function toggleBudgetItem(localId: string) {
    setBudgetItems((current) =>
      current.map((item) => (item.localId === localId ? { ...item, isCollapsed: !item.isCollapsed } : item)),
    )
  }

  function handleRequestDeleteBudgetItem(item: BudgetItemForm) {
    if (isFormReadOnly || isExecutionPhase) return

    if (budgetItems.length <= 1) {
      onOperationAlert?.({
        kind: 'error',
        message: 'At least one budget item is required.',
        title: 'Budget item was not deleted',
      })
      return
    }

    setDeleteBudgetItemTarget(item)
  }

  function handleConfirmDeleteBudgetItem() {
    if (!deleteBudgetItemTarget) return

    setBudgetItems((current) => current.filter((item) => item.localId !== deleteBudgetItemTarget.localId))
    if (deleteBudgetItemTarget.id) {
      setDeletedBudgetItemIds((current) => Array.from(new Set([...current, deleteBudgetItemTarget.id as string])))
    }
    setBudgetItemErrors((current) => {
      const next = { ...current }
      delete next[deleteBudgetItemTarget.localId]
      return next
    })
    setDeleteBudgetItemTarget(null)
  }

  const handleSave = useCallback(async () => {
    if (isFormReadOnly) return false
    if (isSaving) return false

    if (!projectId) {
      setErrors({ context: 'Activity id is missing from the edit URL.' })
      return false
    }

    if (hasMultiBudgetItems) {
      if (canEditBudgetReviewComment && !form.budgetReviewComment.trim()) {
        setErrors({ budgetReviewComment: 'Enter Budget Review Comment.' })
        return false
      }

      const nextBudgetItemErrors = validateBudgetItems(budgetItems)
      if (Object.keys(nextBudgetItemErrors).length > 0) {
        setBudgetItemErrors(nextBudgetItemErrors)
        return false
      }

      setIsSaving(true)
      try {
        const reviewCommentToSave = canEditBudgetReviewComment ? form.budgetReviewComment : savedForm.budgetReviewComment
        const aggregateForm = budgetItemsAggregateForm(budgetItems, reviewCommentToSave)
        const firstItem = budgetItems[0]
        const projectPayload: BudgetProjectPayload = {
          dga_allocated_budget: parseNum(aggregateForm.allocatedBudget),
          dga_budget_review_comments: reviewCommentToSave.trim(),
          dga_budget_source: firstItem?.budgetSource
            ? Number(firstItem.budgetSource) as Dga_aop_projectsesBase['dga_budget_source']
            : undefined,
          dga_budget_type: firstItem?.budgetType && SUB_ACTIVITY_TO_PROJECT_BUDGET_TYPE[firstItem.budgetType]
            ? Number(SUB_ACTIVITY_TO_PROJECT_BUDGET_TYPE[firstItem.budgetType]) as Dga_aop_projectsesBase['dga_budget_type']
            : undefined,
          dga_requested_budget: parseNum(aggregateForm.totalPlannedBudget),
          dga_total_project_budget: parseNum(aggregateForm.totalPlannedBudget),
        }
        const projectResult = await Dga_aop_projectsesService.update(projectId, projectPayload)
        assertOperationSuccess(projectResult, 'Failed to save project budget totals.')

        for (const deletedId of deletedBudgetItemIds) {
          await Dga_sub_activitiesesService.delete(deletedId)
        }

        const savedItems: BudgetItemForm[] = []
        for (const item of budgetItems) {
          const payload = buildBudgetItemPayload(item, projectId)
          if (item.id) {
            const result = await Dga_sub_activitiesesService.update(item.id, payload)
            assertOperationSuccess(result, `Failed to update budget item ${item.name || 'N/A'}.`)
            savedItems.push(cloneBudgetItem(item))
          } else {
            const result = await Dga_sub_activitiesesService.create(payload)
            assertOperationSuccess(result, `Failed to create budget item ${item.name || 'N/A'}.`)
            const created = getResultValue<Dga_sub_activitieses>(result)
            savedItems.push({
              ...cloneBudgetItem(item),
              id: created?.dga_sub_activitiesid ?? item.id,
              localId: created?.dga_sub_activitiesid ?? item.localId,
            })
          }
        }

        setBudgetItems(savedItems)
        setSavedBudgetItems(savedItems.map(cloneBudgetItem))
        setDeletedBudgetItemIds([])
        setBudgetItemErrors({})
        setForm(aggregateForm)
        setSavedForm(aggregateForm)
        setErrors({})
        onOperationAlert?.({
          kind: 'success',
          message: 'Budget items saved successfully.',
          title: 'Budget saved',
        })
        onActivityDataChanged?.()
        return true
      } catch (error) {
        onOperationAlert?.({
          kind: 'error',
          message: error instanceof Error ? error.message : 'Failed to save budget items.',
          title: 'Budget was not saved',
        })
        return false
      } finally {
        setIsSaving(false)
      }
    }

    const nextErrors = validateBudgetForm(form, showTotalActivityBudget, hasAllMonthlyRows, canEditBudgetReviewComment)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return false
    }

    setIsSaving(true)
    try {
      const formToSave = canEditBudgetReviewComment
        ? form
        : { ...form, budgetReviewComment: savedForm.budgetReviewComment }
      const projectPayload = buildProjectPayload(formToSave, showTotalActivityBudget)
      const projectResult = await Dga_aop_projectsesService.update(projectId, projectPayload)
      assertOperationSuccess(projectResult, 'Failed to save project budget fields.')

      for (const record of orderedMonthRecords) {
        const monthIndex = getMonthIndex(record.monthName)
        if (monthIndex === -1) continue

        const plannedBudget = parseNum(form.monthlyBudgets[monthIndex])
        const payload = {
          dga_is_zero: plannedBudget === 0,
          dga_name: MONTH_LABELS[monthIndex],
          dga_planned_budget: plannedBudget,
        }

        const result = await Dga_aop_project_budgetsService.update(record.id, payload)
        assertOperationSuccess(result, `Failed to save ${record.monthName} budget.`)
      }

      const refreshedMonthRecords = monthRecords.map((record) => {
        const monthIndex = getMonthIndex(record.monthName)
        if (monthIndex === -1) return record
        const plannedBudget = parseNum(form.monthlyBudgets[monthIndex])
        return {
          ...record,
          isZero: plannedBudget === 0 ? true : record.isZero,
          plannedBudget,
        }
      })

      setMonthRecords(refreshedMonthRecords)
      setErrors({})
      onOperationAlert?.({
        kind: 'success',
        message: 'Budget information saved successfully.',
        title: 'Budget saved',
      })
      onActivityDataChanged?.()
      setSavedForm(formToSave)
      return true
    } catch (error) {
      onOperationAlert?.({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to save budget information.',
        title: 'Budget was not saved',
      })
      return false
    } finally {
      setIsSaving(false)
    }
  }, [
    form,
    budgetItems,
    canEditBudgetReviewComment,
    deletedBudgetItemIds,
    hasAllMonthlyRows,
    hasMultiBudgetItems,
    isFormReadOnly,
    isSaving,
    monthRecords,
    orderedMonthRecords,
    onActivityDataChanged,
    onOperationAlert,
    projectId,
    savedForm.budgetReviewComment,
    showTotalActivityBudget,
  ])

  useEffect(() => {
    onHeaderActionChange?.({
      canSave: !isFormReadOnly && !isLoading && !isSaving && !errors.context,
      discardChanges: () => {
        setForm(savedForm)
        setBudgetItems(savedBudgetItems.map(cloneBudgetItem))
        setBudgetItemErrors({})
        setDeletedBudgetItemIds([])
        setErrors({})
      },
      hasUnsavedChanges,
      isSaving,
      label: saveLabel,
      onSave: handleSave,
      savingLabel: 'Saving...',
    })

    return () => onHeaderActionChange?.(null)
  }, [errors.context, handleSave, hasUnsavedChanges, isFormReadOnly, isLoading, isSaving, onHeaderActionChange, saveLabel, savedBudgetItems, savedForm])

  function updateMonthRecord(monthId: string, updater: (current: BudgetMonthRecord) => BudgetMonthRecord) {
    setMonthRecords((current) =>
      current.map((record) => (normalizeId(record.id) === normalizeId(monthId) ? updater(record) : record)),
    )
  }

  async function saveBudgetMonthRelatedChanges(
    monthRecord: BudgetMonthRecord | BudgetDrawerMonth,
    actualBudget: number,
    deliveredAmount: number,
  ) {
    const projectResult = await Dga_aop_projectsesService.get(projectId, {
      select: ['dga_project_related_changes'],
    })
    assertOperationSuccess(projectResult, 'Failed to load activity change tracking.')

    const nextRelatedChanges = stringifyMergedProjectRelatedChanges(
      projectResult.data?.dga_project_related_changes,
      buildBudgetMonthRelatedChanges(monthRecord, actualBudget, deliveredAmount),
    )
    const result = await Dga_aop_projectsesService.update(projectId, {
      dga_project_related_changes: nextRelatedChanges,
    } as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>)
    assertOperationSuccess(result, `Failed to update ${monthRecord.monthName} budget changes.`)
    void createExecutionFieldLogs(projectId, [
      {
        logType: EXECUTION_LOG_TYPES.budget,
        name: `${monthRecord.monthName} - Actual Budget`,
        oldValue: monthRecord.actualBudget,
        newValue: actualBudget,
      },
      {
        logType: EXECUTION_LOG_TYPES.budget,
        name: `${monthRecord.monthName} - Delivered Amount`,
        oldValue: monthRecord.deliveredAmount,
        newValue: deliveredAmount,
      },
    ])
    onProjectRelatedChangesChange?.(nextRelatedChanges)
    return nextRelatedChanges
  }

  function handleDeliveredValueChange(monthId: string, value: string) {
    if (!executionMonthlyEditAllowed) return

    setInlineDeliveredDrafts((current) => ({
      ...current,
      [monthId]: value,
    }))

    setInlineDeliveredErrors((current) => {
      const next = { ...current }
      delete next[monthId]
      return next
    })
  }

  async function handleDeliveredValueBlur(monthId: string) {
    if (!executionMonthlyEditAllowed) return
    if (isSavingExecutionMonth) return

    const monthRecord = monthRecords.find((record) => normalizeId(record.id) === normalizeId(monthId))
    if (!monthRecord || monthRecord.isZero || isFutureMonth(monthRecord.monthName)) return

    const rawValue = inlineDeliveredDrafts[monthId] ?? numberToString(monthRecord.deliveredAmount)
    if (isInvalidCurrency(rawValue)) {
      setInlineDeliveredErrors((current) => ({
        ...current,
        [monthId]: 'Enter a valid non-negative amount.',
      }))
      return
    }

    const nextDeliveredValue = parseNum(rawValue)
    if (nextDeliveredValue === monthRecord.deliveredAmount) {
      setInlineDeliveredDrafts((current) => ({
        ...current,
        [monthId]: numberToString(monthRecord.deliveredAmount),
      }))
      return
    }

    try {
      setIsSavingExecutionMonth(monthId)
      onOperationAlert?.({ kind: 'processing', title: `Saving ${monthRecord.monthName} delivered values` })
      await saveBudgetMonthRelatedChanges(monthRecord, monthRecord.actualBudget, nextDeliveredValue)
      const monthResult = await Dga_aop_project_budgetsService.update(monthId, {
        dga_delivered_amount: nextDeliveredValue,
      })
      assertOperationSuccess(monthResult, `Failed to update ${monthRecord.monthName} delivered values.`)

      updateMonthRecord(monthId, (current) => ({
        ...current,
        deliveredAmount: nextDeliveredValue,
      }))
      setInlineDeliveredDrafts((current) => ({
        ...current,
        [monthId]: numberToString(nextDeliveredValue),
      }))
      onOperationAlert?.({
        kind: 'success',
        message: `${monthRecord.monthName} delivered values saved successfully.`,
        title: 'Budget month updated',
      })
      onActivityDataChanged?.()
    } catch (error) {
      onOperationAlert?.({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to save delivered values.',
        title: 'Delivered values were not saved',
      })
      setInlineDeliveredErrors((current) => ({
        ...current,
        [monthId]: error instanceof Error ? error.message : 'Failed to save delivered values.',
      }))
    } finally {
      setIsSavingExecutionMonth(null)
    }
  }

  async function handleToggleZero(monthId: string) {
    if (!executionMonthlyEditAllowed) return
    if (isSavingExecutionMonth) return

    const monthRecord = monthRecords.find((record) => normalizeId(record.id) === normalizeId(monthId))
    if (!monthRecord || isFutureMonth(monthRecord.monthName)) return

    const nextZeroState = !monthRecord.isZero

    try {
      setIsSavingExecutionMonth(monthId)
      onOperationAlert?.({ kind: 'processing', title: `Updating ${monthRecord.monthName} zero flag` })
      const monthResult = await Dga_aop_project_budgetsService.update(monthId, {
        dga_is_zero: nextZeroState,
      })
      assertOperationSuccess(monthResult, `Failed to update ${monthRecord.monthName} zero flag.`)

      updateMonthRecord(monthId, (current) => ({
        ...current,
        isZero: nextZeroState,
      }))
      setInlineDeliveredDrafts((current) => ({
        ...current,
        [monthId]: numberToString(monthRecord.deliveredAmount),
      }))
      setInlineDeliveredErrors((current) => {
        const next = { ...current }
        delete next[monthId]
        return next
      })
      onOperationAlert?.({
        kind: 'success',
        message: nextZeroState
          ? `${monthRecord.monthName} marked as zero successfully.`
          : `${monthRecord.monthName} zero flag removed successfully.`,
        title: 'Budget month updated',
      })
    } catch (error) {
      onOperationAlert?.({
        kind: 'error',
        message: error instanceof Error ? error.message : `Failed to update ${monthRecord.monthName}.`,
        title: 'Budget month was not updated',
      })
    } finally {
      setIsSavingExecutionMonth(null)
    }
  }

  function syncDrawerRowsToMonth(monthId: string, rows: BudgetDetailRecord[]) {
    const detailTotal = sumDetailAmounts(rows)

    updateMonthRecord(monthId, (current) => ({
      ...current,
      actualBudget: detailTotal,
      deliveredAmount: detailTotal,
      details: rows.map((row) => ({
        ...row,
        monthId: row.monthId ?? monthId,
      })),
    }))
    setInlineDeliveredDrafts((current) => ({
      ...current,
      [monthId]: numberToString(detailTotal),
    }))
    setInlineDeliveredErrors((current) => {
      const next = { ...current }
      delete next[monthId]
      return next
    })
  }

  function openDrawer(monthId: string) {
    const monthRecord = monthRecords.find((record) => normalizeId(record.id) === normalizeId(monthId))
    if (!monthRecord || isFutureMonth(monthRecord.monthName)) return

    const nextRows = monthRecord.details.map((detail) => ({
      ...detail,
      monthId: detail.monthId ?? monthRecord.id,
    }))

    setDrawerMonthId(monthRecord.id)
    setOriginalDrawerRows(nextRows.map((detail) => ({ ...detail })))
    setDrawerRows(nextRows.map((detail) => ({ ...detail })))
    if (nextRows.length > 0) syncDrawerRowsToMonth(monthRecord.id, nextRows)
    setDetailDraft(EMPTY_DETAIL_DRAFT)
    setDetailDraftErrors({})
    setEditingDetailLocalId(null)
    setIsDetailFormOpen(false)
    setIsDrawerOpen(true)
  }

  function closeDrawer() {
    if (isSavingDrawer) return

    setIsDrawerOpen(false)
    setDrawerMonthId(null)
    setDrawerRows([])
    setOriginalDrawerRows([])
    setDetailDraft(EMPTY_DETAIL_DRAFT)
    setDetailDraftErrors({})
    setEditingDetailLocalId(null)
    setIsDetailFormOpen(false)
  }

  function handleDetailDraftChange(fields: Partial<BudgetDetailDraft>) {
    if (!executionMonthlyEditAllowed) return

    setDetailDraft((current) => ({ ...current, ...fields }))
    setDetailDraftErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(fields) as Array<keyof BudgetDetailDraft>) {
        delete next[key]
      }
      delete next.submit
      return next
    })
  }

  function openAddDetailForm() {
    if (!executionMonthlyEditAllowed || !selectedDrawerMonth || selectedDrawerMonth.isZero) return

    setDetailDraft(EMPTY_DETAIL_DRAFT)
    setDetailDraftErrors({})
    setEditingDetailLocalId(null)
    setIsDetailFormOpen(true)
  }

  function openEditDetailForm(row: BudgetDetailRecord) {
    if (!executionMonthlyEditAllowed) return

    setDetailDraft({
      accountCodeId: row.accountCodeId,
      amount: numberToString(row.amount),
      grn: row.grn,
    })
    setDetailDraftErrors({})
    setEditingDetailLocalId(row.localId)
    setIsDetailFormOpen(true)
  }

  function cancelDetailForm() {
    setDetailDraft(EMPTY_DETAIL_DRAFT)
    setDetailDraftErrors({})
    setEditingDetailLocalId(null)
    setIsDetailFormOpen(false)
  }

  async function persistBudgetDetailRows(
    month: BudgetDrawerMonth,
    rows: BudgetDetailRecord[],
    originalRows: BudgetDetailRecord[],
  ) {
    const rowsToDelete = originalRows.filter(
      (originalRow) => !rows.some((currentRow) => currentRow.id && currentRow.id === originalRow.id),
    )
    const rowsToCreate = rows.filter((row) => !row.id)
    const rowsToUpdate = rows.filter((row) => {
      if (!row.id) return false
      const originalRow = originalRows.find((currentRow) => currentRow.id === row.id)
      if (!originalRow) return false

      return (
        normalizeId(originalRow.accountCodeId) !== normalizeId(row.accountCodeId)
        || originalRow.grn !== row.grn
        || originalRow.amount !== row.amount
      )
    })
    let savedRows = rows.map((row) => ({ ...row, monthId: row.monthId ?? month.id }))

    for (const row of rowsToDelete) {
      if (!row.id) continue
      await Dga_aop_project_budget_detailsesService.delete(row.id)
    }

    for (const row of rowsToCreate) {
      const payload: Omit<Dga_aop_project_budget_detailsesBase, 'dga_aop_project_budget_detailsid'> = {
        'dga_account_code@odata.bind': toEntityBind('dga_account_codes', row.accountCodeId),
        dga_amount: row.amount,
        'dga_aop_project_budget@odata.bind': toEntityBind('dga_aop_project_budgets', month.id),
        dga_grn: row.grn,
        dga_name: buildBudgetDetailName(row.accountCodeLabel, row.grn),
        statecode: 0,
        statuscode: 1,
      }
      const result = await Dga_aop_project_budget_detailsesService.create(payload)
      assertOperationSuccess(result, `Failed to create ${month.monthName} budget detail.`)
      const created = getResultValue<Dga_aop_project_budget_detailses>(result)
      const createdId = created?.dga_aop_project_budget_detailsid
      if (createdId) {
        savedRows = savedRows.map((savedRow) => (
          savedRow.localId === row.localId
            ? { ...savedRow, id: createdId, localId: createdId }
            : savedRow
        ))
      }
    }

    for (const row of rowsToUpdate) {
      if (!row.id) continue
      const payload: Partial<Omit<Dga_aop_project_budget_detailsesBase, 'dga_aop_project_budget_detailsid'>> = {
        'dga_account_code@odata.bind': toEntityBind('dga_account_codes', row.accountCodeId),
        dga_amount: row.amount,
        dga_grn: row.grn,
        dga_name: buildBudgetDetailName(row.accountCodeLabel, row.grn),
      }
      const result = await Dga_aop_project_budget_detailsesService.update(row.id, payload)
      assertOperationSuccess(result, `Failed to update ${month.monthName} budget detail.`)
    }

    const nextActualBudget = sumDetailAmounts(savedRows)
    const nextDeliveredAmount = nextActualBudget

    await saveBudgetMonthRelatedChanges(month, nextActualBudget, nextDeliveredAmount)
    const monthResult = await Dga_aop_project_budgetsService.update(month.id, {
      dga_actual_budget: nextActualBudget,
      dga_delivered_amount: nextDeliveredAmount,
      dga_is_zero: month.isZero,
    })
    assertOperationSuccess(monthResult, `Failed to update ${month.monthName} budget totals.`)

    return savedRows
  }

  async function handleCommitDetailDraft() {
    if (!selectedDrawerMonth) return
    if (!executionMonthlyEditAllowed) return
    if (selectedDrawerMonth.isZero) {
      setDetailDraftErrors({
        submit: 'Budget details cannot be added while this month is set to zero.',
      })
      return
    }

    const nextErrors = validateDetailDraft(detailDraft)
    if (Object.keys(nextErrors).length > 0) {
      setDetailDraftErrors(nextErrors)
      return
    }

    const option = accountCodeOptionMap.get(normalizeId(detailDraft.accountCodeId))
    const nextRow: BudgetDetailRecord = {
      accountCodeId: detailDraft.accountCodeId,
      accountCodeLabel: option?.label ?? '',
      amount: parseNum(detailDraft.amount),
      grn: detailDraft.grn.trim(),
      id: drawerRows.find((row) => row.localId === editingDetailLocalId)?.id,
      localId: editingDetailLocalId ?? createTempId(),
      monthId: selectedDrawerMonth.id,
    }

    const nextRows = editingDetailLocalId
      ? drawerRows.map((row) => (row.localId === editingDetailLocalId ? nextRow : row))
      : [...drawerRows, nextRow]

    try {
      setIsSavingDrawer(true)
      const savedRows = await persistBudgetDetailRows(selectedDrawerMonth, nextRows, originalDrawerRows)
      setDrawerRows(savedRows)
      setOriginalDrawerRows(savedRows.map((row) => ({ ...row })))
      syncDrawerRowsToMonth(selectedDrawerMonth.id, savedRows)
      cancelDetailForm()
      onOperationAlert?.({
        kind: 'success',
        message: `${selectedDrawerMonth.monthName} budget entry saved successfully.`,
        title: 'Budget entry saved',
      })
      onActivityDataChanged?.()
    } catch (error) {
      onOperationAlert?.({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to save budget entry.',
        title: 'Budget entry was not saved',
      })
    } finally {
      setIsSavingDrawer(false)
    }
  }

  async function handleDeleteDrawerRow(localId: string) {
    if (!executionMonthlyEditAllowed) return
    if (!selectedDrawerMonth) return

    const nextRows = drawerRows.filter((row) => row.localId !== localId)

    try {
      setIsSavingDrawer(true)
      const savedRows = await persistBudgetDetailRows(selectedDrawerMonth, nextRows, originalDrawerRows)
      setDrawerRows(savedRows)
      setOriginalDrawerRows(savedRows.map((row) => ({ ...row })))
      syncDrawerRowsToMonth(selectedDrawerMonth.id, savedRows)
      if (editingDetailLocalId === localId) {
        cancelDetailForm()
      }
      onOperationAlert?.({
        kind: 'success',
        message: `${selectedDrawerMonth.monthName} budget entry deleted successfully.`,
        title: 'Budget entry deleted',
      })
      onActivityDataChanged?.()
    } catch (error) {
      onOperationAlert?.({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete budget entry.',
        title: 'Budget entry was not deleted',
      })
    } finally {
      setIsSavingDrawer(false)
    }
  }

  async function handleConfirmDrawer() {
    if (!selectedDrawerMonth) return
    if (isDetailFormOpen) {
      setDetailDraftErrors({
        submit: DETAIL_CONFIRM_WARNING,
      })
      return
    }

    if (!executionMonthlyEditAllowed) {
      closeDrawer()
      return
    }

    try {
      setIsSavingDrawer(true)
      onOperationAlert?.({
        kind: 'processing',
        title: selectedDrawerMonth ? `Saving ${selectedDrawerMonth.monthName} budget details` : 'Saving budget details',
      })

      const rowsToDelete = originalDrawerRows.filter(
        (originalRow) => !drawerRows.some((currentRow) => currentRow.id && currentRow.id === originalRow.id),
      )
      const rowsToCreate = drawerRows.filter((row) => !row.id)
      const rowsToUpdate = drawerRows.filter((row) => {
        if (!row.id) return false
        const originalRow = originalDrawerRows.find((currentRow) => currentRow.id === row.id)
        if (!originalRow) return false

        return (
          normalizeId(originalRow.accountCodeId) !== normalizeId(row.accountCodeId)
          || originalRow.grn !== row.grn
          || originalRow.amount !== row.amount
        )
      })

      for (const row of rowsToDelete) {
        if (!row.id) continue
        await Dga_aop_project_budget_detailsesService.delete(row.id)
      }

      for (const row of rowsToCreate) {
        const payload: Omit<Dga_aop_project_budget_detailsesBase, 'dga_aop_project_budget_detailsid'> = {
          'dga_account_code@odata.bind': toEntityBind('dga_account_codes', row.accountCodeId),
          dga_amount: row.amount,
          'dga_aop_project_budget@odata.bind': toEntityBind('dga_aop_project_budgets', selectedDrawerMonth.id),
          dga_grn: row.grn,
          dga_name: buildBudgetDetailName(row.accountCodeLabel, row.grn),
          statecode: 0,
          statuscode: 1,
        }
        const result = await Dga_aop_project_budget_detailsesService.create(payload)
        assertOperationSuccess(result, `Failed to create ${selectedDrawerMonth.monthName} budget detail.`)
      }

      for (const row of rowsToUpdate) {
        if (!row.id) continue
        const payload: Partial<Omit<Dga_aop_project_budget_detailsesBase, 'dga_aop_project_budget_detailsid'>> = {
          'dga_account_code@odata.bind': toEntityBind('dga_account_codes', row.accountCodeId),
          dga_amount: row.amount,
          dga_grn: row.grn,
          dga_name: buildBudgetDetailName(row.accountCodeLabel, row.grn),
        }
        const result = await Dga_aop_project_budget_detailsesService.update(row.id, payload)
        assertOperationSuccess(result, `Failed to update ${selectedDrawerMonth.monthName} budget detail.`)
      }

      const nextActualBudget = sumDetailAmounts(drawerRows)
      const nextDeliveredAmount = nextActualBudget

      await saveBudgetMonthRelatedChanges(selectedDrawerMonth, nextActualBudget, nextDeliveredAmount)
      const monthResult = await Dga_aop_project_budgetsService.update(selectedDrawerMonth.id, {
        dga_actual_budget: nextActualBudget,
        dga_delivered_amount: nextDeliveredAmount,
        dga_is_zero: selectedDrawerMonth.isZero,
      })
      assertOperationSuccess(monthResult, `Failed to update ${selectedDrawerMonth.monthName} budget totals.`)

      updateMonthRecord(selectedDrawerMonth.id, (current) => ({
        ...current,
        actualBudget: nextActualBudget,
        deliveredAmount: nextDeliveredAmount,
        details: drawerRows.map((row) => ({ ...row })),
        isZero: current.isZero,
      }))

      setInlineDeliveredDrafts((current) => ({
        ...current,
        [selectedDrawerMonth.id]: numberToString(nextDeliveredAmount),
      }))
      onOperationAlert?.({
        kind: 'success',
        message: `${selectedDrawerMonth.monthName} budget details saved successfully.`,
        title: 'Budget details saved',
      })
      onActivityDataChanged?.()
      closeDrawer()
    } catch (error) {
      onOperationAlert?.({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to save budget details.',
        title: 'Budget details were not saved',
      })
    } finally {
      setIsSavingDrawer(false)
    }
  }

  function renderBudgetItemCard(item: BudgetItemForm, index: number) {
    const itemErrors = budgetItemErrors[item.localId] ?? {}
    const hasItemErrors = Object.keys(itemErrors).length > 0
    const totalBudget = sumBudgetItemMonthly(item)
    const budgetSourceLabel = getOptionLabel(SUB_ACTIVITY_BUDGET_SOURCE_OPTIONS, item.budgetSource)
    const budgetTypeLabel = getOptionLabel(SUB_ACTIVITY_BUDGET_TYPE_OPTIONS, item.budgetType)

    return (
      <article className="edit-activity__budget-item edit-activity__budget-item--collapsed" key={item.localId}>
        <button
          aria-label={`Edit budget item ${item.name || index + 1}`}
          className={`edit-activity__budget-item-summary${hasItemErrors ? ' edit-activity__budget-item-summary--invalid' : ''}`}
          onClick={() => openBudgetItemWizard(item)}
          type="button"
        >
          <span className="edit-activity__budget-item-main">
            <span className="edit-activity__budget-item-number">B{index + 1}</span>
            <strong>{item.name.trim() || 'N/A'}</strong>
            {item.budgetSource ? <span className="edit-activity__budget-item-pill">{budgetSourceLabel}</span> : null}
            {item.budgetType ? <span className="edit-activity__budget-item-pill">{budgetTypeLabel}</span> : null}
            <span className="edit-activity__budget-item-review">Awaiting review</span>
          </span>
          <span className="edit-activity__budget-item-total">
            <span>Total Planned Budget</span>
            <CurrencyDisplay value={totalBudget} />
          </span>
          <span className="edit-activity__budget-item-toggle" aria-hidden="true">
            <Pencil size={16} />
          </span>
        </button>
        <button
          aria-label={`Delete budget item ${item.name || index + 1}`}
          className="edit-activity__budget-item-delete"
          disabled={isFormReadOnly || budgetItems.length <= 1}
          onClick={() => handleRequestDeleteBudgetItem(item)}
          type="button"
        >
          <Trash2 size={15} />
        </button>

      </article>
    )
  }

  function renderBudgetWizard() {
    if (!budgetWizardItem) return null

    const plannedTotal = sumBudgetItemMonthly(budgetWizardItem)
    const delta = calcBudgetItemDelta(budgetWizardItem)
    const quarterRows = Array.from({ length: 4 }, (_, quarterIndex) => {
      const startIndex = quarterIndex * 3
      const quarterMonths = MONTH_LABELS.slice(startIndex, startIndex + 3)
      const plannedAmount = sumMonthly(budgetWizardItem.monthlyBudgets.slice(startIndex, startIndex + 3))
      const cumulativeTotal = sumMonthly(budgetWizardItem.monthlyBudgets.slice(0, startIndex + 3))
      const annualPercent = plannedTotal > 0 ? Math.round((plannedAmount / plannedTotal) * 100) : 0

      return {
        annualPercent,
        cumulativeTotal,
        label: `Q${quarterIndex + 1}`,
        months: `${quarterMonths[0].slice(0, 3)} - ${quarterMonths[quarterMonths.length - 1].slice(0, 3)}`,
        plannedAmount,
      }
    })

    return (
      <SideDrawer
        actions={
          <div className="edit-activity__milestones-drawer-actions edit-activity__budget-drawer-actions">
            {budgetWizardStep === 1 ? (
              <Button onClick={closeBudgetItemWizard} type="button" variant="secondary">
                Cancel
              </Button>
            ) : (
              <Button onClick={() => setBudgetWizardStep((current) => Math.max(1, current - 1) as BudgetWizardStep)} type="button" variant="secondary">
                Back
              </Button>
            )}
            {budgetWizardStep < 3 ? (
              <Button onClick={handleBudgetWizardNext} type="button">
                Next
              </Button>
            ) : (
              <Button onClick={handleSaveBudgetWizardItem} type="button">
                {budgetWizardMode === 'edit' ? 'Update Budget Item' : 'Save Budget Item'}
              </Button>
            )}
          </div>
        }
        isOpen={Boolean(budgetWizardItem)}
        onClose={closeBudgetItemWizard}
        title={budgetWizardMode === 'edit' ? 'Edit Budget Item' : 'Add Budget Item'}
      >
        <div className="edit-activity__budget-wizard edit-activity__budget-drawer">
          <p className="edit-activity__budget-wizard-description">Enter budget details and monthly planned distribution.</p>
          <div className="edit-activity__budget-wizard-steps" aria-label="Budget item steps">
            {[
              { label: 'Budget Details', step: 1 as const },
              { label: 'Monthly Breakdown', step: 2 as const },
              { label: 'Quarter Review', step: 3 as const },
            ].map((step) => (
              <div className={`edit-activity__budget-wizard-step${budgetWizardStep === step.step ? ' edit-activity__budget-wizard-step--active' : ''}${budgetWizardStep > step.step ? ' edit-activity__budget-wizard-step--done' : ''}`} key={step.step}>
                <span>{budgetWizardStep > step.step ? <CircleCheck size={15} /> : step.step}</span>
                <strong>{step.label}</strong>
              </div>
            ))}
          </div>

          {budgetWizardStep === 1 ? (
            <section className="edit-activity__budget-wizard-card edit-activity__milestones-drawer-card">
              <div className="create-activity__section-header edit-activity__milestones-drawer-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true"><Wallet size={18} /></span>
                  <div>
                    <h2>Budget Details</h2>
                    <p>Select the funding source, budget type, and allocated budget amount.</p>
                  </div>
                </div>
              </div>
              <div className="create-activity__form-stack edit-activity__milestones-drawer-section">
                <div className="create-activity__form-row create-activity__form-row--two">
                  <Input
                    error={budgetWizardErrors.name}
                    label="Sub Activity Name"
                    onChange={(event) => updateBudgetWizardItem({ name: event.target.value })}
                    placeholder="Enter sub activity name"
                    required
                    value={budgetWizardItem.name}
                  />
                  <Textarea
                    label="Sub Activity Description"
                    onChange={(event) => updateBudgetWizardItem({ description: event.target.value })}
                    placeholder="Enter sub activity description"
                    value={budgetWizardItem.description}
                  />
                </div>
                <RadioGroup
                  className="edit-activity__budget-source"
                  error={budgetWizardErrors.budgetSource}
                  label="Budget Source"
                  name={`budget-wizard-source-${budgetWizardItem.localId}`}
                  onChange={(value) => updateBudgetWizardItem({ budgetSource: value as SubActivityBudgetSourceValue })}
                  options={SUB_ACTIVITY_BUDGET_SOURCE_OPTIONS}
                  required
                  value={budgetWizardItem.budgetSource}
                />
                <RadioGroup
                  className="edit-activity__budget-type"
                  error={budgetWizardErrors.budgetType}
                  label="Budget Type"
                  name={`budget-wizard-type-${budgetWizardItem.localId}`}
                  onChange={(value) => updateBudgetWizardItem({ budgetType: value as SubActivityBudgetTypeValue })}
                  options={SUB_ACTIVITY_BUDGET_TYPE_OPTIONS}
                  required
                  value={budgetWizardItem.budgetType}
                />
                <div className="create-activity__form-row create-activity__form-row--three">
                  <label className="field field--disabled edit-activity__budget-disabled-currency">
                    <span className="field__label">Total Planned Budget</span>
                    <span className="currency-input__control field__input-wrap" style={{ paddingRight: '2.4rem' }}>
                      <DirhamIcon />
                      <input className="field__control" disabled readOnly value={addCommas(String(plannedTotal)) || '0'} />
                      <span className="field__right-icon"><LockKeyhole size={15} /></span>
                    </span>
                  </label>
                  <CurrencyInput
                    error={budgetWizardErrors.allocatedBudget}
                    label="Allocated Budget"
                    onChange={(event) => updateBudgetWizardItem({ allocatedBudget: stripCommas(event.target.value) })}
                    placeholder="0"
                    required
                    value={addCommas(budgetWizardItem.allocatedBudget)}
                  />
                  <label className="field field--disabled edit-activity__budget-disabled-currency">
                    <span className="field__label">Delta</span>
                    <span className="currency-input__control field__input-wrap" style={{ paddingRight: '2.4rem' }}>
                      <DirhamIcon />
                      <input className="field__control" disabled readOnly value={addCommas(delta) || '0'} />
                      <span className="field__right-icon"><LockKeyhole size={15} /></span>
                    </span>
                  </label>
                </div>
              </div>
            </section>
          ) : null}

          {budgetWizardStep === 2 ? (
            <section className="edit-activity__budget-wizard-card edit-activity__milestones-drawer-card">
              <div className="create-activity__section-header edit-activity__milestones-drawer-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true"><CalendarRange size={18} /></span>
                  <div>
                    <h2>Monthly Budget Breakdown</h2>
                    <p>Enter the planned budget for each month from January to December.</p>
                  </div>
                </div>
              </div>
              <div className="edit-activity__budget-wizard-fiscal">
                <div className="edit-activity__monthly-intro">
                  <span className="edit-activity__monthly-icon" aria-hidden="true"><CalendarRange size={18} /></span>
                  <div>
                    <strong>Fiscal year allocation</strong>
                    <span>Update the planned budget on the 12 monthly rows created by the activity plugin.</span>
                  </div>
                </div>
                <div className="edit-activity__monthly-metric">
                  <span>Annual planned total</span>
                  <CurrencyDisplay value={plannedTotal} />
                </div>
              </div>
              {budgetWizardErrors.monthlyBudgets ? <span className="field__error">{budgetWizardErrors.monthlyBudgets}</span> : null}
              <div className="edit-activity__budget-wizard-month-grid">
                {MONTH_LABELS.map((month, monthIndex) => (
                  <CurrencyInput
                    error={budgetWizardErrors.monthlyBudgets && isInvalidCurrency(budgetWizardItem.monthlyBudgets[monthIndex]) ? budgetWizardErrors.monthlyBudgets : undefined}
                    key={month}
                    label={month}
                    onChange={(event) => updateBudgetWizardMonth(monthIndex, stripCommas(event.target.value))}
                    placeholder="0"
                    required
                    value={addCommas(budgetWizardItem.monthlyBudgets[monthIndex])}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {budgetWizardStep === 3 ? (
            <section className="edit-activity__budget-wizard-card edit-activity__milestones-drawer-card">
              <div className="create-activity__section-header edit-activity__milestones-drawer-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true"><ChartNoAxesColumnIncreasing size={18} /></span>
                  <div>
                    <h2>Quarter Review</h2>
                    <p>Review the quarter-wise summary and overall allocation.</p>
                  </div>
                </div>
              </div>
              <div className="edit-activity__budget-wizard-table-wrap">
                <table className="edit-activity__budget-wizard-table">
                  <thead>
                    <tr>
                      <th>Quarter</th>
                      <th>Months</th>
                      <th>Planned Amount</th>
                      <th>% of Annual</th>
                      <th>Cumulative Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quarterRows.map((row) => (
                      <tr key={row.label}>
                        <td>{row.label}</td>
                        <td>{row.months}</td>
                        <td><CurrencyDisplay value={row.plannedAmount} /></td>
                        <td>{row.annualPercent}%</td>
                        <td><CurrencyDisplay value={row.cumulativeTotal} /></td>
                      </tr>
                    ))}
                    <tr className="edit-activity__budget-wizard-table-total">
                      <td colSpan={2}>Annual Total</td>
                      <td><CurrencyDisplay value={plannedTotal} /></td>
                      <td>{plannedTotal > 0 ? '100%' : '0%'}</td>
                      <td><CurrencyDisplay value={plannedTotal} /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="edit-activity__budget-wizard-review">
                <CircleCheck size={18} />
                <div>
                  <strong>Review and Confirm</strong>
                  <span>Please review the quarter-wise planned distribution and overall allocation. You can go back to make changes if needed.</span>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </SideDrawer>
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
              <strong><CurrencyDisplay value={parseNum(months[monthIndex])} /></strong>
            </div>
          ))}
        </div>
      </div>
    )
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

  function renderSingleBudgetReadOnlyCard() {
    const plannedBudget = sumMonthly(form.monthlyBudgets)
    const allocatedBudget = parseNum(form.allocatedBudget)
    const delta = plannedBudget - allocatedBudget

    return (
      <section className="edit-activity__budget-readonly-card" aria-label="Budget allocation summary">
        <div className="edit-activity__budget-readonly-card-header">
          <div className="edit-activity__budget-readonly-card-main">
            <span className="edit-activity__budget-item-number">B1</span>
            <strong>Budget Allocation</strong>
            <span className="edit-activity__budget-item-pill">
              {renderBudgetReadOnlyValue(getOptionLabel(BUDGET_SOURCE_OPTIONS, form.budgetSource))}
            </span>
            <span className="edit-activity__budget-item-pill">
              {renderBudgetReadOnlyValue(getOptionLabel(BUDGET_TYPE_OPTIONS, form.budgetType))}
            </span>
          </div>
          <div className="edit-activity__budget-item-total">
            <span>Total Planned Budget</span>
            <CurrencyDisplay value={plannedBudget} />
          </div>
        </div>

        {renderBudgetReadOnlyTiles([
          {
            label: 'Budget Source',
            value: renderBudgetReadOnlyValue(getOptionLabel(BUDGET_SOURCE_OPTIONS, form.budgetSource)),
          },
          {
            label: 'Budget Type',
            value: renderBudgetReadOnlyValue(getOptionLabel(BUDGET_TYPE_OPTIONS, form.budgetType)),
          },
          {
            label: 'Allocated Budget',
            value: <CurrencyDisplay value={allocatedBudget} />,
          },
          {
            label: 'Delta',
            value: <CurrencyDisplay value={delta} />,
            variant: 'success',
          },
        ])}

        {renderBudgetMonthCards(form.monthlyBudgets, 'Planned Cash Flow - Jan to Dec')}
      </section>
    )
  }

  function renderBudgetItemReadOnlyCard(item: BudgetItemForm, index: number) {
    const totalBudget = sumBudgetItemMonthly(item)
    const delta = calcBudgetItemDelta(item)
    const budgetSourceLabel = getOptionLabel(SUB_ACTIVITY_BUDGET_SOURCE_OPTIONS, item.budgetSource)
    const budgetTypeLabel = getOptionLabel(SUB_ACTIVITY_BUDGET_TYPE_OPTIONS, item.budgetType)

    return (
      <article className={`edit-activity__budget-item${item.isCollapsed ? ' edit-activity__budget-item--collapsed' : ''}`} key={item.localId}>
        <button
          aria-expanded={!item.isCollapsed}
          className="edit-activity__budget-item-summary"
          onClick={() => toggleBudgetItem(item.localId)}
          type="button"
        >
          <span className="edit-activity__budget-item-main">
            <span className="edit-activity__budget-item-number">B{index + 1}</span>
            <strong>{item.name.trim() || 'N/A'}</strong>
            {item.budgetSource ? <span className="edit-activity__budget-item-pill">{budgetSourceLabel}</span> : null}
            {item.budgetType ? <span className="edit-activity__budget-item-pill">{budgetTypeLabel}</span> : null}
            <span className="edit-activity__budget-item-review">Awaiting review</span>
          </span>
          <span className="edit-activity__budget-item-total">
            <span>Total Planned Budget</span>
            <CurrencyDisplay value={totalBudget} />
          </span>
          <span className="edit-activity__budget-item-toggle" aria-hidden="true">
            {item.isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </span>
        </button>

        {!item.isCollapsed ? (
          <div className="edit-activity__budget-item-readonly-body">
            {renderBudgetReadOnlyTiles([
              { label: 'Sub Activity Name', value: renderBudgetReadOnlyValue(item.name) },
              { label: 'Budget Source', value: renderBudgetReadOnlyValue(budgetSourceLabel) },
              { label: 'Budget Type', value: renderBudgetReadOnlyValue(budgetTypeLabel) },
              { label: 'Allocated Budget', value: <CurrencyDisplay value={parseNum(item.allocatedBudget)} /> },
              { label: 'Delta', value: <CurrencyDisplay value={parseNum(delta)} />, variant: 'success' },
              { label: 'Description', value: renderBudgetReadOnlyValue(item.description) },
            ])}
            {renderBudgetMonthCards(item.monthlyBudgets, 'Planned Cash Flow - Jan to Dec')}
          </div>
        ) : null}
      </article>
    )
  }

  function renderOverallProjectBudgetCard() {
    const overallMonthlyBudgets = MONTH_LABELS.map((_, monthIndex) => (
      budgetItems.reduce((sum, item) => sum + parseNum(item.monthlyBudgets[monthIndex]), 0)
    ))
    const overallPlannedBudget = overallMonthlyBudgets.reduce((sum, value) => sum + value, 0)
    const overallAllocatedBudget = budgetItems.reduce((sum, item) => sum + parseNum(item.allocatedBudget), 0)
    const overallDelta = overallPlannedBudget - overallAllocatedBudget

    return (
      <section className="edit-activity__overall-budget-card" aria-label="Overall project budget">
        <div className="edit-activity__overall-budget-header">
          <div className="edit-activity__overall-budget-title">
            <h3>Overall Project Budget</h3>
            <span>Auto-calculated · read-only</span>
            <span>Rolled up from {budgetItems.length} budget item{budgetItems.length === 1 ? '' : 's'}</span>
          </div>
        </div>

        {renderBudgetReadOnlyTiles([
          {
            label: 'Overall Total Planned Budget',
            value: <CurrencyDisplay value={overallPlannedBudget} />,
          },
          {
            label: 'Overall Allocated Budget',
            value: <CurrencyDisplay value={overallAllocatedBudget} />,
          },
          {
            label: 'Delta',
            value: <CurrencyDisplay value={overallDelta} />,
            variant: 'success',
          },
        ])}

        {renderBudgetMonthCards(overallMonthlyBudgets.map(String), 'Overall Planned Cash Flow - Jan to Dec')}
      </section>
    )
  }

  function renderPlanningQuarterGrid() {
    return Array.from({ length: 4 }, (_, quarterIndex) => {
      const startIndex = quarterIndex * 3
      const quarterMonths = MONTH_LABELS.slice(startIndex, startIndex + 3)
      const quarterTotal = sumMonthly(form.monthlyBudgets.slice(startIndex, startIndex + 3))
      const isCurrentQuarter = quarterIndex === currentQuarterIndex

      return (
        <section
          aria-label={`Quarter ${quarterIndex + 1}${isCurrentQuarter ? ', current quarter' : ''}`}
          className={`edit-activity__monthly-quarter${isCurrentQuarter ? ' edit-activity__monthly-quarter--current' : ''}`}
          key={`quarter-${quarterIndex + 1}`}
        >
          <div className="edit-activity__monthly-quarter-header">
            <div className="edit-activity__monthly-quarter-title">
              <span className="edit-activity__monthly-quarter-number">Q{quarterIndex + 1}</span>
              <span className="edit-activity__monthly-quarter-range">
                {quarterMonths[0]} to {quarterMonths[quarterMonths.length - 1]}
              </span>
              {isCurrentQuarter ? <span className="edit-activity__monthly-current-badge">Current</span> : null}
            </div>
            <div className="edit-activity__monthly-quarter-total">
              <span>Quarter total</span>
              <strong><CurrencyDisplay value={quarterTotal} /></strong>
            </div>
          </div>

          <div className="edit-activity__monthly-quarter-fields">
            {quarterMonths.map((label, monthOffset) => {
              const monthIndex = startIndex + monthOffset
              return (
                <CurrencyInput
                  className="edit-activity__monthly-field"
                  disabled={isFormReadOnly}
                  error={errors.monthlyBudgets && isInvalidCurrency(form.monthlyBudgets[monthIndex]) ? errors.monthlyBudgets : undefined}
                  key={label}
                  label={label}
                  onChange={(event) => handleMonthlyChange(monthIndex, stripCommas(event.target.value))}
                  placeholder="0"
                  required
                  value={addCommas(form.monthlyBudgets[monthIndex])}
                />
              )
            })}
          </div>
        </section>
      )
    })
  }

  function renderExecutionTableView() {
    const totalPlanned = orderedMonthRecords.reduce((sum, record) => sum + record.plannedBudget, 0)
    const totalActual = orderedMonthRecords.reduce((sum, record) => sum + record.actualBudget, 0)
    const totalDelivered = orderedMonthRecords.reduce((sum, record) => sum + record.deliveredAmount, 0)

    return (
      <div className="edit-activity__execution-budget-table-card">
        <div className="edit-activity__execution-budget-table-title">
          <h3>Budget Spending Monthly</h3>
        </div>
        <div className="edit-activity__execution-budget-table-scroll">
          <div className="edit-activity__execution-budget-table" role="table" aria-label="Budget Spending Monthly">
            <div className="edit-activity__execution-budget-table-row edit-activity__execution-budget-table-row--header" role="row">
              <div role="columnheader">Month</div>
              <div role="columnheader">Planned Spending</div>
              <div role="columnheader">Actual Spending</div>
              <div role="columnheader">Delivered Values</div>
              <div role="columnheader">Progress</div>
              <div role="columnheader" aria-label="Add budget details" />
              <div role="columnheader">Set to Zero</div>
            </div>

            {MONTH_LABELS.map((monthName) => {
              const monthRecord = monthRecords.find((record) => normalizeMonth(record.monthName) === normalizeMonth(monthName))
              const monthId = monthRecord?.id ?? monthName
              const isFuture = isFutureMonth(monthName)
              const deliveredDraft = inlineDeliveredDrafts[monthId] ?? numberToString(monthRecord?.deliveredAmount)
              const canEditCurrentMonth = executionMonthlyEditAllowed && !isFuture && Boolean(monthRecord)
              const canOpenMonthDrawer = Boolean(monthRecord) && !isFuture
              const hasDetails = (monthRecord?.details.length ?? 0) > 0
              const isSavingMonth = isSavingExecutionMonth === monthId
              const rowProgress = monthRecord?.plannedBudget
                ? Math.min(100, Math.round(((monthRecord.actualBudget ?? 0) / monthRecord.plannedBudget) * 100))
                : 0

              return (
                <div
                  className={`edit-activity__execution-budget-table-row${isFuture ? ' edit-activity__execution-budget-table-row--future' : ''}`}
                  key={monthName}
                  role="row"
                >
                  <div className="edit-activity__execution-budget-table-month" role="cell">
                    <strong>{monthName}</strong>
                  </div>
                  <div role="cell">
                    <span className="edit-activity__execution-budget-table-money">
                      <CurrencyDisplay value={monthRecord?.plannedBudget ?? 0} />
                    </span>
                  </div>
                  <div className="edit-activity__execution-budget-table-actual" role="cell">
                    <span className="edit-activity__execution-budget-table-money edit-activity__execution-budget-table-money--readonly">
                      <CurrencyDisplay value={monthRecord?.actualBudget ?? 0} />
                    </span>
                  </div>
                  <div role="cell">
                    <CurrencyInput
                      className="edit-activity__execution-budget-table-delivered"
                      disabled={!canEditCurrentMonth || Boolean(monthRecord?.isZero) || isSavingMonth}
                      error={inlineDeliveredErrors[monthId]}
                      label={`${monthName} delivered value`}
                      onBlur={() => {
                        void handleDeliveredValueBlur(monthId)
                      }}
                      onChange={(event) => handleDeliveredValueChange(monthId, stripCommas(event.target.value))}
                      placeholder="0"
                      value={addCommas(deliveredDraft)}
                    />
                  </div>
                  <div role="cell">
                    <span className="edit-activity__execution-budget-progress">
                      <span>{rowProgress}%</span>
                      <i aria-hidden="true"><b style={{ width: `${rowProgress}%` }} /></i>
                    </span>
                  </div>
                  <div role="cell">
                    <Button
                      className="edit-activity__execution-budget-add-btn"
                      disabled={!canOpenMonthDrawer || isSavingMonth || Boolean(monthRecord?.isZero)}
                      onClick={() => openDrawer(monthId)}
                    >
                      Add
                    </Button>
                  </div>
                  <div role="cell">
                    <label className={`edit-activity__execution-budget-zero-toggle${monthRecord?.isZero ? ' edit-activity__execution-budget-zero-toggle--active' : ''}`}>
                      <span>Set to Zero:</span>
                      <input
                        checked={Boolean(monthRecord?.isZero)}
                        disabled={!canEditCurrentMonth || (!monthRecord?.isZero && hasDetails) || isSavingMonth}
                        onChange={() => {
                          void handleToggleZero(monthId)
                        }}
                        type="checkbox"
                      />
                      <span className="edit-activity__execution-budget-zero-switch" aria-hidden="true" />
                      <strong>{monthRecord?.isZero ? 'Yes' : 'No'}</strong>
                    </label>
                  </div>
                </div>
              )
            })}

            <div className="edit-activity__execution-budget-table-row edit-activity__execution-budget-table-row--total" role="row">
              <div role="cell">Total</div>
              <div role="cell"><CurrencyDisplay value={totalPlanned} /></div>
              <div role="cell"><CurrencyDisplay value={totalActual} /></div>
              <div role="cell"><CurrencyDisplay value={totalDelivered} /></div>
              <div role="cell" />
              <div role="cell" />
              <div role="cell" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderExecutionGraphView() {
    return (
      <div className="edit-activity__execution-budget-graph" aria-label="Execution budget graphical view">
        <div className="edit-activity__execution-budget-graph-section">
          <div className="edit-activity__execution-budget-graph-head">
            <h3>Budget Spending Monthly</h3>
            <div className="edit-activity__execution-budget-graph-legend" aria-hidden="true">
              <span><i className="edit-activity__execution-budget-legend-dot edit-activity__execution-budget-legend-dot--planned" /> Planned</span>
              <span><i className="edit-activity__execution-budget-legend-dot edit-activity__execution-budget-legend-dot--actual" /> Actual</span>
              <span><i className="edit-activity__execution-budget-legend-dot edit-activity__execution-budget-legend-dot--delivered" /> Delivered</span>
            </div>
          </div>

          <div className="edit-activity__execution-budget-monthly-chart">
            <div className="edit-activity__execution-budget-monthly-y-axis" aria-hidden="true">
              <CurrencyDisplay value={monthlyGraphicalMaxValue} />
              <CurrencyDisplay value={Math.round(monthlyGraphicalMaxValue * 0.75)} />
              <CurrencyDisplay value={Math.round(monthlyGraphicalMaxValue / 2)} />
              <CurrencyDisplay value={Math.round(monthlyGraphicalMaxValue * 0.25)} />
              <CurrencyDisplay value={0} />
            </div>
            <div className="edit-activity__execution-budget-monthly-plot">
              {graphicalMonths.map((month) => {
                const plannedHeight = month.plannedBudget > 0 ? Math.min(100, Math.max(3, (month.plannedBudget / monthlyGraphicalMaxValue) * 100)) : 0
                const actualHeight = month.actualBudget > 0 ? Math.min(100, Math.max(3, (month.actualBudget / monthlyGraphicalMaxValue) * 100)) : 0
                const deliveredHeight = month.deliveredAmount > 0 ? Math.min(100, Math.max(3, (month.deliveredAmount / monthlyGraphicalMaxValue) * 100)) : 0

                return (
                  <article
                    className="edit-activity__execution-budget-monthly-chart-item"
                    key={month.monthName}
                    title={`${month.monthName} | Planned: ${month.plannedBudget} | Actual: ${month.actualBudget} | Delivered: ${month.deliveredAmount}`}
                  >
                    <div className="edit-activity__execution-budget-monthly-bars" aria-hidden="true">
                      <span
                        className="edit-activity__execution-budget-monthly-bar edit-activity__execution-budget-monthly-bar--planned"
                        style={{ height: `${plannedHeight}%` }}
                      />
                      <span
                        className="edit-activity__execution-budget-monthly-bar edit-activity__execution-budget-monthly-bar--actual"
                        style={{ height: `${actualHeight}%` }}
                      />
                      <span
                        className="edit-activity__execution-budget-monthly-bar edit-activity__execution-budget-monthly-bar--delivered"
                        style={{ height: `${deliveredHeight}%` }}
                      />
                    </div>
                    <strong>{month.monthName.slice(0, 3)}</strong>
                  </article>
                )
              })}
            </div>
          </div>
        </div>

        <div className="edit-activity__execution-budget-graph-section">
          <div className="edit-activity__execution-budget-graph-head">
            <h3>Planned Spent vs Actual Spent</h3>
          <div className="edit-activity__execution-budget-graph-legend" aria-hidden="true">
            <span><i className="edit-activity__execution-budget-legend-dot edit-activity__execution-budget-legend-dot--planned" /> Planned Spent</span>
            <span><i className="edit-activity__execution-budget-legend-dot edit-activity__execution-budget-legend-dot--actual" /> Actual Spent</span>
          </div>
          </div>

          <div className="edit-activity__execution-budget-chart">
          {graphicalQuarters.map((quarter) => {
            const plannedHeight = Math.max(4, (quarter.plannedSpent / graphicalMaxValue) * 100)
            const actualHeight = Math.max(4, (quarter.actualSpent / graphicalMaxValue) * 100)

            return (
              <article className="edit-activity__execution-budget-chart-quarter" key={quarter.label}>
                <div className="edit-activity__execution-budget-chart-quarter-head">
                  <strong>{quarter.label}</strong>
                  <span>{quarter.range}</span>
                </div>
                <div className="edit-activity__execution-budget-chart-bars" aria-hidden="true">
                  <div className="edit-activity__execution-budget-chart-bar-wrap">
                    <span
                      className="edit-activity__execution-budget-chart-bar edit-activity__execution-budget-chart-bar--planned"
                      style={{ height: `${plannedHeight}%` }}
                    />
                    <em>Planned</em>
                  </div>
                  <div className="edit-activity__execution-budget-chart-bar-wrap">
                    <span
                      className="edit-activity__execution-budget-chart-bar edit-activity__execution-budget-chart-bar--actual"
                      style={{ height: `${actualHeight}%` }}
                    />
                    <em>Actual</em>
                  </div>
                </div>
                <div className="edit-activity__execution-budget-chart-copy">
                  <span className="edit-activity__execution-budget-chart-copy-row edit-activity__execution-budget-chart-copy-row--planned">
                    Planned <CurrencyDisplay value={quarter.plannedSpent} />
                  </span>
                  <span className="edit-activity__execution-budget-chart-copy-row edit-activity__execution-budget-chart-copy-row--actual">
                    Actual <CurrencyDisplay value={quarter.actualSpent} />
                  </span>
                  <div className="edit-activity__execution-budget-progress-track">
                    <span style={{ width: `${quarter.progress}%` }} />
                  </div>
                </div>
              </article>
            )
          })}
          <article className="edit-activity__execution-budget-overall">
            <div>
              <span>Overall Progress</span>
              <strong>{overallProgress}%</strong>
            </div>
            <div className="edit-activity__execution-budget-overall-ring" style={{ '--progress': `${overallProgress}%` } as CSSProperties}>
              <span>{overallProgress}%</span>
            </div>
            <div className="edit-activity__execution-budget-overall-values">
              <span>Planned <CurrencyDisplay value={overallPlannedSpent} /></span>
              <span>Actual <CurrencyDisplay value={overallActualSpent} /></span>
            </div>
          </article>
          </div>
        </div>
      </div>
    )
  }

  const drawerColumns: readonly DataGridColumn<BudgetDetailGridRow>[] = [
    {
      header: '#',
      key: 'index',
      render: (row) => <span>{row.index}</span>,
    },
    {
      header: 'Account Code',
      key: 'accountCode',
      render: (row) => (
        <span className="edit-activity__budget-detail-account-code" title={row.accountCodeLabel}>
          {row.accountCodeLabel}
        </span>
      ),
    },
    {
      header: 'GRN',
      key: 'grn',
      render: (row) => (
        <span className="edit-activity__budget-detail-grn" title={row.grn}>
          {row.grn}
        </span>
      ),
    },
    {
      header: 'Amount',
      key: 'amount',
      render: (row) => (
        <span className="edit-activity__budget-detail-amount">
          <CurrencyDisplay value={row.amount} />
        </span>
      ),
    },
    {
      header: 'Action',
      key: 'actions',
      render: (row) => (
        <div className="edit-activity__budget-detail-actions">
          <button
            aria-label="Edit budget detail"
            className="edit-activity__procurement-action-btn"
            disabled={!executionMonthlyEditAllowed}
            onClick={() => openEditDetailForm(row)}
            type="button"
          >
            <Pencil size={14} />
          </button>
          <button
            aria-label="Delete budget detail"
            className="edit-activity__procurement-action-btn edit-activity__procurement-action-btn--danger"
            disabled={!executionMonthlyEditAllowed}
            onClick={() => {
              void handleDeleteDrawerRow(row.localId)
            }}
            type="button"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  function renderExecutionDrawer() {
    const title = selectedDrawerMonth ? `Budget Details - ${selectedDrawerMonth.monthName}` : 'Budget Details'
    const isDrawerReadOnly = !executionMonthlyEditAllowed
    const addDisabled = isDrawerReadOnly || !selectedDrawerMonth || selectedDrawerMonth.isZero

    return (
      <SideDrawer
        actions={
          <div className="edit-activity__budget-details-drawer-actions">
            <Button onClick={closeDrawer} variant="secondary">
              Close
            </Button>
            <Button disabled={isSavingDrawer} onClick={() => void handleConfirmDrawer()}>
              {isSavingDrawer ? 'Confirming...' : 'Confirm'}
            </Button>
          </div>
        }
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={title}
      >
        <div className="edit-activity__budget-details-drawer">
          {detailDraftErrors.submit ? (
            <div className="create-activity__notice create-activity__notice--error" role="alert">
              {detailDraftErrors.submit}
            </div>
          ) : null}

          <div className="edit-activity__budget-details-stats">
            <div className="edit-activity__budget-details-stat">
              <span>Allocated Budget</span>
              <strong><CurrencyDisplay value={drawerAllocatedBudget} /></strong>
            </div>
            <div className="edit-activity__budget-details-stat">
              <span>Total Actual Budget</span>
              <strong><CurrencyDisplay value={drawerActualTotal} /></strong>
            </div>
            <div className="edit-activity__budget-details-stat">
              <span>Remaining Budget</span>
              <strong><CurrencyDisplay value={drawerRemainingBudget} /></strong>
            </div>
          </div>

          {selectedDrawerMonth?.isZero ? (
            <div className="create-activity__notice create-activity__notice--warning" role="alert">
              This month is currently set to zero. Remove the zero flag first if you want to add budget details.
            </div>
          ) : null}

          <div className="edit-activity__budget-details-header">
            <div>
              <span>Account Codes</span>
              <h3>Monthly detail breakdown</h3>
            </div>
            <Button disabled={addDisabled} icon={<Plus size={16} />} onClick={openAddDetailForm} variant="secondary">
              Add Budget Entry
            </Button>
          </div>

          {isDetailFormOpen ? (
            <div className="edit-activity__budget-details-form">
              <Select
                disabled={isDrawerReadOnly}
                error={detailDraftErrors.accountCodeId}
                id="budget-detail-account-code"
                label="Account Code"
                onChange={(value) => handleDetailDraftChange({ accountCodeId: value })}
                options={accountCodeSelectOptions}
                required
                value={detailDraft.accountCodeId}
              />
              <Input
                disabled={isDrawerReadOnly}
                error={detailDraftErrors.grn}
                label="GRN"
                onChange={(event) => handleDetailDraftChange({ grn: event.target.value })}
                required
                value={detailDraft.grn}
              />
              <CurrencyInput
                disabled={isDrawerReadOnly}
                error={detailDraftErrors.amount}
                label="Amount"
                onChange={(event) => handleDetailDraftChange({ amount: stripCommas(event.target.value) })}
                placeholder="0"
                required
                value={addCommas(detailDraft.amount)}
              />

              <div className="edit-activity__budget-details-form-actions">
                <Button onClick={cancelDetailForm} variant="ghost">
                  Cancel
                </Button>
                <Button
                  disabled={isDrawerReadOnly || isSavingDrawer}
                  onClick={() => {
                    void handleCommitDetailDraft()
                  }}
                >
                  Add Entry
                </Button>
              </div>
            </div>
          ) : null}

          <div className="edit-activity__budget-details-grid-wrap">
            <DataGrid
              columns={drawerColumns}
              emptyMessage="No budget details have been added for this month yet."
              getRowKey={(row) => row.localId}
              rows={visibleDrawerRows}
            />
          </div>
        </div>
      </SideDrawer>
    )
  }

  if (isLoading) {
    return (
      <div className="edit-activity__manual-form">
        <Card className="create-activity__section">
          <div className="create-activity__section-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <Wallet size={18} />
              </span>
              <div>
                <span>Budget</span>
                <h2>Loading budget information...</h2>
              </div>
            </div>
          </div>
          <div className="create-activity__form-stack">
            <div className="skeleton-line skeleton-shimmer" style={{ width: '55%', height: '1rem' }} />
            <div className="skeleton-input skeleton-shimmer" />
            <div className="skeleton-input skeleton-shimmer" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="edit-activity__manual-form">
      {errors.context ? (
        <div className="create-activity__notice create-activity__notice--error" role="alert">
          {errors.context}
        </div>
      ) : null}

      {!hasAllMonthlyRows && !hasMultiBudgetItems ? (
        <div className="create-activity__notice create-activity__notice--warning" role="alert">
          Monthly budget setup is incomplete. Missing rows: {missingMonths.join(', ')}. The activity creation plugin must create all 12 month rows before budget changes can be saved.
        </div>
      ) : null}

      <AiSummaryPanel
        error={aiSummaryError}
        isLoading={isAiSummaryLoading}
        meta={aiSummaryMeta}
        summaries={aiSummaryBlocks}
        title="Budget"
      />

      {isExecutionPhase ? (
        <section className="edit-activity__budget-metric-section" aria-label="Execution budget metrics">
          <div className="edit-activity__budget-stats">
            <div className="edit-activity__budget-stat edit-activity__budget-stat--spent">
              <span className="edit-activity__budget-stat-icon" aria-hidden="true">
                <ChartNoAxesColumnIncreasing size={16} />
              </span>
              <div>
                <span className="edit-activity__budget-stat-label">Total Actual Budget Spent</span>
                <span className="edit-activity__budget-stat-value">
                  <CurrencyDisplay value={actualBudgetSpent} />
                </span>
              </div>
            </div>
            <div className="edit-activity__budget-stat edit-activity__budget-stat--remaining">
              <span className="edit-activity__budget-stat-icon" aria-hidden="true">
                <Wallet size={16} />
              </span>
              <div>
                <span className="edit-activity__budget-stat-label">Remaining Budget</span>
                <span className="edit-activity__budget-stat-value">
                  <CurrencyDisplay value={remainingBudget} />
                </span>
              </div>
            </div>
            <div className="edit-activity__budget-stat edit-activity__budget-stat--delivered">
              <span className="edit-activity__budget-stat-icon" aria-hidden="true">
                <CircleCheck size={16} />
              </span>
              <div>
                <span className="edit-activity__budget-stat-label">Total Delivered Values</span>
                <span className="edit-activity__budget-stat-value">
                  <CurrencyDisplay value={totalDeliveredValues} />
                </span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {showBudgetOverviewCard ? (
      <Card className={`create-activity__section edit-activity__budget-overview-card${isExecutionPhase ? ' edit-activity__budget-overview-card--execution' : ''}`}>
        <div className="create-activity__section-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <Wallet size={18} />
            </span>
            <div>
              <span>Budget Overview</span>
              {!isExecutionPhase ? <h2>Overall budget summary</h2> : null}
              <p>
                {isExecutionPhase
                  ? 'Review actual spending, remaining budget, and delivered value for this activity.'
                  : 'Review planned, allocated, spent, and remaining budget values for this activity.'}
              </p>
            </div>
          </div>
        </div>

        <div className="create-activity__form-stack">
          {showBudgetReviewComment ? (
            !isEditing ? (
              <div className="edit-activity__budget-review-readonly">
                <span>Budget Review Comment</span>
                <p>{renderBudgetReadOnlyValue(form.budgetReviewComment)}</p>
              </div>
            ) : (
              <div className="create-activity__form-row">
                <Textarea
                  disabled={isBudgetReviewCommentReadOnly}
                  error={errors.budgetReviewComment}
                  label="Budget Review Comment"
                  onChange={(event) => handleFieldChange({ budgetReviewComment: event.target.value })}
                  placeholder="Enter your budget review comments..."
                  required={canEditBudgetReviewComment}
                  rows={3}
                  value={form.budgetReviewComment}
                />
              </div>
            )
          ) : null}
        </div>
      </Card>
      ) : null}

      <Card className={`create-activity__section edit-activity__budget-allocation-card${isExecutionPhase ? ' edit-activity__budget-allocation-card--execution' : ''}${isEditing && !isExecutionPhase && !hasMultiBudgetItems ? ' edit-activity__budget-allocation-card--single-edit' : ''}`}>
        <div className="create-activity__section-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <Wallet size={18} />
            </span>
            <div>
              <span>Budget Allocation</span>
              {!isExecutionPhase ? <h2>Source, type, and amounts</h2> : null}
              <p>Select the funding source, budget type, and allocated budget amount.</p>
            </div>
          </div>
          {isEditing && !isExecutionPhase && !hasMultiBudgetItems ? (
            <Button disabled={isFormReadOnly} icon={<Plus size={16} />} onClick={handleAddBudgetItem}>
              Add Budget Item
            </Button>
          ) : null}
        </div>

        {!isEditing ? (
          hasMultiBudgetItems ? (
            <div className="create-activity__form-stack">
              {renderOverallProjectBudgetCard()}
            </div>
          ) : (
            renderSingleBudgetReadOnlyCard()
          )
        ) : isExecutionPhase ? (
          <div className="create-activity__readonly-panel">
            {renderBudgetReadOnlyDetails([
              {
                label: 'Budget Source',
                value: renderBudgetReadOnlyValue(getOptionLabel(BUDGET_SOURCE_OPTIONS, form.budgetSource)),
                kind: 'classification',
                columns: 6,
              },
              {
                label: 'Budget Type',
                value: renderBudgetReadOnlyValue(getOptionLabel(BUDGET_TYPE_OPTIONS, form.budgetType)),
                kind: 'classification',
                columns: 6,
              },
              ...(showTotalActivityBudget
                ? [{
                    label: 'Total Activity Budget (Across Multiple Years)',
                    value: <CurrencyDisplay value={parseNum(form.totalActivityBudget)} />,
                    kind: 'requirement' as const,
                    columns: 4 as const,
                  }]
                : []),
              {
                label: 'Total Planned Budget',
                value: <CurrencyDisplay value={parseNum(form.totalPlannedBudget)} />,
                kind: 'requirement',
                columns: showTotalActivityBudget ? 4 : 6,
              },
              {
                label: 'Allocated Budget',
                value: <CurrencyDisplay value={parseNum(form.allocatedBudget)} />,
                kind: 'requirement',
                columns: showTotalActivityBudget ? 4 : 6,
              },
            ])}
          </div>
        ) : hasMultiBudgetItems ? (
          <div className="create-activity__form-stack">
            {renderOverallProjectBudgetCard()}
          </div>
        ) : (
          <div className="create-activity__form-stack">
            <div className="create-activity__form-row">
              <RadioGroup
                className="edit-activity__budget-source"
                disabled={isFormReadOnly}
                error={errors.budgetSource}
                label="Budget Source"
                name="budget-source"
                onChange={(value) => handleFieldChange({ budgetSource: value as BudgetFormData['budgetSource'] })}
                options={BUDGET_SOURCE_OPTIONS}
                required
                value={form.budgetSource}
              />
            </div>

            <div className="create-activity__form-row">
              <RadioGroup
                className="edit-activity__budget-type"
                disabled={isFormReadOnly}
                error={errors.budgetType}
                label="Budget Type"
                name="budget-type"
                onChange={(value) => handleFieldChange({ budgetType: value as BudgetFormData['budgetType'] })}
                options={BUDGET_TYPE_OPTIONS}
                required
                value={form.budgetType}
              />
            </div>

            <div className="create-activity__form-row create-activity__form-row--three">
              {showTotalActivityBudget ? (
                <CurrencyInput
                  disabled={isFormReadOnly}
                  error={errors.totalActivityBudget}
                  label="Total Activity Budget (Across Multiple Years)"
                  onChange={(event) => handleFieldChange({ totalActivityBudget: stripCommas(event.target.value) })}
                  placeholder="0"
                  required
                  value={addCommas(form.totalActivityBudget)}
                />
              ) : null}

              <label className="field field--disabled edit-activity__budget-disabled-currency">
                <span className="field__label">
                  Total Planned Budget
                  <span aria-hidden="true" className="field__required"> *</span>
                </span>
                <span className="currency-input__control field__input-wrap" style={{ paddingRight: '2.4rem' }}>
                  <DirhamIcon />
                  <input
                    aria-invalid={false}
                    className="field__control"
                    disabled
                    readOnly
                    required
                    value={addCommas(form.totalPlannedBudget) || '0'}
                  />
                  <span className="field__right-icon">
                    <LockKeyhole size={15} />
                  </span>
                </span>
                <span className="field__hint">Auto-calculated from monthly budgets</span>
              </label>

              <CurrencyInput
                disabled={isFormReadOnly}
                error={errors.allocatedBudget}
                label="Allocated Budget"
                onChange={(event) => handleFieldChange({ allocatedBudget: stripCommas(event.target.value) })}
                placeholder="0"
                required
                value={addCommas(form.allocatedBudget)}
              />
              <label className="field field--disabled edit-activity__budget-disabled-currency">
                <span className="field__label">Delta</span>
                <span className="currency-input__control field__input-wrap" style={{ paddingRight: '2.4rem' }}>
                  <DirhamIcon />
                  <input
                    aria-invalid={false}
                    className="field__control"
                    disabled
                    readOnly
                    value={addCommas(String(parseNum(form.totalPlannedBudget) - parseNum(form.allocatedBudget))) || '0'}
                  />
                  <span className="field__right-icon">
                    <LockKeyhole size={15} />
                  </span>
                </span>
                <span className="field__hint">Total Budget minus Allocated Budget</span>
              </label>
            </div>
          </div>
        )}
      </Card>

      {!isExecutionPhase && hasMultiBudgetItems ? (
        <Card className="create-activity__section edit-activity__budget-items-section" aria-label="Budget items">
          <div className="edit-activity__budget-items-toolbar">
            <div className="edit-activity__budget-items-heading">
              <span>Budget Items</span>
              <strong>{budgetItems.length}</strong>
            </div>
            <div className="edit-activity__budget-items-actions">
              {isEditing ? (
                <Button disabled={isFormReadOnly} icon={<Plus size={16} />} onClick={handleAddBudgetItem}>
                  Add Budget Item
                </Button>
              ) : null}
              <button
                className="edit-activity__budget-items-expand"
                onClick={() => {
                  setBudgetItems((current) => current.map((item) => ({ ...item, isCollapsed: allBudgetItemsExpanded })))
                }}
                type="button"
              >
                {allBudgetItemsExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            </div>
          </div>

          <div className="create-activity__form-stack edit-activity__budget-items">
            {budgetItems.map(isEditing ? renderBudgetItemCard : renderBudgetItemReadOnlyCard)}
          </div>
        </Card>
      ) : null}

      {isEditing && !hasMultiBudgetItems ? <Card className={`create-activity__section${isExecutionPhase ? ' edit-activity__execution-budget-section' : ''}`}>
        <div className="create-activity__section-header edit-activity__budget-breakdown-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <Wallet size={18} />
            </span>
            <div>
              <span>Monthly Budget Breakdown</span>
              {!isExecutionPhase ? <h2>12-month allocation grid</h2> : null}
              <p>
                {isExecutionPhase
                  ? 'Track monthly planned, actual, delivered, and remaining budget values.'
                  : 'Review and maintain the month-by-month planned budget distribution.'}
              </p>
            </div>
          </div>
          {isExecutionPhase ? (
            <div className="edit-activity__budget-view-switch" aria-label="Budget view mode">
              <button
                aria-pressed={budgetViewMode === 'table'}
                className={budgetViewMode === 'table' ? 'edit-activity__budget-view-switch-btn edit-activity__budget-view-switch-btn--active' : 'edit-activity__budget-view-switch-btn'}
                onClick={() => setBudgetViewMode('table')}
                type="button"
              >
                <List size={15} />
                <span>Table View</span>
              </button>
              <button
                aria-pressed={budgetViewMode === 'graph'}
                className={budgetViewMode === 'graph' ? 'edit-activity__budget-view-switch-btn edit-activity__budget-view-switch-btn--active' : 'edit-activity__budget-view-switch-btn'}
                onClick={() => setBudgetViewMode('graph')}
                type="button"
              >
                <ChartNoAxesColumnIncreasing size={15} />
                <span>Graphical View</span>
              </button>
            </div>
          ) : null}
        </div>

        <div className="create-activity__form-stack edit-activity__monthly-body">
          {!isExecutionPhase ? <div className="edit-activity__monthly-overview">
            <div className="edit-activity__monthly-intro">
              <span className="edit-activity__monthly-icon" aria-hidden="true">
                <CalendarRange size={20} />
              </span>
              <div>
                <strong>Fiscal year allocation</strong>
                <span>Update the planned budget on the 12 monthly rows created by the activity plugin.</span>
              </div>
            </div>
            <div className="edit-activity__monthly-metrics">
              <div className="edit-activity__monthly-metric">
                <span>Annual planned total</span>
                <strong>
                  <CurrencyDisplay value={sumMonthly(form.monthlyBudgets)} />
                </strong>
              </div>
              <div className="edit-activity__monthly-metric edit-activity__monthly-metric--progress">
                <span><CircleCheck size={13} /> Rows loaded</span>
                <strong>{orderedMonthRecords.length}/12 months</strong>
              </div>
            </div>
            <div
              aria-label={`${orderedMonthRecords.length} of 12 monthly budget rows loaded`}
              aria-valuemax={12}
              aria-valuemin={0}
              aria-valuenow={orderedMonthRecords.length}
              className="edit-activity__monthly-progress-track"
              role="progressbar"
            >
              <span style={{ width: `${(orderedMonthRecords.length / 12) * 100}%` }} />
            </div>
          </div> : null}

          <div className={isExecutionPhase ? 'edit-activity__execution-budget-quarter-grid' : 'edit-activity__monthly-quarter-grid'}>
            {isExecutionPhase
              ? budgetViewMode === 'table'
                ? renderExecutionTableView()
                : renderExecutionGraphView()
              : renderPlanningQuarterGrid()}
          </div>
        </div>
      </Card> : null}

      {isExecutionPhase ? renderExecutionDrawer() : null}
      {renderBudgetWizard()}
      <ConfirmationDialog
        confirmLabel="Confirm"
        description="The currently entered overall budget will become the first budget item. A new blank budget item will be added, and the overall project budget will become a read-only aggregate after saving. Do you want to continue?"
        isOpen={isConvertDialogOpen}
        onCancel={() => setIsConvertDialogOpen(false)}
        onConfirm={handleConfirmConvertToMultiBudget}
        title="Convert to multi-budget"
      />
      <ConfirmationDialog
        confirmLabel="Delete"
        danger
        description={`Delete ${deleteBudgetItemTarget?.name || 'this budget item'}? This will remove the budget item when changes are saved.`}
        isOpen={Boolean(deleteBudgetItemTarget)}
        onCancel={() => setDeleteBudgetItemTarget(null)}
        onConfirm={handleConfirmDeleteBudgetItem}
        title="Delete budget item"
      />
    </div>
  )
}
