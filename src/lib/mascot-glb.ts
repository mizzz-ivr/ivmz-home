/**
 * A bounded, dependency-free structural gate for candidate 3D mascot assets.
 * Passing this check is NOT equivalent to visual inspection or a complete glTF audit.
 */
export const MAX_MASCOT_GLB_BYTES = 5 * 1024 * 1024
export const REQUIRED_MASCOT_CLIPS = ['idle', 'walk', 'run'] as const

export type MascotGlbValidation =
  | {
      ok: true
      report: { bytes: number; nodes: number; meshes: number; joints: number; clips: string[] }
    }
  | { ok: false; reason: string }

type JsonObject = Record<string, unknown>

function record(value: unknown): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function objectArray(value: unknown): JsonObject[] | null {
  if (!Array.isArray(value) || !value.every(record)) return null
  return value
}

function validIndex(value: unknown, length: number): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) < length
}

function invalid(reason: string): MascotGlbValidation {
  return { ok: false, reason }
}

/**
 * Validate a local GLB before connecting it to a WebGL loader.
 * No external URI, optional decoder or external texture is accepted at this stage.
 */
export function inspectMascotGlb(source: ArrayBuffer | Uint8Array): MascotGlbValidation {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source)
  if (bytes.byteLength < 28) return invalid('truncated')
  if (bytes.byteLength > MAX_MASCOT_GLB_BYTES) return invalid('size_limit')

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2) {
    return invalid('invalid_glb_header')
  }
  if (view.getUint32(8, true) !== bytes.byteLength) return invalid('invalid_total_length')

  let offset = 12
  const chunks: { type: number; start: number; length: number }[] = []
  while (offset < bytes.byteLength) {
    if (offset + 8 > bytes.byteLength) return invalid('truncated_chunk_header')
    const length = view.getUint32(offset, true)
    const type = view.getUint32(offset + 4, true)
    const start = offset + 8
    if (length % 4 !== 0 || length > bytes.byteLength - start) {
      return invalid('invalid_chunk_length')
    }
    chunks.push({ type, start, length })
    offset = start + length
  }
  if (
    chunks.length !== 2 ||
    chunks[0].type !== 0x4e4f534a ||
    chunks[1].type !== 0x004e4942
  ) {
    return invalid('expected_json_and_binary_chunks')
  }

  let model: unknown
  try {
    const json = bytes.subarray(chunks[0].start, chunks[0].start + chunks[0].length)
    model = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(json))
  } catch {
    return invalid('invalid_json')
  }
  if (!record(model) || !record(model.asset) || model.asset.version !== '2.0') {
    return invalid('invalid_gltf_version')
  }
  if (Array.isArray(model.extensionsRequired) && model.extensionsRequired.length > 0) {
    return invalid('unsupported_required_extension')
  }

  const buffers = objectArray(model.buffers)
  if (
    !buffers ||
    buffers.length !== 1 ||
    !Number.isSafeInteger(buffers[0].byteLength) ||
    (buffers[0].byteLength as number) < 1 ||
    (buffers[0].byteLength as number) > chunks[1].length ||
    buffers[0].uri !== undefined
  ) {
    return invalid('invalid_embedded_buffer')
  }
  const images = objectArray(model.images ?? [])
  if (!images || images.length > 8 || images.some((image) => image.uri !== undefined)) {
    return invalid('external_or_invalid_texture')
  }

  const meshes = objectArray(model.meshes)
  const nodes = objectArray(model.nodes)
  const skins = objectArray(model.skins)
  const animations = objectArray(model.animations)
  if (
    !meshes ||
    !nodes ||
    !skins ||
    !animations ||
    meshes.length < 1 ||
    meshes.length > 20 ||
    nodes.length > 128 ||
    skins.length < 1 ||
    animations.length > 12
  ) {
    return invalid('invalid_model_structure')
  }
  if (
    !meshes.every(
      (mesh) =>
        Array.isArray(mesh.primitives) &&
        mesh.primitives.length > 0 &&
        mesh.primitives.every(
          (primitive: unknown) =>
            record(primitive) && record(primitive.attributes) && primitive.attributes.POSITION !== undefined,
        ),
    )
  ) {
    return invalid('missing_3d_mesh')
  }

  const joints = new Set<number>()
  for (const skin of skins) {
    if (
      !Array.isArray(skin.joints) ||
      skin.joints.length < 1 ||
      skin.joints.length > 96 ||
      !skin.joints.every((joint: unknown) => validIndex(joint, nodes.length))
    ) {
      return invalid('invalid_skeleton')
    }
    for (const joint of skin.joints as number[]) joints.add(joint)
  }
  if (
    !nodes.some(
      (node) => validIndex(node.mesh, meshes.length) && validIndex(node.skin, skins.length),
    )
  ) {
    return invalid('missing_skinned_mesh')
  }

  const names = new Set<string>()
  for (const clip of animations) {
    if (typeof clip.name !== 'string' || names.has(clip.name)) return invalid('invalid_clip_name')
    names.add(clip.name)
    if (!Array.isArray(clip.samplers) || !Array.isArray(clip.channels) || clip.channels.length < 1) {
      return invalid('empty_animation')
    }
    const hasJointMotion = clip.channels.some((channel: unknown) => {
      if (!record(channel) || !record(channel.target)) return false
      const target = channel.target
      return (
        validIndex(channel.sampler, clip.samplers.length) &&
        typeof target.node === 'number' &&
        joints.has(target.node) &&
        (target.path === 'translation' || target.path === 'rotation' || target.path === 'scale')
      )
    })
    if (!hasJointMotion) return invalid('clip_has_no_joint_animation')
  }
  if (!REQUIRED_MASCOT_CLIPS.every((name) => names.has(name))) {
    return invalid('missing_required_clip')
  }

  return {
    ok: true,
    report: {
      bytes: bytes.byteLength,
      nodes: nodes.length,
      meshes: meshes.length,
      joints: joints.size,
      clips: [...names],
    },
  }
}
