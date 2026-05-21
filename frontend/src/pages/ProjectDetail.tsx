import { useParams, useNavigate, useOutletContext } from 'react-router-dom'
import { useState, useEffect } from 'react'
import SummaryTab from '../components/SummaryTab'
import RequirementsTab from '../components/RequirementsTab'
import IATab from '../components/IATab'
import DescriptionTab from '../components/DescriptionTab'

interface Project {
  id: string
  name: string
  client?: string
  tag: string
  created_at: string
}

interface OutletContext {
  refreshProjects: () => void
}

const TAG_BADGE: Record<string, string> = {
  '운영': 'bg-blue-100 text-blue-700',
  '제안': 'bg-green-100 text-green-700',
  'TBD': 'bg-gray-100 text-gray-600',
}

const TABS = ['Summary', '요건 정리', 'IA', '디스크립션'] as const
type Tab = (typeof TABS)[number]

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { refreshProjects } = useOutletContext<OutletContext>()

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('Summary')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`${import.meta.env.VITE_API_URL}/projects/${id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setProject(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/projects/${id}`, { method: 'DELETE' })
      await refreshProjects()
      navigate('/')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-400 text-sm">로딩 중...</div>
  }
  if (!project) {
    return <div className="p-8 text-gray-400 text-sm">프로젝트를 찾을 수 없습니다.</div>
  }

  const tagStyle = TAG_BADGE[project.tag] ?? TAG_BADGE['TBD']
  const createdAt = new Date(project.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col h-full px-8 pt-8 pb-4">
      {/* 상단 헤더 */}
      <div className="shrink-0 flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${tagStyle}`}>
              {project.tag}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {project.client && <span>고객사: {project.client}</span>}
            <span>생성일: {createdAt}</span>
          </div>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors"
        >
          삭제
        </button>
      </div>

      {/* 탭 */}
      <div className="shrink-0 border-b border-gray-200 mb-6">
        <nav className="flex">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 콘텐츠 — flex-1로 남은 높이 모두 사용 */}
      <div className="flex-1 min-h-0">
        {activeTab === 'Summary' && <SummaryTab projectId={id!} />}
        {activeTab === '요건 정리' && <RequirementsTab projectId={id!} />}
        {activeTab === 'IA' && (
          <IATab projectId={id!} projectName={project.name} />
        )}
        {activeTab === '디스크립션' && <DescriptionTab projectId={id!} />}
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">프로젝트 삭제</h2>
            <p className="text-sm text-gray-600 mb-6">
              <strong>{project.name}</strong>을(를) 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
