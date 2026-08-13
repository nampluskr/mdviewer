export interface MarkdownBrowserApi {
  platform: NodeJS.Platform
}

declare global {
  interface Window {
    markdownBrowser: MarkdownBrowserApi
  }
}
