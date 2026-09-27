import { LensParameters, CalculatedOptics, RayTraceResult, RayPathPoint, OpticalMaterial } from '../types/optics';
import { getMaterialById, calculateWavelengthIndex } from './materialsData';

export const TOOLING_INDEX = 1.530;

/**
 * Calculates optimal recommended base curve using Vogel's Rule
 */
export function calculateVogelsBaseCurve(sphere: number, cylinder: number = 0): number {
  const sphericalEquivalent = sphere + (cylinder / 2.0);
  let bc: number;
  if (sphericalEquivalent >= 0) {
    bc = sphericalEquivalent + 6.00;
  } else {
    bc = (sphericalEquivalent / 2.0) + 6.00;
  }
  return Math.max(0.50, Math.min(14.00, Math.round(bc * 4) / 4));
}

/**
 * Converts optical power in Diopters to signed surface radius of curvature in mm.
 * Sign convention: Positive power = center of curvature behind surface (for convex front).
 */
export function powerToRadius(powerD: number, refractiveIndex: number): number {
  if (Math.abs(powerD) < 0.001) return 1000000;
  return ((refractiveIndex - 1.0) / powerD) * 1000.0;
}

export function radiusToPower(radiusMm: number, refractiveIndex: number): number {
  if (Math.abs(radiusMm) < 0.001 || Math.abs(radiusMm) > 999999) return 0;
  return ((refractiveIndex - 1.0) / radiusMm) * 1000.0;
}

/**
 * Calculates exact spherical Sagitta (sag) depth: s = |R| - sqrt(R^2 - y^2) >= 0
 */
export function calculateSphericalSag(radiusMm: number, yMm: number): number {
  const absR = Math.abs(radiusMm);
  if (absR > 999999 || absR < 0.001) return 0;
  const yClamped = Math.min(absR - 0.001, Math.abs(yMm));
  return absR - Math.sqrt(absR * absR - yClamped * yClamped);
}

/**
 * Calculates sagitta on a toric back surface with cylinder axis rotation
 */
export function calculateToricSag(rxMm: number, ryMm: number, xMm: number, yMm: number, axisDeg: number): number {
  const rad = (axisDeg * Math.PI) / 180.0;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);

  const xRot = xMm * cosA + yMm * sinA;
  const yRot = -xMm * sinA + yMm * cosA;

  const sagX = calculateSphericalSag(rxMm, Math.abs(xRot));
  const sagY = calculateSphericalSag(ryMm, Math.abs(yRot));
  return sagX + sagY;
}

/**
 * Calculates Aspheric / Conic Sagitta:
 * s(y) = (c * y^2) / (1 + sqrt(1 - (1 + k) * c^2 * y^2)) + A4 * y^4
 */
export function calculateAsphericSag(
  radiusMm: number,
  yMm: number,
  conicK: number = -0.5,
  a4: number = 0
): number {
  const absR = Math.abs(radiusMm);
  if (absR > 999999 || absR < 0.001) return 0;
  const c = 1.0 / absR;
  const y2 = yMm * yMm;
  const radical = 1.0 - (1.0 + conicK) * (c * c) * y2;
  if (radical < 0) return absR;
  const standardSag = (c * y2) / (1.0 + Math.sqrt(radical));
  return standardSag + (a4 * Math.pow(yMm, 4));
}

/**
 * Calculates exact 3D surface elevation/sagitta for all Multifocal, Bifocal, and Progressive designs.
 */
