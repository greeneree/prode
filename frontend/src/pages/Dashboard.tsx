import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'

interface Task {
  id: string
  project_id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  due_date?: string
  source: 'manual' | 'auto'
  created_at: string
}

interface Project {
  id: string
  name: string
  client?: string
  tag: string
}

const COLUMNS: {
  key: Task['status']
  label: string
  bg: string
  headerBg: string
  badge: string
}[] = [
  { key: 'todo',        label: '투두',  bg: 'bg-gray-50',  headerBg: 'bg-gray-100',  badge: 'bg-gray-300 text-gray-700' },
  { key: 'in_progress', label: '진행중', bg: 'bg-blue-50',  headerBg: 'bg-blue-100',  badge: 'bg-blue-300 text-blue-900' },
  { key: 'done',        label: '완료',  bg: 'bg-green-50', headerBg: 'bg-green-100', badge: 'bg-green-300 text-green-900' },
]

const STATUS_ORDER: Task['status'][] = ['todo', 'in_progress', 'done']
const STATUS_LABELS: Record<string, string> = {
  todo: '투두',
  in_progress: '진행중',
  done: '완료',
}

function getDueDateColor(dueDate: string | undefined): string {
  if (!dueDate) return 'text-gray-400'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diff = Math.floor((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'text-red-600'
  if (diff <= 3) return 'text-orange-500'
  return 'text-gray-400'
}

// 컬럼 드롭존
function DroppableArea({ colKey, children }: { colKey: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: colKey })
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 overflow-y-auto p-3 space-y-2 min-h-[40px] rounded-lg transition-colors ${
        isOver ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-200' : ''
      }`}
    >
      {children}
    </div>
  )
}

// 카드 드래그 래퍼 — setNodeRef만 담당, transform 미적용 (DragOverlay가 시각 처리)
function DraggableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`touch-none select-none ${isDragging ? 'opacity-40' : ''}`}
    >
      {children}
    </div>
  )
}

// 드래그 중 커서를 따라다니는 오버레이 카드
function TaskOverlayCard({ task }: { task: Task }) {
  return (
    <div className="bg-white rounded-lg shadow-2xl border-2 border-indigo-300 p-3 rotate-2 opacity-95">
      <p className="font-semibold text-sm text-gray-900 mb-1 leading-snug">{task.title}</p>
      {task.description && (
        <p
          className="text-xs text-gray-500 mb-2 leading-relaxed"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {task.description}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        {task.due_date && (
          <span className={`text-xs ${getDueDateColor(task.due_date)}`}>{task.due_date}</span>
        )}
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ml-auto ${
            task.source === 'auto' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {task.source}
        </span>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [openStatusId, setOpenStatusId] = useState<string | null>(null)
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  // 인라인 추가 폼
  const [adding, setAdding] = useState<Task['status'] | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newDueDate, setNewDueDate] = useState('')

  // 8px 이상 이동해야 드래그 활성화 — 클릭 이벤트와 충돌 방지
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/projects`)
      if (res.ok) setProjects(await res.json())
    } catch { /* 서버 미기동 시 무시 */ }
  }

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const url =
        selectedProjectId === 'all'
          ? `${import.meta.env.VITE_API_URL}/tasks`
          : `${import.meta.env.VITE_API_URL}/tasks?project_id=${selectedProjectId}`
      const res = await fetch(url)
      if (res.ok) setTasks(await res.json())
    } catch { /* 무시 */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProjects() }, [])

  useEffect(() => {
    fetchTasks()
    setOpenStatusId(null)
    setAdding(null)
  }, [selectedProjectId])

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    setOpenStatusId(null)
    const res = await fetch(`${import.meta.env.VITE_API_URL}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
    }
  }

  const handleDelete = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm('태스크를 삭제할까요?')) return
    const res = await fetch(`${import.meta.env.VITE_API_URL}/tasks/${taskId}`, { method: 'DELETE' })
    if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }

  const handleDueDateChange = async (taskId: string, dueDate: string) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ due_date: dueDate }),
    })
    if (res.ok) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, due_date: dueDate || undefined } : t))
      )
    }
  }

  const handleMove = async (taskId: string, direction: 'next' | 'prev') => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    const idx = STATUS_ORDER.indexOf(task.status)
    const newIdx = direction === 'next' ? idx + 1 : idx - 1
    if (newIdx < 0 || newIdx >= STATUS_ORDER.length) return
    await handleStatusChange(taskId, STATUS_ORDER[newIdx])
  }

  const handleAddConfirm = async (status: Task['status']) => {
    if (!newTitle.trim()) return
    const projectId = selectedProjectId === 'all' ? '' : selectedProjectId
    if (!projectId) return

    const body: Record<string, string> = {
      project_id: projectId,
      title: newTitle.trim(),
      status,
      source: 'manual',
    }
    if (newDesc.trim()) body.description = newDesc.trim()
    if (newDueDate) body.due_date = newDueDate

    const res = await fetch(`${import.meta.env.VITE_API_URL}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const created = await res.json()
      setTasks((prev) => [created, ...prev])
    }
    setAdding(null)
    setNewTitle('')
    setNewDesc('')
    setNewDueDate('')
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id)
    setActiveTask(task ?? null)
    setOpenStatusId(null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over) return
    const task = tasks.find((t) => t.id === active.id)
    if (!task) return
    const newStatus = over.id as Task['status']
    if (task.status !== newStatus) {
      handleStatusChange(task.id, newStatus)
    }
  }

  const tasksByStatus = (status: Task['status']) => tasks.filter((t) => t.status === status)
  const canAdd = selectedProjectId !== 'all'

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="p-6 h-full flex flex-col" onClick={() => setOpenStatusId(null)}>
        {/* 헤더 */}
        <div className="shrink-0 flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">대시보드</h1>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">프로젝트</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">전체보기</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            {loading && <span className="text-xs text-gray-400">불러오는 중...</span>}
          </div>
        </div>

        {/* 칸반 보드 */}
        <div className="flex gap-4 flex-1 min-h-0">
          {COLUMNS.map((col) => {
            const colTasks = tasksByStatus(col.key)
            const isAdding = adding === col.key
            const colIdx = STATUS_ORDER.indexOf(col.key)

            return (
              <div
                key={col.key}
                className={`flex-1 flex flex-col rounded-xl ${col.bg} overflow-hidden`}
              >
                {/* 컬럼 헤더 */}
                <div className={`shrink-0 flex items-center gap-2 px-4 py-3 ${col.headerBg}`}>
                  <span className="text-sm font-bold text-gray-700">{col.label}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${col.badge}`}>
                    {colTasks.length}
                  </span>
                </div>

                {/* 드롭존 + 카드 목록 */}
                <DroppableArea colKey={col.key}>
                  {colTasks.map((task) => (
                    <DraggableCard key={task.id} id={task.id}>
                      <div
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow relative"
                        onClick={(e) => {
                          e.stopPropagation()
                          setOpenStatusId(openStatusId === task.id ? null : task.id)
                        }}
                      >
                        {/* 삭제 버튼 */}
                        <button
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => handleDelete(task.id, e)}
                          className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center rounded hover:bg-red-100 text-gray-300 hover:text-red-500 transition-colors text-xs font-bold"
                        >
                          ✕
                        </button>

                        {/* 제목 */}
                        <p className="font-semibold text-sm text-gray-900 pr-6 mb-1 leading-snug">
                          {task.title}
                        </p>

                        {/* 설명 — 2줄 말줄임 */}
                        {task.description && (
                          <p
                            className="text-xs text-gray-500 mb-2 leading-relaxed"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {task.description}
                          </p>
                        )}

                        {/* 듀데이트 + 출처 뱃지 */}
                        <div
                          className="flex items-center justify-between mt-2"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="date"
                            value={task.due_date ?? ''}
                            onChange={(e) => handleDueDateChange(task.id, e.target.value)}
                            className={`text-xs bg-transparent border-0 p-0 focus:outline-none cursor-pointer ${getDueDateColor(task.due_date)}`}
                            title={task.due_date ? '기한 변경' : '기한 설정'}
                          />
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              task.source === 'auto'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {task.source}
                          </span>
                        </div>

                        {/* 화살표 이동 버튼 */}
                        <div
                          className="flex gap-1 mt-2"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {colIdx > 0 && (
                            <button
                              onClick={() => handleMove(task.id, 'prev')}
                              className="flex-1 py-0.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                            >
                              ← {STATUS_LABELS[STATUS_ORDER[colIdx - 1]]}
                            </button>
                          )}
                          {colIdx < COLUMNS.length - 1 && (
                            <button
                              onClick={() => handleMove(task.id, 'next')}
                              className="flex-1 py-0.5 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                            >
                              {STATUS_LABELS[STATUS_ORDER[colIdx + 1]]} →
                            </button>
                          )}
                        </div>

                        {/* 카드 클릭 → 상태 변경 버튼 토글 */}
                        {openStatusId === task.id && (
                          <div
                            className="mt-2 flex gap-1"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {STATUS_ORDER.map((s) => (
                              <button
                                key={s}
                                onClick={() => handleStatusChange(task.id, s)}
                                className={`flex-1 py-1 text-xs rounded border transition-colors ${
                                  task.status === s
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                }`}
                              >
                                {STATUS_LABELS[s]}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </DraggableCard>
                  ))}
                </DroppableArea>

                {/* 하단: 인라인 추가 폼 */}
                <div className="shrink-0 px-3 pb-3">
                  {isAdding ? (
                    <div
                      className="bg-white rounded-lg border border-indigo-300 p-2 space-y-2"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        autoFocus
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddConfirm(col.key)
                          if (e.key === 'Escape') {
                            setAdding(null)
                            setNewTitle('')
                            setNewDesc('')
                            setNewDueDate('')
                          }
                        }}
                        placeholder="태스크 제목 *"
                        className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <textarea
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                        placeholder="세부내역 (선택)"
                        rows={2}
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <input
                        type="date"
                        value={newDueDate}
                        onChange={(e) => setNewDueDate(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleAddConfirm(col.key)}
                          className="flex-1 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors"
                        >
                          확인
                        </button>
                        <button
                          onClick={() => {
                            setAdding(null)
                            setNewTitle('')
                            setNewDesc('')
                            setNewDueDate('')
                          }}
                          className="flex-1 py-1 text-xs border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!canAdd) return
                        setAdding(col.key)
                        setNewTitle('')
                        setNewDesc('')
                        setNewDueDate('')
                      }}
                      disabled={!canAdd}
                      className={`w-full py-1.5 text-xs border border-dashed rounded transition-all ${
                        canAdd
                          ? 'text-gray-500 border-gray-300 hover:text-gray-700 hover:border-gray-400 hover:bg-white'
                          : 'text-gray-300 border-gray-200 cursor-not-allowed'
                      }`}
                      title={!canAdd ? '프로젝트를 선택하면 태스크를 추가할 수 있습니다' : ''}
                    >
                      + 추가
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 드래그 오버레이 — 커서를 따라다니는 반투명 카드 */}
      <DragOverlay>
        {activeTask && <TaskOverlayCard task={activeTask} />}
      </DragOverlay>
    </DndContext>
  )
}
