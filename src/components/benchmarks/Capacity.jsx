'use client'

import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { COLOR, fmtOps } from './charts'
import { capacityData } from './capacity-data'

const LABEL = { oxia: 'Oxia (3 nodes)', zookeeper: 'ZooKeeper', etcd: 'etcd' }

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

// Throughput vs stored dataset size (log-log). ZooKeeper and etcd end at a ✕ where they
// stopped serving writes; Oxia's line continues past every node's RAM to ~100 GB.
export default function Capacity() {
  const dark = useIsDark()
  const c = {
    text: dark ? 'rgba(230,230,230,0.85)' : 'rgba(40,40,40,0.85)',
    muted: dark ? 'rgba(200,200,200,0.6)' : 'rgba(60,60,60,0.6)',
    grid: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    tooltipBg: dark ? '#1e1e1e' : '#ffffff',
    tooltipBorder: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
  }

  const lines = ['oxia', 'zookeeper', 'etcd'].map(key => ({
    label: LABEL[key],
    data: capacityData[key].map(p => ({ x: p.gb, y: p.ops })),
    borderColor: COLOR[key],
    backgroundColor: COLOR[key],
    borderWidth: 2.5,
    pointRadius: 0,
    pointHoverRadius: 3,
    tension: 0.2,
  }))
  // ✕ where a baseline stopped serving writes
  const marks = Object.entries(capacityData.terminal).map(([key, t]) => ({
    label: `${LABEL[key]}: ${t.label}`,
    data: [{ x: t.gb, y: Math.max(t.ops, 12) }],
    borderColor: COLOR[key],
    backgroundColor: COLOR[key],
    pointStyle: 'crossRot',
    pointRadius: 8,
    pointHoverRadius: 10,
    pointBorderWidth: 3,
    showLine: false,
    _terminal: t.label,
  }))

  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: {
        labels: {
          color: c.text,
          boxWidth: 12,
          boxHeight: 12,
          usePointStyle: true,
          filter: item => !item.text.includes(':'), // hide the ✕ datasets from the legend
        },
        position: 'top',
        align: 'start',
      },
      tooltip: {
        backgroundColor: c.tooltipBg,
        titleColor: c.text,
        bodyColor: c.text,
        borderColor: c.tooltipBorder,
        borderWidth: 1,
        callbacks: {
          title: items => items[0].parsed.x.toPrecision(2) + ' GB stored',
          label: ctx =>
            '  ' +
            ctx.dataset.label +
            (ctx.dataset._terminal ? '' : ': ' + fmtOps(ctx.parsed.y) + ' ops/s'),
        },
      },
    },
    scales: {
      x: {
        type: 'logarithmic',
        min: 0.05,
        max: 150,
        grid: { color: c.grid },
        ticks: {
          color: c.muted,
          font: { size: 10 },
          callback: v => ([0.1, 1, 10, 100].includes(v) ? v + ' GB' : ''),
        },
        title: { display: true, text: 'dataset stored per server', color: c.muted, font: { size: 10 } },
      },
      y: {
        type: 'linear',
        beginAtZero: true,
        suggestedMax: 55000,
        grid: { color: c.grid },
        ticks: {
          color: c.muted,
          font: { size: 10 },
          callback: v => (v === 0 ? '0' : fmtOps(v)),
        },
        title: { display: true, text: 'writes per second', color: c.muted, font: { size: 10 } },
      },
    },
    animation: { duration: 300 },
  }

  return (
    <div style={{ height: 360, margin: '1rem 0' }}>
      <Line data={{ datasets: [...lines, ...marks] }} options={opts} />
    </div>
  )
}
