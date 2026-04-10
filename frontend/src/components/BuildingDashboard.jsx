import React, { useEffect, useState } from 'react'
import { auditAPI } from '../services/api'
import '../styles/BuildingDashboard.css'

function downloadReport(report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${(report.audit?.building_name || report.audit?.name || 'audit-report').replace(/\s+/g, '_').toLowerCase()}_report.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function BuildingDashboard({ auditId, refreshKey, onSelectProfile }) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchDashboard()
  }, [auditId, refreshKey])

  const fetchDashboard = async () => {
    setLoading(true)
    try {
      const response = await auditAPI.getDashboard(auditId)
      setDashboard(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to load building dashboard')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleExportReport = async () => {
    try {
      const response = await auditAPI.getReport(auditId)
      downloadReport(response.data)
    } catch (err) {
      setError('Failed to export report')
      console.error(err)
    }
  }

  if (loading) return <p className="loading">Loading dashboard...</p>
  if (error) return <div className="error-message">{error}</div>
  if (!dashboard) return null

  return (
    <div className="building-dashboard">
      <div className="dashboard-header">
        <div>
          <h3>Building Dashboard</h3>
          <p>{dashboard.audit.building_name || dashboard.audit.name}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={handleExportReport}>
          Export Report
        </button>
      </div>

      <div className="dashboard-kpis">
        <div className="dashboard-kpi">
          <span className="label">Profiles</span>
          <span className="value">{dashboard.profile_count}</span>
        </div>
        <div className="dashboard-kpi">
          <span className="label">Upload Batches</span>
          <span className="value">{dashboard.batch_count}</span>
        </div>
        <div className="dashboard-kpi">
          <span className="label">Measurements</span>
          <span className="value">{dashboard.audit.measurement_count}</span>
        </div>
      </div>

      <div className="dashboard-profiles">
        {dashboard.profiles.map((entry) => (
          <article key={entry.profile.id} className="dashboard-profile-card">
            <div className="dashboard-profile-top">
              <div>
                <h4>{entry.profile.name}</h4>
                <p>{entry.profile.equipment_type}</p>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => onSelectProfile?.(entry.profile.id)}>
                Open Profile
              </button>
            </div>
            <p className="dashboard-profile-meta">
              Latest batch: {entry.latest_batch || 'No uploads yet'}
            </p>
            <div className="dashboard-chip-row">
              {entry.measurement_types.length > 0 ? entry.measurement_types.map((item) => (
                <span key={item} className="dashboard-chip">{item}</span>
              )) : <span className="dashboard-chip muted">No analyses yet</span>}
            </div>
            <div className="dashboard-summary-list">
              {entry.summary.map((summary) => (
                <div key={summary.measurement_type} className={`dashboard-summary-item ${summary.threshold_status.status}`}>
                  <strong>{summary.measurement_type}</strong>
                  <span>{summary.avg.toFixed(2)} {summary.unit}</span>
                  <small>{summary.threshold_status.message}</small>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default BuildingDashboard
