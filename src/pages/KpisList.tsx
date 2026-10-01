import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronLeft, ChevronRight, Eye, Filter, LayoutList, Pencil, Plus, Rows, Sparkles, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, EmptyState, SearchInput } from '../components/ui'
import type { Dga_aop_kpis } from '../generated/models/Dga_aop_kpisModel'
import { Dga_aop_kpisService } from '../generated/services/Dga_aop_kpisService'
import { APP_ROUTE_PATHS, EXECUTION_PLAN_KPI_DETAIL_ROUTE, EXECUTION_PLAN_KPI_DRAFT_STORAGE_KEY } from '../routes/appRoutes'
import '../styles/activities-list.css'

type KpiRow = {
  id: string
  kpiName: string
  strategicActivity: string
  kpiDescription: string
  kpiType: string
  periodicMeasurement: string
  unit: string
  polarity: string
  kpiAvailability: string
  kpiPhase: string
  approvalStatus: string
  pendingWith: string
  division: string
}

type KpiSortKey = keyof Omit<KpiRow, 'id'>
type KpiColumnFilter = { operator: 'contains' | 'equals', value: string }

const KPI_TYPE_OPTIONS = ['Special Reports', 'Aspirations', 'Foundational Strategies', 'Annual Plan', 'Special Strategies', 'Common']
const DIVISION_OPTIONS = ['Advanced Automation & Integration']
const PAGE_SIZE = 10
const LAZY_BATCH_SIZE = 10

function getResultValue<T>(result: unknown): T | undefined {
  const shaped = result as { data?: T; value?: T; result?: T; record?: T }
  return shaped.data ?? shaped.value ?? shaped.result ?? shaped.record
}

function assertOperationSuccess(result: unknown, fallbackMessage: string) {
  if ((result as { success?: boolean })?.success === false) {
    const error = (result as { error?: { message?: string } | string })?.error
    const message = typeof error === 'string' ? error : error?.message
    throw new Error(message || fallbackMessage)
  }
}

function optionLabel<T extends Record<number, string>>(options: T, value?: number | string | null) {
  if (value === undefined || value === null || value === '') return ''
  return options[Number(value) as keyof T] ?? ''
}

function kpiRecordToRow(record: Dga_aop_kpis): KpiRow | null {
  if (!record.dga_aop_kpiid) return null
  return {
    id: record.dga_aop_kpiid,
    kpiName: record.dga_kpi_name || 'Untitled KPI',
    strategicActivity: '-',
    kpiDescription: record.dga_kpi_description || '-',
    kpiType: optionLabel({ 1: 'Special Reports', 2: 'Aspirations', 3: 'Foundational Strategies', 4: 'Annual Plans', 5: 'Special Strategies', 6: 'Common' }, record.dga_kpi_type) || '-',
    periodicMeasurement: optionLabel({ 1: 'Quarterly', 2: 'Semi-Annually', 3: 'Annually' }, record.dga_periodic_measurement) || '-',
    unit: optionLabel({ 1: '#', 2: '%', 3: 'Rate', 4: 'AED' }, record.dga_unit) || '-',
    polarity: optionLabel({ 1: 'Ascending', 2: 'Descending', 3: 'Closer to Target' }, record.dga_polarity) || '-',
    kpiAvailability: optionLabel({ 1: 'New', 2: 'Currently Measured' }, record.dga_kpi_availability) || 'New',
    kpiPhase: optionLabel({ 0: 'Planning', 1: 'Execution' }, record.dga_kpi_phase) || 'Planning',
    approvalStatus: optionLabel({ 1: 'Active', 2: 'Inactive' }, record.statuscode) || 'Draft',
    pendingWith: 'Division Member - AAI',
    division: 'Advanced Automation & Integration',
  }
}

function toneFor(value: string): 'neutral' | 'info' | 'warning' | 'success' {
  if (value === 'Draft') return 'neutral'
  if (value === 'Planning') return 'warning'
  if (value === 'New') return 'warning'
  if (value === 'Ascending' || value === 'Quarterly') return 'info'
  return 'info'
}

