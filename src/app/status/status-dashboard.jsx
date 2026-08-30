'use client'

import { useRef, useState } from 'react'
import styles from './page.module.css'

const DAY_COUNT = 90
const testCases = [
  { id: 'basic-kv', name: 'Basic KV' },
  { id: 'ephemeral', name: 'Ephemeral' },
  { id: 'notification', name: 'Notification' },
  { id: 'sequences', name: 'Sequences' },
  { id: 'secondary index', name: 'Secondary Index' },
  { id: 'versioning', name: 'Versioning' },
]

const testCaseDescriptions = {
  'basic-kv': 'Validates create, read, update, delete, range, and list operations against a reference model.',
  ephemeral: 'Verifies that ephemeral records are removed when their owning client session expires.',
  notification: 'Checks that change notifications are delivered and match committed state changes.',
  sequences: 'Validates monotonically allocated sequence keys and their ordering under concurrent writes.',
  'secondary index': 'Verifies that secondary-index entries remain consistent with their source records.',
  versioning: 'Checks version comparisons and conditional mutations across successive record updates.',
}

const resultLabels = {
  failed: 'Correctness failure',
  inconclusive: 'Inconclusive',
  noRun: 'No run',
}

function createTestCases(overrides = {}) {
  return testCases.map(testCase => ({
    id: testCase.id,
    name: testCase.name,
    description: testCaseDescriptions[testCase.id],
    passRate: overrides[testCase.id]?.passRate ?? '100.0%',
    exceptions: overrides[testCase.id]?.exceptions ?? {},
  }))
}

const dashboards = [
  {
    id: 'stable',
    label: 'Stable',
    serverVersion: '0.16.x',
    updated: 'Aug 31, 2026 at 06:14 UTC',
    testCases: createTestCases({
      ephemeral: {
        passRate: '98.9%',
        exceptions: {
          76: {
            result: 'inconclusive',
            date: 'Aug 18, 2026',
            title: 'Session expiry phase timed out',
            detail: 'The run ended before all ephemeral records could be verified.',
          },
        },
      },
      sequences: {
        passRate: '98.9%',
        exceptions: {
          61: {
            result: 'noRun',
            date: 'Aug 3, 2026',
            title: 'Scheduled run unavailable',
            detail: 'The runner did not produce a result for this test case.',
          },
        },
      },
      'secondary index': {
        passRate: '98.9%',
        exceptions: {
          84: {
            result: 'failed',
            date: 'Aug 26, 2026',
            title: 'Index reconciliation mismatch',
            detail: 'One secondary-index entry was missing after recovery.',
          },
        },
      },
    }),
  },
  {
    id: 'beta',
    label: 'Beta',
    serverVersion: '0.17.x',
    updated: 'Aug 31, 2026 at 06:36 UTC',
    testCases: createTestCases({
      notification: {
        passRate: '98.9%',
        exceptions: {
          80: {
            result: 'inconclusive',
            date: 'Aug 22, 2026',
            title: 'Delivery verification exceeded its deadline',
            detail: 'The run ended before every notification could be reconciled.',
          },
        },
      },
      versioning: {
        passRate: '98.9%',
        exceptions: {
          69: {
            result: 'noRun',
            date: 'Aug 11, 2026',
            title: 'Scheduled run unavailable',
            detail: 'The runner did not produce a result for this test case.',
          },
        },
      },
    }),
  },
  {
    id: 'alpha',
    label: 'Alpha',
    serverVersion: 'main',
    updated: 'Aug 31, 2026 at 07:02 UTC',
    testCases: createTestCases({
      'basic-kv': {
        passRate: '98.9%',
        exceptions: {
          83: {
            result: 'failed',
            date: 'Aug 25, 2026',
            title: 'Reference-state checkpoint mismatch',
            detail: 'The final state differed from the in-memory reference model.',
          },
        },
      },
      'secondary index': {
        passRate: '98.9%',
        exceptions: {
          72: {
            result: 'inconclusive',
            date: 'Aug 14, 2026',
            title: 'Index observation incomplete',
            detail: 'The workflow ended before the final index reconciliation completed.',
          },
        },
      },
    }),
  },
]

function TestHistoryChart({ name, passRate, exceptions }) {
  return (
    <div
      className={styles.historyChart}
      role="group"
      aria-label={`${name}: ${passRate} pass rate over the past 90 days`}
    >
      <div className={styles.bars}>
        {Array.from({ length: DAY_COUNT }, (_, index) => {
          const exception = exceptions[index]
          const result = exception?.result ?? 'passed'
          const className = [
            styles.bar,
            styles[result],
            exception ? styles.exceptionBar : '',
          ].filter(Boolean).join(' ')

          if (exception) {
            return (
              <button
                aria-label={`${exception.date}: ${resultLabels[exception.result]}. ${exception.title}. ${exception.detail}`}
                className={className}
                key={index}
                type="button"
              >
                <span
                  className={`${styles.tooltip} ${index > 70 ? styles.tooltipRight : ''}`}
                  role="tooltip"
                >
                  <time>{exception.date}</time>
                  <strong>{resultLabels[exception.result]}</strong>
                  <b>{exception.title}</b>
                  <span>{exception.detail}</span>
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
        <span>{passRate} pass rate</span>
        <span className={styles.chartLine} aria-hidden="true" />
        <span>Today</span>
      </div>
    </div>
  )
}

function TestCase({ testCase }) {
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
        <span className={styles.passing}>Passing</span>
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
          <span>Test pass rate over the past 90 days.</span>
        </div>

        <div className={styles.testCaseList}>
          {dashboard.testCases.map(testCase => (
            <TestCase key={testCase.id} testCase={testCase} />
          ))}
        </div>

        <div className={styles.legend} aria-label="Test result legend">
          <span><i className={styles.legendPassed} />Passed</span>
          <span><i className={styles.legendInconclusive} />Inconclusive</span>
          <span><i className={styles.legendFailed} />Correctness failure</span>
          <span><i className={styles.legendNoRun} />No run</span>
        </div>
        <p className={styles.lastUpdated}>Last updated {dashboard.updated}</p>
      </div>
    </section>
  )
}
