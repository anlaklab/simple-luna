export default {
  logo: <span>🚀 Luna Documentation</span>,
  project: {
    link: 'https://github.com/lunaslides/luna',
  },
  chat: {
    link: 'https://discord.com',
  },
  docsRepositoryBase: 'https://github.com/lunaslides/luna/tree/main/docs',
  footer: {
    text: 'Luna - PowerPoint Processing Platform',
  },
  useNextSeoProps() {
    return {
      titleTemplate: '%s – Luna Docs'
    }
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta property="og:title" content="Luna Documentation" />
      <meta property="og:description" content="Documentation for Luna - PowerPoint Processing Platform with AI Capabilities" />
    </>
  ),
  primaryHue: 200,
  navigation: {
    prev: true,
    next: true
  },
  sidebar: {
    titleComponent({ title, type }) {
      if (type === 'separator') {
        return <span className="cursor-default">{title}</span>
      }
      return <>{title}</>
    },
    defaultMenuCollapseLevel: 1,
    toggleButton: true
  },
  toc: {
    float: true,
    backToTop: true
  }
}