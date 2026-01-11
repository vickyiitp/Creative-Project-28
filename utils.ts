import { Vector2 } from './types';

export const Vec = {
  add: (v1: Vector2, v2: Vector2): Vector2 => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
  sub: (v1: Vector2, v2: Vector2): Vector2 => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
  mul: (v: Vector2, s: number): Vector2 => ({ x: v.x * s, y: v.y * s }),
  mag: (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y),
  norm: (v: Vector2): Vector2 => {
    const m = Math.sqrt(v.x * v.x + v.y * v.y);
    return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
  },
  dot: (v1: Vector2, v2: Vector2): number => v1.x * v2.x + v1.y * v2.y,
  dist: (v1: Vector2, v2: Vector2): number => Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)),
  angle: (v: Vector2): number => Math.atan2(v.y, v.x),
  fromAngle: (rad: number): Vector2 => ({ x: Math.cos(rad), y: Math.sin(rad) }),
};

export const degToRad = (deg: number) => (deg * Math.PI) / 180;
export const radToDeg = (rad: number) => (rad * 180) / Math.PI;

// Calculate reflection vector R = I - 2(I.N)N
// I: Incident vector (from light source to surface)
// N: Normal vector of surface
export const reflect = (incident: Vector2, normal: Vector2): Vector2 => {
  const d = Vec.dot(incident, normal);
  return Vec.sub(incident, Vec.mul(normal, 2 * d));
};

// Intersection of line segment (p1, p2) and circle (center, radius)
// Returns boolean
export const lineIntersectsCircle = (p1: Vector2, p2: Vector2, center: Vector2, radius: number): boolean => {
  const d = Vec.sub(p2, p1);
  const f = Vec.sub(p1, center);
  
  const a = Vec.dot(d, d);
  const b = 2 * Vec.dot(f, d);
  const c = Vec.dot(f, f) - radius * radius;

  let discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;

  discriminant = Math.sqrt(discriminant);

  const t1 = (-b - discriminant) / (2 * a);
  const t2 = (-b + discriminant) / (2 * a);

  if (t1 >= 0 && t1 <= 1) return true;
  if (t2 >= 0 && t2 <= 1) return true;

  return false;
};

// Helper to determine sky color based on time of day (0 to 1)
export const getSkyColor = (t: number) => {
  // t=0 (Dawn), t=0.5 (Noon), t=1 (Dusk)
  if (t < 0.3) {
    // Dawn to Morning
    return ['#0f172a', '#3f1a24', '#fdba74']; // Dark blue to reddish to orange
  } else if (t < 0.7) {
    // Midday
    return ['#0ea5e9', '#7dd3fc', '#fef3c7']; // Blue to Light Blue to Yellowish
  } else {
    // Afternoon to Dusk
    return ['#1e1b4b', '#4c1d95', '#c2410c']; // Dark purple to purple to deep orange
  }
};
