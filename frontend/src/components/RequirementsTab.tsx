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

  const fetchSaved = async () => {
    try {
      const res = await fetch(`http://localhost:8000/requirements?project_id=${projectId}`)
      if (res.ok) setSavedList(await res.json())
    } catch {
      // 무시
    }
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
      const res = await fetch('http://localhost:8000/requirements/generate', {
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
      const res = await fetch('http://localhost:8000/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          raw_input: currentRaw,
          result_html: resultHtml,
        }),
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
  }

  const handleCardClick = (req: Requirement) => {
    setResultHtml(req.result_html)
    setCurrentRaw(req.raw_input)
    setIsSaved(true)
  }

  return (
    <div className="flex h-full gap-6">
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
          /* 결과 표시 영역 */
          <>
            {/* 버튼 */}
            <div className="shrink-0 flex items-center justify-end gap-2 mb-3">
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

            {/* 저장 목록 (결과 아래 축소 표시) */}
            {savedList.length > 0 && (
              <div className="shrink-0 mt-4 max-h-44 overflow-y-auto">
                <p className="text-xs font-medium text-gray-400 mb-2">저장된 요건 정리</p>
                <div className="space-y-1.5">
                  {savedList.map((req) => (
                    <button
                      key={req.id}
                      onClick={() => handleCardClick(req)}
                      className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      <span className="text-xs text-gray-400 mr-2">
                        {new Date(req.created_at).toLocaleString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-sm text-gray-600">
                        {req.raw_input.slice(0, 50)}
                        {req.raw_input.length > 50 ? '...' : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* 빈 상태 + 저장 목록 */
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
                    <button
                      key={req.id}
                      onClick={() => handleCardClick(req)}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      <div className="text-xs text-gray-400 mb-0.5">
                        {new Date(req.created_at).toLocaleString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="text-sm text-gray-700">
                        {req.raw_input.slice(0, 50)}
                        {req.raw_input.length > 50 ? '...' : ''}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