function FilterMenu({
  label,
  onChange,
  options,
  values,
}: {
  label: string
  onChange: (values: string[]) => void
  options: string[]
  values: string[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const allSelected = values.length === 0 || values.length === options.length
  const displayValue = allSelected ? 'All categories' : `${values.length} selected`

  function toggleValue(option: string) {
    if (values.includes(option)) {
      onChange(values.filter((value) => value !== option))
      return
    }
    onChange([...values, option])
  }

  return (
    <div className="kpis-list__filter-menu" ref={menuRef}>
      <span className="kpis-list__filter-label">{label}</span>
      <button
        className={`activities-list__cat-trigger kpis-list__filter-trigger${isOpen ? ' activities-list__cat-trigger--active' : ''}`}
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        <span className="activities-list__cat-trigger-label">{label.toLowerCase()}</span>
        <span className="activities-list__cat-trigger-value">{displayValue}</span>
      </button>
      {isOpen ? (
        <div className="activities-list__cat-dropdown kpis-list__filter-dropdown">
          <label className="activities-list__cat-option">
            <input
              checked={allSelected}
              onChange={() => onChange(allSelected ? [] : [...options])}
              type="checkbox"
            />
            <span>Select All</span>
          </label>
          {options.map((option) => (
            <label
              className="activities-list__cat-option"
              key={option}
            >
              <input
                checked={allSelected || values.includes(option)}
                onChange={() => toggleValue(option)}
                type="checkbox"
              />
              <span>
              {option}
              </span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function KpisList() {
  const navigate = useNavigate()
  const [kpis, setKpis] = useState<KpiRow[]>([])
  const [isLoadingKpis, setIsLoadingKpis] = useState(true)
  const [kpisError, setKpisError] = useState('')
  const [deletedKpiIds, setDeletedKpiIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [divisionFilter, setDivisionFilter] = useState<string[]>([])
  const [kpiTypeFilter, setKpiTypeFilter] = useState<string[]>([])
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [viewMode] = useState<'pagination' | 'lazy'>('pagination')
  const [displayMode, setDisplayMode] = useState<'table' | 'card'>('table')
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  const [isPortfolioSummaryExpanded, setIsPortfolioSummaryExpanded] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [lazyCount, setLazyCount] = useState(LAZY_BATCH_SIZE)
  const [sortConfig, setSortConfig] = useState<{ key: KpiSortKey, direction: 'asc' | 'desc' } | null>(null)
  const [columnFilters, setColumnFilters] = useState<Partial<Record<KpiSortKey, KpiColumnFilter>>>({})
  const [openFilterColumn, setOpenFilterColumn] = useState<KpiSortKey | null>(null)
  const [filterPopoverPos, setFilterPopoverPos] = useState({ top: 0, left: 0 })
  const [filterOperator, setFilterOperator] = useState<'contains' | 'equals'>('contains')
  const [filterDraft, setFilterDraft] = useState('')
  const filterPopoverRef = useRef<HTMLDivElement>(null)
  const lazySentinelRef = useRef<HTMLDivElement>(null)
  const activeKpis = useMemo(() => kpis.filter((kpi) => !deletedKpiIds.includes(kpi.id)), [deletedKpiIds, kpis])

  const filteredKpis = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const filtered = activeKpis.filter((kpi) => {
      const matchesSearch = !query || [
        kpi.kpiName,
        kpi.strategicActivity,
        kpi.kpiDescription,
        kpi.kpiType,
        kpi.periodicMeasurement,
        kpi.polarity,
      ].some((value) => value.toLowerCase().includes(query))
      const matchesDivision = divisionFilter.length === 0 || divisionFilter.includes(kpi.division)
      const matchesType = kpiTypeFilter.length === 0 || kpiTypeFilter.includes(kpi.kpiType)
      const matchesPhase = phaseFilter === 'all' || kpi.kpiPhase.toLowerCase() === phaseFilter
      const matchesColumnFilters = Object.entries(columnFilters).every(([key, filter]) => {
        const value = filter?.value.trim().toLowerCase()
        if (!value) return true
        const fieldValue = String(kpi[key as KpiSortKey]).toLowerCase()
        return filter?.operator === 'equals' ? fieldValue === value : fieldValue.includes(value)
      })

      return matchesSearch && matchesDivision && matchesType && matchesPhase && matchesColumnFilters
    })

    if (!sortConfig) return filtered

    return [...filtered].sort((a, b) => {
      const result = a[sortConfig.key].localeCompare(b[sortConfig.key], undefined, { numeric: true })
      return sortConfig.direction === 'asc' ? result : -result
    })
  }, [activeKpis, columnFilters, divisionFilter, kpiTypeFilter, phaseFilter, searchQuery, sortConfig])

  const activeFilterCount = [
    searchQuery.trim(),
    divisionFilter.length > 0 ? String(divisionFilter.length) : '',
    kpiTypeFilter.length > 0 ? String(kpiTypeFilter.length) : '',
    phaseFilter !== 'all' ? phaseFilter : '',
    ...Object.values(columnFilters).map((filter) => filter?.value ?? ''),
  ].filter(Boolean).length

  const totalCount = filteredKpis.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const showPagination = viewMode === 'pagination' && totalCount > PAGE_SIZE
  const showLoadMore = viewMode === 'lazy' && lazyCount < totalCount
  const rangeStart = totalCount > 0 ? (viewMode === 'pagination' ? (currentPage - 1) * PAGE_SIZE + 1 : 1) : 0
  const rangeEnd = viewMode === 'pagination' ? Math.min(currentPage * PAGE_SIZE, totalCount) : Math.min(lazyCount, totalCount)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const visibleKpis = viewMode === 'pagination'
    ? filteredKpis.slice(pageStart, pageStart + PAGE_SIZE)
    : filteredKpis.slice(0, lazyCount)

  useEffect(() => {
    let isMounted = true

    async function loadKpis() {
      setIsLoadingKpis(true)
      setKpisError('')
      try {
        const result = await Dga_aop_kpisService.getAll({
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
        })
        assertOperationSuccess(result, 'Unable to load KPIs.')
        const rows = (getResultValue<Dga_aop_kpis[]>(result) ?? [])
          .map(kpiRecordToRow)
          .filter((row): row is KpiRow => Boolean(row))
        if (isMounted) setKpis(rows)
      } catch (error) {
        if (isMounted) setKpisError(error instanceof Error ? error.message : 'Unable to load KPIs.')
      } finally {
        if (isMounted) setIsLoadingKpis(false)
      }
    }

    void loadKpis()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1)
      setLazyCount(LAZY_BATCH_SIZE)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [columnFilters, divisionFilter, kpiTypeFilter, searchQuery])

  useEffect(() => {
    if (viewMode !== 'lazy') return undefined
    const sentinel = lazySentinelRef.current
    if (!sentinel) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return
        setLazyCount((current) => Math.min(totalCount, current + LAZY_BATCH_SIZE))
      },
      { rootMargin: '100px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [totalCount, viewMode])

  function handleSort(key: KpiSortKey) {
    setSortConfig((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  function renderSortIcon(key: KpiSortKey) {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUp className="edit-activity__deps-sort-icon edit-activity__deps-sort-icon--inactive" size={12} />
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="edit-activity__deps-sort-icon edit-activity__deps-sort-icon--active" size={12} />
      : <ArrowDown className="edit-activity__deps-sort-icon edit-activity__deps-sort-icon--active" size={12} />
  }

  function resetFilters() {
    setSearchQuery('')
    setDivisionFilter([])
    setKpiTypeFilter([])
    setPhaseFilter('all')
    setColumnFilters({})
    setOpenFilterColumn(null)
    setFilterOperator('contains')
    setFilterDraft('')
    setSortConfig(null)
  }

  function handleOpenColumnFilter(key: KpiSortKey, event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (openFilterColumn === key) {
      setOpenFilterColumn(null)
      return
    }

    const anchor = event.currentTarget.closest('[data-filter-anchor]') as HTMLElement | null
    const rect = anchor?.getBoundingClientRect() ?? event.currentTarget.getBoundingClientRect()
    setFilterPopoverPos({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
    })
    setFilterOperator(columnFilters[key]?.operator ?? 'contains')
    setFilterDraft(columnFilters[key]?.value ?? '')
    setOpenFilterColumn(key)
  }

  function applyColumnFilter() {
    if (!openFilterColumn) return

    setColumnFilters((current) => {
      const next = { ...current }
      if (filterDraft.trim()) {
        next[openFilterColumn] = { operator: filterOperator, value: filterDraft.trim() }
      } else {
        delete next[openFilterColumn]
      }
      return next
    })
    setOpenFilterColumn(null)
  }

  function clearColumnFilter(key: KpiSortKey) {
    setColumnFilters((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setOpenFilterColumn(null)
    setFilterDraft('')
    setFilterOperator('contains')
  }

  function openKpi(kpi: KpiRow) {
    navigate(`${EXECUTION_PLAN_KPI_DETAIL_ROUTE}/${kpi.id}`)
  }

  function editKpi(kpi: KpiRow) {
    window.sessionStorage.setItem(EXECUTION_PLAN_KPI_DRAFT_STORAGE_KEY, JSON.stringify({
      kpiName: kpi.kpiName,
      strategicActivity: kpi.strategicActivity,
      kpiDescription: kpi.kpiDescription,
      kpiType: kpi.kpiType.toLowerCase().replace(/\s+/g, '-'),
      periodicMeasurement: kpi.periodicMeasurement.toLowerCase().replace(/\s+/g, '-'),
      unit: kpi.unit === '%' ? 'percent' : kpi.unit.toLowerCase(),
      polarity: kpi.polarity.toLowerCase().replace(/\s+/g, '-'),
      divisionName: kpi.division,
    }))
    navigate(`${EXECUTION_PLAN_KPI_DETAIL_ROUTE}/${kpi.id}`, { state: { editKpi: true } })
  }

  async function deleteKpi(kpi: KpiRow) {
    try {
      await Dga_aop_kpisService.delete(kpi.id)
      setDeletedKpiIds((current) => [...current, kpi.id])
    } catch (error) {
      setKpisError(error instanceof Error ? error.message : 'Unable to delete KPI.')
    }
  }

  const columns: Array<{ key: KpiSortKey, label: string }> = [
    { key: 'kpiName', label: 'KPI Name' },
    { key: 'strategicActivity', label: 'Strategic Activity / Others' },
    { key: 'kpiDescription', label: 'KPI Description' },
    { key: 'kpiType', label: 'KPI Type' },
    { key: 'periodicMeasurement', label: 'Periodic Measurement' },
    { key: 'unit', label: 'Unit' },
    { key: 'polarity', label: 'Polarity' },
    { key: 'kpiAvailability', label: 'KPI Availability' },
    { key: 'kpiPhase', label: 'KPI Phase' },
    { key: 'approvalStatus', label: 'Approval Status' },
    { key: 'pendingWith', label: 'Pending With' },
  ]

  return (
    <div className="activities-list kpis-list">
      <div className="activities-list__header">
        <div className="activities-list__header-text">
          <h1>
            My KPI
            <span className="activities-list__count-badge">{totalCount} KPI{totalCount === 1 ? '' : 's'}</span>
          </h1>
          <p>Manage KPI definitions, measurement frequency, approval status, and ownership in one place.</p>
        </div>
        <div className="activities-list__header-actions">
          <Button icon={<Plus size={15} />} onClick={() => navigate(APP_ROUTE_PATHS.createKpi)}>
            Create KPI
          </Button>
        </div>
      </div>

      <div className="activities-list__project-tabs kpis-list__project-tabs">
        <div className="kpis-list__status-tabs" aria-label="KPI status filters">
          {[
            ['all', 'All'],
            ['planning', 'Planning'],
            ['execution', 'Execution'],
            ['monitoring', 'Monitoring'],
            ['completed', 'Completed'],
            ['cancelled', 'Cancelled'],
          ].map(([value, label]) => (
            <button
              className={`kpis-list__status-tab${phaseFilter === value ? ' kpis-list__status-tab--active' : ''}`}
              key={value}
              onClick={() => setPhaseFilter(value)}
              type="button"
            >
              {label}
              <strong>{value === 'all' ? activeKpis.length : activeKpis.filter((kpi) => kpi.kpiPhase.toLowerCase() === value).length}</strong>
            </button>
          ))}
        </div>
      </div>

      <section
        className={`activities-list__portfolio-summary${isPortfolioSummaryExpanded ? ' activities-list__portfolio-summary--expanded' : ''}`}
        aria-label="AI Portfolio Summary"
      >
        <button
          aria-expanded={isPortfolioSummaryExpanded}
          className="activities-list__portfolio-head"
          onClick={() => setIsPortfolioSummaryExpanded((current) => !current)}
          type="button"
        >
          <span className="activities-list__portfolio-icon" aria-hidden="true">
            <Sparkles size={22} />
          </span>
          <div>
            <h2>AI Portfolio Summary <span>Action Required</span></h2>
            <p>
              You currently have {totalCount} KPIs in this execution cycle. Focus first on KPI records with
              missing measurement details, unclear ownership, or pending approval so they are ready for reviewer action.
            </p>
          </div>
          <div className="activities-list__portfolio-meta">
            <strong>{totalCount} KPIs</strong>
            <span>{Math.min(totalCount, 2)} flagged</span>
            <ChevronDown size={15} className="activities-list__portfolio-chevron" />
          </div>
        </button>

        {isPortfolioSummaryExpanded ? (
          <div className="activities-list__portfolio-body">
            <div className="activities-list__portfolio-tabs" role="tablist" aria-label="KPI AI summary views">
              <button className="activities-list__portfolio-tab activities-list__portfolio-tab--active" type="button">AI Review Flag ({Math.min(totalCount, 4)})</button>
              <button className="activities-list__portfolio-tab" type="button">Recommended Action</button>
              <button className="activities-list__portfolio-tab" type="button">Execution Readiness</button>
            </div>
            <div className="activities-list__portfolio-risks">
              <article className="activities-list__portfolio-risk-card">
                <span className="activities-list__portfolio-card-icon" aria-hidden="true"><Sparkles size={16} /></span>
                <div>
                  <div className="activities-list__portfolio-card-title">
                    <strong>KPI Definition Risk:</strong>
                    <span>{Math.min(totalCount, 3)} KPIs</span>
                  </div>
                  <p>Review KPI name, description, unit, polarity, and measurement frequency before submission.</p>
                  <small>Related KPIs</small>
                  <div className="activities-list__portfolio-chips">
                    {visibleKpis.slice(0, 3).map((kpi) => <span key={kpi.id}>{kpi.kpiName}</span>)}
                  </div>
                </div>
              </article>
              <article className="activities-list__portfolio-risk-card">
                <span className="activities-list__portfolio-card-icon" aria-hidden="true"><Filter size={16} /></span>
                <div>
                  <div className="activities-list__portfolio-card-title">
                    <strong>Approval Readiness:</strong>
                    <span>{activeKpis.filter((kpi) => kpi.approvalStatus === 'Draft').length} draft</span>
                  </div>
                  <p>Prioritize draft KPI records and ensure pending-with ownership is clear before routing.</p>
                  <small>Related KPIs</small>
                  <div className="activities-list__portfolio-chips">
                    {visibleKpis.slice(0, 3).map((kpi) => <span key={`approval-${kpi.id}`}>{kpi.kpiName}</span>)}
                  </div>
                </div>
              </article>
            </div>
          </div>
        ) : null}
      </section>

      <section className="activities-list__control-panel" aria-label="KPI filters">
        <div className="activities-list__control-header">
          <button
            aria-expanded={!filtersCollapsed}
            className="kpis-list__filter-collapse"
            onClick={() => setFiltersCollapsed((current) => !current)}
            type="button"
          >
            <span className="activities-list__control-icon" aria-hidden="true">
              <Filter size={15} />
            </span>
            <div>
              <span>Filters</span>
              <strong>{activeFilterCount > 0 ? `${activeFilterCount} active` : 'All KPIs'}</strong>
            </div>
            <ChevronDown aria-hidden="true" className="kpis-list__filter-chevron" size={15} />
          </button>
          {activeFilterCount > 0 ? (
            <button className="activities-list__reset-btn" onClick={resetFilters} type="button">
              <X size={14} />
              Clear All
            </button>
          ) : null}
        </div>

        <div className={`activities-list__filters-row kpis-list__filters-row${filtersCollapsed ? ' kpis-list__filters-row--collapsed' : ''}`}>
          <div className="kpis-list__search-field">
            <span className="kpis-list__filter-label">Search</span>
            <SearchInput
              label="Search"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search KPI name, activity, or keywords..."
              value={searchQuery}
            />
          </div>
          <FilterMenu label="Division" onChange={setDivisionFilter} options={DIVISION_OPTIONS} values={divisionFilter} />
          <FilterMenu label="KPI Type" onChange={setKpiTypeFilter} options={KPI_TYPE_OPTIONS} values={kpiTypeFilter} />
          <div className="activities-list__view-toggle kpis-list__display-toggle" role="group" aria-label="KPI display mode">
            <button
              className={`activities-list__view-btn${displayMode === 'table' ? ' activities-list__view-btn--active' : ''}`}
              onClick={() => setDisplayMode('table')}
              title="Table view"
              type="button"
            >
              <LayoutList size={15} />
            </button>
            <button
              className={`activities-list__view-btn${displayMode === 'card' ? ' activities-list__view-btn--active' : ''}`}
              onClick={() => setDisplayMode('card')}
              title="Card view"
              type="button"
            >
              <Rows size={15} />
            </button>
          </div>
        </div>
      </section>

      <div className="data-grid kpis-data-grid" aria-label="KPIs grid">
        <table>
          <thead>
            <tr>
              <th className="kpis-data-grid__select-col"><span className="kpis-data-grid__checkbox" aria-hidden="true" /></th>
              {columns.map((column) => (
                <th data-filter-anchor key={column.key}>
                  <div className="activities-list__header-content">
                    <button className="activities-list__sort-btn" onClick={() => handleSort(column.key)} type="button">
                      <span>{column.label}</span>
                      {renderSortIcon(column.key)}
                    </button>
                    <button
                      aria-label={`Filter by ${column.label}`}
                      className={`activities-list__header-filter-btn${columnFilters[column.key] ? ' activities-list__header-filter-btn--active' : ''}${openFilterColumn === column.key ? ' activities-list__header-filter-btn--open' : ''}`}
                      onClick={(event) => handleOpenColumnFilter(column.key, event)}
                      type="button"
                    >
                      <Filter size={11} />
                    </button>
                  </div>
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingKpis ? (
              <tr>
                <td colSpan={columns.length + 2}>
                  <EmptyState description="Fetching KPI records from Dataverse." title="Loading KPIs..." />
                </td>
              </tr>
            ) : kpisError ? (
              <tr>
                <td colSpan={columns.length + 2}>
                  <EmptyState description={kpisError} title="Unable to load KPIs" />
                </td>
              </tr>
            ) : visibleKpis.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 2}>
                  <EmptyState description="Try changing search or filter values." title="No KPIs found" />
                </td>
              </tr>
            ) : (
              visibleKpis.map((kpi) => (
                <tr key={kpi.id} onClick={() => openKpi(kpi)}>
                  <td className="kpis-data-grid__select-col"><span className="kpis-data-grid__checkbox" aria-hidden="true" /></td>
                  <td><button className="activities-list__name-link" type="button">{kpi.kpiName}</button></td>
                  <td><button className="activities-list__name-link" type="button">{kpi.strategicActivity}</button></td>
                  <td>{kpi.kpiDescription}</td>
                  <td>{kpi.kpiType}</td>
                  <td><Badge tone={toneFor(kpi.periodicMeasurement)}>{kpi.periodicMeasurement}</Badge></td>
                  <td>{kpi.unit}</td>
                  <td><Badge tone={toneFor(kpi.polarity)}>{kpi.polarity}</Badge></td>
                  <td><Badge tone={toneFor(kpi.kpiAvailability)}>{kpi.kpiAvailability}</Badge></td>
                  <td><Badge tone={toneFor(kpi.kpiPhase)}>{kpi.kpiPhase}</Badge></td>
                  <td><Badge tone={toneFor(kpi.approvalStatus)}>{kpi.approvalStatus}</Badge></td>
                  <td>{kpi.pendingWith}</td>
                  <td>
                    <div className="kpis-grid__actions kpis-grid__actions--buttons">
                      <button aria-label={`Edit ${kpi.kpiName}`} className="kpis-grid__action-btn" onClick={(event) => { event.stopPropagation(); editKpi(kpi) }} type="button">
                        <Pencil size={14} />
                      </button>
                      <button aria-label={`Delete ${kpi.kpiName}`} className="kpis-grid__action-btn kpis-grid__action-btn--danger" onClick={(event) => { event.stopPropagation(); deleteKpi(kpi) }} type="button">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {openFilterColumn ? (
          <div className="activities-list__col-filter-popover kpis-list__col-filter-popover" ref={filterPopoverRef} style={{ left: filterPopoverPos.left, top: filterPopoverPos.top }}>
            <strong>{columns.find((column) => column.key === openFilterColumn)?.label}</strong>
            <select className="kpis-list__operator-select" onChange={(event) => setFilterOperator(event.target.value as 'contains' | 'equals')} value={filterOperator}>
              <option value="contains">Contains</option>
              <option value="equals">Equals</option>
            </select>
            <input onChange={(event) => setFilterDraft(event.target.value)} placeholder="Filter value..." type="text" value={filterDraft} />
            <div className="activities-list__filter-actions">
              <button className="activities-list__filter-cancel" onClick={() => clearColumnFilter(openFilterColumn)} type="button">Clear</button>
              <button className="activities-list__filter-cancel" onClick={() => setOpenFilterColumn(null)} type="button">Cancel</button>
              <button className="activities-list__filter-apply" onClick={applyColumnFilter} type="button">Apply</button>
            </div>
          </div>
        ) : null}
      </div>

      <section className={`activities-grid kpis-grid${displayMode === 'card' ? ' activities-grid--hidden' : ''}`} aria-label="KPIs grid">
          <div className="kpis-grid__head">
            {columns.map((column) => (
              <div className="activities-list__header-content" data-filter-anchor key={column.key}>
                <button className="activities-list__sort-btn" onClick={() => handleSort(column.key)} type="button">
                  <span>{column.label}</span>
                  {renderSortIcon(column.key)}
                </button>
                <button
                  aria-label={`Filter by ${column.label}`}
                  className={`activities-list__header-filter-btn${columnFilters[column.key] ? ' activities-list__header-filter-btn--active' : ''}${openFilterColumn === column.key ? ' activities-list__header-filter-btn--open' : ''}`}
                  onClick={(event) => handleOpenColumnFilter(column.key, event)}
                  type="button"
                >
                  <Filter size={11} />
                </button>
              </div>
            ))}
            <span>Actions</span>
          </div>
          {openFilterColumn ? (
            <div
              className="activities-list__col-filter-popover kpis-list__col-filter-popover"
              ref={filterPopoverRef}
              style={{ left: filterPopoverPos.left, top: filterPopoverPos.top }}
            >
              <strong>{columns.find((column) => column.key === openFilterColumn)?.label}</strong>
              <select
                className="kpis-list__operator-select"
                onChange={(event) => setFilterOperator(event.target.value as 'contains' | 'equals')}
                value={filterOperator}
              >
                <option value="contains">Contains</option>
                <option value="equals">Equals</option>
              </select>
              <input
                onChange={(event) => setFilterDraft(event.target.value)}
                placeholder="Filter value..."
                type="text"
                value={filterDraft}
              />
              <div className="activities-list__filter-actions">
                <button className="activities-list__filter-cancel" onClick={() => clearColumnFilter(openFilterColumn)} type="button">
                  Clear
                </button>
                <button className="activities-list__filter-cancel" onClick={() => setOpenFilterColumn(null)} type="button">
                  Cancel
                </button>
                <button className="activities-list__filter-apply" onClick={applyColumnFilter} type="button">
                  Apply
                </button>
              </div>
            </div>
          ) : null}
          <div className="activities-grid__body">
            {visibleKpis.length === 0 ? (
              <div className="activities-grid__empty">
                <EmptyState description={isLoadingKpis ? 'Fetching KPI records from Dataverse.' : kpisError || 'Try changing search or filter values.'} title={isLoadingKpis ? 'Loading KPIs...' : kpisError ? 'Unable to load KPIs' : 'No KPIs found'} />
              </div>
            ) : (
              visibleKpis.map((kpi) => (
                <div
                  className="kpis-grid__row"
                  key={kpi.id}
                  onClick={() => openKpi(kpi)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openKpi(kpi)
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <span className="activities-grid__name"><strong>{kpi.kpiName}</strong></span>
                  <span>{kpi.strategicActivity}</span>
                  <span>{kpi.kpiDescription}</span>
                  <span>{kpi.kpiType}</span>
                  <span><Badge tone={toneFor(kpi.periodicMeasurement)}>{kpi.periodicMeasurement}</Badge></span>
                  <span>{kpi.unit}</span>
                  <span><Badge tone={toneFor(kpi.polarity)}>{kpi.polarity}</Badge></span>
                  <span><Badge tone={toneFor(kpi.kpiAvailability)}>{kpi.kpiAvailability}</Badge></span>
                  <span><Badge tone={toneFor(kpi.kpiPhase)}>{kpi.kpiPhase}</Badge></span>
                  <span><Badge tone={toneFor(kpi.approvalStatus)}>{kpi.approvalStatus}</Badge></span>
                  <span>{kpi.pendingWith}</span>
                  <span className="kpis-grid__actions kpis-grid__actions--buttons">
                    <button
                      aria-label={`Edit ${kpi.kpiName}`}
                      className="kpis-grid__action-btn"
                      onClick={(event) => {
                        event.stopPropagation()
                        editKpi(kpi)
                      }}
                      type="button"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      aria-label={`Delete ${kpi.kpiName}`}
                      className="kpis-grid__action-btn kpis-grid__action-btn--danger"
                      onClick={(event) => {
                        event.stopPropagation()
                        deleteKpi(kpi)
                      }}
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </span>
                  <span className="kpis-grid__actions">⋮</span>
                </div>
              ))
            )}
          </div>
      </section>
      {displayMode === 'card' ? (
        <section className="kpis-card-grid" aria-label="KPI card view">
          {visibleKpis.length === 0 ? (
            <div className="activities-card-grid__empty">
              <EmptyState description={isLoadingKpis ? 'Fetching KPI records from Dataverse.' : kpisError || 'Try changing search or filter values.'} title={isLoadingKpis ? 'Loading KPIs...' : kpisError ? 'Unable to load KPIs' : 'No KPIs found'} />
            </div>
          ) : (
            visibleKpis.map((kpi) => (
              <article className="kpis-card" key={`kpi-card-${kpi.id}`} onClick={() => openKpi(kpi)}>
                <div className="activities-card__topline">
                  <span>{kpi.id ? `KPI-${kpi.id.slice(0, 4).toUpperCase()}` : 'KPI'}</span>
                  <Badge tone={toneFor(kpi.approvalStatus)}>{kpi.approvalStatus}</Badge>
                </div>
                <h3>{kpi.kpiName}</h3>
                <span className={`activities-card__phase activities-card__phase--${kpi.kpiPhase.toLowerCase() === 'execution' ? 'execution' : 'planning'}`}>
                  {kpi.kpiPhase}
                </span>
                <p>{kpi.kpiDescription}</p>
                <div className="activities-card__strategy">
                  <span>KPI Type</span>
                  <strong>{kpi.kpiType}</strong>
                  <small>{kpi.strategicActivity}</small>
                </div>
                <div className="activities-card__metrics">
                  <div>
                    <span>Measurement</span>
                    <strong>{kpi.periodicMeasurement}</strong>
                  </div>
                  <div>
                    <span>Pending With</span>
                    <strong>{kpi.pendingWith}</strong>
                  </div>
                </div>
                <div className="activities-card__footer">
                  <span>{kpi.division}</span>
                  <button
                    className="activities-list__view-action"
                    onClick={(event) => {
                      event.stopPropagation()
                      openKpi(kpi)
                    }}
                    type="button"
                  >
                    <Eye size={14} />
                    View
                  </button>
                </div>
              </article>
            ))
          )}
        </section>
      ) : null}
      {totalCount > 0 ? (
        <div className="activities-list__pagination">
          <span className="activities-list__pagination-info">
            Showing <strong>{rangeStart}-{rangeEnd}</strong> of <strong>{totalCount}</strong> KPIs
          </span>
          {showPagination ? (
            <div className="activities-list__pagination-controls">
              <button
                aria-label="Previous page"
                className="activities-list__page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                type="button"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="activities-list__page-numbers">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    className={`activities-list__page-num${page === currentPage ? ' activities-list__page-num--active' : ''}`}
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
                className="activities-list__page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                type="button"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {viewMode === 'lazy' && showLoadMore ? (
        <div aria-hidden="true" className="activities-list__sentinel" ref={lazySentinelRef}>
          <span className="activities-list__sentinel-dot" />
          <span className="activities-list__sentinel-dot" />
          <span className="activities-list__sentinel-dot" />
        </div>
      ) : viewMode === 'lazy' && totalCount > 0 ? (
        <div aria-hidden="true" className="activities-list__sentinel--done">
          <Check size={13} />
          <span>All {totalCount} KPIs loaded</span>
        </div>
      ) : null}
    </div>
  )
}
