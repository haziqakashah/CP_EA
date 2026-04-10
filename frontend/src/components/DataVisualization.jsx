import React, { useMemo } from 'react'
import { Bar, Line, Scatter } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import '../styles/DataVisualization.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
)

function buildSeriesLabel(item) {
  const batch = item.import_batch ? ` - ${item.import_batch}` : ''
  if (item.source_column) {
    return `${item.source_column} (${item.unit})${batch}`
  }

  return `${item.measurement_type} (${item.unit})${batch}`
}

function DataVisualization({ measurements, title, plotType = 'line' }) {
  const chartData = useMemo(() => {
    if (!measurements || measurements.length === 0) return null

    const grouped = {}
    measurements.forEach((measurement) => {
      const key = `${measurement.import_batch || 'default'}_${measurement.source_sheet || 'default'}_${measurement.source_column || measurement.measurement_type}`
      if (!grouped[key]) {
        grouped[key] = []
      }
      grouped[key].push(measurement)
    })

    const sortedTimestamps = [...new Set(
      measurements
        .map((item) => item.timestamp)
        .sort((left, right) => new Date(left) - new Date(right))
    )]

    const labels = sortedTimestamps.map((timestamp) => new Date(timestamp).toLocaleString())
    const palette = ['#0f766e', '#ea580c', '#2563eb', '#16a34a', '#a855f7', '#dc2626']

    const datasets = Object.values(grouped).map((values, index) => {
      const color = palette[index % palette.length]
      const firstItem = values[0]
      const byTimestamp = new Map(values.map((item) => [item.timestamp, item.value]))
      const seriesLabel = buildSeriesLabel(firstItem)

      if (plotType === 'scatter') {
        return {
          label: seriesLabel,
          data: values
            .slice()
            .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp))
            .map((item) => ({
              x: new Date(item.timestamp).toLocaleString(),
              y: item.value
            })),
          borderColor: color,
          backgroundColor: color,
          pointRadius: 4
        }
      }

      return {
        label: seriesLabel,
        data: sortedTimestamps.map((timestamp) => byTimestamp.get(timestamp) ?? null),
        borderColor: color,
        backgroundColor: plotType === 'bar' ? `${color}aa` : `${color}22`,
        borderWidth: plotType === 'bar' ? 1 : 2,
        tension: 0.3,
        fill: false,
        spanGaps: true
      }
    })

    return { labels, datasets }
  }, [measurements, plotType])

  if (!chartData) return null

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: title || 'Equipment Analysis'
      }
    },
    scales: {
      x: {
        type: plotType === 'scatter' ? 'category' : 'category'
      },
      y: {
        beginAtZero: false
      }
    }
  }

  return (
    <div className="visualization">
      {plotType === 'bar' ? (
        <Bar data={chartData} options={options} />
      ) : plotType === 'scatter' ? (
        <Scatter data={chartData} options={options} />
      ) : (
        <Line data={chartData} options={options} />
      )}
    </div>
  )
}

export default DataVisualization
