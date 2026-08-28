import type { APIRequestContext, APIResponse } from '@playwright/test'

type GetOptions = Parameters<APIRequestContext['get']>[1]

const remoteGetAttempts = process.env.E2E_BASE_URL ? 2 : 1
const remoteGetRetryDelayMs = 500
const transientNetworkMarkers = [
  'econnreset',
  'etimedout',
  'econnrefused',
  'ehostunreach',
  'enetunreach',
  'eai_again',
  'socket hang up',
  'timed out',
] as const

function isTransientNetworkError(error: unknown) {
  const detail = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  const normalized = detail.toLowerCase()

  return transientNetworkMarkers.some((marker) => normalized.includes(marker))
}

function errorClass(error: unknown) {
  return error instanceof Error ? error.name : typeof error
}

export async function getWithTransientRetry(
  request: APIRequestContext,
  path: string,
  options?: GetOptions,
): Promise<APIResponse> {
  for (let attempt = 1; attempt <= remoteGetAttempts; attempt += 1) {
    try {
      // HTTP responses, including 4xx/5xx, are returned immediately. Only a thrown
      // transient transport error is eligible for a retry.
      return await request.get(path, options)
    } catch (error) {
      const canRetry = attempt < remoteGetAttempts && isTransientNetworkError(error)
      if (!canRetry) throw error

      // Keep retry diagnostics intentionally narrow: path, attempt and error class only.
      // Never log response bodies, headers, credentials or connection strings here.
      console.warn(
        `[e2e:get-retry] path=${path} attempt=${attempt}/${remoteGetAttempts} error=${errorClass(error)}`,
      )
      await new Promise((resolve) => setTimeout(resolve, remoteGetRetryDelayMs * attempt))
    }
  }

  throw new Error(`unreachable GET retry state for ${path}`)
}
