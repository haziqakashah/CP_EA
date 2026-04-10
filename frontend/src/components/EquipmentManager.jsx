import React, { useEffect, useMemo, useState } from 'react'
import { auditAPI } from '../services/api'
import '../styles/EquipmentManager.css'

const EQUIPMENT_TYPES = [
  'chiller',
  'boiler',
  'ahu',
  'pump',
  'fan',
  'compressor',
  'cooling_tower',
  'room survey'
]

function EquipmentManager({ auditId, onEquipmentUpdated }) {
  const [equipment, setEquipment] = useState([])
  const [templates, setTemplates] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    equipment_type: 'chiller',
    location: '',
    notes: ''
  })

  const selectedTemplate = useMemo(
    () => templates[formData.equipment_type] || null,
    [formData.equipment_type, templates]
  )

  const fetchEquipment = async () => {
    setLoading(true)
    try {
      const response = await auditAPI.getEquipment(auditId)
      setEquipment(response.data)
      setError(null)
      if (onEquipmentUpdated) {
        onEquipmentUpdated(response.data)
      }
    } catch (err) {
      setError('Failed to load equipment')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await auditAPI.getTemplates()
      setTemplates(response.data || {})
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchEquipment()
    fetchTemplates()
  }, [auditId])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      await auditAPI.createEquipment(auditId, formData)
      setFormData({
        name: '',
        equipment_type: 'chiller',
        location: '',
        notes: ''
      })
      fetchEquipment()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add equipment')
      console.error(err)
    }
  }

  const handleDelete = async (equipmentId) => {
    try {
      await auditAPI.deleteEquipment(auditId, equipmentId)
      fetchEquipment()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete equipment')
      console.error(err)
    }
  }

  return (
    <div className="equipment-manager">
      <div className="section-heading">
        <h3>Audited Items</h3>
        <p>Add the equipment and room survey items covered in this audit, then upload and review each one separately.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="equipment-form" onSubmit={handleSubmit}>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Item name, e.g. Chiller 1 or Level 3 Room Survey"
          required
        />
        <input
          type="text"
          name="equipment_type"
          list="equipment-type-options"
          value={formData.equipment_type}
          onChange={handleChange}
          placeholder="Type, e.g. chiller, room survey, or plate heat exchanger"
          required
        />
        <datalist id="equipment-type-options">
          {EQUIPMENT_TYPES.map((type) => (
            <option key={type} value={type} />
          ))}
        </datalist>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="Location or plant room"
        />
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="2"
          placeholder="Notes, tag number, or workbook tab naming hints"
        />
        {selectedTemplate && (
          <div className="template-preview">
            <strong>{selectedTemplate.label} template</strong>
            <p>Recommended analyses: {selectedTemplate.analyses.join(', ') || 'None'}</p>
          </div>
        )}
        <button type="submit" className="btn btn-primary">Add Item</button>
      </form>

      {loading ? (
        <p className="loading">Loading equipment...</p>
      ) : equipment.length === 0 ? (
        <p className="empty-state">No items registered yet. Add an equipment or room survey item first, then map its analysis data to it.</p>
      ) : (
        <div className="equipment-grid">
          {equipment.map((item) => (
            <article key={item.id} className="equipment-card">
              <div>
                <h4>{item.name}</h4>
                <p className="equipment-type">{item.equipment_type.toUpperCase()}</p>
                {item.location && <p>{item.location}</p>}
                {item.notes && <p className="equipment-notes">{item.notes}</p>}
                {item.profile_template && (
                  <p className="equipment-template">Template: {item.profile_template}</p>
                )}
              </div>
              <button type="button" className="btn btn-danger" onClick={() => handleDelete(item.id)}>
                Remove
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default EquipmentManager
