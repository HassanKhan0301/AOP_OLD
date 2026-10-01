import type { ReactNode } from 'react'

type WorkflowActionsPanelProps = {
  children: ReactNode
}

export function WorkflowActionsPanel({ children }: WorkflowActionsPanelProps) {
  return (
    <div className="edit-activity__workflow-panel-actions">
      {children}
    </div>
  )
}
