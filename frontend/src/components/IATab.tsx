import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'

interface TreeNode {
  id: string
  label: string
  depth: number
  type: 'page' | 'component' | 'element'
  children: TreeNode[]
}

interface DisplayNode {
  node: TreeNode
  isFirst: boolean
  isLast: boolean
}

interface Props {
  projectId: string
  projectName: string
}

const DEPTH_COLORS = ['bg-indigo-400', 'bg-blue-400', 'bg-teal-400', 'bg-gray-300']
const genId = () => Math.random().toString(36).slice(2, 9)

// ---- 트리 유틸 ----

function flatten(nodes: TreeNode[]): DisplayNode[] {
  const result: DisplayNode[] = []
  function dfs(arr: TreeNode[]) {
    arr.forEach((node, idx) => {
      result.push({ node, isFirst: idx === 0, isLast: idx === arr.length - 1 })
      dfs(node.children ?? [])
    })
  }
  dfs(nodes)
  return result
}

function updateNode(nodes: TreeNode[], id: string, patch: Partial<TreeNode>): TreeNode[] {
  return nodes.map(n =>
    n.id === id
      ? { ...n, ...patch }
      : { ...n, children: updateNode(n.children ?? [], id, patch) }
  )
}

function deleteNode(nodes: TreeNode[], id: string): TreeNode[] {
  return nodes
    .filter(n => n.id !== id)
    .map(n => ({ ...n, children: deleteNode(n.children ?? [], id) }))
}

function addChild(nodes: TreeNode[], parentId: string, parentDepth: number): TreeNode[] {
  return nodes.map(n => {
    if (n.id === parentId) {
      return {
        ...n,
        children: [
          ...(n.children ?? []),
          { id: genId(), label: '새 항목', depth: parentDepth + 1, type: 'page', children: [] },
        ],
      }
    }
    return { ...n, children: addChild(n.children ?? [], parentId, parentDepth) }
  })
}

function moveNode(nodes: TreeNode[], id: string, dir: 'up' | 'down'): TreeNode[] {
  const idx = nodes.findIndex(n => n.id === id)
  if (idx !== -1) {
    const to = dir === 'up' ? idx - 1 : idx + 1
    if (to < 0 || to >= nodes.length) return nodes
    const arr = [...nodes]
    ;[arr[idx], arr[to]] = [arr[to], arr[idx]]
    return arr
  }
  return nodes.map(n => ({ ...n, children: moveNode(n.children ?? [], id, dir) }))
}

// ---- Excel 변환 ----

function treeToRows(nodes: TreeNode[]): Record<string, string>[] {
  const rows: Record<string, string>[] = []
  function dfs(node: TreeNode) {
    const row: Record<string, string> = { '뎁스0': '', '뎁스1': '', '뎁스2': '', '뎁스3': '', '타입': node.type, '비고': '' }
    row[`뎁스${node.depth}`] = node.label
    rows.push(row)
    ;(node.children ?? []).forEach(dfs)
  }
  nodes.forEach(dfs)
  return rows
}

function rowsToTree(rows: Record<string, string>[]): TreeNode[] {
  const root: TreeNode[] = []
  const stack: (TreeNode | null)[] = [null, null, null, null]

  for (const row of rows) {
    let depth = -1
    let label = ''
    for (let d = 3; d >= 0; d--) {
      const v = String(row[`뎁스${d}`] ?? '').trim()
      if (v) { depth = d; label = v; break }
    }
    if (depth === -1) continue

    const type = (['page', 'component', 'element'] as const).includes(row['타입'] as never)
      ? (row['타입'] as TreeNode['type'])
      : 'page'

    const node: TreeNode = { id: genId(), label, depth, type, children: [] }

    if (depth === 0) {
      root.push(node)
    } else {
      stack[depth - 1]?.children.push(node)
    }
    stack[depth] = node
    for (let d = depth + 1; d < 4; d++) stack[d] = null
  }
  return root
}

// ---- 컴포넌트 ----

