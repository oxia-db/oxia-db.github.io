'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './page.module.css'

const DAY_COUNT = 90
const STATUS_URL = 'https://oxia-db.github.io/chaos/status/v1/summary.json'
const SMOKE_STATUS_URL = 'https://oxia-db.github.io/chaos/status-smoke/v1/summary.json'
const channelDefinitions = [
  { id: 'stable', label: 'Stable', fallbackVersion: '0.16.x' },
  { id: 'beta', label: 'Beta', fallbackVersion: '0.17.x' },
]
const testCases = [
  { id: 'basic-kv', name: 'Basic KV' },
  { id: 'ephemeral', name: 'Ephemeral' },
  { id: 'notification', name: 'Notification' },
  { id: 'sequences', name: 'Sequences' },
  { id: 'secondary-index', name: 'Secondary Index' },
  { id: 'versioning', name: 'Versioning' },
]

const testCaseDescriptions = {
  'basic-kv': 'Validates create, read, update, delete, range, and list operations against a reference model.',
  ephemeral: 'Verifies that ephemeral records are removed when their owning client session expires.',
  notification: 'Checks that change notifications are delivered and match committed state changes.',
  sequences: 'Validates monotonically allocated sequence keys and their ordering under concurrent writes.',
  'secondary-index': 'Verifies that secondary-index entries remain consistent with their source records.',
  versioning: 'Checks version comparisons and conditional mutations across successive record updates.',
}

const resultLabels = {
  passed: 'Passed',
  failed: 'Failure',
  not_run: 'Not run',
}

function utcDates() {
  const today = new Date()
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())

  return Array.from({ length: DAY_COUNT }, (_, index) => (
    new Date(midnight - (DAY_COUNT - index - 1) * 86400000).toISOString().slice(0, 10)
  ))
}

function normalizeHistory(history = []) {
  const entries = new Map(history.map(result => [result.date, result]))

  return utcDates().map(date => entries.get(date) ?? { date, result: 'not_run' })
}

function calculatePassRate(history) {
  const completedRuns = history.filter(result => result.result !== 'not_run')

  if (completedRuns.length === 0) {
    return null
  }

  const passedRuns = completedRuns.filter(result => result.result === 'passed').length

  return `${((passedRuns / completedRuns.length) * 100).toFixed(1)}%`
}

function createTestCases(overrides = {}) {
  return testCases.map(testCase => {
    const history = normalizeHistory(overrides[testCase.id]?.history)

    return {
      id: testCase.id,
      name: testCase.name,
      description: testCaseDescriptions[testCase.id],
      passRate: calculatePassRate(history),
      history,
    }
  })
}

const emptyDashboards = channelDefinitions.map(channel => ({
  id: channel.id,
  label: channel.label,
  serverVersion: channel.fallbackVersion,
  updated: null,
  testCases: createTestCases(),
}))

