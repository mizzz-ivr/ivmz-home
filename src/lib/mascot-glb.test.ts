import { describe, expect, it } from 'vitest'

import { inspectMascotGlb, MAX_MASCOT_GLB_BYTES } from './mascot-glb'

function candidate() {
  const action = (name: string) => ({
    name,
    samplers: [{ input: 0, output: 0 }],
    channels: [{ sampler: 0, target: { node: 1, path: 'rotation' } }],
  })
  return {
    asset: { version: '2.0' },
    buffers: [{ byteLength: 4 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }],
    nodes: [{ mesh: 0, skin: 0 }, { name: 'leg' }],
    skins: [{ joints: [1] }],
    animations: [action('idle'), action('walk'), action('run')],
  }
}

function glb(model: object, dataLength = 4): Uint8Array {
  const encoded = new TextEncoder().encode(JSON.stringify(model))
  const jsonLength = Math.ceil(encoded.byteLength / 4) * 4
  const binaryLength = Math.ceil(dataLength / 4) * 4
  const buffer = new Uint8Array(12 + 8 + jsonLength + 8 + binaryLength)
  const view = new DataView(buffer.buffer)
  view.setUint32(0, 0x46546c67, true)
  view.setUint32(4, 2, true)
  view.setUint32(8, buffer.byteLength, true)
  view.setUint32(12, jsonLength, true)
  view.setUint32(16, 0x4e4f534a, true)
  buffer.fill(0x20, 20, 20 + jsonLength)
  buffer.set(encoded, 20)
  view.setUint32(20 + jsonLength, binaryLength, true)
  view.setUint32(24 + jsonLength, 0x004e4942, true)
  return buffer
}

describe('mascot GLB asset acceptance', () => {
  it('accepts a bounded, embedded and skinned GLB with distinct clip names', () => {
    const report = inspectMascotGlb(glb(candidate()))
    expect(report).toMatchObject({
      ok: true,
      report: { nodes: 2, meshes: 1, joints: 1, clips: ['idle', 'walk', 'run'] },
    })
  })

  it('rejects truncated data and invalid header or declared size', () => {
    expect(inspectMascotGlb(new Uint8Array(12))).toEqual({ ok: false, reason: 'truncated' })
    const corrupt = glb(candidate())
    corrupt[0] = 0
    expect(inspectMascotGlb(corrupt)).toEqual({ ok: false, reason: 'invalid_glb_header' })

    const mismatch = glb(candidate())
    new DataView(mismatch.buffer).setUint32(8, 24, true)
    expect(inspectMascotGlb(mismatch)).toEqual({ ok: false, reason: 'invalid_total_length' })
  })

  it('enforces the asset budget before decoding the JSON payload', () => {
    const oversized = new Uint8Array(MAX_MASCOT_GLB_BYTES + 1)
    expect(inspectMascotGlb(oversized)).toEqual({ ok: false, reason: 'size_limit' })
  })

  it('requires the actual skinned 3D mesh instead of accepting a 2D-like model', () => {
    const model = candidate()
    model.nodes = [{ mesh: 0 }, { name: 'leg' }] as typeof model.nodes
    expect(inspectMascotGlb(glb(model))).toEqual({ ok: false, reason: 'missing_skinned_mesh' })
  })

  it('requires all three independent named clips', () => {
    const model = candidate()
    model.animations.pop()
    expect(inspectMascotGlb(glb(model))).toEqual({ ok: false, reason: 'missing_required_clip' })
  })

  it('requires animation channels targeting a skeleton joint', () => {
    const model = candidate()
    model.animations[1].channels[0].target.node = 0
    expect(inspectMascotGlb(glb(model))).toEqual({
      ok: false,
      reason: 'clip_has_no_joint_animation',
    })
  })

  it('rejects external textures and unsupported decoder extensions', () => {
    const model = { ...candidate(), images: [{ uri: 'https://example.test/face.png' }] }
    expect(inspectMascotGlb(glb(model))).toEqual({
      ok: false,
      reason: 'external_or_invalid_texture',
    })
    const extended = { ...candidate(), extensionsRequired: ['KHR_draco_mesh_compression'] }
    expect(inspectMascotGlb(glb(extended))).toEqual({
      ok: false,
      reason: 'unsupported_required_extension',
    })
  })

  it('rejects malformed binary chunks without following external references', () => {
    const buffer = glb(candidate())
    new DataView(buffer.buffer).setUint32(12, 0xfffffff0, true)
    expect(inspectMascotGlb(buffer)).toEqual({ ok: false, reason: 'invalid_chunk_length' })
  })
})
