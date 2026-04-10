# Quick Start Guide

## Fastest Windows Setup

If you are on Windows, use the repo root scripts:

1. Double-click `setup_windows.bat`
2. Double-click `start_app.bat`
3. Open `http://localhost:3000`

If PowerShell asks for permission, allow it for this run.

## Setup Instructions

### 1. Backend Setup (Python)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv

# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python run.py
```

**Expected output:**
```
WARNING in app.run_simple (werkzeug __init__.py:xxx)
 * Running on http://127.0.0.1:5000
```

The backend API will be running at `http://localhost:5001`

---

### 2. Frontend Setup (React)

In a **new terminal**, run:

```bash
cd frontend

# Install Node dependencies
npm install

# Start development server
npm run dev
```

**Expected output:**
```
VITE v5.0.0  ready in xxx ms

➜  Local:   http://localhost:3000/
```

The frontend will be running at `http://localhost:3000`

---

## Using the Application

### Step 1: Create an Audit
1. Open http://localhost:3000
2. Click "+ New Audit"
3. Fill in audit details:
   - Audit Name (required)
   - Building Name (optional)
   - Auditor Name (optional)
   - Description (optional)
4. Click "Create Audit"

### Step 2: Upload Energy Data
1. Click "View Details" on your audit
2. In the "Upload Energy Data" section, either:
   - Drag and drop a CSV or Excel file
   - Click to browse and select a file
3. System will automatically detect and process measurements

### Step 3: View Analysis
1. Once uploaded, scroll down to "Data Analysis" section
2. View the chart visualization
3. Check summary statistics for each equipment type and measurement

---

## Sample Data File

Create a `sample_data.csv` to test with:

```
timestamp,chiller_inlet_temperature,chiller_outlet_temperature,chiller_power,pump_flow_rate
2024-01-15 10:00:00,12.5,18.3,45.2,250
2024-01-15 10:05:00,12.4,18.4,45.8,252
2024-01-15 10:10:00,12.6,18.5,46.1,248
2024-01-15 10:15:00,12.7,18.6,46.5,255
2024-01-15 10:20:00,12.5,18.4,45.9,251
```

---

## Troubleshooting

### Backend Issues

**Port 5000 already in use:**
```bash
# Change port in backend/.env
PORT=5001
```

**Import errors:**
```bash
# Reinstall dependencies
pip install --upgrade -r requirements.txt
```

### Frontend Issues

**Port 3000 already in use:**
```bash
# The dev server is set to 3000, change in vite.config.js if needed
```

**Npm modules issues:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Connection Issues

**CORS errors in browser console:**
- Ensure backend is running on `http://localhost:5001`
- Check frontend vite.config.js proxy settings

**File upload errors:**
- Ensure file is CSV or Excel format
- Check backend `uploads/` folder exists

---

## API Testing

You can test the API directly using curl or Postman:

```bash
# Get all audits
curl http://localhost:5000/api/audits

# Create new audit
curl -X POST http://localhost:5000/api/audits \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Audit","building_name":"Building A"}'

# Get audit details
curl http://localhost:5000/api/audits/1

# Get audit data summary
curl http://localhost:5000/api/data/1/summary
```

---

## Next Steps

1. **Expand Equipment Types**: Add more equipment models (coolers, compressors, etc.)
2. **Advanced Analysis**: Implement efficiency calculations and KPIs
3. **User Accounts**: Add authentication for multi-user support
4. **Reporting**: Generate PDF reports with findings
5. **Real-time Data**: Connect to IoT sensors for live monitoring

---

## Support

For detailed information:
- Backend: See `backend/README.md`
- Frontend: See `frontend/README.md`
- Main project: See `README.md`
