'use client'

import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { COLOR, fmtOps } from './charts'
import { failoverData } from './failover-data'

const LABEL = { oxia: 'Oxia (3 nodes)', zookeeper: 'ZooKeeper', etcd: 'etcd' }
const SYSTEMS = ['oxia', 'zookeeper', 'etcd']

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

// Dashed vertical line at t=0 (the leader kill).
const killLine = {
  id: 'killLine',
  afterDraw(chart) {
    const x = chart.scales.x.getPixelForValue(0)
    const { top, bottom } = chart.chartArea
    const ctx = chart.ctx
    ctx.save()
    ctx.strokeStyle = 'rgba(200,60,60,0.8)'
    ctx.setLineDash([5, 4])
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(200,60,60,0.9)'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('leader killed', x + 4, top + 10)
    ctx.restore()
  },
}

// mode="availability": delivered throughput as % of the offered rate.
// mode="latency": write p99 per 2s interval (log scale).
export default function Failover({ mode }) {
  const dark = useIsDark()
  const c = {
    text: dark ? 'rgba(230,230,230,0.85)' : 'rgba(40,40,40,0.85)',
    muted: dark ? 'rgba(200,200,200,0.6)' : 'rgba(60,60,60,0.6)',
    grid: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    tooltipBg: dark ? '#1e1e1e' : '#ffffff',
    tooltipBorder: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
  }
  const latency = mode === 'latency'

  const datasets = SYSTEMS.map(key => {
    const { target, points } = failoverData[key]
    return {
      label: LABEL[key],
      data: points.map(p => ({
        x: p.t,
        y: latency ? Math.max(p.wp99, 0.1) : (100 * p.ops) / target,
      })),
      borderColor: COLOR[key],
      backgroundColor: COLOR[key],
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 3,
      stepped: !latency,
      tension: 0,
    }
  })

  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: {
        labels: { color: c.text, boxWidth: 12, boxHeight: 12, usePointStyle: true },
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
          title: items => 't = ' + items[0].parsed.x + ' s',
          label: ctx =>
            '  ' +
            ctx.dataset.label +
            ': ' +
            (latency ? ctx.parsed.y.toFixed(1) + ' ms' : ctx.parsed.y.toFixed(0) + '% of offered rate'),
        },
      },
    },
    scales: {
      x: {
        type: 'linear',
        min: -30,
        max: 90,
        grid: { color: c.grid },
        ticks: { color: c.muted, font: { size: 10 }, stepSize: 15, callback: v => v + ' s' },
        title: {
          display: true,
          text: 'seconds since leader kill',
          color: c.muted,
          font: { size: 10 },
        },
      },
      y: latency
        ? {
            type: 'logarithmic',
            min: 1,
            max: 5000,
            grid: { color: c.grid },
            ticks: {
              color: c.muted,
              font: { size: 10 },
              callback: v => {
                const l = Math.log10(v)
                if (Math.abs(l - Math.round(l)) > 1e-6) return ''
                return v >= 1000 ? v / 1000 + ' s' : v + ' ms'
              },
            },
            title: { display: true, text: 'write p99 per 2s interval', color: c.muted, font: { size: 10 } },
          }
        : {
            min: 0,
            max: 110,
            grid: { color: c.grid },
            ticks: { color: c.muted, font: { size: 10 }, callback: v => v + '%' },
            title: {
              display: true,
              text: 'delivered throughput (% of offered rate)',
              color: c.muted,
              font: { size: 10 },
            },
          },
    },
    animation: { duration: 300 },
  }

  return (
    <div style={{ height: 320, margin: '1rem 0' }}>
      <Line data={{ datasets }} options={opts} plugins={[killLine]} />
    </div>
  )
}
