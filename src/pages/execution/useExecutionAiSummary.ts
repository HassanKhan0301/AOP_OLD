import { useCallback, useEffect, useRef, useState } from 'react'
import { Dga_aop_ai_summariesService } from '../../generated/services/Dga_aop_ai_summariesService'
import { triggerActivityAiSummaryRefresh } from '../editActivity/helpers/aiSummaryFlow'

const summaryKeys: Record<string, string[]> = {
  'Activity Information': ['Project Summary', 'ProjectSummary'],
  Budget: ['Budget Summary', 'BudgetSummary'],
  Milestone: ['Milestone Summary', 'milestoneSummary'],
  Objectives: ['Objective Summary', 'ObjectiveSummary'],
}

export function useExecutionAiSummary(projectId: string) {
  const [summaries, setSummaries] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(0)
  const load = useCallback(async (refresh = false) => {
    if (!projectId) return
    const sequence = ++request.current
    setIsLoading(true)
    setError('')
    try {
      if (refresh) {
        const result = await triggerActivityAiSummaryRefresh(projectId)
        if (result.success === false) throw new Error('AI summary refresh failed.')
      }
      const id = projectId.replace(/[{}]/g, '').toLowerCase()
      const result = await Dga_aop_ai_summariesService.getAll({
        filter: `_dga_reference_record_id_value eq ${id} or dga_summary_id eq '${id}'`,
        orderBy: ['modifiedon desc', 'createdon desc'],
        select: ['dga_response_json'],
        top: 5,
      })
      if (result.success === false) throw new Error('Unable to load AI summary.')
      const raw = result.data?.find((row) => row.dga_response_json)?.dga_response_json
      let parsed: unknown = raw ? JSON.parse(raw) : {}
      if (typeof parsed === 'string') parsed = JSON.parse(parsed)
      const data = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {}
      const mapped: Record<string, string> = {}
      for (const [title, keys] of Object.entries(summaryKeys)) {
        const source = title === 'Objectives' && data.Objective && typeof data.Objective === 'object' ? data.Objective as Record<string, unknown> : data
        const value = keys.map((key) => source[key]).find((item) => typeof item === 'string')
        mapped[title] = typeof value === 'string' ? value : ''
      }
      if (sequence === request.current) setSummaries(mapped)
    } catch {
      if (sequence === request.current) setError('AI summary is temporarily unavailable. Please retry.')
    } finally {
      if (sequence === request.current) setIsLoading(false)
    }
  }, [projectId])
  const invalidate = useCallback(() => { request.current++ }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => { window.clearTimeout(timer); invalidate() }
  }, [invalidate, load])
  return { summaries, isLoading, error, reload: load }
}
