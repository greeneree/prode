import { Outlet, Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

interface Project {
  id: string
  name: string
  client?: string
  tag: string
}

const TAG_BADGE: Record<string, string> = {
  '운영': 'bg-blue-500 text-white',
  '제안': 'bg-green-500 text-white',
  'TBD': 'bg-gray-500 text-white',
}

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: currentId } = useParams()
  const [projects, setProjects] = useState<Project[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', client: '', tag: 'TBD' })
  const [creating, setCreating] = useState(false)

  const role = sessionStorage.getItem('prode_auth') ?? 'master'

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/projects?owner=${role}`)
      if (res.ok) setProjects(await res.json())
    } catch {
      // 서버 미기동 시 무시
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [])

  const closeModal = () => {
    setShowModal(false)
    setForm({ name: '', client: '', tag: 'TBD' })
  }

  const handleCreate = async () => {
    if (!form.name.trim() || creating) return
    setCreating(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          client: form.client.trim() || null,
          tag: form.tag,
          owner: role,
        }),
      })
      if (res.ok) {
        const created = await res.json()
        await fetchProjects()
        closeModal()
        navigate(`/projects/${created.id}`)
      }
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 좌측 사이드바 */}
      <aside className="w-60 bg-gray-900 text-gray-100 flex flex-col shrink-0">
        {/* 로고 */}
        <div className="px-6 py-5 border-b border-gray-700">
          <Link to="/" className="text-xl font-bold tracking-tight text-white">
            prode
          </Link>
        </div>

        {/* 새 프로젝트 버튼 */}
        <div className="px-4 py-4">
          <button
            onClick={() => setShowModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
          >
            <span className="text-lg leading-none">+</span>
            새 프로젝트
          </button>
        </div>

        {/* 대시보드 메뉴 */}
        <div className="px-2 pb-2">
          <Link
            to="/dashboard"
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              location.pathname === '/dashboard'
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="text-base leading-none">📋</span>
            Task Board
          </Link>
        </div>

        {/* 프로젝트 목록 */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2">
          {projects.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-500">프로젝트가 없습니다</p>
          ) : (
            <ul className="space-y-0.5">
              {projects.map((project) => (
                <li key={project.id}>
                  <Link
                    to={`/projects/${project.id}`}
                    className={`flex flex-col px-3 py-2 rounded-md transition-colors ${
                      currentId === project.id ? 'bg-gray-700' : 'hover:bg-gray-800'
                    }`}
                  >
                    <span className="text-sm font-medium text-gray-100 truncate">
                      {project.name}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      {project.client && (
                        <span className="text-xs text-gray-400 truncate">{project.client}</span>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                          TAG_BADGE[project.tag] ?? TAG_BADGE['TBD']
                        }`}
                      >
                        {project.tag}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </nav>
        {/* 로그아웃 */}
        <div className="px-4 py-3 border-t border-gray-700 shrink-0">
          <button
            onClick={() => {
              sessionStorage.removeItem('prode_auth')
              navigate('/login')
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors"
          >
            <span className="text-base leading-none">↩</span>
            로그아웃
          </button>
        </div>
      </aside>

      {/* 우측 메인 콘텐츠 */}
      <main className="flex-1 overflow-y-auto">
        <Outlet context={{ refreshProjects: fetchProjects }} />
      </main>

      {/* 새 프로젝트 생성 모달 */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">새 프로젝트 만들기</h2>

            <div className="space-y-4">
              {/* 프로젝트명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  프로젝트명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate() }}
                  placeholder="프로젝트명을 입력하세요"
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 고객사명 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">고객사명</label>
                <input
                  type="text"
                  value={form.client}
                  onChange={(e) => setForm((f) => ({ ...f, client: e.target.value }))}
                  placeholder="고객사명을 입력하세요"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 태그 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">태그</label>
                <div className="flex gap-5">
                  {['운영', '제안', 'TBD'].map((tag) => (
                    <label key={tag} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="tag"
                        value={tag}
                        checked={form.tag === tag}
                        onChange={() => setForm((f) => ({ ...f, tag }))}
                        className="accent-indigo-600"
                      />
                      <span className="text-sm text-gray-700">{tag}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name.trim() || creating}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {creating ? '생성 중...' : '프로젝트 생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
