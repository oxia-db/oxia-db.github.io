import { FiArrowUpRight } from 'react-icons/fi'
import styles from './page.module.css'

export const metadata = {
  title: 'Blog',
  description: 'Articles about Oxia and distributed metadata systems.',
}

const posts = [
  {
    title: 'Designing a Distributed Metadata System - Foundation',
    date: '2026-07-05',
    displayDate: 'Jul 5, 2026',
    author: 'Qiang Zhao',
    href: 'https://www.linkedin.com/pulse/designing-distributed-metadata-system-foundation-qiang-zhao-qlvlc/',
    summary:
      'A walkthrough of the standalone server semantics that distributed metadata systems need before adding replication, sharding, and cluster management.',
    tags: ['Metadata systems', 'Distributed systems', 'Design'],
  },
  {
    title: 'From Metadata Store to Metadata Plane',
    date: '2026-06-20',
    displayDate: 'Jun 20, 2026',
    author: 'Qiang Zhao',
    href: 'https://www.linkedin.com/pulse/from-metadata-store-plane-qiang-zhao-gysuc/',
    summary:
      'How coordination metadata grows into a runtime metadata plane with storage, notification, sharding, and federation requirements.',
    tags: ['Metadata plane', 'Coordination', 'Scalability'],
  },
]

export default function BlogPage() {
  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <p className={styles.kicker}>Oxia Blog</p>
        <h1>Articles on distributed metadata systems</h1>
        <p className={styles.intro}>
          Technical posts about Oxia, metadata stores, coordination, and the
          architecture patterns behind scalable infrastructure.
        </p>
      </section>

      <section className={styles.posts} aria-label="Blog posts">
        {posts.map((post) => (
          <article className={styles.post} key={post.href}>
            <div className={styles.meta}>
              <time dateTime={post.date}>{post.displayDate}</time>
              <span>{post.author}</span>
            </div>
            <h2>
              <a href={post.href} target="_blank" rel="noreferrer">
                {post.title}
              </a>
            </h2>
            <p>{post.summary}</p>
            <div className={styles.footer}>
              <ul className={styles.tags} aria-label={`${post.title} topics`}>
                {post.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
              <a className={styles.readLink} href={post.href} target="_blank" rel="noreferrer">
                Read on LinkedIn
                <FiArrowUpRight aria-hidden="true" />
              </a>
            </div>
          </article>
        ))}
      </section>
    </main>
  )
}
