'use client'

import { useEffect, useState } from 'react'
import { benchData } from './data'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
)

// Palette — matches the rest of the docs. Oxia in blues (darker = bigger cluster),
// ZooKeeper green, etcd amber.
export const COLOR = {
  'oxia-3': '#6da7ec',
  'oxia-6': '#2a78d6',
  'oxia-12': '#184f95',
  oxia: '#2a78d6',
  zookeeper: '#1baf7a',
  etcd: '#c98500',
  read: '#2a78d6',
  write: '#c98500',
  zipf: '#9aa0a6',
}

const LABEL = {
  'oxia-3': 'oxia-3',
  'oxia-6': 'oxia-6',
  'oxia-12': 'oxia-12',
  zookeeper: 'ZooKeeper',
  etcd: 'etcd',
}

// Detect the active docs theme (nextra/next-themes toggles `class="dark"` on <html>)
// and re-render charts when it changes, so grid/tick colors follow light/dark.
function useIsDark() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const el = document.documentElement
    const read = () => setDark(el.classList.contains('dark'))
    read()
    const obs = new MutationObserver(read)
    obs.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => obs.disconnect()
  }, [])
  return dark
}

function themeColors(dark) {
  return {
    text: dark ? 'rgba(230,230,230,0.85)' : 'rgba(40,40,40,0.85)',
    muted: dark ? 'rgba(200,200,200,0.6)' : 'rgba(60,60,60,0.6)',
    grid: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    tooltipBg: dark ? '#1e1e1e' : '#ffffff',
    tooltipBorder: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
  }
}

export function fmtOps(n) {
  if (n == null) return '—'
  if (n >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M'
  if (n >= 1e3) return Math.round(n / 1e3) + 'k'
  return String(n)
}

function fmtMs(v) {
  if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1) + ' s'
  if (v >= 100) return Math.round(v) + ' ms'
  if (v >= 10) return v.toFixed(1) + ' ms'
  if (v >= 1) return v.toFixed(2) + ' ms'
  return v.toFixed(3) + ' ms'
}

// percentile (0..100) -> "number of nines" x-position: 50%→0.30, 90%→1, 99%→2, 99.9%→3
function pctToX(p) {
  return -Math.log10(1 - p / 100)
}
const PCT_TICKS = [
  { x: pctToX(50), label: '50%' },
  { x: pctToX(90), label: '90%' },
  { x: pctToX(99), label: '99%' },
  { x: pctToX(99.9), label: '99.9%' },
  { x: pctToX(99.99), label: '99.99%' },
]

// ---- Grouped horizontal bar chart: one workload, N systems ----
export function ThroughputBars({ workloads, systems }) {
  const dark = useIsDark()
  const c = themeColors(dark)
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
        margin: '1rem 0',
      }}
    >
      {workloads.map(wl => {
        const rows = systems.filter(s => wl.values[s] != null)
        const data = {
          labels: rows.map(s => LABEL[s] || s),
          datasets: [
            {
              data: rows.map(s => wl.values[s]),
              backgroundColor: rows.map(s => COLOR[s]),
              borderRadius: 4,
              barThickness: 16,
            },
          ],
        }
        const opts = {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: c.tooltipBg,
              titleColor: c.text,
              bodyColor: c.text,
              borderColor: c.tooltipBorder,
              borderWidth: 1,
              callbacks: { label: ctx => '  ' + fmtOps(ctx.parsed.x) + ' ops/s' },
            },
          },
          scales: {
            x: {
              grid: { color: c.grid },
              ticks: { color: c.muted, callback: v => fmtOps(v), maxTicksLimit: 5, font: { size: 10 } },
            },
            y: { grid: { display: false }, ticks: { color: c.text, font: { size: 11 } } },
          },
          animation: { duration: 300 },
        }
        return (
          <figure key={wl.key} style={{ margin: 0 }}>
            <figcaption
              style={{ fontSize: '.8rem', fontWeight: 600, opacity: 0.85, marginBottom: '.4rem' }}
            >
              {wl.label}
            </figcaption>
            <div style={{ height: rows.length * 26 + 24 }}>
              <Bar data={data} options={opts} />
            </div>
          </figure>
        )
      })}
    </div>
  )
}

