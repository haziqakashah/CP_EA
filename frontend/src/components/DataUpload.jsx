import React, { useEffect, useMemo, useState } from 'react'
import { dataAPI } from '../services/api'
import '../styles/DataUpload.css'

const MEASUREMENT_TYPES = ['temperature', 'humidity', 'lux_level', 'lux_distribution', 'power', 'flow', 'pressure']

function measurementPlaceholder(selectedEquipment) {
  if (selectedEquipment?.equipment_type === 'room survey') {
    return 'e.g. lux_level'
  }

  return 'e.g. power'
}

function buildDefaultImportBatch(filename) {
  if (!filename) return ''

  const now = new Date()
  const stamp = now.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })

  return `${filename} - ${stamp}`
}

function createSheetSelection(sheet, selectedEquipment) {
  return {
    sheet_name: sheet.sheet_name,
    enabled: true,
    timestamp_column: sheet.timestamp_candidates[0] || '',
    columns: sheet.columns.map((column) => ({
      column_name: column.column_name,
      selected: Boolean(column.recommended_measurement_type),
      equipment_label: selectedEquipment?.name || column.recommended_equipment_label || '',
      equipment_type: selectedEquipment?.equipment_type || column.recommended_equipment_type || 'equipment',
      measurement_type: column.recommended_measurement_type || '',
      unit: column.recommended_unit || ''
    }))
  }
}