function requireValue(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function isUtcDate(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
}

function validateHistory(history, location) {
  requireValue(Array.isArray(history), `${location} must be an array`)
  const dates = new Set()

  for (const entry of history) {
    requireValue(entry && typeof entry === 'object', `${location} entries must be objects`)
    requireValue(isUtcDate(entry.date), `${location} contains an invalid UTC date`)
    requireValue(!dates.has(entry.date), `${location} contains a duplicate date`)
    requireValue(['passed', 'failed', 'not_run'].includes(entry.result), `${location} contains an invalid result`)
    if (entry.result === 'failed') {
      requireValue(typeof entry.title === 'string' && entry.title, `${location} failure has no title`)
      requireValue(typeof entry.detail === 'string' && entry.detail, `${location} failure has no detail`)
    }
    dates.add(entry.date)
  }

  return history
}

function parseSummary(summary) {
  requireValue(summary && typeof summary === 'object', 'status document must be an object')
  requireValue(summary.schemaVersion === 1, 'unsupported status schema')
  requireValue(summary.windowDays === DAY_COUNT, 'unexpected status window')
  requireValue(Array.isArray(summary.channels), 'status channels must be an array')

  const channels = new Map(summary.channels.map(channel => [channel.id, channel]))
  requireValue(channels.size === channelDefinitions.length, 'status document has unexpected channels')

  return channelDefinitions.map(definition => {
    const channel = channels.get(definition.id)
    requireValue(channel && typeof channel === 'object', `status channel ${definition.id} is missing`)
    requireValue(typeof channel.serverVersion === 'string' && channel.serverVersion, `status channel ${definition.id} has no server version`)
    requireValue(typeof channel.updatedAt === 'string' && !Number.isNaN(Date.parse(channel.updatedAt)), `status channel ${definition.id} has an invalid update time`)
    requireValue(Array.isArray(channel.testCases), `status channel ${definition.id} has no testcases`)

    const publishedCases = new Map(channel.testCases.map(testCase => [testCase.id, testCase]))
    requireValue(publishedCases.size === testCases.length, `status channel ${definition.id} has unexpected testcases`)
    const overrides = Object.fromEntries(testCases.map(testCase => {
      const published = publishedCases.get(testCase.id)
      requireValue(published && typeof published === 'object', `status testcase ${testCase.id} is missing`)
      return [testCase.id, {
        history: validateHistory(published.history, `${definition.id}/${testCase.id}`),
      }]
    }))

    return {
      id: definition.id,
      label: definition.label,
      serverVersion: channel.serverVersion,
      updated: channel.updatedAt,
      testCases: createTestCases(overrides),
    }
  })
}

function TestHistoryChart({ name, passRate, history }) {
  const passRateLabel = passRate ? `${passRate} pass rate` : 'No completed runs'

  return (
    <div
      className={styles.historyChart}
      role="group"
      aria-label={`${name}: ${passRateLabel.toLowerCase()} over the past 90 days`}
    >
      <div className={styles.bars}>
        {history.map((testResult, index) => {
          const result = testResult.result
          const className = [
            styles.bar,
            styles[result],
            result === 'failed' ? styles.exceptionBar : '',
          ].filter(Boolean).join(' ')

          if (result === 'failed') {
            return (
              <button
                aria-label={`${testResult.date}: ${resultLabels[result]}. ${testResult.title}. ${testResult.detail}`}
                className={className}
                key={index}
                type="button"
              >
                <span
                  className={`${styles.tooltip} ${index > 70 ? styles.tooltipRight : ''}`}
                  role="tooltip"
                >
                  <time>{testResult.date}</time>
                  <strong>{resultLabels[result]}</strong>
                  <b>{testResult.title}</b>
                  <span>{testResult.detail}</span>
                </span>
              </button>
            )
          }

          return <span aria-hidden="true" className={className} key={index} />
        })}
      </div>
      <div className={styles.chartLabels}>
        <span>90 days ago</span>
        <span className={styles.chartLine} aria-hidden="true" />
        <span>{passRateLabel}</span>
        <span className={styles.chartLine} aria-hidden="true" />
        <span>Today</span>
      </div>
    </div>
  )
}

function TestCase({ testCase }) {
  const latestResult = testCase.history.at(-1).result
  const latestResultClass = {
    passed: styles.passing,
    failed: styles.failing,
    not_run: styles.notRunStatus,
  }[latestResult]

  return (
    <article className={styles.testCase}>
      <div className={styles.testCaseHeading}>
        <h3>
          <span className={styles.testCaseName} tabIndex="0">
            {testCase.name}
            <span className={styles.testCaseTooltip} role="tooltip">
              <strong>{testCase.name}</strong>
              <span>{testCase.description}</span>
            </span>
          </span>
        </h3>
        <span className={latestResultClass}>{resultLabels[latestResult]}</span>
      </div>
      <TestHistoryChart {...testCase} />
    </article>
  )
}

export default function StatusDashboard() {
  const [activeId, setActiveId] = useState('stable')
  const [dashboards, setDashboards] = useState(emptyDashboards)
  const [dataState, setDataState] = useState('loading')
  const [isPreview, setIsPreview] = useState(false)
  const tabRefs = useRef([])
  const dashboard = dashboards.find(item => item.id === activeId) ?? dashboards[0]

  useEffect(() => {
    const controller = new AbortController()

    async function loadStatus() {
      try {
        const preview = new URLSearchParams(window.location.search).get('preview') === 'smoke'
        setIsPreview(preview)
        const response = await fetch(preview ? SMOKE_STATUS_URL : STATUS_URL, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (response.status === 404) {
          setDataState('empty')
          return
        }
        if (!response.ok) {
          throw new Error(`status request failed with ${response.status}`)
        }
        setDashboards(parseSummary(await response.json()))
        setDataState('loaded')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setDataState('error')
        }
      }
    }

    loadStatus()
    return () => controller.abort()
  }, [])

  function selectAdjacentTab(event, index) {
    const offsets = { ArrowLeft: -1, ArrowRight: 1, Home: -index, End: dashboards.length - index - 1 }
    const offset = offsets[event.key]

    if (offset === undefined) {
      return
    }

    event.preventDefault()
    const nextIndex = (index + offset + dashboards.length) % dashboards.length
    setActiveId(dashboards[nextIndex].id)
    tabRefs.current[nextIndex]?.focus()
  }

  return (
    <section className={styles.testCases} aria-labelledby="dashboard-title">
      <div className={styles.dashboardHeading}>
        <div>
          <h2 id="dashboard-title">Correctness dashboard</h2>
          <p>Daily results grouped by the Oxia server version under test.</p>
        </div>
        <span>Past 90 days</span>
      </div>

      <div className={styles.releaseTabs} role="tablist" aria-label="Oxia server versions">
        {dashboards.map((item, index) => {
          const selected = item.id === dashboard.id

          return (
            <button
              aria-controls="server-dashboard-panel"
              aria-selected={selected}
              className={styles.releaseTab}
              id={`server-tab-${item.id}`}
              key={item.id}
              onClick={() => setActiveId(item.id)}
              onKeyDown={event => selectAdjacentTab(event, index)}
              ref={element => { tabRefs.current[index] = element }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              <span>{item.label}</span>
              <small>Oxia server {item.serverVersion}</small>
            </button>
          )
        })}
      </div>

      <div
        aria-labelledby={`server-tab-${dashboard.id}`}
        className={styles.dashboardPanel}
        id="server-dashboard-panel"
        role="tabpanel"
      >
        <div className={styles.componentIntro}>
          <strong>Oxia server {dashboard.serverVersion}</strong>
          <span>
            {isPreview
              ? 'One-minute smoke preview; production stability history is unchanged.'
              : 'Completed-run pass rate over the past 90 days.'}
          </span>
        </div>

        <div className={styles.testCaseList}>
          {dashboard.testCases.map(testCase => (
            <TestCase key={testCase.id} testCase={testCase} />
          ))}
        </div>

        <div className={styles.legend} aria-label="Test result legend">
          <span><i className={styles.legendPassed} />Passed</span>
          <span><i className={styles.legendFailed} />Failure</span>
          <span><i className={styles.legendNotRun} />Not run</span>
        </div>
        <p className={styles.lastUpdated}>
          {dataState === 'loading' && 'Loading published results…'}
          {dataState === 'error' && 'Published results are temporarily unavailable.'}
          {dataState === 'empty' && 'No results published yet.'}
          {dataState === 'loaded' && `${isPreview ? 'Smoke preview · ' : ''}Last updated ${dashboard.updated}`}
        </p>
      </div>
    </section>
  )
}
