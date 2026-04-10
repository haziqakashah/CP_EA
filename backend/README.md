# Energy Auditing Application - Backend

## Overview
Flask-based REST API backend for energy auditing data management, processing, and analysis.

## Features
- RESTful API for audit management
- CSV/Excel file upload and processing
- Automatic measurement data extraction and storage
- Energy data analysis and summary statistics
- Support for multiple equipment types (chillers, pumps, fans, etc.)
- Support for multiple measurement types (temperature, power, flow)

## Setup

### Prerequisites
- Python 3.8+
- pip or conda

### Installation
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/Scripts/activate  # On Windows
   # or
   source venv/bin/activate  # On macOS/Linux
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Copy `.env` and adjust if needed

### Running the Server
```bash
python run.py
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Audits
- `GET /api/audits` - Get all audits
- `GET /api/audits/<id>` - Get specific audit
- `POST /api/audits` - Create new audit
- `PUT /api/audits/<id>` - Update audit
- `DELETE /api/audits/<id>` - Delete audit

### Data
- `POST /api/data/upload` - Upload energy data (CSV/Excel)
- `GET /api/data/<audit_id>` - Get all measurements for audit
- `GET /api/data/<audit_id>/summary` - Get summary statistics

## Data Format
Uploaded files should include timestamps and measurement data with columns clearly labeled (e.g., "chiller_temperature", "pump_power", "flow_rate").

## Project Structure
```
backend/
├── app/
│   ├── models/          # Database models
│   ├── routes/          # API endpoints
│   └── services/        # Business logic
├── uploads/             # Uploaded files storage
├── config.py            # Configuration
├── requirements.txt     # Dependencies
└── run.py              # Application entry point
```
