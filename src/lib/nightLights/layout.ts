// Frozen layout of the pinned SVS 5313 EIC print (1024×288).
//
// The image is a world map with graphics drawn on top: four magnified inset frames
// (with labels), the small boxes on the map that those insets magnify ("parent regions"),
// translucent connector wedges between them, and a legend. Only map pixels outside every
// mask are analysed. Insets are magnified DUPLICATES of their parent regions, so they are
// never sonified as observations; Tour mode sounds the parent region's map pixels.
//
// Rectangles were detected by src/layout-detect.ts on the pinned file (seeded with
// rough by-eye positions) and frozen here; test/unit/layout.test.ts re-runs the detection
// and checks it still agrees. Coordinates are inclusive image pixels. See LIMITATIONS.md.
import { inRect, shrink, type Rect } from './raster.ts';

export const IMAGE_WIDTH = 1024;
export const IMAGE_HEIGHT = 288;

export type InsetId = 'western-europe' | 'eastern-mediterranean' | 'ukraine' | 'india';
type Side = 'top' | 'bottom' | 'left' | 'right';

export interface Inset {
  readonly id: InsetId;
  readonly name: string;
  /** Magnified inset frame, including its label in the top corner. */
  readonly frame: Rect;
  /** Small box on the map that the inset magnifies. */
  readonly parent: Rect;
  /** Which side of the parent box and of the frame the connector wedge joins. */
  readonly connector: { readonly parentSide: Side; readonly frameSide: Side };
}

export const INSETS: readonly Inset[] = [
  {
    id: 'western-europe',
    name: 'Western Europe',
    frame: { x0: 91, y0: 99, x1: 265, y1: 274 },
    parent: { x0: 223, y0: 52, x1: 258, y1: 87 },
    connector: { parentSide: 'bottom', frameSide: 'top' },
  },
  {
    id: 'eastern-mediterranean',
    name: 'Eastern Mediterranean',
    frame: { x0: 315, y0: 17, x1: 429, y1: 169 },
    parent: { x0: 278, y0: 79, x1: 297, y1: 106 },
    connector: { parentSide: 'right', frameSide: 'left' },
  },
  {
    id: 'ukraine',
    name: 'Ukraine',
    frame: { x0: 619, y0: 13, x1: 763, y1: 122 },
    parent: { x0: 784, y0: 55, x1: 809, y1: 74 },
    connector: { parentSide: 'left', frameSide: 'right' },
  },
  {
    id: 'india',
    name: 'India',
    frame: { x0: 807, y0: 142, x1: 944, y1: 279 },
    parent: { x0: 844, y0: 91, x1: 884, y1: 132 },
    connector: { parentSide: 'bottom', frameSide: 'top' },
  },
];

/** Legend: title, colour bar and its three small tick labels. */
export const LEGEND_BOX: Rect = { x0: 501, y0: 157, x1: 582, y1: 170 };
/** The colour bar inside the legend. Row 166 is a darker anti-aliased edge and is excluded. */
export const LEGEND_BAR: Rect = { x0: 502, y0: 162, x1: 581, y1: 165 };

/** Extra pixels masked around drawn graphics to cover JPEG ringing and anti-aliasing. */
export const MASK_PAD = 3;
/** Parent region pixels used for sound: the box interior, shrunk away from its outline. */
export const PARENT_INNER_SHRINK = 3;

export const LAYOUT_SEEDS = {
  insets: INSETS.map((i) => ({ id: i.id, frame: i.frame, parent: i.parent })),
  legendWindow: { x0: 470, y0: 140, x1: 620, y1: 185 },
};

type Pt = readonly [number, number];

function edge(r: Rect, side: Side): [Pt, Pt] {
  switch (side) {
    case 'top':
      return [[r.x0, r.y0], [r.x1, r.y0]];
    case 'bottom':
      return [[r.x0, r.y1], [r.x1, r.y1]];
    case 'left':
      return [[r.x0, r.y0], [r.x0, r.y1]];
    case 'right':
      return [[r.x1, r.y0], [r.x1, r.y1]];
  }
}

/** Connector wedge: quadrilateral joining the facing edges of parent box and inset frame. */
export function connectorQuad(inset: Inset): Pt[] {
  const [a, b] = edge(inset.parent, inset.connector.parentSide);
  const [c, d] = edge(inset.frame, inset.connector.frameSide);
  return [a, b, d, c];
}

function distToSegment(px: number, py: number, [ax, ay]: Pt, [bx, by]: Pt): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function inPolygon(px: number, py: number, poly: Pt[], pad: number): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    if (distToSegment(px, py, poly[i], poly[j]) <= pad) return true;
  }
  return inside;
}

export type MaskReason = 'legend' | 'inset' | 'parent-outline' | 'connector';

/** Why a pixel is excluded from analysis, or null for an analysable map pixel. */
export function maskReason(x: number, y: number): MaskReason | null {
  if (inRect(LEGEND_BOX, x, y, MASK_PAD)) return 'legend';
  for (const inset of INSETS) {
    if (inRect(inset.frame, x, y, MASK_PAD)) return 'inset';
    if (inRect(inset.parent, x, y, MASK_PAD) && !inRect(shrink(inset.parent, PARENT_INNER_SHRINK), x, y)) {
      return 'parent-outline';
    }
  }
  for (const inset of INSETS) {
    if (inPolygon(x, y, connectorQuad(inset), MASK_PAD)) {
      // The parent box interior is real map data even where the wedge polygon touches it.
      if (!inRect(shrink(inset.parent, PARENT_INNER_SHRINK), x, y)) return 'connector';
    }
  }
  return null;
}

let cachedMask: Uint8Array | null = null;

/** 1 = masked, 0 = map pixel; row-major IMAGE_WIDTH × IMAGE_HEIGHT. */
export function maskBitmap(): Uint8Array {
  if (cachedMask) return cachedMask;
  const m = new Uint8Array(IMAGE_WIDTH * IMAGE_HEIGHT);
  for (let y = 0; y < IMAGE_HEIGHT; y++) {
    for (let x = 0; x < IMAGE_WIDTH; x++) m[y * IMAGE_WIDTH + x] = maskReason(x, y) ? 1 : 0;
  }
  cachedMask = m;
  return m;
}

export function parentRegion(inset: Inset): Rect {
  return shrink(inset.parent, PARENT_INNER_SHRINK);
}
