import { CalendarCheck, ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, Gauge, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import logoSource from '../../assets/Logo.ts?raw'
import { NAVIGATION_ITEMS } from '../../constants/app'
import { useNavigationGuard } from '../../contexts/useNavigationGuard'
import { isExecutionPlanActivityDetailRoute, isExecutionPlanKpiDetailRoute } from '../../routes/appRoutes'
import { canViewNavigationItem, getOverviewLabel } from '../../utils/permissions'
import { closeMobileSidebar, toggleSidebarCollapsed } from '../../store/appSlice'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { IconButton } from '../ui/IconButton'
import type { DivisionalHierarchyRef, UserRole } from '../../store/userSlice'

const logoBase64 = logoSource.match(/'([^']+)'/)?.[1] ?? ''
const EXECUTION_PLAN_ITEM_IDS = [
  'createExecutionPlanActivity',
  'executionPlanActivitiesList',
  'executionPlanFinancialSpending',
  'createKpi',
  'kpis',
]

function getRoleDisplayName(
  role: UserRole,
  hierarchies: DivisionalHierarchyRef[],
): string {
  const hierarchy = hierarchies.find((h) => h.roleId === role.roleId)
  return hierarchy ? `${role.roleName} - ${hierarchy.shortName}` : role.roleName
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('')
}

