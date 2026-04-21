import { createClient, type GrouchoClient, type GrouchoClientOptions } from "./client.js"

export type CreateServerClientOptions = Omit<GrouchoClientOptions, "apiKey"> & {
  /** Required on the server — never pass to browser bundles. */
  apiKey: string
}

/**
 * Same as {@link createClient} but requires `apiKey` (typed for server-only usage).
 */
export function createServerClient(options: CreateServerClientOptions): GrouchoClient {
  return createClient(options)
}

export { createClient } from "./client.js"
export type { GrouchoClient, GrouchoClientOptions } from "./client.js"
export { GrouchoApiError } from "./errors.js"
