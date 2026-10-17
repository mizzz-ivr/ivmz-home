// Generated original ivmz mascot: pearly white, blue accents, purple eyes; rigged GLB with idle/walk/run.
// Run: node scripts/build-original-mascot.mjs
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
function buildMascotGlb() {
  const groups = new Map();
  const skinPivots = [
    [-0.29, 0.73, 0], [0.29, 0.73, 0], [-0.51, 1.08, 0],
    [0.51, 1.08, 0], [0, 1.64, 0], [0, 0.84, 0],
  ];
  const names = ['left_leg', 'right_leg', 'left_arm', 'right_arm', 'head', 'body'];
  const materials = [
    [0.96, 0.97, 1, 1], [0.48, 0.81, 1, 1], [0.41, 0.24, 0.72, 1],
    [0.14, 0.1, 0.2, 1], [1, 0.66, 0.78, 1], [0.2, 0.59, 0.91, 1],
    [0.99, 0.98, 1, 1],
  ];
  function ellipsoid(material, joint, cx, cy, cz, rx, ry, rz, seg = 12, rings = 8) {
    let g = groups.get(material);
    if (!g) {
      g = { positions: [], normals: [], joints: [], weights: [], indices: [] };
      groups.set(material, g);
    }
    const first = g.positions.length / 3;
    for (let r = 0; r <= rings; r++) {
      const theta = Math.PI * r / rings;
      const sin = Math.sin(theta), cos = Math.cos(theta);
      for (let s = 0; s <= seg; s++) {
        const phi = Math.PI * 2 * s / seg;
        const px = sin * Math.cos(phi), py = cos, pz = sin * Math.sin(phi);
        g.positions.push(cx + rx * px, cy + ry * py, cz + rz * pz);
        const nx = px / rx, ny = py / ry, nz = pz / rz;
        const mag = Math.hypot(nx, ny, nz);
        g.normals.push(nx / mag, ny / mag, nz / mag);
        g.joints.push(joint, 0, 0, 0);
        g.weights.push(1, 0, 0, 0);
      }
    }
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < seg; s++) {
        const a = first + r * (seg + 1) + s;
        const b = a + seg + 1;
        g.indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  // All geometry is original, generated from elementary ellipsoids in bind-pose coordinates.
  ellipsoid(0, 5, 0, 0.84, 0, 0.50, 0.64, 0.39, 16, 10); // body
  ellipsoid(6, 4, 0, 1.67, 0, 0.59, 0.56, 0.48, 20, 12); // round face
  ellipsoid(0, 4, -0.33, 2.11, -0.02, 0.20, 0.32, 0.17, 10, 7);
  ellipsoid(0, 4, 0.33, 2.11, -0.02, 0.20, 0.32, 0.17, 10, 7);
  ellipsoid(1, 4, -0.33, 2.27, 0.02, 0.15, 0.15, 0.13, 10, 7);
  ellipsoid(1, 4, 0.33, 2.27, 0.02, 0.15, 0.15, 0.13, 10, 7);
  ellipsoid(2, 4, -0.205, 1.75, 0.45, 0.13, 0.16, 0.08, 10, 7); // purple eyes
  ellipsoid(2, 4, 0.205, 1.75, 0.45, 0.13, 0.16, 0.08, 10, 7);
  ellipsoid(6, 4, -0.235, 1.80, 0.516, 0.042, 0.059, 0.019, 8, 5); // eye highlights
  ellipsoid(6, 4, 0.175, 1.80, 0.516, 0.042, 0.059, 0.019, 8, 5);
  ellipsoid(4, 4, -0.39, 1.51, 0.37, 0.115, 0.067, 0.05, 8, 5);
  ellipsoid(4, 4, 0.39, 1.51, 0.37, 0.115, 0.067, 0.05, 8, 5);
  ellipsoid(3, 4, 0, 1.48, 0.485, 0.11, 0.037, 0.04, 10, 6);
  ellipsoid(0, 0, -0.29, 0.47, 0.0, 0.21, 0.42, 0.24, 10, 7); // legs
  ellipsoid(0, 1, 0.29, 0.47, 0.0, 0.21, 0.42, 0.24, 10, 7);
  ellipsoid(5, 0, -0.29, 0.17, 0.16, 0.235, 0.17, 0.33, 10, 7); // shoes
  ellipsoid(5, 1, 0.29, 0.17, 0.16, 0.235, 0.17, 0.33, 10, 7);
  ellipsoid(0, 2, -0.60, 0.89, 0.01, 0.21, 0.40, 0.215, 10, 7); // arms
  ellipsoid(0, 3, 0.60, 0.89, 0.01, 0.21, 0.40, 0.215, 10, 7);
  ellipsoid(1, 2, -0.63, 0.57, 0.08, 0.19, 0.19, 0.18, 10, 7);
  ellipsoid(1, 3, 0.63, 0.57, 0.08, 0.19, 0.19, 0.18, 10, 7);
  ellipsoid(2, 5, -0.12, 0.93, 0.375, 0.068, 0.085, 0.028, 8, 5); // chest symbol
  ellipsoid(5, 5, 0.10, 0.90, 0.38, 0.045, 0.17, 0.024, 8, 5);

  const bufferBytes = [];
  const bufferViews = [];
  const accessors = [];
  function rawBytes(values, component) {
    const bytes = new Uint8Array(values.length * (component === 5126 ? 4 : component === 5123 ? 2 : 1));
    const v = new DataView(bytes.buffer);
    for (let i = 0; i < values.length; i++) {
      if (component === 5126) v.setFloat32(i * 4, values[i], true);
      else if (component === 5123) v.setUint16(i * 2, values[i], true);
      else bytes[i] = values[i];
    }
    return bytes;
  }
  function accessor(values, componentType, type, usage, bounds) {
    while (bufferBytes.length % 4) bufferBytes.push(0);
    const byteOffset = bufferBytes.length;
    const chunk = rawBytes(values, componentType);
    for (const b of chunk) bufferBytes.push(b);
    const byteLength = chunk.length;
    const bufferView = bufferViews.length;
    bufferViews.push({ buffer: 0, byteOffset, byteLength, ...(usage ? { target: usage } : {}) });
    const elements = ({ SCALAR: 1, VEC3: 3, VEC4: 4, MAT4: 16 })[type];
    const obj = { bufferView, componentType, count: values.length / elements, type };
    if (bounds) {
      obj.min = bounds.min;
      obj.max = bounds.max;
    }
    accessors.push(obj);
    return accessors.length - 1;
  }
  const primitives = [];
  for (const [mat, g] of groups) {
    const mins = [Infinity, Infinity, Infinity], maxes = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < g.positions.length; i += 3) {
      for (let j = 0; j < 3; j++) {
        mins[j] = Math.min(mins[j], g.positions[i + j]);
        maxes[j] = Math.max(maxes[j], g.positions[i + j]);
      }
    }
    primitives.push({
      attributes: {
        POSITION: accessor(g.positions, 5126, 'VEC3', 34962, { min: mins, max: maxes }),
        NORMAL: accessor(g.normals, 5126, 'VEC3', 34962),
        JOINTS_0: accessor(g.joints, 5121, 'VEC4', 34962),
        WEIGHTS_0: accessor(g.weights, 5126, 'VEC4', 34962)
      },
      indices: accessor(g.indices, 5123, 'SCALAR', 34963),
      material: mat, mode: 4
    });
  }
  const ibm = [];
  for (const p of skinPivots) ibm.push(
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -p[0], -p[1], -p[2], 1
  );
  const ibmAccessor = accessor(ibm, 5126, 'MAT4');
  const nodes = [
    { name: 'ivmz-original-mascot', mesh: 0, skin: 0, children: [1, 2, 3, 4, 5, 6] },
    ...skinPivots.map((translation, i) => ({ name: names[i], translation }))
  ];
  function rotationX(a) {
    return [Math.sin(a / 2), 0, 0, Math.cos(a / 2)];
  }
  function rotationY(a) {
    return [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
  }
  function animation(name, seconds, samples) {
    const times = samples.map((_, i) => seconds * i / (samples.length - 1));
    const input = accessor(times, 5126, 'SCALAR', undefined, { min: [0], max: [seconds] });
    const samplers = [], channels = [];
    function add(node, path, values, type = 'VEC4') {
      const output = accessor(values.flat(), 5126, type);
      channels.push({ sampler: samplers.length, target: { node, path } });
      samplers.push({ input, output, interpolation: 'LINEAR' });
    }
    add(1, 'rotation', samples.map(s => rotationX(s.leg)));
    add(2, 'rotation', samples.map(s => rotationX(-s.leg)));
    add(3, 'rotation', samples.map(s => rotationX(-s.arm)));
    add(4, 'rotation', samples.map(s => rotationX(s.arm)));
    add(5, 'rotation', samples.map(s => rotationY(s.head)));
    add(6, 'translation', samples.map(s => [0, 0.84 + s.bob, 0]), 'VEC3');
    return { name, samplers, channels };
  }
  const idle = animation('idle', 2, [
    { leg: 0, arm: 0.04, head: -0.08, bob: 0 },
    { leg: 0, arm: -0.03, head: 0.08, bob: 0.035 },
    { leg: 0, arm: 0.04, head: -0.08, bob: 0 }
  ]);
  const walk = animation('walk', 0.8, [
    { leg: -0.36, arm: -0.28, head: -0.04, bob: 0 },
    { leg: 0, arm: 0, head: 0, bob: 0.045 },
    { leg: 0.36, arm: 0.28, head: 0.04, bob: 0 },
    { leg: 0, arm: 0, head: 0, bob: 0.045 },
    { leg: -0.36, arm: -0.28, head: -0.04, bob: 0 }
  ]);
  const run = animation('run', 0.45, [
    { leg: -0.73, arm: -0.57, head: -0.10, bob: 0.03 },
    { leg: 0, arm: 0, head: 0, bob: 0.13 },
    { leg: 0.73, arm: 0.57, head: 0.10, bob: 0.03 },
    { leg: 0, arm: 0, head: 0, bob: 0.13 },
    { leg: -0.73, arm: -0.57, head: -0.10, bob: 0.03 }
  ]);
  while (bufferBytes.length % 4) bufferBytes.push(0);
  const bin = new Uint8Array(bufferBytes);
  const json = {
    asset: { version: '2.0', generator: 'ivmz-original-mascot-builder' },
    scene: 0, scenes: [{ nodes: [0] }], nodes,
    materials: materials.map((factor, i) => ({
      name: ['pearl', 'sky-blue', 'violet', 'ink', 'blush', 'deep-blue', 'face-white'][i],
      pbrMetallicRoughness: { baseColorFactor: factor, metallicFactor: 0, roughnessFactor: 0.68 },
      doubleSided: true
    })),
    meshes: [{ name: 'SkinnedOriginalMascot', primitives }],
    skins: [{ inverseBindMatrices: ibmAccessor, skeleton: 0, joints: [1, 2, 3, 4, 5, 6] }],
    animations: [idle, walk, run], buffers: [{ byteLength: bin.length }],
    bufferViews, accessors
  };
  const jsonText = JSON.stringify(json);
  const jsonBytes = [];
  for (let i = 0; i < jsonText.length; i++) jsonBytes.push(jsonText.charCodeAt(i));
  while (jsonBytes.length % 4) jsonBytes.push(0x20);
  const length = 12 + 8 + jsonBytes.length + 8 + bin.length;
  const output = new Uint8Array(length), dv = new DataView(output.buffer);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, length, true);
  dv.setUint32(12, jsonBytes.length, true); dv.setUint32(16, 0x4e4f534a, true);
  output.set(jsonBytes, 20);
  const end = 20 + jsonBytes.length;
  dv.setUint32(end, bin.length, true); dv.setUint32(end + 4, 0x004e4942, true);
  output.set(bin, end + 8);
  return output;
}
const modelPath = 'public/mascot/ivmz-mascot-v1.glb'
const built = buildMascotGlb()
if (process.argv.includes('--check')) {
  const existing = readFileSync(modelPath)
  if (!Buffer.from(built).equals(existing)) {
    throw new Error('Mascot GLB differs from the reproducible model source')
  }
} else {
  mkdirSync('public/mascot', { recursive: true })
  writeFileSync(modelPath, built)
}
