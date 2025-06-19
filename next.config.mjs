import nextra from 'nextra'

const config = nextra({
  latex: true,
  search: {
    codeblocks: false
  },
  contentDirBasePath: '/docs'
})({
  output: 'export',
  basePath: "",
  images: {
    unoptimized: true // mandatory, otherwise won't export
  }
})

export default config