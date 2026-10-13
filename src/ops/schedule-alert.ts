import { after } from 'next/server'

import { sendOpsAlert, type OpsAlert } from './alert'

/**
 * Sends an alert after the response has been returned, so a slow webhook can never delay a
 * visitor. Outside a request (unit tests, scripts) it falls back to a detached best-effort call.
 */
export function scheduleOpsAlert(alert: OpsAlert) {
  try {
    after(() => sendOpsAlert(alert))
  } catch {
    void sendOpsAlert(alert)
  }
}