export function calculateMultifocalSurfaceSag(
  baseRadiusMm: number,
  xMm: number,
  yMm: number,
  lensType: LensParameters['lensType'],
  addPower: number = 2.0,
  corridorLengthMm: number = 14,
  refractiveIndex: number = 1.50,
  nasalInsetMm: number = 2.5,
  segmentTopY: number = -2.0,
  segmentWidthMm: number = 28.0
): number {
  const rRadial = Math.hypot(xMm, yMm);
  const baseSag = calculateSphericalSag(baseRadiusMm, rRadial);
  if (addPower <= 0.01) return baseSag;

  const nMinus1 = refractiveIndex - 1.0;

  if (lensType === 'progressive_pal') {
    const corridorTop = 4.0;
    const corridorBottom = -(corridorLengthMm - 4.0);

    let corridorCenterX = 0;
    if (yMm < corridorTop && yMm > corridorBottom) {
      const progFraction = (corridorTop - yMm) / (corridorTop - corridorBottom);
      corridorCenterX = -nasalInsetMm * progFraction;
    } else if (yMm <= corridorBottom) {
      corridorCenterX = -nasalInsetMm;
    }

    let localAdd = 0;
    if (yMm >= corridorTop) {
      localAdd = 0;
    } else if (yMm <= corridorBottom) {
      localAdd = addPower;
    } else {
      const t = (corridorTop - yMm) / (corridorTop - corridorBottom);
      localAdd = addPower * (10.0 * Math.pow(t, 3) - 15.0 * Math.pow(t, 4) + 6.0 * Math.pow(t, 5));
    }

    const xRel = xMm - corridorCenterX;
    const corridorWidth = 7.0;
    const lateralDist = Math.max(0, Math.abs(xRel) - corridorWidth / 2.0);
    const blendWeight = Math.exp(-0.5 * Math.pow(lateralDist / 8.5, 2));

    const addSagDelta = (localAdd * (rRadial * rRadial)) / (2000.0 * nMinus1);
    return baseSag + (addSagDelta * blendWeight);
  }

  if (lensType === 'bifocal_flattop') {
    const segRadius = segmentWidthMm / 2.0;
    const segCenterY = segmentTopY - segRadius;
    const segCenterX = -nasalInsetMm;

    const dx = xMm - segCenterX;
    const dy = yMm - segCenterY;
    const distToSegCenter = Math.hypot(dx, dy);

    if (yMm <= segmentTopY && distToSegCenter <= segRadius) {
      const addSag = (addPower * (distToSegCenter * distToSegCenter)) / (2000.0 * nMinus1);
      const ledgeHeight = (addPower * (segRadius * segRadius)) / (4000.0 * nMinus1);
      return baseSag + addSag + ledgeHeight;
    }
    return baseSag;
  }

  if (lensType === 'bifocal_round') {
    const segRadius = segmentWidthMm / 2.0;
    const distToSegCenter = Math.hypot(xMm - (-nasalInsetMm), yMm - (segmentTopY - segRadius));
    if (distToSegCenter <= segRadius) {
      const addSag = (addPower * (distToSegCenter * distToSegCenter)) / (2000.0 * nMinus1);
      return baseSag + addSag;
    }
    return baseSag;
  }

  if (lensType === 'bifocal_executive') {
    if (yMm <= segmentTopY) {
      const dy = Math.abs(yMm - segmentTopY);
      const addSag = (addPower * (dy * dy + xMm * xMm * 0.5)) / (2000.0 * nMinus1);
      return baseSag + addSag + 0.35;
    }
    return baseSag;
  }

  if (lensType === 'trifocal_7x28') {
    const segRadius = segmentWidthMm / 2.0;
    const intermediateHeight = 7.0;
    const nearTopY = segmentTopY - intermediateHeight;
    const distToSegCenter = Math.hypot(xMm - (-nasalInsetMm), yMm - (segmentTopY - segRadius));

    if (distToSegCenter <= segRadius) {
      if (yMm <= segmentTopY && yMm > nearTopY) {
        const interAdd = addPower * 0.5;
        const addSag = (interAdd * (distToSegCenter * distToSegCenter)) / (2000.0 * nMinus1);
        return baseSag + addSag + 0.15;
      } else if (yMm <= nearTopY) {
        const addSag = (addPower * (distToSegCenter * distToSegCenter)) / (2000.0 * nMinus1);
        return baseSag + addSag + 0.35;
      }
    }
    return baseSag;
  }

  return baseSag;
}

/**
 * Comprehensive Ophthalmic Optical Calculations Engine
 */
