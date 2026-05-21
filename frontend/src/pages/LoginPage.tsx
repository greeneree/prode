import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!password.trim() || loading) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        const { role } = await res.json()
        sessionStorage.setItem('prode_auth', role)
        navigate('/', { replace: true })
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm p-8">
        {/* 로고 */}
        <div className="text-center mb-8">
          <p className="text-3xl font-bold tracking-tight text-gray-900">prode</p>
          <p className="text-sm text-gray-400 mt-1">기획 자동화 툴</p>
        </div>

        <div className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin() }}
            placeholder="비밀번호를 입력하세요"
            autoFocus
            className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors ${
              error ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
          />

          {error && (
            <p className="text-sm text-red-500">비밀번호가 올바르지 않습니다</p>
          )}

          <button
            onClick={handleLogin}
            disabled={!password.trim() || loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                로그인 중...
              </>
            ) : '로그인'}
          </button>
        </div>
      </div>
    </div>
  )
}
