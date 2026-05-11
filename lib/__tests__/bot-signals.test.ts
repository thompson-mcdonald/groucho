import { describe, expect, it } from "vitest"
import {
  botSignalFromHeaders,
  isLikelyAutomatedUserAgent,
} from "@/lib/bot-signals"

describe("isLikelyAutomatedUserAgent", () => {
  it.each([
    {
      ua: null,
      likelyBot: true,
      reason: "empty_user_agent",
    },
    {
      ua: "",
      likelyBot: true,
      reason: "empty_user_agent",
    },
    {
      ua: "   ",
      likelyBot: true,
      reason: "empty_user_agent",
    },
    {
      ua: "curl/8.7.1",
      likelyBot: true,
      reason: "ua_contains:curl/",
    },
    {
      ua: "python-requests/2.31.0",
      likelyBot: true,
      reason: "ua_contains:python-requests",
    },
    {
      ua: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 HeadlessChrome/120.0.0.0",
      likelyBot: true,
      reason: "ua_contains:headlesschrome",
    },
    {
      ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      likelyBot: false,
      reason: undefined,
    },
    {
      ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      likelyBot: false,
      reason: undefined,
    },
    {
      ua: "Googlebot/2.1 (+http://www.google.com/bot.html)",
      likelyBot: true,
      reason: "ua_contains:googlebot",
    },
  ])("$ua → likelyBot=$likelyBot", ({ ua, likelyBot, reason }) => {
    const s = isLikelyAutomatedUserAgent(ua)
    expect(s.likelyBot).toBe(likelyBot)
    expect(s.reason).toBe(reason)
  })
})

describe("botSignalFromHeaders", () => {
  it("reads User-Agent header", () => {
    const h = new Headers()
    h.set("User-Agent", "axios/1.6.0")
    expect(botSignalFromHeaders(h)).toEqual({
      likelyBot: true,
      reason: "ua_contains:axios/",
    })
  })

  it("treats missing User-Agent like empty", () => {
    const h = new Headers()
    expect(botSignalFromHeaders(h)).toEqual({
      likelyBot: true,
      reason: "empty_user_agent",
    })
  })
})