export function calculateLensOptics(params: LensParameters): CalculatedOptics {
  const material = getMaterialById(params.materialId);
  const n = material.nd;
  const semiDiameter = params.diameter / 2.0;

  const F1 = params.baseCurve;
  const R1 = powerToRadius(F1, n);

  let frontSag = calculateSphericalSag(R1, semiDiameter);
  if (params.lensType === 'single_vision_aspheric') {
    frontSag = calculateAsphericSag(R1, semiDiameter, params.conicConstantK ?? -0.5, params.asphericCoeffA4 ?? 0);
  }

  const targetSphere = params.sphere;
  const targetCyl = params.cylinder || 0;
  const fdaMin = material.fdaMinCenterThickness;

  // Thin lens approximation for preliminary sag check
  const estF2_sph = targetSphere - F1;
  const estF2_cyl = (targetSphere + targetCyl) - F1;

  const estR2_sph = powerToRadius(estF2_sph, n);
  const estR2_cyl = powerToRadius(estF2_cyl, n);

  const backSag_sph = calculateSphericalSag(estR2_sph, semiDiameter);
  const backSag_cyl = calculateSphericalSag(estR2_cyl, semiDiameter);

  // Auto Center Thickness:
  // For Meniscus Lens with F2 < 0 (concave back): EdgeThickness = Center - FrontSag + BackSag
  //   => Center = EdgeMin + FrontSag - BackSag (if FrontSag > BackSag)
  // For Biconvex Lens with F2 > 0 (convex back): EdgeThickness = Center - FrontSag - BackSag
  //   => Center = EdgeMin + FrontSag + BackSag
  // For Minus Lens: Center = fdaMin (Edge will naturally be thick).
  let centerThickness = params.centerThickness;

  if (params.autoCenterThickness) {
    if (targetSphere < 0) {
      centerThickness = fdaMin;
    } else {
      // Plus Lens:
      if (estF2_sph <= 0) {
        // Meniscus Plus (F1 > 0, F2 <= 0)
        const sagDelta = frontSag - Math.min(backSag_sph, backSag_cyl);
        centerThickness = Math.max(fdaMin, params.minEdgeThickness + Math.max(0, sagDelta));
      } else {
        // Biconvex Plus (F1 > 0, F2 > 0)
        centerThickness = Math.max(fdaMin, params.minEdgeThickness + frontSag + Math.max(backSag_sph, backSag_cyl));
      }
    }
  }

  const tMeters = centerThickness / 1000.0;
  
  // Exact Thick Lensmaker's Equation
  const thickCorrectionDenominator = 1.0 - (tMeters / n) * F1;
  const exactF2_sph = (targetSphere - F1) / (thickCorrectionDenominator || 1.0);
  const exactF2_cyl = ((targetSphere + targetCyl) - F1) / (thickCorrectionDenominator || 1.0);

  const exactR2_sph = powerToRadius(exactF2_sph, n);
  const exactR2_cyl = powerToRadius(exactF2_cyl, n);

  const actualBackSag_sph = calculateSphericalSag(exactR2_sph, semiDiameter);
  const actualBackSag_cyl = calculateSphericalSag(exactR2_cyl, semiDiameter);

  // Exact Edge Thickness calculation respecting surface curvatures:
  let edgeThickness1: number;
  let edgeThickness2: number;

  if (exactF2_sph <= 0) {
    // Meniscus back (concave toward eye): Back surface curves away (+X)
    edgeThickness1 = centerThickness - frontSag + actualBackSag_sph;
  } else {
    // Biconvex back (convex toward eye): Back surface curves inward (-X)
    edgeThickness1 = centerThickness - frontSag - actualBackSag_sph;
  }

  if (exactF2_cyl <= 0) {
    edgeThickness2 = centerThickness - frontSag + actualBackSag_cyl;
  } else {
    edgeThickness2 = centerThickness - frontSag - actualBackSag_cyl;
  }

  const minEdge = Math.max(0.2, Math.min(edgeThickness1, edgeThickness2));
  const maxEdge = Math.max(edgeThickness1, edgeThickness2);

  const totalPower = F1 + exactF2_sph - (tMeters / n) * F1 * exactF2_sph;
  const EFL = Math.abs(totalPower) > 0.001 ? (1.0 / totalPower) * 1000.0 : 999999;
  const BFL = EFL * (1.0 - (tMeters / n) * F1);

  const avgThickness = (centerThickness + (minEdge + maxEdge) / 2.0) / 2.0;
  const radiusCm = semiDiameter / 10.0;
  const avgThickCm = avgThickness / 10.0;
  const volumeCm3 = Math.PI * radiusCm * radiusCm * avgThickCm * 0.92;
  const weightGrams = volumeCm3 * material.density;

  const lca = totalPower / material.abbeVd;
  const decentrationCm = semiDiameter / 10.0;
  const tca_mm = ((decentrationCm * Math.abs(totalPower)) / material.abbeVd) * 10.0;
  const sphAberration = 0.06 * Math.pow(F1 / 10.0, 2) * Math.abs(totalPower);

  return {
    r1_front_mm: R1,
    r2_back_sphere_mm: exactR2_sph,
    r2_back_cyl_mm: targetCyl !== 0 ? exactR2_cyl : undefined,
    frontPowerD: F1,
    backPowerSphereD: exactF2_sph,
    backPowerCylD: exactF2_cyl,
    totalEquivalentPowerD: totalPower,
    effectiveFocalLength_mm: EFL,
    backFocalLength_mm: BFL,
    calculatedCenterThickness_mm: centerThickness,
    calculatedMinEdgeThickness_mm: minEdge,
    calculatedMaxEdgeThickness_mm: maxEdge,
    lensVolume_cm3: Math.max(0.1, volumeCm3),
    lensWeight_grams: Math.max(0.1, weightGrams),
    longitudinalChromaticAberration_D: lca,
    transverseChromaticAberration_mm: tca_mm,
    abbeDispersionIndexSpread: material.nF - material.nC,
    approximateSphericalAberration_D: sphAberration,
    recommendedBaseCurveVogel: calculateVogelsBaseCurve(params.sphere, params.cylinder),
    frontSag_mm: frontSag,
    backSagMin_mm: Math.min(actualBackSag_sph, actualBackSag_cyl),
    backSagMax_mm: Math.max(actualBackSag_sph, actualBackSag_cyl),
    refractiveIndex: n,
    material
  };
}

