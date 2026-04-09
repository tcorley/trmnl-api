// Bun environment types
declare module "bun" {
  interface Env {
    ACCESS_TOKEN?: string
    PLEX_BASE_URL?: string
    PLEX_TOKEN?: string
    HOST?: string
    PORT?: string
  }
}

// Cloudflare Workers environment bindings
// These are set via wrangler.toml [vars] or `wrangler secret put`
declare global {
  interface CloudflareBindings {
    ACCESS_TOKEN: string
    PLEX_BASE_URL: string
    PLEX_TOKEN: string
  }
}

export {}
