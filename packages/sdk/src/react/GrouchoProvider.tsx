"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { createClient, type GrouchoClient } from "../client.js"
import { GrouchoContext } from "./context.js"

export type GrouchoProviderProps = {
  /** Direct client (e.g. server-held key on a private route — still avoid exposing keys in the browser). */
  client?: GrouchoClient
  /**
   * Relative proxy base on this origin (e.g. `/api/groucho`). The host forwards to Groucho with
   * the project API key. Mutually exclusive with `client`.
   */
  proxyBasePath?: string
  children: ReactNode
}

export function GrouchoProvider({
  client: clientProp,
  proxyBasePath,
  children,
}: GrouchoProviderProps) {
  if ((clientProp && proxyBasePath) || (!clientProp && !proxyBasePath)) {
    throw new Error("GrouchoProvider: provide exactly one of `client` or `proxyBasePath`")
  }

  const [proxyClient, setProxyClient] = useState<GrouchoClient | null>(null)

  useEffect(() => {
    if (!proxyBasePath || clientProp) return
    setProxyClient(
      createClient({
        baseUrl: `${window.location.origin}${proxyBasePath}`,
        apiKey: undefined,
      }),
    )
  }, [clientProp, proxyBasePath])

  const client = useMemo(
    () => clientProp ?? proxyClient,
    [clientProp, proxyClient],
  )

  if (!client) {
    return (
      <div className="groucho-root groucho-muted" style={{ padding: "1rem" }}>
        Loading…
      </div>
    )
  }

  return (
    <GrouchoContext.Provider value={client}>{children}</GrouchoContext.Provider>
  )
}
