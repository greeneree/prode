import { useState, useEffect } from 'react'

interface IANode {
  id: string
  label: string
  depth: number
  type: 'page' | 'component' | 'element'
  children?: IANode[]
}

interface DescRow {
  구분: string
  컴포넌트명: string
  설명: string
  인터랙션: string
}

interface ScreenDesc {
  id: string
  ia_node_id: string
  ia_node_label: string
  result_json: DescRow[]
  created_at: string
}

interface Props {
  projectId: string
}

function flattenNodes(nodes: IANode[]): IANode[] {
  return nodes.flatMap((node) => [node, ...flattenNodes(node.children ?? [])])
}

const CATEGORY_COLOR: Record<string, string> = {
  헤더: 'bg-blue-100 text-blue-700',
  네비게이션: 'bg-purple-100 text-purple-700',
  콘텐츠: 'bg-green-100 text-green-700',
  버튼: 'bg-orange-100 text-orange-700',
  폼: 'bg-yellow-100 text-yellow-700',
  모달: 'bg-pink-100 text-pink-700',
  기타: 'bg-gray-100 text-gray-600',
}

interface ResultTableProps {
  rows: DescRow[]
  editable?: boolean
  onChange?: (updated: DescRow[]) => void
}

function ResultTable({ rows, editable = false, onChange }: ResultTableProps) {
  const [editCell, setEditCell] = useState<{ row: number; field: keyof DescRow } | null>(null)
  const [editValue, setEditValue] = useState('')

  const startEdit = (rowIdx: number, field: keyof DescRow) => {
    setEditCell({ row: rowIdx, field })
    setEditValue(rows[rowIdx][field])
  }

  const commitEdit = () => {
    if (!editCell) return
    const prev = rows[editCell.row][editCell.field]
    if (onChange && editValue !== prev) {
      onChange(rows.map((r, i) => i === editCell.row ? { ...r, [editCell.field]: editValue } : r))
    }
    setEditCell(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
    if (e.key === 'Escape') setEditCell(null)
  }

  const editInput = (
    <input
      autoFocus
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={commitEdit}
      onKeyDown={handleKeyDown}
      className="w-full px-1 py-0.5 border border-indigo-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
    />
  )

  const cellClass = `block min-h-[1.2rem] ${editable ? 'cursor-text rounded hover:bg-indigo-50 px-1 -mx-1' : ''}`

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-24">구분</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600 w-36">컴포넌트명</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">설명</th>
            <th className="px-3 py-2.5 text-left font-medium text-gray-600">인터랙션</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const isEditingCategory = editCell?.row === i && editCell?.field === '구분'
            const isEditingName     = editCell?.row === i && editCell?.field === '컴포넌트명'
            const isEditingDesc     = editCell?.row === i && editCell?.field === '설명'
            const isEditingAction   = editCell?.row === i && editCell?.field === '인터랙션'
            return (
              <tr key={i} className="border-b border-gray-100 last:border-0">
                {/* 구분 — 편집 중일 때 input, 아닐 때 뱃지 */}
                <td className="px-3 py-2">
                  {editable && isEditingCategory ? editInput : (
                    <span
                      onClick={() => editable && startEdit(i, '구분')}
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${CATEGORY_COLOR[row.구분] ?? CATEGORY_COLOR['기타']} ${editable ? 'cursor-text' : ''}`}
                    >
                      {row.구분}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-800 font-medium">
                  {editable && isEditingName ? editInput : (
                    <span onClick={() => editable && startEdit(i, '컴포넌트명')} className={cellClass}>
                      {row.컴포넌트명}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {editable && isEditingDesc ? editInput : (
                    <span onClick={() => editable && startEdit(i, '설명')} className={cellClass}>
                      {row.설명}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-gray-600">
                  {editable && isEditingAction ? editInput : (
                    <span onClick={() => editable && startEdit(i, '인터랙션')} className={cellClass}>
                      {row.인터랙션}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function DescriptionTab({ projectId }: Props) {
  const [flatNodes, setFlatNodes] = useState<IANode[]>([])
  const [iaLoaded, setIaLoaded] = useState(false)
  const [selectedNode, setSelectedNode] = useState<IANode | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<DescRow[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedDescs, setSavedDescs] = useState<ScreenDesc[]>([])

  // IA 트리 로드
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/ia?project_id=${projectId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tree_data) setFlatNodes(flattenNodes(data.tree_data))
        setIaLoaded(true)
      })
      .catch(() => setIaLoaded(true))
  }, [projectId])

  // 화면 선택 시 이전 분석 기록 로드
  const fetchSavedDescs = async (nodeId: string) => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/screen-descs?project_id=${projectId}&ia_node_id=${nodeId}`
      )
      if (res.ok) setSavedDescs(await res.json())
    } catch { /* 무시 */ }
  }

  const handleNodeSelect = (node: IANode) => {
    if (node.type === 'element') return
    setSelectedNode(node)
    setImagePreview(null)
    setImageBase64(null)
    setResult(null)
    setSaved(false)
    setSavedDescs([])
    fetchSavedDescs(node.id)
  }

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 800
        let w = img.width
        let h = img.height
        if (w > MAX || h > MAX) {
          if (w > h) { h = (h * MAX) / w; w = MAX }
          else { w = (w * MAX) / h; h = MAX }
        }
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/jpeg', 0.7).split(',')[1])
      }
      img.src = url
    })
  }

  // document 레벨 paste 이벤트 — 화면 선택 상태에서 어디서든 Ctrl+V
  useEffect(() => {
    if (!selectedNode) return

    const handler = async (e: ClipboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return

      const items = e.clipboardData?.items
      if (!items) return

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile()
          if (!blob) continue
          const compressed = await compressImage(blob)
          setImagePreview(`data:image/jpeg;base64,${compressed}`)
          setImageBase64(compressed)
          setResult(null)
          setSaved(false)
          break
        }
      }
    }

    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [selectedNode])

  const handleAnalyze = async () => {
    if (!selectedNode || !imageBase64 || analyzing) return
    setAnalyzing(true)
    setResult(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/screen-descs/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          ia_node_id: selectedNode.id,
          ia_node_label: selectedNode.label,
          image_base64: imageBase64,
          media_type: 'image/jpeg',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setResult(data.result_json)
      }
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSave = async () => {
    if (!selectedNode || !imageBase64 || !result || saving) return
    setSaving(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/screen-descs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          ia_node_id: selectedNode.id,
          ia_node_label: selectedNode.label,
          image_base64: imageBase64,
          result_json: result,
        }),
      })
      if (res.ok) {
        setSaved(true)
        await fetchSavedDescs(selectedNode.id)
      }
    } finally {
      setSaving(false)
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
    <div className="flex h-full">
      {/* 좌측 패널 30% */}
      <div className="w-[30%] border-r border-gray-200 flex flex-col overflow-hidden shrink-0">
        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">화면 선택</p>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {!iaLoaded ? (
            <p className="px-4 py-3 text-xs text-gray-400">로딩 중...</p>
          ) : flatNodes.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">먼저 IA를 생성해주세요</p>
          ) : (
            flatNodes.map((node) => {
              const isSelectable = node.type !== 'element'
              const isSelected = selectedNode?.id === node.id
              return (
                <div
                  key={node.id}
                  onClick={() => isSelectable && handleNodeSelect(node)}
                  style={{ paddingLeft: `${node.depth * 14 + 12}px` }}
                  className={`flex items-center gap-1.5 py-1.5 pr-3 mx-1 rounded-md text-sm transition-colors ${
                    isSelectable
                      ? isSelected
                        ? 'bg-indigo-50 text-indigo-700 font-medium cursor-pointer'
                        : 'text-gray-700 hover:bg-gray-100 cursor-pointer'
                      : 'text-gray-400 cursor-default'
                  }`}
                >
                  <span className="text-xs shrink-0">
                    {node.type === 'page' ? '📄' : node.type === 'component' ? '▫' : '·'}
                  </span>
                  <span className="truncate">{node.label}</span>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 우측 작업 영역 70% */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedNode ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400 text-sm">좌측에서 page 타입 화면을 선택하세요</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">{selectedNode.label}</h2>

            {/* 1) 이미지 붙여넣기 영역 */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 mb-3 overflow-hidden">
              {imagePreview ? (
                <div className="flex flex-col items-center gap-2 p-4">
                  <img
                    src={imagePreview}
                    alt="붙여넣기된 화면 이미지"
                    className="max-h-52 rounded-lg object-contain"
                  />
                  <p className="text-xs text-gray-400">다시 Ctrl+V로 교체 가능</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-1">
                  <p className="text-gray-400 text-sm">화면 이미지를 붙여넣으세요</p>
                  <p className="text-gray-300 text-xs">Ctrl+V</p>
                </div>
              )}
            </div>

            {imageBase64 && (
              <div className="mb-5">
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {analyzing ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      분석 중...
                    </>
                  ) : (
                    '분석 시작'
                  )}
                </button>
              </div>
            )}

            {/* 2) 분석 결과 영역 */}
            {result && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-700">분석 결과</h3>
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
                <ResultTable
                  rows={result}
                  editable
                  onChange={(updated) => {
                    setResult(updated)
                    setSaved(false)  // 셀 수정 시 저장 상태 초기화
                  }}
                />
              </div>
            )}

            {/* 이전 분석 기록 */}
            {savedDescs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-3">이전 분석 기록</h3>
                <div className="space-y-4">
                  {savedDescs.map((desc) => (
                    <div key={desc.id} className="border border-gray-200 rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                        <span className="text-xs text-gray-400">{formatDate(desc.created_at)}</span>
                      </div>
                      <ResultTable rows={desc.result_json as DescRow[]} />
                    </div>
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