/**
 * Exact 2D Optical Ray Tracing using Snell's Law vector formulation
 */
export function traceOpticalRays(
  params: LensParameters,
  optics: CalculatedOptics,
  rayHeights: number[] = [-25, -15, -5, 0, 5, 15, 25],
  customWavelengths?: number[]
): RayTraceResult[] {
  const wavelengths = customWavelengths || [
    { wl: 656.3, color: '#ef4444', name: 'Red C-line (656.3 nm)' },
    { wl: 587.6, color: '#eab308', name: 'Helium d-line (587.6 nm)' },
    { wl: 486.1, color: '#06b6d4', name: 'Blue F-line (486.1 nm)' }
  ];

  const results: RayTraceResult[] = [];
  const absR1 = Math.abs(optics.r1_front_mm);
  const R2 = optics.r2_back_sphere_mm;
  const absR2 = Math.abs(R2);
  const isBackConcave = optics.backPowerSphereD <= 0; // standard meniscus
  const tc = optics.calculatedCenterThickness_mm;
  const nAir = 1.0;

  wavelengths.forEach(wlObj => {
    const wl = typeof wlObj === 'number' ? wlObj : wlObj.wl;
    const color = typeof wlObj === 'number' ? '#06b6d4' : wlObj.color;
    const name = typeof wlObj === 'number' ? `${wl} nm` : wlObj.name;
    const nLens = calculateWavelengthIndex(optics.material, wl);

    rayHeights.forEach(yIn => {
      const points: RayPathPoint[] = [];
      const startX = -60;
      points.push({ x: startX, y: yIn });

      // 1. Intersect with Front Surface (Apex at X=0, Center at X=absR1)
      let xFront = 0;
      if (Math.abs(yIn) < absR1) {
        xFront = absR1 - Math.sqrt(absR1 * absR1 - yIn * yIn);
      }
      points.push({ x: xFront, y: yIn });

      // Normal at front surface pointing into air (-X)
      const normLen1 = absR1 || 1;
      const normX1 = (xFront - absR1) / normLen1;
      const normY1 = yIn / normLen1;

      const v1x = 1.0;
      const v1y = 0.0;
      const cosTheta1 = -(v1x * normX1 + v1y * normY1);
      const eta1 = nAir / nLens;
      const sin2Theta2 = eta1 * eta1 * (1.0 - cosTheta1 * cosTheta1);

      let v2x = 1.0;
      let v2y = 0.0;

      if (sin2Theta2 <= 1.0) {
        const cosTheta2 = Math.sqrt(1.0 - sin2Theta2);
        v2x = eta1 * v1x + (eta1 * cosTheta1 - cosTheta2) * normX1;
        v2y = eta1 * v1y + (eta1 * cosTheta1 - cosTheta2) * normY1;
        const v2Len = Math.hypot(v2x, v2y) || 1;
        v2x /= v2Len;
        v2y /= v2Len;
      }

      // 2. Intersect with Back Surface
      // Back vertex at X=tc.
      // If back is concave (meniscus, F2 <= 0): Center is at (tc + absR2, 0)
      // If back is convex (biconvex, F2 > 0): Center is at (tc - absR2, 0)
      const cx2 = isBackConcave ? (tc + absR2) : (tc - absR2);
      const dx = xFront - cx2;
      const dy = yIn;
      const A = v2x * v2x + v2y * v2y;
      const B = 2.0 * (dx * v2x + dy * v2y);
      const C = dx * dx + dy * dy - absR2 * absR2;

      let tBack = (tc - xFront) / (v2x || 1);
      const discr = B * B - 4.0 * A * C;
      if (discr >= 0 && Math.abs(A) > 1e-6) {
        const t1 = (-B - Math.sqrt(discr)) / (2.0 * A);
        const t2 = (-B + Math.sqrt(discr)) / (2.0 * A);
        const candidates = isBackConcave
          ? [t1, t2].filter(t => t > 0.01)
          : [t1, t2].filter(t => t > 0.01);
        if (candidates.length > 0) {
          tBack = isBackConcave ? Math.min(...candidates) : Math.max(...candidates);
        }
      }

      const xBack = xFront + v2x * tBack;
      const yBack = yIn + v2y * tBack;
      points.push({ x: xBack, y: yBack });

      // Outward normal pointing into air on right (+X)
      let normX2: number;
      let normY2: number;
      if (isBackConcave) {
        normX2 = (cx2 - xBack) / absR2;
        normY2 = -yBack / absR2;
      } else {
        normX2 = (xBack - cx2) / absR2;
        normY2 = yBack / absR2;
      }
      const normLen2 = Math.hypot(normX2, normY2) || 1;
      normX2 /= normLen2;
      normY2 /= normLen2;

      const cosTheta3 = -(v2x * normX2 + v2y * normY2);
      const eta2 = nLens / nAir;
      const sin2Theta4 = eta2 * eta2 * (1.0 - cosTheta3 * cosTheta3);

      let v3x = v2x;
      let v3y = v2y;

      if (sin2Theta4 <= 1.0) {
        const cosTheta4 = Math.sqrt(1.0 - sin2Theta4);
        v3x = eta2 * v2x + (eta2 * cosTheta3 - cosTheta4) * normX2;
        v3y = eta2 * v2y + (eta2 * cosTheta3 - cosTheta4) * normY2;
        const v3Len = Math.hypot(v3x, v3y) || 1;
        v3x /= v3Len;
        v3y /= v3Len;
      }

      let focalInterceptX = xBack - (yBack * v3x) / (v3y || 1e-6);
      if (Math.abs(v3y) < 1e-5) {
        focalInterceptX = 999999;
      }

      const endX = 220;
      const endY = yBack + (v3y / (v3x || 1)) * (endX - xBack);
      points.push({ x: endX, y: endY });

      results.push({
        wavelength_nm: wl,
        color,
        name,
        points,
        focalIntercept_x: focalInterceptX
      });
    });
  });

  return results;
}

