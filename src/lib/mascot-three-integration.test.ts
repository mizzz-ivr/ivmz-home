import { readFileSync } from 'node:fs'

import { AnimationMixer, SkinnedMesh } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { describe, expect, it } from 'vitest'

const MODEL_PATH = 'public/mascot/ivmz-mascot-v1.glb'

describe('real original mascot GLB playback', () => {
  it('loads the committed GLB and animates skinned limbs with Three.js', async () => {
    const source = readFileSync(MODEL_PATH)
    // GLTFLoader checks instanceof ArrayBuffer. Copy Node Buffer bytes into
    // this jsdom realm so the loader recognizes the binary GLB input.
    const input = new Uint8Array(source.byteLength)
    input.set(source)
    const gltf = await new GLTFLoader().parseAsync(input.buffer, '/mascot/')

    expect(gltf.animations.map((clip) => clip.name)).toEqual(['idle', 'walk', 'run'])
    const meshes: SkinnedMesh[] = []
    gltf.scene.traverse((object) => {
      if (object instanceof SkinnedMesh) meshes.push(object)
    })
    expect(meshes.length).toBeGreaterThan(0)
    expect(meshes[0].skeleton.bones.length).toBeGreaterThanOrEqual(6)

    const leftLeg = gltf.scene.getObjectByName('left_leg')
    const rightLeg = gltf.scene.getObjectByName('right_leg')
    expect(leftLeg).toBeDefined()
    expect(rightLeg).toBeDefined()
    if (!leftLeg || !rightLeg) throw new Error('Missing skinned legs')

    const mixer = new AnimationMixer(gltf.scene)
    const walk = mixer.clipAction(gltf.animations[1])
    walk.play()
    mixer.update(0.2)

    expect(Math.abs(leftLeg.rotation.x)).toBeGreaterThan(0.05)
    expect(leftLeg.rotation.x * rightLeg.rotation.x).toBeLessThan(0)

    walk.stop()
    const run = mixer.clipAction(gltf.animations[2])
    run.play()
    mixer.update(0.1125)
    expect(Math.abs(leftLeg.rotation.x)).toBeGreaterThan(0.1)

    mixer.stopAllAction()
    mixer.uncacheRoot(gltf.scene)
  })
})
