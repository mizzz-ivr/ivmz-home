export type LimitedRequestText =
  | { kind: 'ok'; text: string }
  | { kind: 'too_large' }
  | { kind: 'invalid' }

/**
 * Reject oversized API payloads *while* consuming the request stream.
 * Reading request.text() first does not enforce a memory limit for chunked bodies
 * or requests with a misleading Content-Length header.
 */
export async function readLimitedRequestText(
  request: Request,
  maxBytes: number,
): Promise<LimitedRequestText> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) return { kind: 'invalid' }

  const lengthHeader = request.headers.get('content-length')
  if (lengthHeader !== null) {
    const declaredBytes = Number(lengthHeader)
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes < 0) {
      return { kind: 'invalid' }
    }
    if (declaredBytes > maxBytes) return { kind: 'too_large' }
  }

  if (!request.body) return { kind: 'invalid' }

  const reader = request.body.getReader()
  const parts: Uint8Array[] = []
  let receivedBytes = 0
  let overLimit = false

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value.byteLength > maxBytes - receivedBytes) {
        overLimit = true
        return { kind: 'too_large' }
      }
      parts.push(value)
      receivedBytes += value.byteLength
    }

    const bytes = new Uint8Array(receivedBytes)
    let offset = 0
    for (const part of parts) {
      bytes.set(part, offset)
      offset += part.byteLength
    }

    return { kind: 'ok', text: new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
  } catch {
    return { kind: 'invalid' }
  } finally {
    if (overLimit) {
      // Do not wait on cancellation of an untrusted, possibly stalled body stream.
      void reader.cancel().catch(() => undefined)
    }
    reader.releaseLock()
  }
}
