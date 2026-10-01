import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { BarChart3, ClipboardList, Clock3, UserCheck, UserRound } from 'lucide-react'
import { Badge } from '../../../components/ui'
import { WorkflowActionsPanel } from './WorkflowActionsPanel'

type RailCardHeaderProps = {
  icon: LucideIcon
  title: string
}

type RailCardProps = {
  children: ReactNode
  className?: string
}

type ActivitySideRailProps = {
  children: ReactNode
  className?: string
  label?: string
}

type ActivityInfoRow = {
  label: string
  value: ReactNode
  className?: string
}

type ActivityWorkflowRailCardProps = {
  children: ReactNode
}

type ActivityProgressRailCardProps = {
  children: ReactNode
}

type ActivityInfoRailCardProps = {
  pendingWith: string
  phaseLabel: string
  phaseTone?: 'neutral' | 'info' | 'warning' | 'success'
  rows?: ActivityInfoRow[]
  statusLabel: string
  statusTone?: 'neutral' | 'info' | 'warning' | 'success'
}

type ActivityCreationDetailsRailCardProps = {
  createdBy: ReactNode
  createdOn: ReactNode
  modifiedOn: ReactNode
}

export function RailCardHeader({ icon: Icon, title }: RailCardHeaderProps) {
  return (
    <div className="edit-activity__rail-card-header">
      <Icon aria-hidden="true" size={16} />
      <h2>{title}</h2>
    </div>
  )
}

export function RailCard({ children, className = '' }: RailCardProps) {
  return (
    <section className={`edit-activity__rail-card${className ? ` ${className}` : ''}`}>
      {children}
    </section>
  )
}

export function ActivitySideRail({ children, className = '', label = 'Activity side panel' }: ActivitySideRailProps) {
  return (
    <aside aria-label={label} className={`edit-activity__right-rail${className ? ` ${className}` : ''}`}>
      {children}
    </aside>
  )
}

export function ActivityWorkflowRailCard({ children }: ActivityWorkflowRailCardProps) {
  return (
    <RailCard className="edit-activity__rail-card--actions">
      <RailCardHeader icon={ClipboardList} title="Workflow Actions" />
      <WorkflowActionsPanel>
        {children}
      </WorkflowActionsPanel>
    </RailCard>
  )
}

export function ActivityProgressRailCard({ children }: ActivityProgressRailCardProps) {
  return (
    <RailCard className="edit-activity__rail-card--progress">
      <RailCardHeader icon={BarChart3} title="Activity Progress" />
      {children}
    </RailCard>
  )
}

export function ActivityInfoRailCard({
  pendingWith,
  phaseLabel,
  phaseTone = 'info',
  rows = [],
  statusLabel,
  statusTone = 'neutral',
}: ActivityInfoRailCardProps) {
  return (
    <RailCard>
      <RailCardHeader icon={UserCheck} title="Activity Info" />
      <div className="edit-activity__activity-info-list">
        <div className="edit-activity__activity-info-row">
          <span>Status</span>
          <Badge tone={statusTone}>{statusLabel}</Badge>
        </div>
        <div className="edit-activity__activity-info-row">
          <span>Phase</span>
          <Badge tone={phaseTone}>{phaseLabel}</Badge>
        </div>
        {rows.map((row) => (
          <div className={row.className ? `edit-activity__activity-info-row ${row.className}` : 'edit-activity__activity-info-row'} key={row.label}>
            <span>{row.label}</span>
            {row.value}
          </div>
        ))}
        <div className="edit-activity__activity-info-row edit-activity__activity-info-row--pending">
          <span>Pending with</span>
          <strong>
            <UserRound size={14} />
            {pendingWith}
          </strong>
        </div>
      </div>
    </RailCard>
  )
}

export function ActivityCreationDetailsRailCard({
  createdBy,
  createdOn,
  modifiedOn,
}: ActivityCreationDetailsRailCardProps) {
  return (
    <RailCard>
      <RailCardHeader icon={Clock3} title="Activity Creation Details" />
      <dl className="edit-activity__creation-details">
        <div>
          <dt>Created By</dt>
          <dd>{createdBy}</dd>
        </div>
        <div>
          <dt>Created On</dt>
          <dd>{createdOn}</dd>
        </div>
        <div>
          <dt>Modified On</dt>
          <dd>{modifiedOn}</dd>
        </div>
      </dl>
    </RailCard>
  )
}
