import React, { useEffect, useMemo, useState } from 'react'
import { dataAPI } from '../services/api'
import DataVisualization from '../components/DataVisualization'
import '../styles/DataView.css'

function prettifyMeasurementType(type) {
  if (!type) return 'Analysis'
  const labels = {
    lux_level: 'Lux Level Analysis',
    lux_distribution: 'Lux Distribution Analysis',
    temperature: 'Temperature Analysis',
    humidity: 'Humidity Analysis'
  }

  if (labels[type]) {
    return labels[type]
  }

  return `${type.charAt(0).toUpperCase()}${type.slice(1)} Analysis`
}

function analysisSubtitle(selectedEquipment, auditName) {
  const itemType = selectedEquipment?.equipment_type

  if (itemType === 'room survey') {
    return auditName
      ? `Viewing room survey analyses for ${auditName}.`
      : 'Viewing room survey analyses.'
  }

  return auditName
    ? `Viewing equipment-specific analyses for ${auditName}.`
    : 'Viewing equipment-specific analyses.'
}

function summaryHeading(stats) {
  const measurementLabels = {
    lux_level: 'Lux Level',
    lux_distribution: 'Lux Distribution',
    temperature: 'Room Temperature',
    humidity: 'Room Humidity'
  }

  const measurementLabel = measurementLabels[stats.measurement_type] || stats.measurement_type
  return `${stats.equipment_label || stats.equipment_type || 'Series'} - ${measurementLabel}`
}

function thresholdText(threshold) {
  if (!threshold) return 'No threshold configured'
  const parts = []
  if (threshold.min !== undefined) parts.push(`min ${threshold.min}`)
  if (threshold.max !== undefined) parts.push(`max ${threshold.max}`)
  return parts.join(' / ')
}

function plotOptionsFor(measurementType) {
  if (['lux_distribution', 'power', 'flow'].includes(measurementType)) {
    return ['line', 'bar']
  }

  if (['temperature', 'humidity', 'lux_level'].includes(measurementType)) {
    return ['line', 'scatter', 'bar']
  }

  return ['line', 'bar', 'scatter']
}