/**
 * Calculates Anti-Reflective (AR) Coating Spectral Reflectance Curve R(lambda)
 */
export function calculateCoatingReflectanceCurve(
  material: OpticalMaterial,
  coating: string
): { wavelength: number; reflectance: number; transmittance: number }[] {
  const points: { wavelength: number; reflectance: number; transmittance: number }[] = [];
  const ns = material.nd;

  for (let lambda = 380; lambda <= 780; lambda += 5) {
    let R = 0.04;

    if (coating === 'uncoated') {
      const fresnel = Math.pow((ns - 1.0) / (ns + 1.0), 2);
      R = fresnel * 100;
    } else if (coating === 'ar_green_multi') {
      const deltaLambda = (lambda - 530.0) / 110.0;
      R = 0.25 + 1.6 * (Math.pow(deltaLambda, 4) - 0.7 * Math.pow(deltaLambda, 2));
      R = Math.max(0.15, Math.min(6.5, R));
    } else if (coating === 'ar_blue_shield') {
      if (lambda <= 450) {
        const blueBoost = 18.0 * Math.exp(-Math.pow((lambda - 425) / 25, 2));
        R = 0.4 + blueBoost;
      } else {
        const delta = (lambda - 560.0) / 130.0;
        R = 0.3 + 1.2 * Math.pow(delta, 2);
      }
    } else if (coating === 'ar_achromatic') {
      const delta = (lambda - 550.0) / 200.0;
      R = 0.15 + 0.35 * Math.pow(delta, 2);
    } else if (coating === 'polarized_g15') {
      R = 4.0;
    } else if (coating === 'mirror_silver') {
      R = 28.0 + 8.0 * Math.cos((lambda - 500) / 50.0);
    }

    const transmittance = Math.max(0, 100 - R);
    points.push({
      wavelength: lambda,
      reflectance: Math.max(0.05, Math.min(100, R)),
      transmittance: Math.max(0, Math.min(100, transmittance))
    });
  }

  return points;
}