export function Sidebar() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const { confirmNavigation } = useNavigationGuard()
  const [isAopOpen, setIsAopOpen] = useState(true)
  const [isExecutionPlanOpen, setIsExecutionPlanOpen] = useState(false)
  const { isMobileSidebarOpen, isSidebarCollapsed, selectedRole } = useAppSelector((state) => state.app)
  const { currentRole, currentRolesDivisionalHierarchies } = useAppSelector((state) => state.user)
  const navigationItems = NAVIGATION_ITEMS
    .filter((item) => item.id !== 'editActivity')
    .filter((item) => canViewNavigationItem(selectedRole, item))
    .map((item) => (item.id === 'overview' ? { ...item, label: getOverviewLabel(selectedRole) } : item))
  const dashboardItem = navigationItems.find((item) => item.id === 'dashboard')
  const standaloneItems = navigationItems.filter((item) => ['procurementPlan', 'engagementPlan'].includes(item.id))
  const executionPlanItems = navigationItems.filter((item) => EXECUTION_PLAN_ITEM_IDS.includes(item.id))
  const aopItems = navigationItems
    .filter((item) => !['dashboard', 'procurementPlan', 'engagementPlan', ...EXECUTION_PLAN_ITEM_IDS].includes(item.id))
    .map((item) => ({
      ...item,
      label: item.id === 'createActivity'
        ? 'Create AOP Activity'
        : item.id === 'overview'
          ? 'AOP Division/Sector Overview'
          : item.id === 'activityLeads'
            ? 'AOP Activity Leads'
            : item.id === 'activitiesList'
              ? 'AOP Activities List'
              : item.id === 'financialSpending'
                ? 'AOP Financial Spending'
                : item.label.startsWith('AOP ')
                  ? item.label
                  : `AOP ${item.label}`,
    }))
  const isRouteActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`)
  const isExecutionPlanItemActive = (itemId: string, path: string) => {
    if (itemId === 'executionPlanActivitiesList' && isExecutionPlanActivityDetailRoute(location.pathname)) return true
    if (itemId === 'kpis' && isExecutionPlanKpiDetailRoute(location.pathname)) return true

    return isRouteActive(path)
  }
  const isAopActive = aopItems.some((item) => isRouteActive(item.path))
  const isExecutionPlanActive = location.pathname.startsWith('/execution-plan')
    || executionPlanItems.some((item) => isExecutionPlanItemActive(item.id, item.path))
  const displayName = currentRole
    ? getRoleDisplayName(currentRole, currentRolesDivisionalHierarchies)
    : 'No role assigned'

  function toggleAopGroup() {
    setIsAopOpen((current) => {
      const next = !current
      if (next) {
        setIsExecutionPlanOpen(false)
      }
      return next
    })
  }

  function toggleExecutionPlanGroup() {
    setIsExecutionPlanOpen((current) => {
      const next = !current
      if (next) {
        setIsAopOpen(false)
      }
      return next
    })
  }

  return (
    <>
      <div
        className={`layout-backdrop ${isMobileSidebarOpen ? 'layout-backdrop--visible' : ''}`}
        onClick={() => dispatch(closeMobileSidebar())}
      />
      <aside
        className={`sidebar ${isSidebarCollapsed ? 'sidebar--collapsed' : ''} ${
          isMobileSidebarOpen ? 'sidebar--mobile-open' : ''
        }`}
      >
        <div className="sidebar__brand">
          <div className="sidebar__brand-mark">
            <img alt="Digital Connect" src={`data:image/png;base64,${logoBase64}`} />
          </div>
          <div className="sidebar__brand-copy">
            <span>Digital Connect</span>
            <strong>Annual Operating Plan</strong>
          </div>
          <IconButton className="sidebar__mobile-close" label="Close navigation" onClick={() => dispatch(closeMobileSidebar())}>
            <X size={18} />
          </IconButton>
        </div>

        <nav aria-label="Primary navigation" className="sidebar__nav">
          {dashboardItem ? (() => {
            const Icon = dashboardItem.icon

            return (
              <NavLink
                aria-label={dashboardItem.label}
                className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                key={dashboardItem.id}
                onClick={(event) => {
                  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                    return
                  }

                  event.preventDefault()
                  if (dashboardItem.path === location.pathname) {
                    dispatch(closeMobileSidebar())
                    return
                  }

                  confirmNavigation(() => {
                    dispatch(closeMobileSidebar())
                    navigate(dashboardItem.path)
                  })
                }}
                to={dashboardItem.path}
                title={dashboardItem.label}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{dashboardItem.label}</span>
              </NavLink>
            )
          })() : null}

          {aopItems.length > 0 ? (
            <div className={`sidebar__group ${isAopOpen ? 'sidebar__group--open' : ''}`}>
              <button
                aria-expanded={isAopOpen && !isSidebarCollapsed}
                className={`sidebar__link sidebar__group-trigger ${isAopActive ? 'sidebar__group-trigger--active' : ''}`}
                onClick={toggleAopGroup}
                title="Annual Operating Plan"
                type="button"
              >
                <CalendarCheck aria-hidden="true" size={18} />
                <span>Annual Operating Plan</span>
                <span className="sidebar__group-chevron" aria-hidden="true">
                  {isAopOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </span>
              </button>

              <div className="sidebar__submenu">
                {aopItems.map((item) => {
                  const Icon = item.icon

                  return (
                    <NavLink
                      aria-label={item.label}
                      className={() => `sidebar__link ${isRouteActive(item.path) ? 'sidebar__link--active' : ''}`}
                      key={item.id}
                      onClick={(event) => {
                        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                          return
                        }

                        event.preventDefault()
                        if (item.path === location.pathname) {
                          dispatch(closeMobileSidebar())
                          return
                        }

                        confirmNavigation(() => {
                          dispatch(closeMobileSidebar())
                          navigate(item.path)
                        })
                      }}
                      to={item.path}
                      title={item.label}
                    >
                      <Icon aria-hidden="true" size={15} />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ) : null}

          {executionPlanItems.length > 0 ? (
            <div className={`sidebar__group ${isExecutionPlanOpen ? 'sidebar__group--open' : ''}`}>
              <button
                aria-expanded={isExecutionPlanOpen && !isSidebarCollapsed}
                className={`sidebar__link sidebar__group-trigger ${isExecutionPlanActive ? 'sidebar__group-trigger--active' : ''}`}
                onClick={toggleExecutionPlanGroup}
                title="Execution Plan"
                type="button"
              >
                <Gauge aria-hidden="true" size={18} />
                <span>Execution Plan</span>
                <span className="sidebar__group-chevron" aria-hidden="true">
                  {isExecutionPlanOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </span>
              </button>

              <div className="sidebar__submenu">
                {executionPlanItems.map((item) => {
                  const Icon = item.icon

                  return (
                    <NavLink
                      aria-label={item.label}
                      className={() => `sidebar__link ${isExecutionPlanItemActive(item.id, item.path) ? 'sidebar__link--active' : ''}`}
                      key={item.id}
                      onClick={(event) => {
                        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                          return
                        }

                        event.preventDefault()
                        if (item.path === location.pathname) {
                          dispatch(closeMobileSidebar())
                          return
                        }

                        confirmNavigation(() => {
                          dispatch(closeMobileSidebar())
                          navigate(item.path)
                        })
                      }}
                      to={item.path}
                      title={item.label}
                    >
                      <Icon aria-hidden="true" size={15} />
                      <span>{item.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ) : null}

          {standaloneItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                aria-label={item.label}
                className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                key={item.id}
                onClick={(event) => {
                  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                    return
                  }

                  event.preventDefault()
                  if (item.path === location.pathname) {
                    dispatch(closeMobileSidebar())
                    return
                  }

                  confirmNavigation(() => {
                    dispatch(closeMobileSidebar())
                    navigate(item.path)
                  })
                }}
                to={item.path}
                title={item.label}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__role-card" title={displayName}>
            <span className="sidebar__role-eyebrow">Current Role</span>
            <span className="sidebar__role-content">
              <span className="sidebar__role-initials">{getInitials(displayName)}</span>
              <span className="sidebar__role-copy">
                <strong>{displayName}</strong>
                <small>{currentRolesDivisionalHierarchies.find((h) => h.roleId === currentRole?.roleId)?.hierarchyName ?? 'Organization role'}</small>
              </span>
            </span>
          </div>
        </div>
        <IconButton
          className="sidebar__collapse"
          label={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          onClick={() => dispatch(toggleSidebarCollapsed())}
        >
          {isSidebarCollapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </IconButton>
      </aside>
    </>
  )
}
