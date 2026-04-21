"use client"

import { createContext, useContext } from "react"
import type { GrouchoClient } from "../client.js"

const GrouchoContext = createContext<GrouchoClient | null>(null)

export function useGroucho(): GrouchoClient {
  const c = useContext(GrouchoContext)
  if (!c) {
    throw new Error("useGroucho must be used within GrouchoProvider")
  }
  return c
}

export { GrouchoContext }
