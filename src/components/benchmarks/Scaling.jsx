import { ScalingLines } from './charts'
import { benchData } from './data'

// Throughput vs cluster size under a uniform key distribution. mode="write" shows the
// write-only line; mode="read" shows the read-only line with the Zipf read line (YCSB C)
// overlaid, to show why hot-key workloads plateau while uniform reads scale.
export default function Scaling({ mode }) {
  const u = benchData.uniform
  if (mode === 'write') {
    return (
      <ScalingLines
        title="Write-only throughput (uniform)"
        servers={u.servers}
        series={[{ key: 'write', label: 'Write-only (uniform)', points: u.write }]}
      />
    )
  }
  return (
    <ScalingLines
      title="Read-only throughput — uniform vs Zipf"
      servers={u.servers}
      series={[
        { key: 'read', label: 'Read-only (uniform)', points: u.read },
        { key: 'zipf', label: 'Read-only (YCSB C, Zipf)', points: u.zipfRead, dashed: true },
      ]}
    />
  )
}
