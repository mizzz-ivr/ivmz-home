import { describe, expect, it } from 'vitest'

import { HARD_LIMITS } from './catalog'
import { DISABLED_POLICY, resolveAttachmentPolicy, toPublicPolicy } from './policy'

const MB = 1024 * 1024

describe('resolveAttachmentPolicy', () => {
  it('stays disabled without configured storage even if an admin enabled it', () => {
    expect(
      resolveAttachmentPolicy({ attachmentsEnabled: true }, { storageConfigured: false }),
    ).toBe(DISABLED_POLICY)
  })

  it('stays disabled until an admin enables it', () => {
    expect(resolveAttachmentPolicy(null, { storageConfigured: true })).toBe(DISABLED_POLICY)
    expect(
      resolveAttachmentPolicy({ attachmentsEnabled: false }, { storageConfigured: true }),
    ).toBe(DISABLED_POLICY)
  })

  it('applies admin limits and types', () => {
    const policy = resolveAttachmentPolicy(
      {
        allowedTypes: ['png', 'docx'],
        attachmentsEnabled: true,
        maxFileSizeMB: 8,
        maxFiles: 2,
        maxTotalSizeMB: 12,
      },
      { storageConfigured: true },
    )

    expect(policy.enabled).toBe(true)
    expect(policy.maxFileBytes).toBe(8 * MB)
    expect(policy.maxFiles).toBe(2)
    expect(policy.maxTotalBytes).toBe(12 * MB)
    expect(policy.types.map((type) => type.id)).toEqual(['png', 'docx'])
  })

  it('clamps values to the hard ceilings so the CMS cannot raise them', () => {
    const policy = resolveAttachmentPolicy(
      { attachmentsEnabled: true, maxFileSizeMB: 9_999, maxFiles: 99, maxTotalSizeMB: 9_999 },
      { storageConfigured: true },
    )

    expect(policy.maxFileBytes).toBe(HARD_LIMITS.maxFileBytes)
    expect(policy.maxFiles).toBe(HARD_LIMITS.maxFiles)
    expect(policy.maxTotalBytes).toBe(HARD_LIMITS.maxTotalBytes)
  })

  it('ignores non-numeric limits and types outside the vetted catalog', () => {
    const policy = resolveAttachmentPolicy(
      {
        allowedTypes: ['exe', 'zip', 'docm', 'pdf'],
        attachmentsEnabled: true,
        maxFileSizeMB: Number.NaN,
        maxFiles: -4,
      },
      { storageConfigured: true },
    )

    expect(policy.types.map((type) => type.id)).toEqual(['pdf'])
    expect(policy.maxFiles).toBe(1)
    expect(policy.maxFileBytes).toBe(5 * MB)
  })

  it('disables when no allowed type survives the catalog', () => {
    expect(
      resolveAttachmentPolicy(
        { allowedTypes: ['exe'], attachmentsEnabled: true },
        { storageConfigured: true },
      ),
    ).toBe(DISABLED_POLICY)
  })

  it('never lets the total limit drop below one file', () => {
    const policy = resolveAttachmentPolicy(
      { attachmentsEnabled: true, maxFileSizeMB: 10, maxTotalSizeMB: 2 },
      { storageConfigured: true },
    )
    expect(policy.maxTotalBytes).toBe(10 * MB)
  })

  it('exposes only what the browser needs', () => {
    const publicPolicy = toPublicPolicy(
      resolveAttachmentPolicy({ attachmentsEnabled: true }, { storageConfigured: true }),
    )
    expect(publicPolicy.types[0]).toEqual({
      extensions: ['png'],
      id: 'png',
      label: 'PNG image',
      mime: 'image/png',
    })
  })
})