/**
 * Calculates progressive lens corridor power map and Minkwitz astigmatic aberration
 */
export function calculateProgressiveMap(
  sphere: number,
  addPower: number = 2.00,
  corridorLengthMm: number = 14,
  gridSize: number = 32
): { x: number; y: number; meanPower: number; unwantedAstigmatism: number }[] {
  const result: { x: number; y: number; meanPower: number; unwantedAstigmatism: number }[] = [];
  const rangeMm = 28;

  for (let i = 0; i < gridSize; i++) {
    const x = -rangeMm + (2 * rangeMm * i) / (gridSize - 1);
    for (let j = 0; j < gridSize; j++) {
      const y = -rangeMm + (2 * rangeMm * j) / (gridSize - 1);

      const corridorTop = 4.0;
      const corridorBottom = -(corridorLengthMm - 4.0);
      
      let localAdd = 0;
      if (y >= corridorTop) {
        localAdd = 0;
      } else if (y <= corridorBottom) {
        localAdd = addPower;
      } else {
        const t = (corridorTop - y) / (corridorTop - corridorBottom);
        localAdd = addPower * (3 * t * t - 2 * t * t * t);
      }

      const corridorWidth = 6.0;
      const distanceFactor = Math.max(0, Math.abs(x) - corridorWidth / 2.0);
      
      let astigmatism = 0;
      if (y < corridorTop && y > corridorBottom - 8) {
        const rateOfAdd = addPower / corridorLengthMm;
        astigmatism = 2.0 * rateOfAdd * distanceFactor * 0.75;
        astigmatism = Math.min(addPower * 1.5, astigmatism);
      } else if (y < corridorBottom - 8) {
        astigmatism = Math.max(0, (Math.abs(x) - 8.0) * 0.15 * addPower);
      }

      result.push({
        x,
        y,
        meanPower: sphere + localAdd,
        unwantedAstigmatism: Math.max(0, Math.min(4.5, astigmatism))
      });
    }
  }

  return result;
}
