'use client'

import { useEffect, useState } from 'react'
import { Bar, Line } from 'react-chartjs-2'
import { COLOR } from './charts'
import { sessionData } from './session-data'

const LABEL = {
  oxia: 'Oxia (3 nodes)',
  oxia6: 'Oxia (6 nodes, 6 shards)',
  oxia12: 'Oxia (12 nodes, 6 shards)',
  zookeeper: 'ZooKeeper',
  etcd: 'etcd',
}
// per-page convention: lighter blue = smaller oxia cluster
const SCOLOR = {
  oxia: COLOR['oxia-3'],
  oxia6: COLOR['oxia-6'],
  oxia12: COLOR['oxia-12'],
  zookeeper: COLOR.zookeeper,
  etcd: COLOR.etcd,
}
const SYSTEMS = ['oxia', 'zookeeper', 'etcd']
// the 6/12-node scaling series (fixed build, shards held at 6) only exist for capacity
const CAP_SYSTEMS = ['oxia', 'oxia6', 'oxia12', 'zookeeper', 'etcd']

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

// mode="capacity": foreground p99 inflation (x own baseline) vs live cluster sessions.
// mode="churn": session-establish p99 vs offered cluster churn rate.
export default function Sessions({ mode }) {
  const dark = useIsDark()
  const c = {
    text: dark ? 'rgba(230,230,230,0.85)' : 'rgba(40,40,40,0.85)',
    muted: dark ? 'rgba(200,200,200,0.6)' : 'rgba(60,60,60,0.6)',
    grid: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    tooltipBg: dark ? '#1e1e1e' : '#ffffff',
    tooltipBorder: dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)',
  }
  const cap = mode === 'capacity'

  if (cap) {
    // Max sustainable live sessions: the largest sweep rung a system held with <=1%
    // foreground degradation and zero failed foreground operations.
    const maxSustainable = key => {
      const ok = sessionData[key].capacity.filter(p => p.degrPct <= 1 && p.fgFailed === 0)
      return ok.length ? ok[ok.length - 1].clusterSessions : 0
    }
    const rows = CAP_SYSTEMS.map(key => ({ key, label: LABEL[key], n: maxSustainable(key) }))
    const data = {
      labels: rows.map(r => r.label),
      datasets: [
        {
          data: rows.map(r => r.n),
          backgroundColor: rows.map(r => SCOLOR[r.key]),
          borderRadius: 4,
          barThickness: 18,
        },
      ],
    }
    const barOpts = {
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
          callbacks: {
            label: ctx => '  ' + ctx.parsed.x.toLocaleString() + ' live sessions sustained',
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: c.grid },
          ticks: {
            color: c.muted,
            font: { size: 10 },
            callback: v => (v >= 1000 ? v / 1000 + 'k' : v),
            maxTicksLimit: 8,
          },
          title: {
            display: true,
            text: 'max sustainable live sessions (cluster-wide, ≤1% foreground impact)',
            color: c.muted,
            font: { size: 10 },
          },
        },
        y: { grid: { display: false }, ticks: { color: c.text, font: { size: 11 } } },
      },
      animation: { duration: 300 },
    }
    return (
      <div style={{ height: CAP_SYSTEMS.length * 34 + 60, margin: '1rem 0' }}>
        <Bar data={data} options={barOpts} />
      </div>
    )
  }

  const datasets = SYSTEMS.map(key => ({
    label: LABEL[key],
    data: sessionData[key].churn.map(p => ({ x: p.offered, y: p.estP99 })),
    borderColor: SCOLOR[key],
    backgroundColor: SCOLOR[key],
    borderWidth: 2,
    pointRadius: 3,
    pointHoverRadius: 5,
    tension: 0.15,
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
          filter: item => !item.text.includes(':'),
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
          title: items =>
            'offered churn: ' + items[0].parsed.x.toLocaleString() + ' sessions/s',
          label: ctx =>
            '  ' +
            ctx.dataset.label +
            ': ' + ctx.parsed.y.toFixed(1) + ' ms establish p99',
        },
      },
    },
    scales: {
      x: {
        type: 'logarithmic',
        grid: { color: c.grid },
        ticks: {
          color: c.muted,
          font: { size: 10 },
          callback: v =>
            [100, 1000, 10000, 5000].includes(v)
              ? v >= 1000
                ? v / 1000 + 'k'
                : v
              : '',
        },
        title: {
          display: true,
          text: 'offered churn (sessions/s, cluster-wide)',
          color: c.muted,
          font: { size: 10 },
        },
      },
      y: {
        type: 'logarithmic',
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
        title: {
          display: true,
          text: 'session-establish p99',
          color: c.muted,
          font: { size: 10 },
        },
      },
    },
    animation: { duration: 300 },
  }

  return (
    <div style={{ height: 320, margin: '1rem 0' }}>
      <Line data={{ datasets }} options={opts} />
    </div>
  )
}