// ---- Latency-by-percentile line chart (log Y, "nines" X) ----
export function PercentileLines({ title, series }) {
  // series: [{ key, dist:[[pct,ms],...] }]
  const dark = useIsDark()
  const c = themeColors(dark)
  const datasets = series
    .filter(s => s.dist)
    .map(s => ({
      label: LABEL[s.key] || s.key,
      data: s.dist.filter(([p]) => p >= 50 && p < 100).map(([p, ms]) => ({ x: pctToX(p), y: ms })),
      borderColor: COLOR[s.key],
      backgroundColor: COLOR[s.key],
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 3,
      tension: 0.15,
    }))
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: { labels: { color: c.text, boxWidth: 12, boxHeight: 12, usePointStyle: true }, position: 'top', align: 'start' },
      title: title ? { display: true, text: title, color: c.text, font: { size: 12, weight: '600' }, align: 'start' } : { display: false },
      tooltip: {
        backgroundColor: c.tooltipBg,
        titleColor: c.text,
        bodyColor: c.text,
        borderColor: c.tooltipBorder,
        borderWidth: 1,
        callbacks: {
          title: items => {
            const x = items[0].parsed.x
            const p = 100 * (1 - Math.pow(10, -x))
            return (p >= 99.9 ? p.toFixed(2) : p >= 99 ? p.toFixed(1) : Math.round(p)) + '%'
          },
          label: ctx => '  ' + ctx.dataset.label + ': ' + fmtMs(ctx.parsed.y),
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        min: pctToX(50),
        max: pctToX(99.99) + 0.15,
        grid: { color: c.grid },
        afterBuildTicks: axis => {
          axis.ticks = PCT_TICKS.map(t => ({ value: t.x }))
        },
        ticks: {
          color: c.muted,
          font: { size: 10 },
          callback: v => {
            const t = PCT_TICKS.find(t => Math.abs(t.x - v) < 1e-6)
            return t ? t.label : ''
          },
        },
        title: { display: true, text: 'percentile', color: c.muted, font: { size: 10 } },
      },
      y: {
        type: 'logarithmic',
        grid: { color: c.grid },
        ticks: {
          color: c.muted,
          font: { size: 10 },
          callback: v => {
            const l = Math.log10(v)
            return Math.abs(l - Math.round(l)) < 1e-6 ? fmtMs(v) : ''
          },
        },
      },
    },
    animation: { duration: 300 },
  }
  return (
    <div style={{ height: 280, margin: '0.75rem 0 1.5rem' }}>
      <Line data={{ datasets }} options={opts} />
    </div>
  )
}

// ---- Scaling line chart: throughput vs cluster size ----
export function ScalingLines({ series, servers, title }) {
  // series: [{ key, label, points:[n,...], dashed? }]
  const dark = useIsDark()
  const c = themeColors(dark)
  const datasets = series.map(s => ({
    label: s.label,
    data: s.points,
    borderColor: COLOR[s.key],
    backgroundColor: COLOR[s.key],
    borderWidth: 2.5,
    borderDash: s.dashed ? [6, 4] : [],
    pointRadius: 4,
    pointHoverRadius: 6,
    tension: 0,
  }))
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: c.text, boxWidth: 24, usePointStyle: false }, position: 'top', align: 'start' },
      title: title ? { display: true, text: title, color: c.text, font: { size: 12, weight: '600' }, align: 'start' } : { display: false },
      tooltip: {
        backgroundColor: c.tooltipBg,
        titleColor: c.text,
        bodyColor: c.text,
        borderColor: c.tooltipBorder,
        borderWidth: 1,
        callbacks: {
          title: items => servers[items[0].dataIndex] + ' servers',
          label: ctx => '  ' + ctx.dataset.label + ': ' + fmtOps(ctx.parsed.y) + ' ops/s',
        },
      },
    },
    scales: {
      x: {
        type: 'category',
        labels: servers.map(n => n + ' servers'),
        grid: { color: c.grid },
        ticks: { color: c.text, font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        grid: { color: c.grid },
        ticks: { color: c.muted, font: { size: 10 }, callback: v => fmtOps(v) },
        title: { display: true, text: 'reads/writes per second', color: c.muted, font: { size: 10 } },
      },
    },
    animation: { duration: 300 },
  }
  return (
    <div style={{ height: 340, margin: '1rem 0' }}>
      <Line data={{ labels: servers.map(n => n + ' servers'), datasets }} options={opts} />
    </div>
  )
}

// ---- One YCSB workload's latency panels (write, if any, + read), from benchData ----
const LAT_SYSTEMS = ['oxia-3', 'zookeeper', 'etcd']

export function LatencyWorkload({ wl }) {
  const d = benchData.latency[wl]
  const hasWrite = LAT_SYSTEMS.some(s => d[s] && d[s].write)
  const readSeries = LAT_SYSTEMS.map(s => ({ key: s, dist: d[s] && d[s].read && d[s].read.dist }))
  const writeSeries = LAT_SYSTEMS.map(s => ({ key: s, dist: d[s] && d[s].write && d[s].write.dist }))
  return (
    <>
      {hasWrite && <PercentileLines title="Write latency by percentile" series={writeSeries} />}
      <PercentileLines title="Read latency by percentile" series={readSeries} />
    </>
  )
}
