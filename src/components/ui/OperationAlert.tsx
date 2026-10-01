import { useEffect } from 'react'
import { AlertTriangle, CheckCircle2, X } from 'lucide-react'

export type OperationAlertKind = 'processing' | 'success' | 'error'

export type OperationAlertPayload = {
  kind: OperationAlertKind
  message?: string
  title: string
}

type OperationAlertProps = {
  alert: OperationAlertPayload | null
  onDismiss?: () => void
}

export function OperationAlert({ alert, onDismiss }: OperationAlertProps) {
  useEffect(() => {
    if (!alert || alert.kind !== 'success' || !onDismiss) return undefined

    const timeoutId = window.setTimeout(onDismiss, 2200)

    return () => window.clearTimeout(timeoutId)
  }, [alert, onDismiss])

  if (!alert) return null

  return (
    <div
      className={`edit-activity__operation-alert edit-activity__operation-alert--${alert.kind}`}
      key={`${alert.kind}-${alert.title}-${alert.message ?? ''}`}
      role={alert.kind === 'error' ? 'alert' : 'status'}
    >
      <div className="edit-activity__operation-alert-header">
        <span aria-hidden="true" className="edit-activity__operation-alert-icon">
          {alert.kind === 'processing'
            ? <span />
            : alert.kind === 'error'
              ? <AlertTriangle size={18} />
              : <CheckCircle2 size={18} />}
        </span>
        <div>
          <span>{alert.kind === 'processing' ? 'Processing' : alert.kind === 'error' ? 'Failed' : 'Completed'}</span>
          <strong>{alert.title}</strong>
        </div>
        {alert.kind !== 'processing' && onDismiss ? (
          <button
            aria-label="Dismiss notification"
            className="edit-activity__operation-alert-close"
            onClick={onDismiss}
            type="button"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>
      {alert.kind !== 'processing' && alert.message ? <p>{alert.message}</p> : null}
      <span aria-hidden="true" className="edit-activity__operation-alert-progress" />
    </div>
  )
}