function DataUpload({ auditId, onUploadSuccess, selectedEquipment }) {
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [previewData, setPreviewData] = useState(null)
  const [uploadToken, setUploadToken] = useState(null)
  const [filename, setFilename] = useState('')
  const [importBatch, setImportBatch] = useState('')
  const [sheetSelections, setSheetSelections] = useState([])
  const [activeSheetName, setActiveSheetName] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [cleanupOptions, setCleanupOptions] = useState({
    remove_empty_rows: true,
    sort_by_timestamp: true,
    remove_duplicate_timestamps: false,
    day_first: false
  })

  const activeSheet = useMemo(
    () => sheetSelections.find((sheet) => sheet.sheet_name === activeSheetName),
    [sheetSelections, activeSheetName]
  )

  useEffect(() => {
    setPreviewData(null)
    setUploadToken(null)
    setFilename('')
    setImportBatch('')
    setSheetSelections([])
    setActiveSheetName(null)
    setError(null)
    setSuccess(null)
  }, [selectedEquipment?.id])

  const handleFile = async (file) => {
    if (!file) return

    if (!selectedEquipment) {
      setError('Select an item before uploading data')
      return
    }

    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    const validExtensions = ['.csv', '.xlsx', '.xls']

    const hasValidType = validTypes.includes(file.type)
    const hasValidExt = validExtensions.some((ext) => file.name.endsWith(ext))

    if (!hasValidType && !hasValidExt) {
      setError('Please upload a CSV or Excel file')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await dataAPI.preview(auditId, file)
      const preview = response.data.preview
      const nextSelections = preview.sheets.map((sheet) => createSheetSelection(sheet, selectedEquipment))

      setPreviewData(preview)
      setUploadToken(response.data.upload_token)
      setFilename(response.data.filename)
      setImportBatch(buildDefaultImportBatch(response.data.filename))
      setSheetSelections(nextSelections)
      setActiveSheetName(nextSelections[0]?.sheet_name || null)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to inspect workbook')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (event) => {
    event.preventDefault()
    event.stopPropagation()

    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true)
    } else if (event.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (event) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)

    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFile(event.dataTransfer.files[0])
    }
  }

  const handleChange = (event) => {
    if (event.target.files && event.target.files[0]) {
      handleFile(event.target.files[0])
    }
  }

  const updateSheet = (sheetName, updater) => {
    setSheetSelections((current) => current.map((sheet) => {
      if (sheet.sheet_name !== sheetName) return sheet
      return updater(sheet)
    }))
  }

  const updateColumn = (sheetName, columnName, field, value) => {
    updateSheet(sheetName, (sheet) => ({
      ...sheet,
      columns: sheet.columns.map((column) => (
        column.column_name === columnName
          ? { ...column, [field]: value }
          : column
      ))
    }))
  }

  const handleImport = async () => {
    if (!selectedEquipment) {
      setError('Select an item before importing data')
      return
    }

    const selections = sheetSelections
      .filter((sheet) => sheet.enabled)
      .map((sheet) => ({
        sheet_name: sheet.sheet_name,
        timestamp_column: sheet.timestamp_column,
        columns: sheet.columns
      }))

    if (!uploadToken || selections.length === 0) {
      setError('Select at least one tab before importing')
      return
    }

    setImporting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await dataAPI.importSelection({
        audit_id: auditId,
        upload_token: uploadToken,
        import_batch: importBatch.trim() || buildDefaultImportBatch(filename),
        selections,
        cleanup_options: cleanupOptions
      })
      setSuccess(`Successfully imported ${response.data.measurement_count} measurements`)
      if (onUploadSuccess) {
        onUploadSuccess()
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import selected data')
      console.error(err)
    } finally {
      setImporting(false)
    }
  }

  const toggleCleanupOption = (field) => {
    setCleanupOptions((current) => ({
      ...current,
      [field]: !current[field]
    }))
  }

  return (
    <div className="data-upload">
      <h3>Analysis Upload</h3>
      <p className="upload-description">
        {selectedEquipment
          ? `Upload workbook data for ${selectedEquipment.name}, then map tabs and columns into analysis types like lux, temperature, humidity, or power.`
          : 'Select an equipment or room survey item first, then upload its analysis data.'}
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {!selectedEquipment && (
        <div className="equipment-upload-placeholder">
          <h4>Select Item First</h4>
          <p>Choose the equipment or room survey item you want to work on, then upload and map its analysis workbook.</p>
        </div>
      )}

      {selectedEquipment && (
        <div className="equipment-upload-context">
          <span className="context-label">Current Item</span>
          <strong>{selectedEquipment.name}</strong>
          <small>{selectedEquipment.equipment_type}</small>
        </div>
      )}

      {selectedEquipment && (
        <div
          className={`upload-area ${dragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-input"
            accept=".csv,.xlsx,.xls"
            onChange={handleChange}
            disabled={uploading || importing}
          />
          <label htmlFor="file-input">
            <div className="upload-icon">Preview Workbook</div>
            <p>Drop a workbook or CSV here</p>
            <p className="upload-hint">We will inspect the tabs and let you choose the data columns manually for {selectedEquipment.name}</p>
          </label>
        </div>
      )}

      {uploading && <p className="loading">Reading workbook structure...</p>}

      {previewData && (
        <div className="mapping-workspace">
          <div className="cleanup-panel">
            <h4>Data Cleanup</h4>
            <p>Choose optional cleanup steps to apply before the selected workbook data is imported.</p>
            <div className="cleanup-grid">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={cleanupOptions.remove_empty_rows}
                  onChange={() => toggleCleanupOption('remove_empty_rows')}
                />
                Remove empty rows
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={cleanupOptions.sort_by_timestamp}
                  onChange={() => toggleCleanupOption('sort_by_timestamp')}
                />
                Sort by timestamp
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={cleanupOptions.remove_duplicate_timestamps}
                  onChange={() => toggleCleanupOption('remove_duplicate_timestamps')}
                />
                Keep latest duplicate timestamp
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={cleanupOptions.day_first}
                  onChange={() => toggleCleanupOption('day_first')}
                />
                Parse dates as day/month/year
              </label>
            </div>
          </div>

          <div className="mapping-header">
            <div>
              <h4>{filename}</h4>
              <p>{previewData.sheet_count} tab(s) detected</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={handleImport} disabled={importing}>
              {importing ? 'Importing...' : 'Import Selected Data'}
            </button>
          </div>

          <label className="field-stack import-batch-field">
            <span>Import batch label</span>
            <input
              type="text"
              value={importBatch}
              onChange={(event) => setImportBatch(event.target.value)}
              placeholder="e.g. Baseline survey - Apr 10"
            />
          </label>

          <div className="sheet-selector">
            {sheetSelections.map((sheet) => (
              <button
                key={sheet.sheet_name}
                type="button"
                className={`sheet-chip ${sheet.sheet_name === activeSheetName ? 'active' : ''}`}
                onClick={() => setActiveSheetName(sheet.sheet_name)}
              >
                {sheet.sheet_name}
              </button>
            ))}
          </div>

          {activeSheet && (
            <div className="sheet-panel">
              <div className="sheet-controls">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={activeSheet.enabled}
                    onChange={(event) => updateSheet(activeSheet.sheet_name, (sheet) => ({
                      ...sheet,
                      enabled: event.target.checked
                    }))}
                  />
                  Import this tab
                </label>

                <label className="field-stack">
                  <span>Timestamp column</span>
                  <select
                    value={activeSheet.timestamp_column}
                    onChange={(event) => updateSheet(activeSheet.sheet_name, (sheet) => ({
                      ...sheet,
                      timestamp_column: event.target.value
                    }))}
                  >
                    <option value="">Select timestamp column</option>
                    {previewData.sheets
                      .find((sheet) => sheet.sheet_name === activeSheet.sheet_name)
                      ?.columns.map((column) => (
                        <option key={column.column_name} value={column.column_name}>
                          {column.column_name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>

              <div className="preview-table-wrap">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {previewData.sheets
                        .find((sheet) => sheet.sheet_name === activeSheet.sheet_name)
                        ?.columns.map((column) => (
                          <th key={column.column_name}>{column.column_name}</th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.sheets
                      .find((sheet) => sheet.sheet_name === activeSheet.sheet_name)
                      ?.preview_rows.map((row, index) => (
                        <tr key={index}>
                          {Object.entries(row).map(([columnName, value]) => (
                            <td key={`${index}-${columnName}`}>{value}</td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="column-mapper">
                {activeSheet.columns.map((column) => (
                  <div key={column.column_name} className="column-card">
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={column.selected}
                        onChange={(event) => updateColumn(activeSheet.sheet_name, column.column_name, 'selected', event.target.checked)}
                      />
                      Import {column.column_name}
                    </label>

                    <div className="column-meta">
                      <p>Sample: {previewData.sheets.find((sheet) => sheet.sheet_name === activeSheet.sheet_name)?.columns.find((item) => item.column_name === column.column_name)?.sample_values.join(', ') || 'No sample'}</p>
                    </div>

                    <div className="column-fields">
                      <label className="field-stack">
                        <span>Item label</span>
                        <input
                          type="text"
                          value={column.equipment_label}
                          onChange={(event) => updateColumn(activeSheet.sheet_name, column.column_name, 'equipment_label', event.target.value)}
                          placeholder={selectedEquipment?.equipment_type === 'room survey' ? 'e.g. Level 3 Room Survey' : 'e.g. Chiller 1'}
                        />
                      </label>

                      <label className="field-stack">
                        <span>Item type</span>
                        <input
                          type="text"
                          value={column.equipment_type}
                          onChange={(event) => updateColumn(activeSheet.sheet_name, column.column_name, 'equipment_type', event.target.value)}
                          placeholder={selectedEquipment?.equipment_type === 'room survey' ? 'e.g. room survey' : 'e.g. chiller'}
                        />
                      </label>

                      <label className="field-stack">
                        <span>Measurement type</span>
                        <input
                          type="text"
                          list={`measurement-types-${column.column_name}`}
                          value={column.measurement_type}
                          onChange={(event) => updateColumn(activeSheet.sheet_name, column.column_name, 'measurement_type', event.target.value)}
                          placeholder={measurementPlaceholder(selectedEquipment)}
                        />
                        <datalist id={`measurement-types-${column.column_name}`}>
                          {MEASUREMENT_TYPES.map((type) => (
                            <option key={type} value={type} />
                          ))}
                        </datalist>
                      </label>

                      <label className="field-stack">
                        <span>Unit</span>
                        <input
                          type="text"
                          value={column.unit}
                          onChange={(event) => updateColumn(activeSheet.sheet_name, column.column_name, 'unit', event.target.value)}
                          placeholder="e.g. kW"
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DataUpload
