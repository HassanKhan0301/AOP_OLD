import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UnsavedChangesDialog } from '../../components/ui'
import { useNavigationGuard } from '../../contexts/useNavigationGuard'

export function ExecutionUnsavedGuard<T>({ snapshot, onRestore, onSave, isSaving, additionalDirty = false }: {
  snapshot: T
  onRestore: (value: T) => void
  onSave: (hasFormChanges: boolean) => Promise<boolean>
  isSaving: boolean
  additionalDirty?: boolean
}) {
  const [baseline, setBaseline] = useState(snapshot)
  const [isOpen, setIsOpen] = useState(false)
  const pending = useRef<(() => void) | null>(null)
  const { registerNavigationGuard, confirmNavigation } = useNavigationGuard()
  const navigate = useNavigate()
  const dirty = additionalDirty || JSON.stringify(snapshot) !== JSON.stringify(baseline)

  useEffect(() => registerNavigationGuard((action) => {
    if (!dirty && !isSaving) { action(); return true }
    pending.current = action
    setIsOpen(true)
    return false
  }), [dirty, isSaving, registerNavigationGuard])

  useEffect(() => {
    if (!dirty) return
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    const click = (event: MouseEvent) => {
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('.create-execution-plan a[href], .execution-plan-detail a[href]') : null
      if (!target || target.target || target.hasAttribute('download')) return
      const url = new URL(target.href)
      if (url.origin !== window.location.origin) return
      event.preventDefault()
      event.stopPropagation()
      confirmNavigation(() => navigate(url.hash.startsWith('#/') ? url.hash.slice(1) : url.pathname + url.search))
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', click, true)
    return () => { window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('click', click, true) }
  }, [confirmNavigation, dirty, navigate])

  function continueNavigation() {
    const action = pending.current
    pending.current = null
    setIsOpen(false)
    action?.()
  }

  return <UnsavedChangesDialog isOpen={isOpen} isSaving={isSaving} title="Unsaved changes" description="You have unsaved changes on this activity. Save your changes before leaving, or discard them to continue without saving." saveLabel="Save Draft" onDismiss={() => { if (!isSaving) { pending.current = null; setIsOpen(false) } }} onDiscard={() => { onRestore(baseline); continueNavigation() }} onSave={async () => { if (await onSave(JSON.stringify(snapshot) !== JSON.stringify(baseline))) { setBaseline(snapshot); continueNavigation() } }} />
}
