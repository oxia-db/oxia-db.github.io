import nextra from 'nextra'

const nextConfig = {
  plugins: {
    "@tailwindcss/postcss": {},
  }
}
const withNextra = nextra({
  latex: true,
  search: {
    codeblocks: false
  },
  contentDirBasePath: '/docs'
})

export default withNextra({
  reactStrictMode: true
})
