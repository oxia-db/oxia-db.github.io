import StatusDashboard from './status-dashboard'
import styles from './page.module.css'

export const metadata = {
  title: 'Stability Status',
  description: 'Daily Oxia stability, correctness, and chaos test status.',
}

export default function StatusPage() {
  return (
    <div className={styles.page}>
      <header className={styles.statusHeader}>
        <h1>Oxia Stability Status</h1>
        <a className={styles.headerLink} href="https://github.com/oxia-db/chaos">
          View chaos tests
        </a>
      </header>

      <main>
        <section className={styles.about} aria-labelledby="about-title">
          <h2 id="about-title">About This Site</h2>
          <p>
            Daily automated stability tests validate Oxia&apos;s correctness across core data
            behaviors under controlled failure conditions. Chaos Mesh introduces pod
            disruptions, network faults, and resource pressure to verify consistency,
            durability, and safe recovery. These results reflect test-suite health, not live
            service availability.
          </p>
        </section>

        <StatusDashboard />
      </main>
    </div>
  )
}
