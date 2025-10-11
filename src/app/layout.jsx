/* eslint-env node */
import { Layout, Navbar, Footer } from 'nextra-theme-docs'
import { Head } from 'nextra/components'
import { SiSlack } from 'react-icons/si';
import { getPageMap } from 'nextra/page-map'
import 'nextra-theme-docs/style.css'

export const metadata = {
  metadataBase: new URL('https://github.com/oxia-db'),
  title: {
    template: '%s - Oxia'
  },
  description: 'Oxia: Scalable Metadata and Index storage',
  applicationName: 'oxia',
  generator: 'Next.js',
  appleWebApp: {
    title: 'Oxia'
  },
  other: {
    'msapplication-TileColor': '#fff'
  },
}

export default async function RootLayout({ children }) {
  const navbar = (
    <Navbar
      logo={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img src="/oxia-logo.svg" alt="Oxia" style={{ height: '30px' }} /> {' '}
          <b>Oxia</b> {' '}
          <span style={{ opacity: '60%' }}>Metadata Store and Coordination System</span>
        </div>
      }

      projectLink="https://github.com/oxia-db"
      chatLink="https://cloud-native.slack.com/archives/C09KFHURYF8"
      chatIcon={<SiSlack />}
    />
  )
  const pageMap = await getPageMap()
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <Head faviconGlyph="✦" />
      <body>
        <Layout
          // banner={<Banner storageKey="Nextra 2">Nextra 2 Alpha</Banner>}
          navbar={navbar}
          editLink="Edit this page on GitHub"
          docsRepositoryBase="https://github.com/oxia-db/oxia-db.github.io/blob/main"
          sidebar={{ defaultMenuCollapseLevel: 1 }}
          pageMap={pageMap}
          footer={
              <Footer>
                  Copyright  ©  2023-{new Date().getFullYear()} &nbsp; Oxia a Series of LF Projects, LLC
                   &mdash;
                    For website terms of use, trademark policy and other project policies please see
                     &nbsp; <a href="https://lfprojects.org/policies">https://lfprojects.org/policies</a>.
              </Footer>
          }
        >
          {children}
        </Layout>
      </body>
    </html>
  )
}
