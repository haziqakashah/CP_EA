import React, { useState } from 'react'
import '../styles/AuditForm.css'

function AuditForm({ onSubmit, initialData = {} }) {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    building_name: initialData.building_name || '',
    auditor_name: initialData.auditor_name || '',
    description: initialData.description || ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      alert('Please enter an audit name')
      return
    }
    onSubmit(formData)
    setFormData({
      name: '',
      building_name: '',
      auditor_name: '',
      description: ''
    })
  }

  return (
    <form className="audit-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Audit Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., Q1 2024 Chiller Efficiency Audit"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="building_name">Building Name</label>
        <input
          type="text"
          id="building_name"
          name="building_name"
          value={formData.building_name}
          onChange={handleChange}
          placeholder="e.g., Main Office Building A"
        />
      </div>

      <div className="form-group">
        <label htmlFor="auditor_name">Auditor Name</label>
        <input
          type="text"
          id="auditor_name"
          name="auditor_name"
          value={formData.auditor_name}
          onChange={handleChange}
          placeholder="e.g., John Smith"
        />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Add any notes about this audit..."
          rows="4"
        />
      </div>

      <button type="submit" className="btn btn-primary">
        Create Audit
      </button>
    </form>
  )
}

export default AuditForm
