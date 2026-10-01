import { AlertTriangle, CheckCircle2 } from 'lucide-react'

export type PersistentAlertType = 'error' | 'warning' | 'info' | 'success'

export type PersistentAlert = {
  id: string
  lines: string[]
  title: string
  type: PersistentAlertType
}

type PersistentAlertsProps = {
  alerts: PersistentAlert[]
}

export function PersistentAlerts({ alerts }: PersistentAlertsProps) {
  if (alerts.length === 0) return null

  return (
    <div className="edit-activity__persistent-alerts">
      {alerts.map((alert) => {
        const Icon = alert.type === 'info' || alert.type === 'success' ? CheckCircle2 : AlertTriangle
        const role = alert.type === 'error' ? 'alert' : 'status'

        return (
          <div className={`edit-activity__persistent-alert edit-activity__persistent-alert--${alert.type}`} key={alert.id} role={role}>
            <Icon aria-hidden="true" size={16} />
            <div>
              <strong>{alert.title}</strong>
              {alert.lines.map((line, index) => (
                <span key={`${alert.id}-${index}`}>{line || '\u00A0'}</span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
