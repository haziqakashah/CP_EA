# Energy Auditing Frontend

## Overview
React-based user interface for the energy auditing system. Built with Vite for fast development and optimized production builds.

## Features
- Audit management (create, view, update, delete)
- Data upload (CSV/Excel files)
- Real-time data visualization with charts
- Summary statistics display
- Responsive design for mobile and desktop

## Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:3000`

### Build for Production
```bash
npm run build
```

## Project Structure
```
frontend/
├── src/
│   ├── components/        # Reusable React components
│   ├── pages/            # Page components
│   ├── services/         # API client services
│   ├── styles/           # CSS stylesheets
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Application entry point
├── index.html           # HTML entry point
├── vite.config.js       # Vite configuration
└── package.json         # Dependencies
```

## Usage
1. Start the backend server (see backend README)
2. Start the frontend dev server
3. Create audits for different energy assessments
4. Upload energy data files (CSV or Excel)
5. View measurements, statistics, and charts
