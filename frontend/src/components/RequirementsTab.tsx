import { useState, useEffect } from 'react'

interface Requirement {
  id: string
  project_id: string
  raw_input: string
  result_html: string
  created_at: string
}

interface ReqCard { icon: string; title: string; description: string; badge: string }
interface FlowStep { number: number; title: string; owner: string }
interface FuncReq { group: string; name: string; description: string; priority: string }
interface NonFuncReq { name: string; description: string }
interface AsIsToBe { as_is: string; to_be: string }
interface ReqData {
  service_overview?: { title: string; description: string; cards: ReqCard[] }
  flow_steps?: FlowStep[]
  functional_requirements?: FuncReq[]
  non_functional_requirements?: NonFuncReq[]
  as_is_to_be?: AsIsToBe[]
}

interface Props {
  projectId: string
}

const PRIORITY_CLASS: Record<string, string> = {
  상: 'bg-red-100 text-red-600',
  중: 'bg-orange-100 text-orange-600',
  하: 'bg-gray-100 text-gray-500',
}

function RequirementView({ data }: { data: ReqData }) {
  return (
    <div className="space-y-6">
      {/* 서비스 개요 */}
      {data.service_overview && (
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-1">{data.service_overview.title}</h3>
          {data.service_overview.description && (
            <p className="text-xs text-gray-400 mb-3">{data.service_overview.description}</p>
          )}
          <div className="grid grid-cols-3 gap-3">
            {data.service_overview.cards.map((card, i) => (
              <div key={i} className="bg-[#f8f9ff] border border-[#e0e0f0] rounded-xl p-3">
                <div className="text-xl mb-1">{card.icon}</div>
                <div className="text-sm font-medium text-gray-800 mb-1">{card.title}</div>
                <div className="text-xs text-gray-500 mb-2">{card.description}</div>
                {card.badge && (
                  <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">{card.badge}</span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 서비스 흐름 */}
      {data.flow_steps && data.flow_steps.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-3">전체 서비스 흐름</h3>
          <div className="flex flex-wrap gap-2 items-center">
            {data.flow_steps.flatMap((step, i) => {
              const items = [
                <div key={step.number} className="flex flex-col items-center bg-[#7B68EE] text-white rounded-xl px-3 py-2 min-w-[80px]">
                  <span className="text-[10px] opacity-70">STEP {step.number}</span>
                  <span className="text-sm font-medium">{step.title}</span>
                  {step.owner && <span className="text-[10px] opacity-70">{step.owner}</span>}
                </div>,
              ]
              if (i < data.flow_steps!.length - 1) {
                items.push(<span key={`a${i}`} className="text-gray-400 text-sm">→</span>)
              }
              return items
            })}
          </div>
        </section>
      )}

      {/* 기능 요건 */}
      {data.functional_requirements && data.functional_requirements.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-3">기능 요건</h3>
          <div className="space-y-2">
            {data.functional_requirements.map((req, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {req.group && <span className="text-xs text-gray-400">{req.group}</span>}
                  <span className="text-sm font-medium text-gray-800">{req.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${PRIORITY_CLASS[req.priority] ?? PRIORITY_CLASS['하']}`}>
                    {req.priority}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{req.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 비기능 요건 */}
      {data.non_functional_requirements && data.non_functional_requirements.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-3">비기능 요건 / 제약사항</h3>
          <ul className="space-y-1.5">
            {data.non_functional_requirements.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-indigo-400 shrink-0">•</span>
                <span>
                  <span className="font-medium text-gray-700">{item.name}</span>
                  {item.description && <span className="text-gray-500"> — {item.description}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* AS-IS / TO-BE */}
      {data.as_is_to_be && data.as_is_to_be.length > 0 && (
        <section>
          <h3 className="text-sm font-bold text-gray-700 mb-3">AS-IS / TO-BE</h3>
          <div className="space-y-2">
            {data.as_is_to_be.map((item, i) => (
              <div key={i} className="grid grid-cols-2 gap-3">
                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                  <div className="text-xs font-medium text-gray-400 mb-1">AS-IS</div>
                  <p className="text-sm text-gray-600">{item.as_is}</p>
                </div>
                <div className="border border-indigo-200 rounded-xl p-3 bg-indigo-50">
                  <div className="text-xs font-medium text-indigo-400 mb-1">TO-BE</div>
                  <p className="text-sm text-indigo-700">{item.to_be}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ReqContent({ resultHtml }: { resultHtml: string }) {
  if (resultHtml.startsWith('{')) {
    try {
      const data: ReqData = JSON.parse(resultHtml)
      return <RequirementView data={data} />
    } catch {
      // 파싱 실패 시 원본 표시
    }
  }
  return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: resultHtml }} />
}

export default function RequirementsTab({ projectId }: Props) {
  const [rawInput, setRawInput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [savedList, setSavedList] = useState<Requirement[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [generatingTaskIds, setGeneratingTaskIds] = useState<Set<string>>(new Set())
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
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/requirements/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, raw_input: rawInput }),
      })
      if (!res.ok) return
      const data = await res.json()

      const saveRes = await fetch(`${import.meta.env.VITE_API_URL}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, raw_input: rawInput, result_html: data.result_html }),
      })
      if (saveRes.ok) {
        const saved = await saveRes.json()
        await fetchSaved()
        setOpenId(saved.id)
      }
      setRawInput('')
    } finally {
      setGenerating(false)
    }
  }

  const handleToggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id))
  }

  const handleGenerateTasksFromReq = async (req: Requirement, e: React.MouseEvent) => {
    e.stopPropagation()
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

  return (
    <div className="flex flex-col h-full">
      {/* 상단 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-2">
        {savedList.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <p className="text-gray-400 text-sm">저장된 요건이 없습니다</p>
          </div>
        ) : (
          savedList.map((req) => {
            const isOpen = openId === req.id
            const isGenerating = generatingTaskIds.has(req.id)
            return (
              <div key={req.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleToggle(req.id)}
                >
                  <span className={`text-gray-400 text-[10px] transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs text-gray-400 mr-2">{formatDate(req.created_at)}</span>
                    <span className="text-sm text-gray-700">
                      {req.raw_input.slice(0, 50)}{req.raw_input.length > 50 ? '...' : ''}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleGenerateTasksFromReq(req, e)}
                    disabled={isGenerating}
                    className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-purple-300 text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
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

                {isOpen && (
                  <div className="px-5 py-4 border-t border-gray-100 bg-white">
                    <ReqContent resultHtml={req.result_html} />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 하단 고정 입력 영역 */}
      <div className="shrink-0 border-t border-gray-200 p-4">
        <div className="flex gap-3 items-center">
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="회의록, 요건 내용을 입력하세요"
            className="flex-1 h-[120px] resize-none border border-gray-200 rounded-xl p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 leading-relaxed"
          />
          <button
            onClick={handleGenerate}
            disabled={!rawInput.trim() || generating}
            className="shrink-0 h-[120px] w-24 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex flex-col items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>분석 중...</span>
              </>
            ) : (
              '요건 정리'
            )}
          </button>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-2.5 rounded-xl shadow-2xl text-sm font-medium pointer-events-none">
          {toast}
        </div>
      )}
    </div>
  )
}
