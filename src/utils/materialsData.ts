import { OpticalMaterial } from '../types/optics';

export const OPTICAL_MATERIALS: OpticalMaterial[] = [
  {
    id: 'cr39',
    name: 'CR-39 (Standard Organic Plastic)',
    code: 'CR-39 (ADC)',
    nd: 1.498,
    ne: 1.500,
    nF: 1.5042,
    nC: 1.4956,
    abbeVd: 58.0,
    density: 1.32,
    cauchyA: 1.485,
    cauchyB: 0.0045,
    cauchyC: 0.0001,
    uvCutoff: 350,
    fdaMinCenterThickness: 2.0,
    description: 'Columbia Resin #39. Outstanding optical clarity, zero stress birefringence, high Abbe number (very low chromatic aberration).',
    recommendedFor: 'Low prescriptions (-3.00D to +2.00D), full-rim frames.'
  },
  {
    id: 'polycarbonate',
    name: 'Polycarbonate (Airwear / Lexan)',
    code: 'PC 1.586',
    nd: 1.586,
    ne: 1.590,
    nF: 1.602,
    nC: 1.582,
    abbeVd: 30.0,
    density: 1.20,
    cauchyA: 1.568,
    cauchyB: 0.0062,
    cauchyC: 0.00025,
    uvCutoff: 385,
    fdaMinCenterThickness: 1.0,
    description: 'Extremely impact resistant (shatterproof), 100% UV400 blocking, lightweight. Lower Abbe value means noticeable color fringing on high powers.',
    recommendedFor: 'Sports, kids, rimless drill mount safety glasses.'
  },
  {
    id: 'trivex',
    name: 'Trivex (PPG / Phoenix / NXT)',
    code: 'Trivex 1.53',
    nd: 1.530,
    ne: 1.532,
    nF: 1.539,
    nC: 1.527,
    abbeVd: 45.0,
    density: 1.11,
    cauchyA: 1.518,
    cauchyB: 0.0041,
    cauchyC: 0.00008,
    uvCutoff: 395,
    fdaMinCenterThickness: 1.0,
    description: 'Lightest optical lens material in existence (1.11 g/cm3). Combines high impact resistance with very sharp optical clarity (Abbe 45).',
    recommendedFor: 'Rimless, drill-mount, children, sports, medium powers.'
  },
  {
    id: 'mr8_160',
    name: 'MR-8 High Index 1.60 (Mitsui)',
    code: 'MR-8 (1.60)',
    nd: 1.597,
    ne: 1.601,
    nF: 1.609,
    nC: 1.594,
    abbeVd: 41.0,
    density: 1.30,
    cauchyA: 1.579,
    cauchyB: 0.0051,
    cauchyC: 0.00018,
    uvCutoff: 395,
    fdaMinCenterThickness: 1.4,
    description: 'Thiourethane resin. Benchmark 1.60 high index material with great tensile strength, excellent Abbe number, and heat resistance.',
    recommendedFor: 'Moderate prescriptions (-4.50D to +3.50D), semi-rimless/nylor frames.'
  },
  {
    id: 'mr7_167',
    name: 'MR-7 / MR-10 Ultra-Thin 1.67 (Mitsui)',
    code: 'MR-7 (1.67)',
    nd: 1.667,
    ne: 1.672,
    nF: 1.684,
    nC: 1.663,
    abbeVd: 32.0,
    density: 1.36,
    cauchyA: 1.644,
    cauchyB: 0.0069,
    cauchyC: 0.00032,
    uvCutoff: 400,
    fdaMinCenterThickness: 1.4,
    description: 'Very thin and lightweight thiourethane polymer. 30% thinner than standard CR-39 for strong prescriptions.',
    recommendedFor: 'High prescriptions (-4.00D to -8.00D, +3.00D to +6.00D).'
  },
  {
    id: 'index_174',
    name: 'Ultra High Index 1.74 (MR-174)',
    code: '1.74 High-Index',
    nd: 1.740,
    ne: 1.746,
    nF: 1.760,
    nC: 1.737,
    abbeVd: 33.0,
    density: 1.47,
    cauchyA: 1.715,
    cauchyB: 0.0076,
    cauchyC: 0.00041,
    uvCutoff: 400,
    fdaMinCenterThickness: 1.2,
    description: 'The thinnest plastic organic lens material available. Significantly reduces edge thickness in severe myopia and center thickness in hyperopia.',
    recommendedFor: 'Extreme myopia (-6.00D to -14.00D) and hyperopia.'
  },
  {
    id: 'crown_glass_1523',
    name: 'Crown Glass B270 (Standard Mineral)',
    code: 'Crown 1.523',
    nd: 1.523,
    ne: 1.525,
    nF: 1.529,
    nC: 1.520,
    abbeVd: 59.0,
    density: 2.54,
    cauchyA: 1.512,
    cauchyB: 0.0038,
    cauchyC: 0.00007,
    uvCutoff: 320,
    fdaMinCenterThickness: 2.0,
    description: 'Pure mineral optical glass. Peerless scratch resistance, pristine optical transmission, and minimal chromatic dispersion. Heavier weight.',
    recommendedFor: 'Classic sunglass optics, laboratory scratch resistance.'
  },
  {
    id: 'high_index_glass_180',
    name: 'High Index Mineral Glass 1.80 (Schott SFL6)',
    code: 'Glass 1.80',
    nd: 1.800,
    ne: 1.808,
    nF: 1.821,
    nC: 1.794,
    abbeVd: 35.0,
    density: 3.65,
    cauchyA: 1.765,
    cauchyB: 0.0098,
    cauchyC: 0.00075,
    uvCutoff: 340,
    fdaMinCenterThickness: 1.5,
    description: 'Dense optical flint mineral glass. Delivers the absolute thinnest profile possible for ultra-severe myopia. Heavy mass.',
    recommendedFor: 'Ultra-high prescription mineral lenses (-10.00D to -20.00D).'
  }
];

export function getMaterialById(id: string): OpticalMaterial {
  return OPTICAL_MATERIALS.find(m => m.id === id) || OPTICAL_MATERIALS[0];
}

/**
 * Calculates refractive index n(lambda) for a given wavelength using Cauchy's dispersion equation:
 * n(λ) = A + B / (λ^2) + C / (λ^4)  where λ is in micrometers
 */
export function calculateWavelengthIndex(material: OpticalMaterial, wavelengthNm: number): number {
  const lambdaMicrons = wavelengthNm / 1000.0;
  const lambda2 = lambdaMicrons * lambdaMicrons;
  const lambda4 = lambda2 * lambda2;
  return material.cauchyA + (material.cauchyB / lambda2) + (material.cauchyC / lambda4);
}
