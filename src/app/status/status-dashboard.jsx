'use client'

import { useRef, useState } from 'react'
import styles from './page.module.css'

const DAY_COUNT = 90
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

function normalizeHistory(history = []) {
  const publishedHistory = history.slice(-DAY_COUNT)
  const notRunDays = Array.from(
    { length: DAY_COUNT - publishedHistory.length },
    () => ({ result: 'not_run' }),
  )

  return [...notRunDays, ...publishedHistory]
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

const dashboards = [
  {
    id: 'stable',
    label: 'Stable',
    serverVersion: '0.16.x',
    updated: null,
    testCases: createTestCases(),
  },
  {
    id: 'beta',
    label: 'Beta',
    serverVersion: '0.17.x',
    updated: null,
    testCases: createTestCases(),
  },
  {
    id: 'alpha',
    label: 'Alpha',
    serverVersion: 'main',
    updated: null,
    testCases: createTestCases(),
  },
]

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
  const tabRefs = useRef([])
  const dashboard = dashboards.find(item => item.id === activeId) ?? dashboards[0]

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
          <span>Completed-run pass rate over the past 90 days.</span>
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
          {dashboard.updated ? `Last updated ${dashboard.updated}` : 'No results published yet.'}
        </p>
      </div>
    </section>
  )
}
