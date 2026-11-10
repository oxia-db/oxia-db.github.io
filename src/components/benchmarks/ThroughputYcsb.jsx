import { ThroughputBars } from './charts'
import { benchData } from './data'

const LABELS = {
  insert: 'Insert (load) — 100% writes',
  A: 'YCSB A — 50% reads / 50% updates',
  B: 'YCSB B — 95% reads',
  C: 'YCSB C — 100% reads',
  D: 'YCSB D — 95% reads, latest keys',
}

export default function ThroughputYcsb() {
  const workloads = benchData.throughput.map(w => ({ ...w, label: LABELS[w.key] || w.phase }))
  return (
    <ThroughputBars workloads={workloads} systems={['oxia-3', 'oxia-6', 'oxia-12', 'zookeeper', 'etcd']} />
  )
}