export default function IATab({ projectId, projectName }: Props) {
  const [description, setDescription] = useState('')
  const [tree, setTree] = useState<TreeNode[]>([])
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`http://localhost:8000/ia?project_id=${projectId}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (data?.tree_data) setTree(data.tree_data) })
      .catch(() => {})
  }, [projectId])

  const handleGenerate = async () => {
    if (!description.trim() || generating) return
    setGenerating(true)
    setSaved(false)
    try {
      const res = await fetch('http://localhost:8000/ia/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, description }),
      })
      if (res.ok) {
        const data = await res.json()
        setTree(data.tree_data)
      }
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (saving || tree.length === 0) return
    setSaving(true)
    try {
      const res = await fetch('http://localhost:8000/ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, title: 'IA', tree_data: tree }),
      })
      if (res.ok) setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = () => {
    const rows = treeToRows(tree)
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ['뎁스0', '뎁스1', '뎁스2', '뎁스3', '타입', '비고'],
    })
    ws['!cols'] = [20, 20, 20, 20, 12, 20].map(w => ({ width: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'IA')
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    XLSX.writeFile(wb, `${projectName}_IA_${date}.xlsx`)
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const wb = XLSX.read(ev.target?.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws)
      setTree(rowsToTree(rows))
      setSaved(false)
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  const flatNodes = flatten(tree)

  return (
    <div className="flex flex-col h-full gap-4">
      {/* IA 생성 영역 */}
      <div className="shrink-0 flex gap-3 items-start">
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleGenerate() }}
          placeholder="서비스 개요 또는 요건 요약을 입력하세요"
          rows={3}
          className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 leading-relaxed"
        />
        <button
          onClick={handleGenerate}
          disabled={!description.trim() || generating}
          className="shrink-0 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
        >
          {generating ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              생성 중...
            </>
          ) : (
            'IA 생성'
          )}
        </button>
      </div>

      {/* 트리 에디터 */}
      <div className="flex-1 min-h-0 flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white">
        {/* 액션 바 */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
          <span className="text-xs font-medium text-gray-500">IA 트리</span>
          <div className="flex items-center gap-2">
            {/* 엑셀 업로드 */}
            <label className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs hover:bg-gray-100 cursor-pointer transition-colors">
              엑셀 업로드
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleUpload}
              />
            </label>
            {/* 엑셀 다운로드 */}
            <button
              onClick={handleDownload}
              disabled={tree.length === 0}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              엑셀 다운로드
            </button>
            {/* 저장 */}
            {saved ? (
              <span className="text-xs text-green-600 font-medium px-1">저장됨 ✓</span>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || tree.length === 0}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            )}
          </div>
        </div>

        {/* 트리 목록 */}
        {tree.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-1">IA가 없습니다</p>
              <p className="text-gray-300 text-xs mb-3">위에서 생성하거나 엑셀을 업로드하세요</p>
              <button
                onClick={() =>
                  setTree([{ id: genId(), label: '새 항목', depth: 0, type: 'page', children: [] }])
                }
                className="text-xs text-indigo-500 hover:text-indigo-700 underline"
              >
                직접 추가
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* 컬럼 헤더 */}
            <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-50 border-b border-gray-100 text-xs text-gray-400 font-medium sticky top-0">
              <span className="flex-1">라벨</span>
              <span className="w-28 shrink-0">타입</span>
              <span className="w-14 shrink-0 text-center">순서</span>
              <span className="w-12 shrink-0 text-center">자식</span>
              <span className="w-8 shrink-0 text-center">삭제</span>
            </div>

            {flatNodes.map(({ node, isFirst, isLast }) => (
              <div
                key={node.id}
                className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-50 hover:bg-gray-50 group min-w-0"
              >
                {/* 라벨 (들여쓰기 + 인라인 편집) */}
                <div
                  className="flex-1 flex items-center gap-2 min-w-0"
                  style={{ paddingLeft: node.depth * 20 }}
                >
                  <span
                    className={`shrink-0 w-2 h-2 rounded-full ${DEPTH_COLORS[node.depth] ?? 'bg-gray-200'}`}
                  />
                  {editingId === node.id ? (
                    <input
                      autoFocus
                      value={node.label}
                      onChange={e =>
                        setTree(t => updateNode(t, node.id, { label: e.target.value }))
                      }
                      onBlur={() => setEditingId(null)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') setEditingId(null)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      className="flex-1 min-w-0 border border-indigo-300 rounded px-1.5 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  ) : (
                    <span
                      onClick={() => setEditingId(node.id)}
                      title="클릭하여 편집"
                      className="text-sm text-gray-800 truncate cursor-text hover:text-indigo-600 select-none"
                    >
                      {node.label || '(빈 항목)'}
                    </span>
                  )}
                </div>

                {/* 타입 셀렉트 */}
                <select
                  value={node.type}
                  onChange={e =>
                    setTree(t =>
                      updateNode(t, node.id, { type: e.target.value as TreeNode['type'] })
                    )
                  }
                  className="w-28 shrink-0 border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                >
                  <option value="page">page</option>
                  <option value="component">component</option>
                  <option value="element">element</option>
                </select>

                {/* 위/아래 순서 변경 */}
                <div className="flex gap-0.5 w-14 shrink-0 justify-center">
                  <button
                    onClick={() => setTree(t => moveNode(t, node.id, 'up'))}
                    disabled={isFirst}
                    className="px-1 py-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed text-sm leading-none"
                    title="위로"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => setTree(t => moveNode(t, node.id, 'down'))}
                    disabled={isLast}
                    className="px-1 py-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-20 disabled:cursor-not-allowed text-sm leading-none"
                    title="아래로"
                  >
                    ↓
                  </button>
                </div>

                {/* 자식 추가 */}
                <button
                  onClick={() => {
                    if (node.depth < 3) {
                      setTree(t => addChild(t, node.id, node.depth))
                      setSaved(false)
                    }
                  }}
                  disabled={node.depth >= 3}
                  title="자식 노드 추가"
                  className="w-12 shrink-0 text-center text-xs text-indigo-500 hover:text-indigo-700 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  + 자식
                </button>

                {/* 삭제 */}
                <button
                  onClick={() => {
                    setTree(t => deleteNode(t, node.id))
                    setSaved(false)
                  }}
                  title="삭제"
                  className="w-8 shrink-0 text-center text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* 루트 노드 추가 */}
            <div className="px-4 py-2.5">
              <button
                onClick={() => {
                  setTree(t => [
                    ...t,
                    { id: genId(), label: '새 항목', depth: 0, type: 'page', children: [] },
                  ])
                  setSaved(false)
                }}
                className="text-xs text-indigo-500 hover:text-indigo-700"
              >
                + 루트 항목 추가
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
