import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import world from '../data/world.json';
import './EarthGlobe.css';

export type GlobeLocation = { id: string; name: string; lat: number; lon: number };

type EarthGlobeProps = {
  locations: GlobeLocation[];
  selectedId: string;
  onSelect: (id: string) => void;
  playing: boolean;
};

type Rotation = { lat: number; lon: number };
type Point = { x: number; y: number; depth: number };
const RAD = Math.PI / 180;
const CX = 380;
const CY = 281;
const RADIUS = 215;

/** Orthographic projection: the depth hides everything on Earth's far side. */
function project(lon: number, lat: number, rotation: Rotation): Point {
  const longitude = (lon - rotation.lon) * RAD;
  const latitude = lat * RAD;
  const center = rotation.lat * RAD;
  const cosLatitude = Math.cos(latitude);
  return {
    x: CX + RADIUS * cosLatitude * Math.sin(longitude),
    y: CY - RADIUS * (Math.cos(center) * Math.sin(latitude) - Math.sin(center) * cosLatitude * Math.cos(longitude)),
    depth: Math.sin(center) * Math.sin(latitude) + Math.cos(center) * cosLatitude * Math.cos(longitude),
  };
}

function linePath(coordinates: number[][], rotation: Rotation): string {
  let path = '';
  let penDown = false;
  for (const [lon, lat] of coordinates) {
    const point = project(lon, lat, rotation);
    if (point.depth < 0.014) {
      penDown = false;
      continue;
    }
    path += `${penDown ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    penDown = true;
  }
  return path;
}

const graticules: number[][][] = [];
for (let lat = -60; lat <= 60; lat += 30) {
  graticules.push(Array.from({ length: 181 }, (_, i) => [-180 + i * 2, lat]));
}
for (let lon = -180; lon < 180; lon += 30) {
  graticules.push(Array.from({ length: 91 }, (_, i) => [lon, -90 + i * 2]));
}

const clampLatitude = (lat: number) => Math.min(65, Math.max(-65, lat));
const shortestAngle = (difference: number) => ((difference + 540) % 360) - 180;

export default function EarthGlobe({ locations, selectedId, onSelect, playing }: EarthGlobeProps) {
  const uniqueId = useId().replace(/:/g, '');
  const selected = locations.find((location) => location.id === selectedId);
  const initialRotation = { lat: selected ? selected.lat * 0.55 : 12, lon: selected?.lon ?? 22 };
  const [rotation, setRotation] = useState<Rotation>(initialRotation);
  const rotationRef = useRef(initialRotation);
  const targetRef = useRef(initialRotation);
  const dragRef = useRef<{ x: number; y: number; rotation: Rotation } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const frameRef = useRef(0);
  const lastFrameRef = useRef(0);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const target = { lat: selected.lat * 0.55, lon: selected.lon };
    targetRef.current = target;
    if (reducedMotion) {
      rotationRef.current = target;
      setRotation(target);
    }
  }, [selected?.id, selected?.lat, selected?.lon, reducedMotion]);

  useEffect(() => {
    if (reducedMotion) return;
    const animate = (timestamp: number) => {
      frameRef.current = requestAnimationFrame(animate);
      if (timestamp - lastFrameRef.current < 40 || dragRef.current) return;
      lastFrameRef.current = timestamp;
      const previous = rotationRef.current;
      const longitudeDelta = shortestAngle(targetRef.current.lon - previous.lon);
      const latitudeDelta = targetRef.current.lat - previous.lat;
      if (Math.abs(longitudeDelta) < 0.02 && Math.abs(latitudeDelta) < 0.02) return;
      const next = {
        lon: previous.lon + longitudeDelta * 0.09,
        lat: previous.lat + latitudeDelta * 0.09,
      };
      rotationRef.current = next;
      setRotation(next);
    };
    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [reducedMotion]);

  const geometry = useMemo(() => {
    const dots = ['', '', ''];
    for (const [lon, lat] of world.dots) {
      const point = project(lon, lat, rotation);
      if (point.depth <= 0.025) continue;
      const illumination = point.depth * 0.6 + (point.x - CX) / RADIUS * 0.2;
      const bucket = illumination > 0.45 ? 2 : illumination > 0.2 ? 1 : 0;
      dots[bucket] += `M${point.x.toFixed(1)},${point.y.toFixed(1)}h.01`;
    }
    return {
      dots,
      coast: world.coastlines.map((line) => linePath(line, rotation)).join(''),
      grid: graticules.map((line) => linePath(line, rotation)).join(''),
    };
  }, [rotation]);

  const markers = locations.map((location) => ({ ...location, ...project(location.lon, location.lat, rotation) }));
  const selectedMarker = markers.find((marker) => marker.id === selectedId && marker.depth > 0);
  const gradientId = `earth-surface-${uniqueId}`;
  const atmosphereId = `earth-atmosphere-${uniqueId}`;
  const shadeId = `earth-shade-${uniqueId}`;
  const clipId = `earth-clip-${uniqueId}`;
  const glowId = `earth-glow-${uniqueId}`;

  const handlePointerDown = (event: ReactPointerEvent<SVGCircleElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, rotation: rotationRef.current };
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGCircleElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const next = {
      lon: drag.rotation.lon - (event.clientX - drag.x) * 0.35,
      lat: clampLatitude(drag.rotation.lat + (event.clientY - drag.y) * 0.3),
    };
    rotationRef.current = next;
    targetRef.current = next;
    setRotation(next);
  };

  const handlePointerUp = () => {
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div className={`earth-globe${playing ? ' earth-globe--playing' : ''}${dragging ? ' earth-globe--dragging' : ''}`}>
      <svg className="earth-globe__scene" viewBox="0 0 760 560" aria-label="Interactive Earth. Drag to rotate, or select a location." role="group">
        <defs>
          <radialGradient id={gradientId} cx="62%" cy="36%" r="69%">
            <stop offset="0%" stopColor="#073d42" />
            <stop offset="58%" stopColor="#052c36" />
            <stop offset="88%" stopColor="#041d2b" />
            <stop offset="100%" stopColor="#05212d" />
          </radialGradient>
          <radialGradient id={atmosphereId}>
            <stop offset="84%" stopColor="#25bfc8" stopOpacity="0" />
            <stop offset="94%" stopColor="#4ce0dd" stopOpacity="0.06" />
            <stop offset="97%" stopColor="#42e2de" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#25bfc8" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={shadeId} x1="0" x2="1" y1="0.8" y2="0.3">
            <stop offset="0%" stopColor="#020b18" stopOpacity="0.66" />
            <stop offset="55%" stopColor="#051d25" stopOpacity="0" />
            <stop offset="100%" stopColor="#85ffff" stopOpacity="0.025" />
          </linearGradient>
          <filter id={glowId} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <clipPath id={clipId}><circle cx={CX} cy={CY} r={RADIUS} /></clipPath>
        </defs>

        <g className="earth-globe__stars" aria-hidden="true">
          <circle cx="117" cy="112" r="1.4" /><circle cx="627" cy="161" r="1.2" />
          <circle cx="676" cy="364" r="1" /><circle cx="176" cy="439" r="1.2" />
          <circle cx="567" cy="58" r="1" /><circle cx="91" cy="333" r="0.9" />
          <path d="M641 83h8m-4-4v8M138 258h6m-3-3v6" />
        </g>

        <g className="earth-globe__orbits" fill="none" aria-hidden="true">
          <ellipse cx={CX} cy={CY} rx="287" ry="88" transform={`rotate(-24 ${CX} ${CY})`} />
          <ellipse cx={CX} cy={CY} rx="273" ry="128" transform={`rotate(34 ${CX} ${CY})`} />
          <circle cx={CX} cy={CY} r="247" strokeDasharray="1 9" />
          <path d="M380 22v15m0 485v15M121 281h13m492 0h13" />
        </g>

        <circle cx={CX} cy={CY} r="234" fill={`url(#${atmosphereId})`} aria-hidden="true" />
        <circle cx={CX} cy={CY} r={RADIUS + 1} stroke="#48d4d4" strokeWidth="1.7" strokeOpacity="0.42" fill="none" />
        <circle cx={CX} cy={CY} r={RADIUS} fill={`url(#${gradientId})`} />

        <g clipPath={`url(#${clipId})`} aria-hidden="true" pointerEvents="none">
          <path d={geometry.grid} fill="none" stroke="#49bbbc" strokeWidth="0.65" opacity="0.1" />
          <path d={geometry.coast} fill="none" stroke="#41cfce" strokeWidth="0.8" opacity="0.25" />
          {geometry.dots.map((path, index) => (
            <path key={index} d={path} fill="none" stroke="#65e0d3" strokeWidth={index === 2 ? 2.25 : 1.8} strokeLinecap="round" opacity={[0.25, 0.48, 0.72][index]} />
          ))}
          <circle cx={CX} cy={CY} r={RADIUS} fill={`url(#${shadeId})`} />
          <path d="M538 113a215 215 0 0 1 39 265" fill="none" stroke="#a2ffff" strokeWidth="2" opacity="0.2" filter={`url(#${glowId})`} />
        </g>

        <circle className="earth-globe__drag-surface" cx={CX} cy={CY} r={RADIUS} fill="transparent" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} />

        <g className="earth-globe__location-markers">
          {markers.filter((marker) => marker.depth > 0.08).map((marker) => {
            const active = marker.id === selectedId;
            return (
              <g key={marker.id} className={`earth-globe__marker${active ? ' earth-globe__marker--active' : ''}`} transform={`translate(${marker.x} ${marker.y})`} role="button" tabIndex={0} aria-label={`Listen to ${marker.name}`} aria-pressed={active} onClick={() => onSelect(marker.id)} onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(marker.id);
                }
              }}>
                <title>{marker.name}</title>
                <circle className="earth-globe__marker-hit" r="20" fill="transparent" />
                {active && <circle className="earth-globe__beacon" r="19" />}
                <circle className="earth-globe__marker-ring" r={active ? 10 : 6} />
                <circle className="earth-globe__marker-core" r={active ? 3.6 : 2.3} />
              </g>
            );
          })}
        </g>

        {selectedMarker && (
          <g className="earth-globe__location-label" aria-hidden="true" pointerEvents="none">
            <path d={`M${selectedMarker.x + 15},${selectedMarker.y - 9}l30,-29h65`} />
            <text x={selectedMarker.x + 50} y={selectedMarker.y - 47}>{selectedMarker.name.toUpperCase()}</text>
            <circle cx={selectedMarker.x + 110} cy={selectedMarker.y - 38} r="2" />
          </g>
        )}

        <g className="earth-globe__coordinates" aria-hidden="true">
          <text x="380" y="551" textAnchor="middle">{Math.abs(rotation.lat).toFixed(2)}° {rotation.lat >= 0 ? 'N' : 'S'}  /  {Math.abs(((rotation.lon + 540) % 360) - 180).toFixed(2)}° {((rotation.lon + 540) % 360) - 180 >= 0 ? 'E' : 'W'}</text>
        </g>
      </svg>
      <span className="earth-globe__interaction-hint" aria-hidden="true"><span>↔</span> DRAG TO EXPLORE</span>
      <span className="earth-globe__sr-only">Land boundaries use public-domain Natural Earth data. Select a visible location with Tab and Enter, or choose a location from the track list.</span>
    </div>
  );
}
