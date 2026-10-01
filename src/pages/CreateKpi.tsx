import { useState } from 'react'
import { BarChart3, ClipboardList, Gauge, Link2, Save, Target } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Badge, Button, Card, CurrencyInput, DatePicker, Input, RadioGroup, Select, Textarea } from '../components/ui'
import type { Dga_aop_kpis, Dga_aop_kpisBase } from '../generated/models/Dga_aop_kpisModel'
import { Dga_aop_kpisService } from '../generated/services/Dga_aop_kpisService'
import { APP_ROUTE_PATHS, EXECUTION_PLAN_KPI_DETAIL_ROUTE } from '../routes/appRoutes'
import { useAppSelector } from '../store/hooks'

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

type CreateKpiForm = {
  kpiName: string
  arabicKpiName: string
  directorate: string
  kpiDescription: string
  arabicKpiDescription: string
  calculationMethod: string
  arabicCalculationMethod: string
  sourceOfData: string
  expectedImpact: string
  strategicActivity: string
  polarity: string
  kpiType: string
  unit: string
  benchmarkable: string
  periodicMeasurement: string
  baselineStartDate: string
  baselineEndDate: string
  kpiBenchmarkableValue: string
  benchmark: string
  estimatedBaselineAvailable: string
  baselineMethodology: string
  historical2028: string
  historical2029: string
  historical2030: string
  targets: Record<string, { q1: string, q2: string, q3: string, q4: string }>
}

type CreateKpiFormErrors = Partial<Record<keyof CreateKpiForm, string>>

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
  'special-strategies': 5,
  common: 6,
}

const UNIT_VALUE_BY_FORM: Record<string, Dga_aop_kpisBase['dga_unit']> = {
  number: 1,
  percent: 2,
  rate: 3,
  aed: 4,
}

const POLARITY_VALUE_BY_FORM: Record<string, Dga_aop_kpisBase['dga_polarity']> = {
  ascending: 1,
  descending: 2,
  'closer-to-target': 3,
}

const MEASUREMENT_VALUE_BY_FORM: Record<string, Dga_aop_kpisBase['dga_periodic_measurement']> = {
  quarterly: 1,
  'semi-annually': 2,
  annually: 3,
}

function getResultValue<T>(result: unknown): T | undefined {
  const shaped = result as { data?: T; value?: T; result?: T; record?: T }
  return shaped.data ?? shaped.value ?? shaped.result ?? shaped.record
}

function normalizeId(id?: string | null) {
  return (id ?? '').replace(/[{}]/g, '').toLowerCase()
}

function toEntityBind(entitySetName: string, id: string) {
  return `/${entitySetName}(${normalizeId(id)})`
}

function isDivisionMemberRole(roleName?: string | null) {
  return (roleName ?? '').trim().toLowerCase() === 'aop - division member'
}

const INITIAL_FORM: CreateKpiForm = {
  kpiName: '',
  arabicKpiName: '',
  directorate: 'tamm',
  kpiDescription: '',
  arabicKpiDescription: '',
  calculationMethod: '',
  arabicCalculationMethod: '',
  sourceOfData: '',
  expectedImpact: '',
  strategicActivity: '',
  polarity: 'ascending',
  kpiType: 'aspirations',
  unit: 'percent',
  benchmarkable: 'yes',
  periodicMeasurement: 'semi-annually',
  baselineStartDate: '',
  baselineEndDate: '',
  kpiBenchmarkableValue: '',
  benchmark: '',
  estimatedBaselineAvailable: '',
  baselineMethodology: '',
  historical2028: '',
  historical2029: '',
  historical2030: '',
  targets: {
    '2031': { q1: '', q2: '', q3: '', q4: '' },
    '2032': { q1: '', q2: '', q3: '', q4: '' },
    '2033': { q1: '', q2: '', q3: '', q4: '' },
  },
}

