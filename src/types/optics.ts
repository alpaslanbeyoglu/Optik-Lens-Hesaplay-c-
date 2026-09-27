export type LensType =
  | 'single_vision_spherical'
  | 'single_vision_aspheric'
  | 'toric_astigmatic'
  | 'progressive_pal'
  | 'bifocal_flattop'
  | 'bifocal_round'
  | 'bifocal_executive'
  | 'trifocal_7x28'
  | 'prismatic_correction';

export type BevelType =
  | 'v_bevel'       // Standard V-Bevel (110-115 deg) for full rim frames
  | 'flat'          // Flat polished edge for rimless / drill mount frames
  | 'grooved'       // Grooved edge for semi-rimless / nylor string frames
  | 'safety_step';  // Step / safety faceted edge for high minus wraps

export type CoatingType =
  | 'uncoated'
  | 'ar_green_multi'   // Classic multi-layer green residual reflection (530nm)
  | 'ar_blue_shield'   // Blue-cut anti-reflective (450nm residual reflection)
  | 'ar_achromatic'    // Ultra-low reflection neutral broadband
  | 'polarized_g15'    // Polarized sunglass green-grey tint (15% transmission)
  | 'photochromic_uv'  // Photochromic transition tint
  | 'mirror_silver';   // Flash mirror dielectric layer

export interface OpticalMaterial {
  id: string;
  name: string;
  code: string;
  nd: number;       // Refractive index at 587.6 nm (helium d-line)
  ne: number;       // Refractive index at 546.1 nm (mercury e-line)
  nF: number;       // Refractive index at 486.1 nm (hydrogen F-line, blue)
  nC: number;       // Refractive index at 656.3 nm (hydrogen C-line, red)
  abbeVd: number;   // Abbe number Vd = (nd - 1) / (nF - nC)
  density: number;  // g/cm^3
  cauchyA: number;  // Cauchy A coefficient
  cauchyB: number;  // Cauchy B coefficient (um^2)
  cauchyC: number;  // Cauchy C coefficient (um^4)
  uvCutoff: number; // nm
  fdaMinCenterThickness: number; // mm (safety standard)
  description: string;
  recommendedFor: string;
}

export interface LensParameters {
  sphere: number;         // Diopters (e.g. -4.50 D or +2.25 D)
  cylinder: number;       // Diopters (e.g. -1.25 D)
  axis: number;           // Degrees (0 - 180)
  baseCurve: number;      // Front surface power (Diopters, e.g. 4.00 D)
  lensType: LensType;
  diameter: number;       // Blank diameter in mm (e.g. 65, 70, 75 mm)
  centerThickness: number;// mm (or auto-calculated)
  autoCenterThickness: boolean;
  minEdgeThickness: number;// mm (usually 1.0 - 2.0 mm for plus lenses)
  materialId: string;
  bevelType: BevelType;
  coating: CoatingType;
  
  // Specific to Progressive (PAL) & Multifocal
  addPower?: number;      // Reading addition (e.g. +2.00 D)
  corridorLength?: number;// mm (e.g. 14 mm or 17 mm)
  progressionProfile?: 'hard' | 'soft' | 'freeform';
  nasalInsetMm?: number;  // Reading convergence inset (default 2.5 mm)
  segmentTopY?: number;   // Bifocal segment top line Y coordinate (default -2.0 mm)
  segmentWidthMm?: number;// Bifocal segment width (e.g. 28 mm for D28)
  
  // Specific to Aspheric
  conicConstantK?: number; // Conic constant (0 = sphere, -1 = parabola, >0 oblate, <-1 hyperbola)
  asphericCoeffA4?: number; // 4th order deformation
  
  // Specific to Prism
  prismDiopter?: number;  // Prism diopters (e.g. 2.00 Δ)
  prismBaseAngle?: number;// Degrees (0 = Base Out, 90 = Base Up, 180 = Base In, 270 = Base Down)
  
  // Frame & Edging Parameters
  frameShape?: 'round' | 'aviator' | 'wayfarer' | 'cat_eye' | 'rectangular' | 'hexagonal';
  pupillaryDistance?: number; // mm (e.g. 63 mm)
  fittingHeight?: number;     // mm (e.g. 20 mm)
  pantoscopicTilt?: number;   // degrees (e.g. 7 deg)
  wrapAngle?: number;         // degrees (e.g. 4 deg)
}

export interface CalculatedOptics {
  // Surface Curvatures & Radii
  r1_front_mm: number;        // Front surface radius of curvature (mm)
  r2_back_sphere_mm: number;  // Back surface sphere radius of curvature (mm)
  r2_back_cyl_mm?: number;    // Back surface cylinder radius of curvature (mm)
  frontPowerD: number;        // Diopters
  backPowerSphereD: number;   // Diopters
  backPowerCylD: number;      // Diopters
  totalEquivalentPowerD: number; // Thick lens total power
  effectiveFocalLength_mm: number; // EFL (mm)
  backFocalLength_mm: number; // BFL (mm)
  
  // Dimensions
  calculatedCenterThickness_mm: number;
  calculatedMinEdgeThickness_mm: number;
  calculatedMaxEdgeThickness_mm: number;
  lensVolume_cm3: number;
  lensWeight_grams: number;
  
  // Aberrations & Optical Quality
  longitudinalChromaticAberration_D: number; // LCA in diopters
  transverseChromaticAberration_mm: number; // TCA at rim
  abbeDispersionIndexSpread: number;        // (nF - nC)
  approximateSphericalAberration_D: number;
  recommendedBaseCurveVogel: number;       // Vogel's recommended base curve
  
  // Sagitta values at edge
  frontSag_mm: number;
  backSagMin_mm: number;
  backSagMax_mm: number;
  
  // Refractive index at 587.6 nm
  refractiveIndex: number;
  material: OpticalMaterial;
}

export interface RayPathPoint {
  x: number;
  y: number;
  z?: number;
}

export interface RayTraceResult {
  wavelength_nm: number;
  color: string;
  name: string;
  points: RayPathPoint[];
  focalIntercept_x: number;
}