function DataView({ auditId, selectedEquipment, auditName }) {
  const [summary, setSummary] = useState(null)
  const [measurements, setMeasurements] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [plotTypes, setPlotTypes] = useState({})
  const [batchFilters, setBatchFilters] = useState({})

  useEffect(() => {
    fetchData()
  }, [auditId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [summaryRes, dataRes] = await Promise.all([
        dataAPI.getSummary(auditId),
        dataAPI.getByAuditId(auditId)
      ])
      setSummary(summaryRes.data.summary)
      setMeasurements(dataRes.data.measurements)
      setError(null)
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredMeasurements = selectedEquipment
    ? measurements.filter((measurement) => measurement.equipment_label === selectedEquipment.name)
    : []

  const filteredSummaryEntries = summary
    ? Object.entries(summary).filter(([, stats]) => (
        selectedEquipment ? stats.equipment_label === selectedEquipment.name : false
      ))
    : []

  const analysisGroups = useMemo(() => {
    const groups = {}

    filteredMeasurements.forEach((measurement) => {
      const key = measurement.measurement_type || 'other'
      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(measurement)
    })

    return groups
  }, [filteredMeasurements])

  const summaryGroups = useMemo(() => {
    const groups = {}

    filteredSummaryEntries.forEach(([key, stats]) => {
      const groupKey = stats.measurement_type || 'other'
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push([key, stats])
    })

    return groups
  }, [filteredSummaryEntries])

  const analysisCards = useMemo(() => (
    Object.entries(analysisGroups).map(([measurementType, groupMeasurements]) => {
      const batches = [...new Set(groupMeasurements.map((measurement) => measurement.import_batch || 'Imported data'))]
      const activeBatch = batchFilters[measurementType] || 'all'
      const visibleMeasurements = activeBatch === 'all'
        ? groupMeasurements
        : groupMeasurements.filter((measurement) => (measurement.import_batch || 'Imported data') === activeBatch)
      const visibleSummary = (summaryGroups[measurementType] || []).filter(([, stats]) => (
        activeBatch === 'all' ? true : (stats.import_batch || 'Imported data') === activeBatch
      ))
      const plotChoices = plotOptionsFor(measurementType)
      const activePlot = plotTypes[measurementType] || plotChoices[0]

      return {
        measurementType,
        batches,
        activeBatch,
        visibleMeasurements,
        visibleSummary,
        plotChoices,
        activePlot
      }
    })
  ), [analysisGroups, batchFilters, plotTypes, summaryGroups])

  const handlePlotChange = (measurementType, plotType) => {
    setPlotTypes((current) => ({
      ...current,
      [measurementType]: plotType
    }))
  }

  const handleBatchChange = (measurementType, batch) => {
    setBatchFilters((current) => ({
      ...current,
      [measurementType]: batch
    }))
  }

  useEffect(() => {
    if (!selectedEquipment?.preferred_plots) return

    setPlotTypes((current) => {
      const next = { ...current }
      Object.entries(selectedEquipment.preferred_plots).forEach(([measurementType, plotType]) => {
        if (!next[measurementType]) {
          next[measurementType] = plotType
        }
      })
      return next
    })
  }, [selectedEquipment])

  if (loading) return <p className="loading">Loading data...</p>
  if (error) return <p className="error-message">{error}</p>
  if (!selectedEquipment) {
    return <p className="empty-state">Add and select an equipment or room survey item to browse its analysis.</p>
  }
  if (!measurements || measurements.length === 0 || filteredMeasurements.length === 0) {
    return (
      <p className="empty-state">
        No measurement data mapped to {selectedEquipment.name} yet. Upload and map its workbook data to begin.
      </p>
    )
  }

  return (
    <div className="data-view">
      <div className="data-view-header">
        <div>
          <h3>{selectedEquipment.name}</h3>
          <p className="analysis-subtitle">
            {analysisSubtitle(selectedEquipment, auditName)}
          </p>
        </div>
        <div className="analysis-kpis">
          <div className="analysis-kpi">
            <span className="label">Analyses</span>
            <span className="value">{Object.keys(analysisGroups).length}</span>
          </div>
          <div className="analysis-kpi">
            <span className="label">Points</span>
            <span className="value">{filteredMeasurements.length}</span>
          </div>
        </div>
      </div>

      <div className="profile-banner">
        <span className="profile-label">Profile</span>
        <strong>{selectedEquipment.name}</strong>
        <small>{selectedEquipment.equipment_type}</small>
      </div>

      <div className="analysis-group-list">
        {analysisCards.map(({ measurementType, visibleMeasurements, visibleSummary, batches, activeBatch, plotChoices, activePlot }) => (
          <section key={measurementType} className="analysis-group">
            <div className="analysis-group-header">
              <div>
                <h4>{prettifyMeasurementType(measurementType)}</h4>
                <p>
                  {visibleMeasurements.length} point(s) across {new Set(visibleMeasurements.map((item) => item.source_column)).size} visible series
                </p>
              </div>

              <div className="analysis-controls">
                <label className="field-stack compact-field">
                  <span>Upload batch</span>
                  <select
                    value={activeBatch}
                    onChange={(event) => handleBatchChange(measurementType, event.target.value)}
                  >
                    <option value="all">All uploads</option>
                    {batches.map((batch) => (
                      <option key={batch} value={batch}>{batch}</option>
                    ))}
                  </select>
                </label>

                <label className="field-stack compact-field">
                  <span>Plot type</span>
                  <select
                    value={activePlot}
                    onChange={(event) => handlePlotChange(measurementType, event.target.value)}
                  >
                    {plotChoices.map((plotType) => (
                      <option key={plotType} value={plotType}>
                        {plotType.charAt(0).toUpperCase() + plotType.slice(1)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <DataVisualization
              measurements={visibleMeasurements}
              title={`${selectedEquipment.name} ${prettifyMeasurementType(measurementType)}`}
              plotType={activePlot}
            />

            <div className="summary-grid">
              {visibleSummary.map(([key, stats]) => (
                <div key={key} className="summary-card">
                  <h5>{summaryHeading(stats)}</h5>
                  {stats.import_batch && (
                    <div className="stat">
                      <span className="label">Batch:</span>
                      <span className="value">{stats.import_batch}</span>
                    </div>
                  )}
                  <div className="stat">
                    <span className="label">Threshold:</span>
                    <span className="value">{thresholdText(stats.threshold)}</span>
                  </div>
                  <div className={`threshold-pill ${stats.threshold_status.status}`}>
                    {stats.threshold_status.message}
                  </div>
                  {stats.source_sheet && (
                    <div className="stat">
                      <span className="label">Tab:</span>
                      <span className="value">{stats.source_sheet}</span>
                    </div>
                  )}
                  <div className="stat">
                    <span className="label">Unit:</span>
                    <span className="value">{stats.unit}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Count:</span>
                    <span className="value">{stats.count}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Min:</span>
                    <span className="value">{stats.min.toFixed(2)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Max:</span>
                    <span className="value">{stats.max.toFixed(2)}</span>
                  </div>
                  <div className="stat">
                    <span className="label">Avg:</span>
                    <span className="value">{stats.avg.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

export default DataView