export function CreateKpi() {
  const navigate = useNavigate()
  const selectedRole = useAppSelector((state) => state.app.selectedRole)
  const { currentRole, systemUser } = useAppSelector((state) => state.user)
  const [form, setForm] = useState<CreateKpiForm>(INITIAL_FORM)
  const [errors, setErrors] = useState<CreateKpiFormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const sectorName = 'Government Common Digital Platforms'
  const divisionName = 'Advanced Automation & Integration'

  function updateForm(fields: Partial<CreateKpiForm>) {
    setForm((current) => ({ ...current, ...fields }))
    setErrors((current) => {
      const next = { ...current }
      ;(Object.keys(fields) as Array<keyof CreateKpiForm>).forEach((key) => {
        delete next[key]
      })
      return next
    })
    setSubmitError('')
  }

  function updateTarget(year: string, quarter: 'q1' | 'q2' | 'q3' | 'q4', value: string) {
    setForm((current) => ({
      ...current,
      targets: {
        ...current.targets,
        [year]: {
          ...current.targets[year],
          [quarter]: value,
        },
      },
    }))
  }

  async function handleCreateKpi() {
    const nextErrors: CreateKpiFormErrors = {}
    if (!form.kpiName.trim()) nextErrors.kpiName = 'KPI name is required'
    if (!form.arabicKpiName.trim()) nextErrors.arabicKpiName = 'Arabic KPI name is required'
    if (!form.kpiDescription.trim()) nextErrors.kpiDescription = 'KPI description is required'
    if (!form.arabicKpiDescription.trim()) nextErrors.arabicKpiDescription = 'Arabic KPI description is required'
    if (!form.calculationMethod.trim()) nextErrors.calculationMethod = 'Calculation method is required'
    if (!form.arabicCalculationMethod.trim()) nextErrors.arabicCalculationMethod = 'Arabic calculation method is required'
    if (!form.sourceOfData.trim()) nextErrors.sourceOfData = 'Source of data is required'
    if (!form.expectedImpact.trim()) nextErrors.expectedImpact = 'Expected impact is required'
    if (!form.kpiType) nextErrors.kpiType = 'KPI type is required'
    if (!form.unit) nextErrors.unit = 'Unit is required'
    if (!form.baselineStartDate) nextErrors.baselineStartDate = 'Baseline start date is required'
    if (!form.baselineEndDate) nextErrors.baselineEndDate = 'Baseline end date is required'
    if (!form.kpiBenchmarkableValue.trim()) nextErrors.kpiBenchmarkableValue = 'KPI benchmarkable is required'
    if (!form.estimatedBaselineAvailable.trim()) nextErrors.estimatedBaselineAvailable = 'Estimated baseline available is required'
    if (!form.baselineMethodology.trim()) nextErrors.baselineMethodology = 'Baseline methodology is required'

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setSubmitError('Please complete all required KPI fields.')
      return
    }

    setIsSaving(true)
    setSubmitError('')
    try {
      const ownerUserId = normalizeId(systemUser?.systemuserid)

      if (!ownerUserId) {
        throw new Error('Current user could not be resolved for KPI ownership.')
      }

      if (!isDivisionMemberRole(selectedRole) && !isDivisionMemberRole(currentRole?.roleName)) {
        throw new Error('Only AOP - Division Member can create a KPI in the Planning phase.')
      }

      const payload = {
        'ownerid@odata.bind': toEntityBind('systemusers', ownerUserId),
        dga_baseline_end_date: form.baselineEndDate,
        dga_baseline_methodology: form.baselineMethodology.trim(),
        dga_baseline_start_date: form.baselineStartDate,
        dga_benchmark: form.benchmark.trim(),
        dga_calculation_method: form.calculationMethod.trim(),
        dga_calculation_method_arabic: form.arabicCalculationMethod.trim(),
        dga_directorate: DIRECTORATE_VALUE_BY_FORM[form.directorate],
        dga_estimated_baseline_available: Number(form.estimatedBaselineAvailable.replace(/,/g, '')) || 0,
        dga_expected_impact: form.expectedImpact.trim(),
        dga_kpi_availability: 1,
        dga_kpi_benchmarkable: form.kpiBenchmarkableValue.trim(),
        dga_kpi_description: form.kpiDescription.trim(),
        dga_kpi_description_arabic: form.arabicKpiDescription.trim(),
        dga_kpi_name: form.kpiName.trim(),
        dga_kpi_name_arabic: form.arabicKpiName.trim(),
        dga_kpi_phase: 0,
        dga_kpi_type: KPI_TYPE_VALUE_BY_FORM[form.kpiType],
        dga_periodic_measurement: MEASUREMENT_VALUE_BY_FORM[form.periodicMeasurement],
        dga_polarity: POLARITY_VALUE_BY_FORM[form.polarity],
        dga_source_of_data: form.sourceOfData.trim(),
        dga_unit: UNIT_VALUE_BY_FORM[form.unit],
        statecode: 0,
        statuscode: 1,
      } as unknown as Omit<Dga_aop_kpisBase, 'dga_aop_kpiid'>
      const result = await Dga_aop_kpisService.create(payload)
      if ((result as { success?: boolean }).success === false) {
        const error = (result as { error?: { message?: string } | string }).error
        throw new Error(typeof error === 'string' ? error : error?.message || 'Unable to create KPI.')
      }
      const created = getResultValue<Dga_aop_kpis>(result)
      navigate(created?.dga_aop_kpiid ? `${EXECUTION_PLAN_KPI_DETAIL_ROUTE}/${created.dga_aop_kpiid}` : EXECUTION_PLAN_KPI_DETAIL_ROUTE)
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to create KPI.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="create-activity create-execution-plan create-kpi">
      <header className="create-activity__hero create-kpi__hero">
        <div className="create-activity__hero-grid">
          <div className="create-activity__hero-left">
            <nav aria-label="Breadcrumb" className="create-activity__breadcrumb">
              <Link to={APP_ROUTE_PATHS.dashboard}>Dashboard</Link>
              <span>/</span>
              <span>Execution Plan</span>
              <span>/</span>
              <span>Create KPI</span>
            </nav>
            <div className="create-activity__hero-body">
              <div className="create-activity__hero-icon" aria-hidden="true">
                <Gauge size={24} />
              </div>
              <div className="create-activity__hero-content">
                <h1>Create KPI</h1>
                <p>Define KPI ownership, measurement rules, baselines, historical values, and future targets.</p>
              </div>
            </div>
            <div className="create-activity__hero-chips">
              <span className="create-activity__chip">
                <span className="create-activity__chip-label">Status</span>
                <Badge>Draft</Badge>
              </span>
              <span className="create-activity__chip">
                <span className="create-activity__chip-label">Phase</span>
                <Badge tone="info">Execution Plan</Badge>
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
              <Button disabled={isSaving} icon={<Save size={16} />} onClick={handleCreateKpi}>
                {isSaving ? 'Creating...' : 'Create KPI'}
              </Button>
            </div>
            {submitError ? <p className="create-activity__submit-error">{submitError}{Object.keys(errors).length > 0 ? ` (${Object.keys(errors).length} required fields missing)` : ''}</p> : null}
          </div>
        </div>
      </header>

      <div className="create-activity__manual-layout create-kpi__layout">
        <div className="create-activity__manual-form">
          <div className="create-activity__card-grid">
            <div className="create-activity__card-column create-activity__card-column--left">
              <Card className="create-activity__section create-activity__section--grid-card">
                <div className="create-activity__section-header">
                  <div className="create-activity__section-header-inner">
                    <span className="create-activity__section-header-icon" aria-hidden="true">
                      <ClipboardList size={17} />
                    </span>
                    <div>
                      <h2>KPI Information</h2>
                      <p>Capture the KPI name, directorate, and description.</p>
                    </div>
                  </div>
                </div>
                <div className="create-activity__form-stack">
                  <div className="create-activity__form-row create-activity__form-row--two">
                    <Input label="KPI Name" onChange={(event) => updateForm({ kpiName: event.target.value })} required value={form.kpiName} />
                    <Input dir="rtl" label="اسم مؤشر" onChange={(event) => updateForm({ arabicKpiName: event.target.value })} required value={form.arabicKpiName} />
                  </div>
                  <RadioGroup label="Directorate" name="kpi-directorate" onChange={(value) => updateForm({ directorate: value })} options={DIRECTORATE_OPTIONS} required value={form.directorate} />
                  <div className="create-activity__form-row create-activity__form-row--two">
                    <Textarea label="KPI Description" onChange={(event) => updateForm({ kpiDescription: event.target.value })} required rows={4} value={form.kpiDescription} />
                    <Textarea dir="rtl" label="وصف مؤشر الأداء الرئيسي" onChange={(event) => updateForm({ arabicKpiDescription: event.target.value })} required rows={4} value={form.arabicKpiDescription} />
                  </div>
                  <div className="create-activity__form-row create-activity__form-row--two">
                    <Textarea label="Calculation Method" onChange={(event) => updateForm({ calculationMethod: event.target.value })} required rows={4} value={form.calculationMethod} />
                    <Textarea dir="rtl" label="طريقة الحساب" onChange={(event) => updateForm({ arabicCalculationMethod: event.target.value })} required rows={4} value={form.arabicCalculationMethod} />
                  </div>
                </div>
              </Card>

              <Card className="create-activity__section create-activity__section--grid-card">
                <div className="create-activity__section-header">
                  <div className="create-activity__section-header-inner">
                    <span className="create-activity__section-header-icon" aria-hidden="true">
                      <Link2 size={17} />
                    </span>
                    <div>
                      <h2>Measurement Context</h2>
                      <p>Connect the KPI to source data, activity impact, and strategic alignment.</p>
                    </div>
                  </div>
                </div>
                <div className="create-activity__form-stack">
                  <div className="create-activity__form-row create-activity__form-row--two">
                    <Textarea label="Source of Data" onChange={(event) => updateForm({ sourceOfData: event.target.value })} required rows={4} value={form.sourceOfData} />
                    <Textarea label="Expected Impact" onChange={(event) => updateForm({ expectedImpact: event.target.value })} required rows={4} value={form.expectedImpact} />
                  </div>
                  <Select id="kpi-strategic-activity" label="Link to Strategic Activity" onChange={(value) => updateForm({ strategicActivity: value })} options={STRATEGIC_ACTIVITY_OPTIONS} value={form.strategicActivity} />
                  <RadioGroup label="Polarity" name="kpi-polarity" onChange={(value) => updateForm({ polarity: value })} options={POLARITY_OPTIONS} required value={form.polarity} />
                  <div className="create-activity__form-row create-activity__form-row--two">
                    <Select id="kpi-type" label="KPI Type" onChange={(value) => updateForm({ kpiType: value })} options={KPI_TYPE_OPTIONS} required value={form.kpiType} />
                    <Select id="kpi-unit" label="Unit" onChange={(value) => updateForm({ unit: value })} options={UNIT_OPTIONS} required value={form.unit} />
                  </div>
                </div>
              </Card>
            </div>

            <div className="create-activity__card-column create-activity__card-column--right">
              <Card className="create-activity__section create-activity__section--grid-card">
                <div className="create-activity__section-header">
                  <div className="create-activity__section-header-inner">
                    <span className="create-activity__section-header-icon" aria-hidden="true">
                      <BarChart3 size={17} />
                    </span>
                    <div>
                      <h2>Baseline & Benchmark</h2>
                      <p>Define baseline dates, benchmark values, and measurement frequency.</p>
                    </div>
                  </div>
                </div>
                <div className="create-activity__form-stack">
                  <div className="create-activity__form-row create-activity__form-row--two">
                    <RadioGroup label="KPI Benchmarkable" name="kpi-benchmarkable" onChange={(value) => updateForm({ benchmarkable: value })} options={BENCHMARKABLE_OPTIONS} required value={form.benchmarkable} />
                    <RadioGroup label="Periodic Measurement" name="kpi-periodic-measurement" onChange={(value) => updateForm({ periodicMeasurement: value })} options={MEASUREMENT_OPTIONS} required value={form.periodicMeasurement} />
                  </div>
                  <div className="create-activity__form-row create-activity__form-row--two">
                    <DatePicker id="kpi-baseline-start-date" label="Baseline Start Date" onChange={(value) => updateForm({ baselineStartDate: value })} required value={form.baselineStartDate} />
                    <DatePicker id="kpi-baseline-end-date" label="Baseline End Date" min={form.baselineStartDate} onChange={(value) => updateForm({ baselineEndDate: value })} required value={form.baselineEndDate} />
                  </div>
                  <div className="create-activity__form-row create-activity__form-row--two">
                    <Input label="KPI Benchmarkable" onChange={(event) => updateForm({ kpiBenchmarkableValue: event.target.value })} required value={form.kpiBenchmarkableValue} />
                    <Input label="Benchmark (If Applicable)" onChange={(event) => updateForm({ benchmark: event.target.value })} value={form.benchmark} />
                  </div>
                  <div className="create-activity__form-row create-activity__form-row--two">
                    <CurrencyInput label="Estimated Baseline Available" onChange={(event) => updateForm({ estimatedBaselineAvailable: event.target.value })} required value={form.estimatedBaselineAvailable} />
                    <Textarea label="Baseline Methodology" onChange={(event) => updateForm({ baselineMethodology: event.target.value })} required rows={4} value={form.baselineMethodology} />
                  </div>
                </div>
              </Card>

              <Card className="create-activity__section create-activity__section--grid-card create-kpi__history-card">
                <div className="create-activity__section-header">
                  <div className="create-activity__section-header-inner">
                    <span className="create-activity__section-header-icon" aria-hidden="true">
                      <BarChart3 size={17} />
                    </span>
                    <div>
                      <h2>Historical Data</h2>
                      <p>Record actual historical values used for KPI context.</p>
                    </div>
                  </div>
                </div>
                <div className="create-activity__form-stack create-kpi__section-body">
                  <div className="create-activity__form-row create-activity__form-row--three create-kpi__history-grid">
                    <CurrencyInput label="2028" onChange={(event) => updateForm({ historical2028: event.target.value })} required value={form.historical2028} />
                    <CurrencyInput label="2029" onChange={(event) => updateForm({ historical2029: event.target.value })} required value={form.historical2029} />
                    <CurrencyInput label="2030" onChange={(event) => updateForm({ historical2030: event.target.value })} required value={form.historical2030} />
                  </div>
                </div>
              </Card>

              <Card className="create-activity__section create-activity__section--grid-card create-kpi__targets-card">
                <div className="create-activity__section-header">
                  <div className="create-activity__section-header-inner">
                    <span className="create-activity__section-header-icon" aria-hidden="true">
                      <Target size={17} />
                    </span>
                    <div>
                      <h2>Targets</h2>
                      <p>Set quarterly KPI targets for upcoming years.</p>
                    </div>
                  </div>
                </div>
                <div className="create-activity__form-stack create-kpi__section-body">
                  <div className="create-kpi__target-grid">
                    {Object.entries(form.targets).map(([year, target]) => (
                      <div className="create-kpi__target-year" key={year}>
                        <h3>{year} Targets</h3>
                        <CurrencyInput label="Quarter 1" onChange={(event) => updateTarget(year, 'q1', event.target.value)} placeholder="Enter value" required value={target.q1} />
                        <CurrencyInput label="Quarter 2" onChange={(event) => updateTarget(year, 'q2', event.target.value)} placeholder="Enter value" required value={target.q2} />
                        <CurrencyInput label="Quarter 3" onChange={(event) => updateTarget(year, 'q3', event.target.value)} placeholder="Enter value" required value={target.q3} />
                        <CurrencyInput label="Quarter 4" onChange={(event) => updateTarget(year, 'q4', event.target.value)} placeholder="Enter value" required value={target.q4} />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
