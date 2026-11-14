import {useCallback, useEffect, useState} from 'react'
import {Canvas, useThree} from '@react-three/fiber'
import {SRGBColorSpace, Texture} from 'three'
import {bandHeight, bandTop, mapHeight, stripCount} from './scanMap'

function GlobePair({images, strip, onLost}: {images: readonly HTMLImageElement[]; strip: number; onLost: () => void}) {
  const {gl, viewport, invalidate} = useThree()
  const [textures, setTextures] = useState<Texture[]>([])
  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('webglcontextlost', onLost)
    return () => canvas.removeEventListener('webglcontextlost', onLost)
  }, [gl, onLost])
  const first = images[0]
  const second = images[1]
  useEffect(() => {
    const next = [first, second].map(image => {
      const texture = new Texture(image)
      texture.colorSpace = SRGBColorSpace
      texture.needsUpdate = true
      return texture
    })
    setTextures(next)
    invalidate()
    return () => next.forEach(texture => texture.dispose())
  }, [first, second, invalidate])
  const scale = Math.min(viewport.width / 4.6, viewport.height / 2.2)
  const angle = 2 * Math.PI / stripCount
  const rotation = Math.PI / 2 - (strip + .5) * angle

  return <group scale={scale}>
    {textures.map((texture, i) => <group key={i} position={[i === 0 ? -1.13 : 1.13, 0, 0]} rotation={[0, rotation, 0]}>
      <mesh>
        <sphereGeometry args={[1, 64, 40]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.008, 5, 18, strip * angle, angle, bandTop / mapHeight * Math.PI, bandHeight / mapHeight * Math.PI]} />
        <meshBasicMaterial color="#eefcaf" transparent opacity={.48} depthWrite={false} />
      </mesh>
    </group>)}
  </group>
}

export default function PairedGlobes({images, strip}: {images: readonly HTMLImageElement[]; strip: number}) {
  const [failed, setFailed] = useState(false)
  const onLost = useCallback(() => setFailed(true), [])
  if (failed) return <p role="status">3D is unavailable. The maps and sound are ready below.</p>
  return <figure className="pacific-globe-figure">
    <div className="pacific-globe-years" aria-hidden="true"><span>2025</span><span>2026</span></div>
    <div className="pacific-globe-view" aria-hidden="true">
      <Canvas orthographic camera={{position: [0, 0, 5], zoom: 100}} frameloop="demand" dpr={[1, 1.5]}
        fallback={<p>3D is unavailable. The maps and sound are ready below.</p>}>
        <GlobePair images={images} strip={strip} onLost={onLost} />
      </Canvas>
    </div>
    <figcaption>2025 left, 2026 right. Moving the strip turns both globes to the same column. The 2D maps supply the audio samples.</figcaption>
  </figure>
}
