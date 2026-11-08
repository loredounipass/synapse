/**
 * Servicio API para gestión y evaluación de Trading Setups.
 * Consume endpoints protegidos bajo /api/setups.
 */

import { httpRequest } from "./httpClient"

export async function fetchSetups({ status, symbol } = {}) {
  const params = new URLSearchParams()
  if (status && status !== "ALL") params.append("status", status)
  if (symbol) params.append("symbol", symbol)

  const query = params.toString() ? `?${params.toString()}` : ""
  return httpRequest(`/setups${query}`, { method: "GET" })
}

export async function createSetup(payload) {
  return httpRequest("/setups", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function fetchSetup(setupId) {
  return httpRequest(`/setups/${setupId}`, { method: "GET" })
}

export async function updateSetup(setupId, payload) {
  return httpRequest(`/setups/${setupId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteSetup(setupId) {
  return httpRequest(`/setups/${setupId}`, { method: "DELETE" })
}

export async function evaluateSetup(setupId) {
  return httpRequest(`/setups/${setupId}/evaluate`, {
    method: "POST",
  })
}

export async function evaluateAllSetups(status = "PENDING") {
  return httpRequest("/setups/evaluate-all", {
    method: "POST",
    body: JSON.stringify({ status }),
  })
}

