import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listSessions } from '../api/client'
import Navbar from '../components/Navbar'
import SessionCard from '../components/SessionCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { Plus, FileSearch } from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listSessions()
      .then(data => setSessions(data.sessions || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-white">Review Sessions</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {user?.email} · {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link to="/upload" className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} />
            New Review
          </Link>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 text-red-300 text-sm px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex p-4 bg-gray-900 rounded-full mb-4">
              <FileSearch size={32} className="text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">No review sessions yet</p>
            <p className="text-gray-600 text-sm mt-1">Upload a proposal to get started</p>
            <Link to="/upload" className="btn-primary inline-flex items-center gap-2 mt-4 text-sm">
              <Plus size={16} />
              Upload your first proposal
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map(session => (
              <SessionCard key={session.id} session={session} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
