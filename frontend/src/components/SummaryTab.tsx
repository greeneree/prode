import { useState, useEffect } from 'react'

interface IANode {
  id: string
  label: string
  type: 'page' | 'component' | 'element'
  children?: IANode[]
}

interface IADoc {
  tree_data: IANode[]
  updated_at: string
}

interface Task {
  id: string
  status: 'todo' | 'in_progress' | 'done'
}

interface ActivityLog {
  id: string
  action: string
  detail: string | null
  created_at: string
}

interface Props {
  projectId: string
}

function countPages(nodes: IANode[]): number {
  return nodes.reduce(
    (sum, node) =>
      sum + (node.type === 'page' ? 1 : 0) + countPages(node.children ?? []),
    0
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('ko-KR', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SummaryTab({ projectId }: Props) {
  const [ia, setIa] = useState<IADoc | null>(null)
  const [iaLoaded, setIaLoaded] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [memo, setMemo] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    // IA 현황
    fetch(`${import.meta.env.VITE_API_URL}/ia?project_id=${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { setIa(data); setIaLoaded(true) })
      .catch(() => setIaLoaded(true))

    // 태스크 현황
    fetch(`${import.meta.env.VITE_API_URL}/tasks?project_id=${projectId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTasks(data))
      .catch(() => {})

    // 활동 로그
    fetch(`${import.meta.env.VITE_API_URL}/activity-logs?project_id=${projectId}&limit=10`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setLogs(data))
      .catch(() => {})

    // 메모
    fetch(`${import.meta.env.VITE_API_URL}/project-notes?project_id=${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.memo) setMemo(data.memo) })
      .catch(() => {})
  }, [projectId])

  const todo = tasks.filter((t) => t.status === 'todo').length
  const inProgress = tasks.filter((t) => t.status === 'in_progress').length
  const done = tasks.filter((t) => t.status === 'done').length
  const total = tasks.length
  const donePercent = total > 0 ? Math.round((done / total) * 100) : 0
  const pageCount = ia ? countPages(ia.tree_data) : 0

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setSaved(false)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/project-notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, memo }),
      })
      if (res.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto space-y-4">
      {/* 상단 2컬럼 */}
      <div className="grid grid-cols-2 gap-4">
        {/* IA 현황 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            IA 현황
          </p>
          {!iaLoaded ? (
            <p className="text-sm text-gray-400">로딩 중...</p>
          ) : ia ? (
            <div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-3xl font-bold text-gray-900">{pageCount}</span>
                <span className="text-sm text-gray-500">페이지</span>
              </div>
              <p className="text-xs text-gray-400">최종 수정 {formatDate(ia.updated_at)}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">IA가 아직 없습니다</p>
          )}
        </div>

        {/* 태스크 진행 현황 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            태스크 진행 현황
          </p>
          {total === 0 ? (
            <p className="text-sm text-gray-400">등록된 태스크가 없습니다</p>
          ) : (
            <>
              <div className="flex gap-6 mb-4">
                <div>
                  <p className="text-2xl font-bold text-gray-500">{todo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">투두</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-500">{inProgress}</p>
                  <p className="text-xs text-gray-400 mt-0.5">진행중</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-500">{done}</p>
                  <p className="text-xs text-gray-400 mt-0.5">완료</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${donePercent}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-9 text-right shrink-0">
                  {donePercent}%
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 타임라인 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
          활동 타임라인
        </p>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400">아직 활동 기록이 없습니다</p>
        ) : (
          <div>
            {logs.map((log, i) => (
              <div key={log.id} className="flex gap-3">
                {/* 점 + 세로선 */}
                <div className="flex flex-col items-center shrink-0 w-4">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  {i < logs.length - 1 && (
                    <div className="w-px bg-gray-200 flex-1 my-1" />
                  )}
                </div>
                {/* 내용 */}
                <div className={`min-w-0 ${i < logs.length - 1 ? 'pb-4' : ''}`}>
                  <p className="text-xs text-gray-400 mb-0.5">{formatDateTime(log.created_at)}</p>
                  <p className="text-sm text-gray-800 font-medium">{log.action}</p>
                  {log.detail && (
                    <p className="text-xs text-gray-500 mt-0.5">{log.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 하단 메모 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            고객 확인 필요 메모
          </p>
          {saved ? (
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
        </div>
        <textarea
          value={memo}
          onChange={(e) => { setMemo(e.target.value); setSaved(false) }}
          placeholder="고객 확인이 필요한 사항을 메모하세요"
          className="w-full min-h-[180px] resize-none border border-gray-200 rounded-lg p-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 leading-relaxed"
        />
      </div>
    </div>
  )
}
