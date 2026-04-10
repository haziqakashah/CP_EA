import React, { useState } from 'react'
import './styles/App.css'
import AuditList from './pages/AuditList'
import AuditDetail from './pages/AuditDetail'

function App() {
  const [currentPage, setCurrentPage] = useState('audits')
  const [selectedAuditId, setSelectedAuditId] = useState(null)

  const handleSelectAudit = (auditId) => {
    setSelectedAuditId(auditId)
    setCurrentPage('detail')
  }

  const handleBackToList = () => {
    setCurrentPage('audits')
    setSelectedAuditId(null)
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>⚡ Energy Auditing System</h1>
        <p>Simplified energy data management and analysis</p>
      </header>
      
      <div className="app-container">
        {currentPage === 'audits' ? (
          <AuditList onSelectAudit={handleSelectAudit} />
        ) : (
          <AuditDetail 
            auditId={selectedAuditId} 
            onBack={handleBackToList}
          />
        )}
      </div>
    </div>
  )
}

export default App
