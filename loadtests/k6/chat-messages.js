/**
 * k6 load test — chat round-trip (POST /v1/sessions/{sessionId}/messages).
 *
 * Prerequisites: k6 (https://k6.io/), running Groucho API, valid project API key.
 *
 * Usage:
 *   BASE_URL=http://localhost:3000 API_KEY=gk_test_xxx k6 run loadtests/k6/chat-messages.js
 *
 * Aligns with PRD NFR-PERF-1 (p95 target TBD; default threshold p95 &lt; 5s excluding network variance).
 */

import http from "k6/http"
import { check, sleep } from "k6"

export const options = {
  scenarios: {
    chat: {
      executor: "constant-vus",
      vus: 5,
      duration: "30s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<5000"],
    http_req_failed: ["rate<0.05"],
  },
}

const base = __ENV.BASE_URL || "http://127.0.0.1:3000"
const apiKey = __ENV.API_KEY || ""

export default function () {
  if (!apiKey) {
    console.error("Set API_KEY (gk_test_*)")
    return
  }

  const sessionId = `k6_${__VU}_${__ITER}_${Date.now()}`
  const url = `${base.replace(/\/$/, "")}/v1/sessions/${sessionId}/messages`
  const payload = JSON.stringify({ message: "Hi." })

  const res = http.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  })

  check(res, {
    "2xx": (r) => r.status >= 200 && r.status < 300,
  })

  sleep(1)
}
