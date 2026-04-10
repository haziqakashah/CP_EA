import React, { useEffect, useState } from 'react'
import { auditAPI } from '../services/api'
import BuildingDashboard from '../components/BuildingDashboard'
import BatchManager from '../components/BatchManager'
import EquipmentManager from '../components/EquipmentManager'
import DataUpload from '../components/DataUpload'
import DataView from '../components/DataView'
import '../styles/AuditDetail.css'

function AuditDetail({ auditId, onBack }) {
  const [audit, setAudit] = useState(null)
  const [equipmentList, setEquipmentList] = useState([])
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    fetchAudit()
  }, [auditId])

  const fetchAudit = async () => {
    setLoading(true)
    try {
      const response = await auditAPI.getById(auditId)
      const nextEquipment = response.data.equipment || []
      setAudit(response.data)
      setEquipmentList(nextEquipment)
      if (!selectedEquipmentId && nextEquipment.length > 0) {
        setSelectedEquipmentId(nextEquipment[0].id)
      } else if (selectedEquipmentId && !nextEquipment.some((item) => item.id === selectedEquipmentId)) {
        setSelectedEquipmentId(nextEquipment[0]?.id ?? null)
      }
      setError(null)
    } catch (err) {
      setError('Failed to load audit details')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
    fetchAudit()
  }

  const handleEquipmentUpdated = (equipment) => {
    setEquipmentList(equipment)
    if (!selectedEquipmentId && equipment.length > 0) {
      setSelectedEquipmentId(equipment[0].id)
    } else if (selectedEquipmentId && !equipment.some((item) => item.id === selectedEquipmentId)) {
      setSelectedEquipmentId(equipment[0]?.id ?? null)
    }
  }

  const selectedEquipment = equipmentList.find((item) => item.id === selectedEquipmentId) || null

  if (loading) return <p className="loading">Loading audit...</p>
  if (error) return <p className="error-message">{error}</p>
  if (!audit) return null

  return (
    <div className="audit-detail">
      <button className="btn btn-secondary back-btn" onClick={onBack}>
        Back to Audits
      </button>

      <div className="audit-shell">
        <div className="detail-header">
          <p className="eyebrow">Audit Overview</p>
          <h2>{audit.name}</h2>
          {audit.building_name && <p className="detail-meta">Building: {audit.building_name}</p>}
          {audit.auditor_name && <p className="detail-meta">Auditor: {audit.auditor_name}</p>}
          <div className="audit-stats">
            <div className="audit-stat">
              <span className="label">Items</span>
              <span className="value">{equipmentList.length}</span>
            </div>
            <div className="audit-stat">
              <span className="label">Measurements</span>
              <span className="value">{audit.measurement_count || 0}</span>
            </div>
          </div>
        </div>

        <aside className="equipment-browser">
          <h3>Items</h3>
          {equipmentList.length === 0 ? (
            <p className="empty-state">Add equipment or room survey items below to start uploading analysis data.</p>
          ) : (
            equipmentList.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`equipment-browser-item ${selectedEquipmentId === item.id ? 'active' : ''}`}
                onClick={() => setSelectedEquipmentId(item.id)}
              >
                <span>{item.name}</span>
                <small>{item.equipment_type}</small>
              </button>
            ))
          )}
        </aside>
      </div>

      {audit.description && (
        <div className="detail-section">
          <p className="description">{audit.description}</p>
        </div>
      )}

      <div className="detail-content">
        <section className="detail-section">
          <BuildingDashboard
            auditId={auditId}
            refreshKey={refreshKey}
            onSelectProfile={setSelectedEquipmentId}
          />
        </section>

        <section className="detail-section">
          <EquipmentManager auditId={auditId} onEquipmentUpdated={handleEquipmentUpdated} />
        </section>

        <section className="detail-section">
          <DataUpload
            auditId={auditId}
            onUploadSuccess={handleRefresh}
            selectedEquipment={selectedEquipment}
          />
        </section>

        <section className="detail-section">
          <BatchManager auditId={auditId} refreshKey={refreshKey} onBatchUpdated={handleRefresh} />
        </section>

        <section className="detail-section">
          <DataView
            key={`${refreshKey}-${selectedEquipmentId || 'none'}`}
            auditId={auditId}
            selectedEquipment={selectedEquipment}
            auditName={audit.name}
          />
        </section>
      </div>
    </div>
  )
}

export default AuditDetail
