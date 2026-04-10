# Energy Auditing System

A comprehensive web application designed to simplify energy auditing by managing, analyzing, and visualizing energy consumption data from multiple equipment types and measurement sources.

## Overview

This system helps energy auditors efficiently handle large datasets from various sources (chillers, pumps, fans, power meters, flow meters) by providing:

- **Centralized Data Management**: Create and organize audits for different buildings or assessments
- **Easy Data Import**: Upload energy data from CSV or Excel files
- **Automatic Data Processing**: Intelligent column recognition for temperature, power, and flow measurements
- **Real-time Visualization**: Interactive charts and graphs for data analysis
- **Summary Statistics**: Quick insights into equipment performance with min/max/average values

## Project Structure

```
Energy auditing/
├── backend/              # Python Flask REST API
│   ├── app/
│   │   ├── models/      # Database models (Audit, EnergyMeasurement)
│   │   ├── routes/      # API endpoints
│   │   └── services/    # Business logic & data processing
│   ├── config.py        # Configuration
│   ├── run.py          # Application entry point
│   ├── requirements.txt # Python dependencies
│   └── README.md       # Backend documentation
│
└── frontend/            # React + Vite web application
    ├── src/
    │   ├── components/  # Reusable React components
    │   ├── pages/       # Page components
    │   ├── services/    # API client
    │   └── styles/      # CSS stylesheets
    ├── index.html      # HTML entry point
    ├── vite.config.js  # Vite configuration
    ├── package.json    # Node.js dependencies
    └── README.md       # Frontend documentation
```

## Quick Start

### Recommended Versions
- Python `3.10.x`
- Node.js `16+`

Python `3.13` is not recommended for this repo right now because the pinned `pandas==2.1.3` dependency may fail to install there on Windows.

### Prerequisites
- Python 3.8+ (for backend)
- Node.js 16+ (for frontend)
- pip/conda (Python package manager)
- npm/yarn (Node package manager)

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows
# or
source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Run the server
python run.py
```
The API will be available at `http://localhost:5000`

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
The app will be available at `http://localhost:3000`

## Features

### Audit Management
- Create new audits with metadata (building name, auditor, description)
- View all audits and their associated measurements
- Edit and delete audits
- Track measurement counts per audit

### Data Import
- Upload CSV or Excel files containing energy measurements
- Automatic detection of measurement types (temperature, power, flow)
- Support for multiple equipment types (chillers, pumps, fans, compressors)
- Timestamp-aware data processing

### Data Analysis
- Interactive line charts for visualization
- Summary statistics including:
  - Measurement count
  - Minimum, maximum, and average values
  - Units of measurement
- Equipment and measurement type grouping

### API Endpoints

#### Audits
- `GET /api/audits` - Get all audits
- `GET /api/audits/<id>` - Get specific audit
- `POST /api/audits` - Create new audit
- `PUT /api/audits/<id>` - Update audit
- `DELETE /api/audits/<id>` - Delete audit

#### Data
- `POST /api/data/upload` - Upload energy data file
- `GET /api/data/<audit_id>` - Get measurements for audit
- `GET /api/data/<audit_id>/summary` - Get summary statistics

## File Format

Upload files should include timestamps and measurement data with properly labeled columns. Examples:

**CSV Format:**
```
timestamp,chiller_temperature,chiller_power,pump_flow
2024-01-15 10:00:00,12.5,45.2,250
2024-01-15 10:01:00,12.6,45.5,252
```

**Excel Format:**
Same structure with sheets containing timestamp and measurement columns.

Column name patterns recognized:
- **Temperature**: `temp`, `temperature`, `t_in`, `t_out`, `inlet`, `outlet`
- **Power**: `power`, `kw`, `watts`, `energy`, `consumption`
- **Flow**: `flow`, `gpm`, `l/min`, `liter`, `volume`

## Technology Stack

### Backend
- **Framework**: Flask
- **Database**: SQLite (configurable to PostgreSQL)
- **Data Processing**: Pandas, NumPy
- **API**: RESTful API with JSON responses

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: CSS3
- **Charts**: Chart.js with react-chartjs-2
- **HTTP Client**: Axios

## Development

### Adding New Features

#### Backend
1. Create models in `backend/app/models/`
2. Create routes in `backend/app/routes/`
3. Add business logic in `backend/app/services/`

#### Frontend
1. Create components in `frontend/src/components/`
2. Add page templates in `frontend/src/pages/`
3. Define styles in `frontend/src/styles/`
4. Call APIs from `frontend/src/services/api.js`

## Share With Colleagues

To share this project as a GitHub repo:

```bash
git init
git add .
git commit -m "Initial project import"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

For a teammate on Windows:

```powershell
git clone <your-github-repo-url>
cd "Energy auditing\\backend"
py -3.10 -m venv venv
.\\venv\\Scripts\\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
$env:PORT=5001
python run.py
```

In a second terminal:

```powershell
cd "Energy auditing\\frontend"
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Future Enhancements

- [ ] User authentication and authorization
- [ ] Advanced equipment efficiency calculations
- [ ] Energy consumption benchmarking
- [ ] Predictive analytics for equipment performance
- [ ] Multi-file batch processing
- [ ] Export reports (PDF/Excel)
- [ ] Real-time data streaming from IoT devices
- [ ] Mobile application
- [ ] Machine learning anomaly detection

## License

[Add your license here]

## Support

For issues or questions, please create an issue in the repository or contact the development team.
