import axios from 'axios'

const API_BASE_URL = '/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Audit APIs
export const auditAPI = {
  getAll: () => apiClient.get('/audits'),
  getById: (id) => apiClient.get(`/audits/${id}`),
  create: (data) => apiClient.post('/audits', data),
  update: (id, data) => apiClient.put(`/audits/${id}`, data),
  delete: (id) => apiClient.delete(`/audits/${id}`),
  getTemplates: () => apiClient.get('/audits/templates'),
  getEquipment: (id) => apiClient.get(`/audits/${id}/equipment`),
  createEquipment: (id, data) => apiClient.post(`/audits/${id}/equipment`, data),
  deleteEquipment: (id, equipmentId) => apiClient.delete(`/audits/${id}/equipment/${equipmentId}`),
  getDashboard: (id) => apiClient.get(`/audits/${id}/dashboard`),
  getReport: (id) => apiClient.get(`/audits/${id}/report`)
}

// Data APIs
export const dataAPI = {
  preview: (auditId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('audit_id', auditId)
    
    return apiClient.post('/data/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },
  importSelection: (payload) => apiClient.post('/data/import', payload),
  getByAuditId: (auditId) => apiClient.get(`/data/${auditId}`),
  getSummary: (auditId) => apiClient.get(`/data/${auditId}/summary`),
  getBatches: (auditId) => apiClient.get(`/data/${auditId}/batches`),
  renameBatch: (auditId, payload) => apiClient.patch(`/data/${auditId}/batches/rename`, payload),
  deleteBatch: (auditId, payload) => apiClient.delete(`/data/${auditId}/batches`, { data: payload })
}

export default apiClient
