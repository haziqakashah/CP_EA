import React, { useEffect, useState } from 'react'
import { dataAPI } from '../services/api'
import '../styles/BatchManager.css'

function BatchManager({ auditId, refreshKey, onBatchUpdated }) {
  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchBatches()
  }, [auditId, refreshKey])

  const fetchBatches = async () => {
    setLoading(true)
    try {
      const response = await dataAPI.getBatches(auditId)
      setBatches(response.data)
      setError(null)
    } catch (err) {
      setError('Failed to load import batches')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRename = async (name) => {
    const newName = window.prompt('Rename import batch', name)
    if (!newName || newName === name) return

    try {
      await dataAPI.renameBatch(auditId, { old_name: name, new_name: newName })
      fetchBatches()
      onBatchUpdated?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to rename batch')
      console.error(err)
    }
  }

  const handleDelete = async (name) => {
    if (!window.confirm(`Delete all measurements in "${name}"?`)) return

    try {
      await dataAPI.deleteBatch(auditId, { name })
      fetchBatches()
      onBatchUpdated?.()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete batch')
      console.error(err)
    }
  }

  return (
    <div className="batch-manager">
      <div className="section-heading">
        <h3>Import Batches</h3>
        <p>Rename or delete specific uploads without affecting the rest of the building profile data.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading ? (
        <p className="loading">Loading batches...</p>
      ) : batches.length === 0 ? (
        <p className="empty-state">No import batches yet.</p>
      ) : (
        <div className="batch-list">
          {batches.map((batch) => (
            <article key={batch.name} className="batch-card">
              <div>
                <h4>{batch.name}</h4>
                <p>{batch.count} measurements</p>
                <small>{batch.items.join(', ')}</small>
              </div>
              <div className="batch-actions">
                <button type="button" className="btn btn-secondary" onClick={() => handleRename(batch.name)}>
                  Rename
                </button>
                <button type="button" className="btn btn-danger" onClick={() => handleDelete(batch.name)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default BatchManager
