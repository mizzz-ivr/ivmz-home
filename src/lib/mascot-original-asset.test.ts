import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const assetPath = join(process.cwd(), 'public', 'mascot', 'ivmz-mascot-v1.glb')

type Animation = {
  name: string
  channels: { target: { node: number; path: string } }[]
}

type Asset = {
  asset: { version: string; generator: string }
  buffers: { byteLength: number }[]
  bufferViews: { buffer: number; byteOffset: number; byteLength: number }[]
  accessors: { componentType: number; count: number; type: string }[]
  meshes: { primitives: { attributes: Record<string, number> }[] }[]
  nodes: { name?: string; mesh?: number; skin?: number }[]
  skins: { joints: number[]; inverseBindMatrices: number }[]
  animations: Animation[]
}

function readModel() {
  const bytes = readFileSync(assetPath)
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const jsonLength = header.getUint32(12, true)
  const json = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8')) as Asset
  const binaryOffset = 20 + jsonLength
  return { bytes, header, json, binaryOffset }
}

describe('original animated mascot GLB', () => {
  it('is a compact, self-contained and correctly sized GLB 2.0 file', () => {
    const { bytes, header, json, binaryOffset } = readModel()

    expect(header.getUint32(0, true)).toBe(0x46546c67)
    expect(header.getUint32(4, true)).toBe(2)
    expect(header.getUint32(8, true)).toBe(bytes.length)
    expect(bytes.length).toBeLessThan(5 * 1024 * 1024)
    expect(header.getUint32(16, true)).toBe(0x4e4f534a)
    expect(header.getUint32(binaryOffset + 4, true)).toBe(0x004e4942)
    expect(json.asset.version).toBe('2.0')
    expect(json.buffers).toHaveLength(1)
    expect(json.buffers[0].byteLength).toBe(header.getUint32(binaryOffset, true))
    expect(json.bufferViews.length).toBeGreaterThan(0)
    expect(json.bufferViews.every((view) => view.buffer === 0)).toBe(true)
    expect(json.bufferViews.every((view) => view.byteLength > 0)).toBe(true)
  })

  it('contains a genuine skinned 3D mesh and named arm and leg joints', () => {
    const { json } = readModel()

    expect(json.meshes).toHaveLength(1)
    expect(json.meshes[0].primitives.length).toBeGreaterThanOrEqual(3)
    for (const primitive of json.meshes[0].primitives) {
      expect(primitive.attributes).toHaveProperty('POSITION')
      expect(primitive.attributes).toHaveProperty('NORMAL')
      expect(primitive.attributes).toHaveProperty('JOINTS_0')
      expect(primitive.attributes).toHaveProperty('WEIGHTS_0')
    }
    expect(json.nodes[0]).toMatchObject({ mesh: 0, skin: 0 })
    expect(json.nodes.map((node) => node.name)).toEqual(
      expect.arrayContaining(['left_leg', 'right_leg', 'left_arm', 'right_arm', 'head', 'body']),
    )
    expect(json.skins[0].joints).toHaveLength(6)
    expect(json.accessors[json.skins[0].inverseBindMatrices]).toMatchObject({
      count: 6,
      componentType: 5126,
      type: 'MAT4',
    })
  })

  it('has separate idle, walk and run motion clips that animate the legs', () => {
    const { json } = readModel()

    expect(json.animations.map((clip) => clip.name)).toEqual(['idle', 'walk', 'run'])
    for (const clip of json.animations) {
      const movingNodes = new Set(clip.channels.map((channel) => channel.target.node))
      expect(movingNodes.has(1)).toBe(true)
      expect(movingNodes.has(2)).toBe(true)
      expect(movingNodes.has(3)).toBe(true)
      expect(movingNodes.has(4)).toBe(true)
      expect(clip.channels.every((channel) => channel.target.path !== 'weights')).toBe(true)
    }
  })

  it('can reproduce the committed GLB exactly from its original source', () => {
    expect(() =>
      execFileSync(process.execPath, ['scripts/build-original-mascot.mjs', '--check'], {
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 10_000,
      }),
    ).not.toThrow()
  })
})
