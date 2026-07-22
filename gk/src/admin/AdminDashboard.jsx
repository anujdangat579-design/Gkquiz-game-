import { useEffect, useState } from 'react'
import { getDashboardCounts } from '../lib/admin'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    setRefreshing(true)
    try {
      setStats(await getDashboardCounts())
      setError(null)
    } catch (err) {
      setError(err.message || 'Could not load dashboard stats.')
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (error) {
    return (
      <div className="card">
        <p style={{ color: 'var(--danger, #ff5c5c)', fontSize: 13 }}>{error}</p>
      </div>
    )
  }

  if (!stats) return <p className="muted">Loading dashboard…</p>

  const cards = [
    { label: 'Total Users', value: stats.totalUsers },
    { label: 'Active Users', value: stats.activeUsers },
    { label: 'Blocked Users', value: stats.blockedUsers },
    { label: 'Total Competitions', value: stats.totalMatches },
    { label: 'Completed Matches', value: stats.completedMatches },
    { label: 'Active Matches', value: stats.activeMatches },
    { label: 'Successful Payments', value: stats.paidPayments },
    { label: 'Failed Payments', value: stats.failedPayments },
    { label: 'Pending Refund Requests', value: stats.pendingRefunds, highlight: stats.pendingRefunds > 0 },
  ]

  return (
    <div>
      <div className="grid-2" style={{ marginBottom: 16 }}>
        {cards.map((c) => (
          <div key={c.label} className="card" style={{ padding: 14 }}>
            <p
              className="display"
              style={{ fontSize: 22, margin: 0, color: c.highlight ? 'var(--violet, #7c5cff)' : 'inherit' }}
            >
              {c.value}
            </p>
            <p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>{c.label}</p>
          </div>
        ))}
      </div>
      <button className="btn-secondary" onClick={load} disabled={refreshing}>
        {refreshing ? 'Refreshing…' : 'Refresh stats'}
      </button>
    </div>
  )
}
