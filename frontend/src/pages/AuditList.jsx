import React, { useState, useEffect } from 'react'
import { auditAPI } from '../services/api'
import AuditForm from '../components/AuditForm'
import '../styles/AuditList.css'

function AuditList({ onSelectAudit }) {
  const [audits, setAudits] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchAudits()
  }, [])

  const fetchAudits = async () => {
    setLoading(true)
    try {
      const response = await auditAPI.getAll()
      setAudits(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to load audits')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAudit = async (data) => {
    try {
      await auditAPI.create(data)
      setShowForm(false)
      fetchAudits()
    } catch (err) {
      setError('Failed to create audit')
      console.error(err)
    }
  }

  const handleDeleteAudit = async (id) => {
    if (confirm('Are you sure you want to delete this audit?')) {
      try {
        await auditAPI.delete(id)
        fetchAudits()
      } catch (err) {
        setError('Failed to delete audit')
        console.error(err)
      }
    }
  }

  return (
    <main className="audit-list">
      <div className="audit-list-header">
        <h2>Energy Audits</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'Cancel' : '+ New Audit'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <AuditForm onSubmit={handleCreateAudit} />
      )}

      {loading ? (
        <p className="loading">Loading audits...</p>
      ) : audits.length === 0 ? (
        <p className="empty-state">No audits yet. Create one to get started!</p>
      ) : (
        <div className="audit-grid">
          {audits.map(audit => (
            <div key={audit.id} className="audit-card">
              <div className="audit-card-header">
                <h3>{audit.name}</h3>
                <span className="badge">{audit.measurement_count} measurements</span>
              </div>
              
              <div className="audit-card-body">
                {audit.building_name && (
                  <p><strong>Building:</strong> {audit.building_name}</p>
                )}
                {audit.auditor_name && (
                  <p><strong>Auditor:</strong> {audit.auditor_name}</p>
                )}
                {audit.description && (
                  <p className="description">{audit.description}</p>
                )}
              </div>

              <div className="audit-card-footer">
                <button 
                  className="btn btn-secondary"
                  onClick={() => onSelectAudit(audit.id)}
                >
                  View Details
                </button>
                <button 
                  className="btn btn-danger"
                  onClick={() => handleDeleteAudit(audit.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}

export default AuditList
