import { useState, useEffect } from 'react'

interface Requirement {
  id: string
  project_id: string
  raw_input: string
  result_html: string
  created_at: string
}

interface Props {
  projectId: string
}

export default function RequirementsTab({ projectId }: Props) {
  const [rawInput, setRawInput] = useState('')
  const [resultHtml, setResultHtml] = useState<string | null>(null)
  const [currentRaw, setCurrentRaw] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [savedList, setSavedList] = useState<Requirement[]>([])

  // 현재 결과 뷰의 "태스크로 보내기"
  const [sendingTasks, setSendingTasks] = useState(false)
  const [tasksSent, setTasksSent] = useState<number | null>(null)

  // 저장 목록 카드별 [태스크 생성] 로딩 상태
  const [generatingTaskIds, setGeneratingTaskIds] = useState<Set<string>>(new Set())

  // 토스트 메시지
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const fetchSaved = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/requirements?project_id=${projectId}`)
      if (res.ok) setSavedList(await res.json())
    } catch { /* 무시 */ }
  }

  useEffect(() => {
    fetchSaved()
  }, [projectId])

  const handleGenerate = async () => {
    if (!rawInput.trim() || generating) return
    setGenerating(true)
    setResultHtml(null)
    setIsSaved(false)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/requirements/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, raw_input: rawInput }),
      })
      if (res.ok) {
        const data = await res.json()
        setResultHtml(data.result_html)
        setCurrentRaw(rawInput)
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!resultHtml || saving) return
    setSaving(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, raw_input: currentRaw, result_html: resultHtml }),
      })
      if (res.ok) {
        setIsSaved(true)
        await fetchSaved()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleNew = () => {
    setResultHtml(null)
    setIsSaved(false)
    setRawInput('')
    setCurrentRaw('')
    setTasksSent(null)
  }

  const handleCardClick = (req: Requirement) => {
    setResultHtml(req.result_html)
    setCurrentRaw(req.raw_input)
    setIsSaved(true)
    setTasksSent(null)
  }

  // 현재 결과 뷰 → 태스크 일괄 생성
  const handleSendToTasks = async () => {
    if (!resultHtml || sendingTasks) return
    setSendingTasks(true)
    setTasksSent(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/tasks/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, result_html: resultHtml }),
      })
      if (res.ok) {
        const data = await res.json()
        setTasksSent(data.count)
      }
    } finally {
      setSendingTasks(false)
    }
  }

  // 저장된 요건 카드 → 태스크 생성
  const handleGenerateTasksFromReq = async (req: Requirement) => {
    if (generatingTaskIds.has(req.id)) return
    setGeneratingTaskIds((prev) => new Set([...prev, req.id]))
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/tasks/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: req.project_id, result_html: req.result_html }),
      })
      if (res.ok) {
        const data = await res.json()
        setToast(`태스크 ${data.count}개가 대시보드에 추가됐습니다`)
      } else {
        setToast('태스크 생성에 실패했습니다')
      }
    } catch {
      setToast('태스크 생성에 실패했습니다')
    } finally {
      setGeneratingTaskIds((prev) => {
        const next = new Set(prev)
        next.delete(req.id)
        return next
      })
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  // 저장 목록 카드 컴포넌트 (두 섹션에서 재사용)
  const SavedReqCard = ({ req, compact }: { req: Requirement; compact?: boolean }) => {
    const isGenerating = generatingTaskIds.has(req.id)
    return (
      <div
        key={req.id}
        className={`flex items-center gap-2 rounded-lg border border-gray-200 hover:border-indigo-200 transition-colors ${compact ? 'px-3 py-2' : 'p-3'}`}
      >
        {/* 클릭 → 요건 결과 표시 */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => handleCardClick(req)}
        >
          <div className="text-xs text-gray-400 mb-0.5">{formatDate(req.created_at)}</div>
          <div className={`text-gray-700 truncate ${compact ? 'text-sm' : 'text-sm'}`}>
            {req.raw_input.slice(0, 50)}
            {req.raw_input.length > 50 ? '...' : ''}
          </div>
        </div>

        {/* [태스크 생성] 버튼 */}
        <button
          onClick={() => handleGenerateTasksFromReq(req)}
          disabled={isGenerating}
          className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs rounded border border-purple-300 text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {isGenerating ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
              생성중
            </>
          ) : (
            '태스크 생성'
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="flex h-full gap-6 relative">
      {/* 좌측 패널 40% */}
      <div className="w-2/5 flex flex-col border-r border-gray-200 pr-6">
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder="회의록, 컨플루언스 내용 등을 붙여넣으세요"
          className="flex-1 min-h-[400px] resize-none border border-gray-200 rounded-xl p-4 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 leading-relaxed"
        />
        <button
          onClick={handleGenerate}
          disabled={!rawInput.trim() || generating}
          className="mt-4 w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              분석 중...
            </>
          ) : (
            '요건 정리 시작'
          )}
        </button>
      </div>

      {/* 우측 패널 60% */}
      <div className="flex-1 flex flex-col min-h-0">
        {resultHtml ? (
          <>
            {/* 상단 버튼 */}
            <div className="shrink-0 flex items-center justify-end gap-2 mb-3">
              {tasksSent !== null ? (
                <span className="text-sm text-purple-600 font-medium">태스크 {tasksSent}개 생성됨 ✓</span>
              ) : (
                <button
                  onClick={handleSendToTasks}
                  disabled={sendingTasks}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  {sendingTasks ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      추출 중...
                    </>
                  ) : (
                    '태스크로 보내기'
                  )}
                </button>
              )}
              {isSaved ? (
                <span className="text-sm text-green-600 font-medium">저장됨 ✓</span>
              ) : (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {saving ? '저장 중...' : '저장'}
                </button>
              )}
              <button
                onClick={handleNew}
                className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                새로 정리
              </button>
            </div>

            {/* HTML 렌더링 */}
            <div
              className="flex-1 overflow-y-auto border border-gray-200 rounded-xl p-4 bg-white"
              dangerouslySetInnerHTML={{ __html: resultHtml }}
            />

            {/* 저장 목록 */}
            {savedList.length > 0 && (
              <div className="shrink-0 mt-4 max-h-44 overflow-y-auto">
                <p className="text-xs font-medium text-gray-400 mb-2">저장된 요건 정리</p>
                <div className="space-y-1.5">
                  {savedList.map((req) => (
                    <SavedReqCard key={req.id} req={req} compact />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col h-full">
            {!generating && (
              <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border border-dashed border-gray-300 mb-4 shrink-0">
                <p className="text-gray-400 text-sm">
                  좌측에 내용을 입력 후 요건 정리를 시작하세요
                </p>
              </div>
            )}

            {savedList.length > 0 && (
              <div className="flex-1 overflow-y-auto">
                <p className="text-xs font-medium text-gray-400 mb-2">저장된 요건 정리</p>
                <div className="space-y-2">
                  {savedList.map((req) => (
                    <SavedReqCard key={req.id} req={req} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 토스트 메시지 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-2.5 rounded-xl shadow-2xl text-sm font-medium pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
