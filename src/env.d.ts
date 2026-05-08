declare global {
  /**
   * Cloudflare Pages/Workers bindings.
   * Define concrete bindings here if/when you add KV, D1, R2, Vars, etc.
   */
  type CloudflareBindings = Record<string, unknown>

  /**
   * Injected by Cloudflare static assets plugin.
   */
  const __STATIC_CONTENT_MANIFEST: string
}

export {}

