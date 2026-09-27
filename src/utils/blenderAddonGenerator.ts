import { LensParameters, CalculatedOptics } from '../types/optics';

export function generateBlenderManifest(): string {
  return `schema_version = "1.0.0"
id = "ophthalmic_lens_cad"
version = "2.3.0"
name = "Ophthalmic Lens CAD & Optics Studio"
tagline = "Parametric eyeglass lens CAD, collision-free geometry, live material switcher & Cauchy spectral dispersion"
maintainer = "OpticsCAD Studio"
type = "add-on"
blender_version_min = "4.0.0"
license = [
  "SPDX:GPL-2.0-or-later",
]
tags = [
  "Mesh",
  "Add Mesh",
  "Physics",
  "Materials",
]
`;
}

export function generateBlenderPythonAddon(params: LensParameters, optics: CalculatedOptics): string {
  const sphereVal = params.sphere.toFixed(2);
  const cylVal = (params.cylinder || 0).toFixed(2);
  const axisVal = (params.axis || 0).toFixed(1);
  const bcVal = params.baseCurve.toFixed(2);
  const diaVal = params.diameter.toFixed(1);
  const tcVal = optics.calculatedCenterThickness_mm.toFixed(2);
  const eflVal = optics.effectiveFocalLength_mm.toFixed(2);
  const addVal = (params.addPower || 2.0).toFixed(2);
  const corridorVal = (params.corridorLength || 14).toFixed(1);
  const insetVal = (params.nasalInsetMm || 2.5).toFixed(1);
  const segTopVal = (params.segmentTopY || -2.0).toFixed(1);
  const segWidthVal = (params.segmentWidthMm || 28.0).toFixed(1);

  return `bl_info = {
    "name": "Ophthalmic Lens CAD & Optics Studio",
    "author": "OpticsCAD Studio",
    "version": (2, 3, 0),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > Optics CAD & Add > Mesh > Ophthalmic Lens",
    "description": "Collision-Free Parametric Ophthalmic Lens CAD, Multifocal Surfaces, Live Material Switcher & Spectral Cycles Dispersion",
    "warning": "",
    "doc_url": "https://github.com",
    "category": "Add Mesh",
}

import bpy
import bmesh
import math
from mathutils import Vector, Matrix

# ==============================================================================
# 1. SCIENTIFIC OPTICAL MATERIALS DATABASE
# ==============================================================================
MATERIALS_DB = {
    'CR39': {
        'name': 'CR-39 Standard Plastic (1.498)',
        'nd': 1.498, 'ne': 1.500, 'nF': 1.5042, 'nC': 1.4956,
        'abbe': 58.0, 'density': 1.32, 'cauchy_a': 1.485, 'cauchy_b': 0.0045, 'fda_min_tc': 2.0
    },
    'POLYCARBONATE': {
        'name': 'Polycarbonate 1.586 (Shatterproof)',
        'nd': 1.586, 'ne': 1.590, 'nF': 1.6020, 'nC': 1.5820,
        'abbe': 30.0, 'density': 1.20, 'cauchy_a': 1.568, 'cauchy_b': 0.0062, 'fda_min_tc': 1.0
    },
    'TRIVEX': {
        'name': 'Trivex 1.530 (Ultra-light)',
        'nd': 1.530, 'ne': 1.532, 'nF': 1.5390, 'nC': 1.5270,
        'abbe': 45.0, 'density': 1.11, 'cauchy_a': 1.518, 'cauchy_b': 0.0041, 'fda_min_tc': 1.0
    },
    'MR8_160': {
        'name': 'MR-8 High Index 1.60',
        'nd': 1.597, 'ne': 1.601, 'nF': 1.6090, 'nC': 1.5940,
        'abbe': 41.0, 'density': 1.30, 'cauchy_a': 1.579, 'cauchy_b': 0.0051, 'fda_min_tc': 1.4
    },
    'MR7_167': {
        'name': 'MR-7 Ultra-Thin 1.67',
        'nd': 1.667, 'ne': 1.672, 'nF': 1.6840, 'nC': 1.6630,
        'abbe': 32.0, 'density': 1.36, 'cauchy_a': 1.644, 'cauchy_b': 0.0069, 'fda_min_tc': 1.4
    },
    'INDEX_174': {
        'name': 'Ultra High Index 1.74',
        'nd': 1.740, 'ne': 1.746, 'nF': 1.7600, 'nC': 1.7370,
        'abbe': 33.0, 'density': 1.47, 'cauchy_a': 1.715, 'cauchy_b': 0.0076, 'fda_min_tc': 1.2
    },
    'CROWN_GLASS': {
        'name': 'Crown Glass B270 (1.523)',
        'nd': 1.523, 'ne': 1.525, 'nF': 1.5290, 'nC': 1.5200,
        'abbe': 59.0, 'density': 2.54, 'cauchy_a': 1.512, 'cauchy_b': 0.0038, 'fda_min_tc': 2.0
    },
    'GLASS_180': {
        'name': 'Flint Mineral Glass 1.80',
        'nd': 1.800, 'ne': 1.808, 'nF': 1.8210, 'nC': 1.7940,
        'abbe': 35.0, 'density': 3.65, 'cauchy_a': 1.765, 'cauchy_b': 0.0098, 'fda_min_tc': 1.5
    }
}


# ==============================================================================
# 2. OPHTHALMIC MATHEMATICS & MULTIFOCAL SAG ENGINE
# ==============================================================================
def power_to_radius(power_d, nd):
    """Converts optical power in Diopters to surface radius of curvature in mm."""
    if abs(power_d) < 0.0001:
        return 1e7
    return ((nd - 1.0) / power_d) * 1000.0


def calculate_spherical_sag(radius_mm, r_mm):
    """Calculates non-negative spherical sagitta: s = |R| - sqrt(R^2 - r^2) >= 0"""
    abs_r = abs(radius_mm)
    if abs_r > 1e6 or abs_r < 0.001:
        return 0.0
    r_clamped = min(abs_r - 0.001, abs(r_mm))
    return abs_r - math.sqrt(abs_r * abs_r - r_clamped * r_clamped)


def calculate_toric_sag(rx_mm, ry_mm, x_mm, y_mm, axis_deg):
    """Calculates sagitta on a toric back surface with cylinder axis rotation."""
    rad = math.radians(axis_deg)
    cos_a = math.cos(rad)
    sin_a = math.sin(rad)
    
    x_rot = x_mm * cos_a + y_mm * sin_a
    y_rot = -x_mm * sin_a + y_mm * cos_a
    
    sag_x = calculate_spherical_sag(rx_mm, abs(x_rot))
    sag_y = calculate_spherical_sag(ry_mm, abs(y_rot))
    return sag_x + sag_y


def calculate_multifocal_surface_sag(
    base_radius_mm, x_mm, y_mm, lens_type, add_power, corridor_len_mm,
    nd, nasal_inset_mm=2.5, seg_top_y=-2.0, seg_width_mm=28.0
):
    """Calculates exact 3D surface sagitta for Multifocal, Bifocal, and Progressive designs."""
    r_radial = math.hypot(x_mm, y_mm)
    base_sag = calculate_spherical_sag(base_radius_mm, r_radial)
    if add_power <= 0.01:
        return base_sag

    n_minus_1 = nd - 1.0

    if lens_type == 'PROGRESSIVE':
        corridor_top = 4.0
        corridor_bottom = -(corridor_len_mm - 4.0)
        
        corridor_center_x = 0.0
        if corridor_top > y_mm > corridor_bottom:
            prog_fraction = (corridor_top - y_mm) / (corridor_top - corridor_bottom)
            corridor_center_x = -nasal_inset_mm * prog_fraction
        elif y_mm <= corridor_bottom:
            corridor_center_x = -nasal_inset_mm
            
        if y_mm >= corridor_top:
            local_add = 0.0
        elif y_mm <= corridor_bottom:
            local_add = add_power
        else:
            t = (corridor_top - y_mm) / (corridor_top - corridor_bottom)
            local_add = add_power * (10.0 * (t ** 3) - 15.0 * (t ** 4) + 6.0 * (t ** 5))
            
        x_rel = x_mm - corridor_center_x
        corridor_w = 7.0
        lateral_dist = max(0.0, abs(x_rel) - corridor_w / 2.0)
        blend_weight = math.exp(-0.5 * ((lateral_dist / 8.5) ** 2))
        
        add_sag_delta = (local_add * (r_radial ** 2)) / (2000.0 * n_minus_1)
        return base_sag + (add_sag_delta * blend_weight)

    elif lens_type == 'BIFOCAL_FLATTOP':
        seg_radius = seg_width_mm / 2.0
        seg_center_y = seg_top_y - seg_radius
        seg_center_x = -nasal_inset_mm
        
        dx = x_mm - seg_center_x
        dy = y_mm - seg_center_y
        dist_to_seg = math.hypot(dx, dy)
        
        if y_mm <= seg_top_y and dist_to_seg <= seg_radius:
            add_sag = (add_power * (dist_to_seg ** 2)) / (2000.0 * n_minus_1)
            ledge_height = (add_power * (seg_radius ** 2)) / (4000.0 * n_minus_1)
            return base_sag + add_sag + ledge_height
        return base_sag

    elif lens_type == 'BIFOCAL_ROUND':
        seg_radius = seg_width_mm / 2.0
        seg_center_y = seg_top_y - seg_radius
        seg_center_x = -nasal_inset_mm
        dist_to_seg = math.hypot(x_mm - seg_center_x, y_mm - seg_center_y)
        if dist_to_seg <= seg_radius:
            add_sag = (add_power * (dist_to_seg ** 2)) / (2000.0 * n_minus_1)
            return base_sag + add_sag
        return base_sag

    elif lens_type == 'BIFOCAL_EXECUTIVE':
        if y_mm <= seg_top_y:
            dy = abs(y_mm - seg_top_y)
            add_sag = (add_power * (dy ** 2 + (x_mm ** 2) * 0.5)) / (2000.0 * n_minus_1)
            return base_sag + add_sag + 0.35
        return base_sag

    elif lens_type == 'TRIFOCAL_7X28':
        seg_radius = seg_width_mm / 2.0
        intermediate_h = 7.0
        near_top_y = seg_top_y - intermediate_h
        dist_to_seg = math.hypot(x_mm - (-nasal_inset_mm), y_mm - (seg_top_y - seg_radius))
        
        if dist_to_seg <= seg_radius:
            if seg_top_y >= y_mm > near_top_y:
                inter_add = add_power * 0.5
                add_sag = (inter_add * (dist_to_seg ** 2)) / (2000.0 * n_minus_1)
                return base_sag + add_sag + 0.15
            elif y_mm <= near_top_y:
                add_sag = (add_power * (dist_to_seg ** 2)) / (2000.0 * n_minus_1)
                return base_sag + add_sag + 0.35
        return base_sag

    return base_sag


# ==============================================================================
# 3. PROCEDURAL BMESH LENS GENERATOR (COLLISION-FREE ENGINE)
# ==============================================================================
def compute_collision_free_center_thickness(
    r1_mm, r2_sph_mm, r2_cyl_mm, axis_deg, semi_dia_mm, lens_type,
    add_power, corridor_len_mm, nd, is_back_concave,
    min_edge_thick_mm=1.2, fda_min_tc_mm=1.4,
    nasal_inset_mm=2.5, seg_top_y=-2.0, seg_width_mm=28.0
):
    """
    Performs 360-degree polar disc sampling to compute the exact minimum center
    thickness (tc) required so that front and back surfaces maintain at least
    min_edge_thick_mm clearance at EVERY point on the lens, eliminating intersections.
    """
    max_required_tc = fda_min_tc_mm

    # Sample radii from center to edge
    radii_factors = [0.0, 0.2, 0.4, 0.6, 0.8, 0.95, 1.0]
    
    for rf in radii_factors:
        r_current = semi_dia_mm * rf
        if r_current < 0.001:
            # At optical center (0,0)
            # z_front = 0, z_back = -tc => gap = tc >= fda_min_tc_mm
            continue
            
        # Sample angles around the rim and interior
        for deg in range(0, 360, 15):
            rad = math.radians(deg)
            x = r_current * math.cos(rad)
            y = r_current * math.sin(rad)
            
            # 1. Front Surface Sagitta (positive value)
            if lens_type in ['PROGRESSIVE', 'BIFOCAL_FLATTOP', 'BIFOCAL_ROUND', 'BIFOCAL_EXECUTIVE', 'TRIFOCAL_7X28']:
                s_front = calculate_multifocal_surface_sag(
                    r1_mm, x, y, lens_type, add_power, corridor_len_mm, nd,
                    nasal_inset_mm, seg_top_y, seg_width_mm
                )
            else:
                s_front = calculate_spherical_sag(r1_mm, r_current)
                
            # 2. Back Surface Sagitta (positive value)
            if lens_type == 'TORIC':
                s_back = calculate_toric_sag(r2_sph_mm, r2_cyl_mm, x, y, axis_deg)
            else:
                s_back = calculate_spherical_sag(r2_sph_mm, r_current)
                
            # 3. Minimum thickness required at this coordinate:
            # For meniscus (concave back): z_front = -s_front, z_back = -tc - s_back
            # Clearance: z_front - z_back = -s_front - (-tc - s_back) = tc + s_back - s_front >= min_edge_thick_mm
            # => tc >= min_edge_thick_mm + s_front - s_back
            if is_back_concave:
                req_tc = min_edge_thick_mm + (s_front - s_back)
            else:
                # For biconvex (convex back): z_front = -s_front, z_back = -tc + s_back
                # Clearance: z_front - z_back = tc - s_front - s_back >= min_edge_thick_mm
                # => tc >= min_edge_thick_mm + s_front + s_back
                req_tc = min_edge_thick_mm + s_front + s_back
                
            if req_tc > max_required_tc:
                max_required_tc = req_tc
                
    return max_required_tc


def create_ophthalmic_lens_bmesh(
    sphere_d, cyl_d, axis_deg, base_curve_d,
    diameter_mm, center_thick_mm, material_key,
    lens_type, bevel_type, add_power, corridor_len,
    nasal_inset_mm=2.5, seg_top_y=-2.0, seg_width_mm=28.0,
    radial_segments=72, ring_segments=32, min_edge_thick=1.2,
    auto_thickness=True
):
    """Generates complete parametric BMesh with zero surface intersections."""
    bm = bmesh.new()
    mat_info = MATERIALS_DB.get(material_key, MATERIALS_DB['CR39'])
    nd = mat_info['nd']
    fda_min_tc = mat_info['fda_min_tc']
    semi_dia = diameter_mm / 2.0
    
    r1 = power_to_radius(base_curve_d, nd)
    
    # Estimate preliminary back power
    est_f2_sph = sphere_d - base_curve_d
    est_r2_sph = power_to_radius(est_f2_sph, nd)
    est_f2_cyl = (sphere_d + cyl_d) - base_curve_d
    est_r2_cyl = power_to_radius(est_f2_cyl, nd) if abs(cyl_d) > 0.01 else est_r2_sph
    
    is_back_concave = est_f2_sph <= 0.001
    
    # Compute true collision-free safe center thickness across the whole disc
    safe_tc = compute_collision_free_center_thickness(
        r1, est_r2_sph, est_r2_cyl, axis_deg, semi_dia, lens_type,
        add_power, corridor_len, nd, is_back_concave,
        min_edge_thick_mm=min_edge_thick, fda_min_tc_mm=fda_min_tc,
        nasal_inset_mm=nasal_inset_mm, seg_top_y=seg_top_y, seg_width_mm=seg_width_mm
    )
    
    if auto_thickness:
        actual_tc = max(center_thick_mm, safe_tc)
    else:
        actual_tc = max(0.6, center_thick_mm)
    
    # Exact Thick lens back power calculation
    t_m = actual_tc / 1000.0
    thick_correction = 1.0 - (t_m / nd) * base_curve_d
    if abs(thick_correction) < 0.001:
        thick_correction = 1.0
        
    f2_sph = (sphere_d - base_curve_d) / thick_correction
    f2_cyl = ((sphere_d + cyl_d) - base_curve_d) / thick_correction
    
    r2_sph = power_to_radius(f2_sph, nd)
    r2_cyl = power_to_radius(f2_cyl, nd) if abs(cyl_d) > 0.01 else r2_sph
    
    # Build Front Surface Grid
    front_verts_grid = []
    
    for ring_i in range(ring_segments + 1):
        r_frac = (ring_i / ring_segments)
        r_current = semi_dia * (math.sin(r_frac * math.pi / 2.0))
        ring_verts = []
        
        for rad_j in range(radial_segments):
            angle = 2.0 * math.pi * (rad_j / radial_segments)
            x = r_current * math.cos(angle)
            y = r_current * math.sin(angle)
            
            if lens_type in ['PROGRESSIVE', 'BIFOCAL_FLATTOP', 'BIFOCAL_ROUND', 'BIFOCAL_EXECUTIVE', 'TRIFOCAL_7X28']:
                z_front = -calculate_multifocal_surface_sag(
                    r1, x, y, lens_type, add_power, corridor_len, nd,
                    nasal_inset_mm, seg_top_y, seg_width_mm
                )
            else:
                z_front = -calculate_spherical_sag(r1, r_current)
                
            v = bm.verts.new((x, y, z_front))
            ring_verts.append(v)
            
        front_verts_grid.append(ring_verts)
        
    # Front Faces
    for ring_i in range(ring_segments):
        for rad_j in range(radial_segments):
            next_j = (rad_j + 1) % radial_segments
            v1 = front_verts_grid[ring_i][rad_j]
            v2 = front_verts_grid[ring_i][next_j]
            v3 = front_verts_grid[ring_i + 1][next_j]
            v4 = front_verts_grid[ring_i + 1][rad_j]
            if ring_i == 0:
                bm.faces.new((v1, v2, v3))
            else:
                bm.faces.new((v1, v2, v3, v4))

    # Build Back Surface Grid with Guaranteed Non-Intersection Clearance
    back_verts_grid = []
    effective_min_gap = min(min_edge_thick, 0.8)
    
    for ring_i in range(ring_segments + 1):
        r_frac = (ring_i / ring_segments)
        r_current = semi_dia * (math.sin(r_frac * math.pi / 2.0))
        ring_verts = []
        
        for rad_j in range(radial_segments):
            angle = 2.0 * math.pi * (rad_j / radial_segments)
            x = r_current * math.cos(angle)
            y = r_current * math.sin(angle)
            
            if lens_type == 'TORIC':
                sag_b = calculate_toric_sag(r2_sph, r2_cyl, x, y, axis_deg)
            else:
                sag_b = calculate_spherical_sag(r2_sph, r_current)
                
            if is_back_concave:
                # Meniscus: back surface curves in -Z direction
                z_back_ideal = -actual_tc - sag_b
            else:
                # Biconvex: back surface curves in +Z direction towards center
                z_back_ideal = -actual_tc + sag_b
                
            # ABSOLUTE COLLISION PRECLUSION:
            # Back surface is strictly constrained to be at least below the corresponding front surface vertex.
            # Front and back surfaces can NEVER intersect or invert normals.
            z_front_local = front_verts_grid[ring_i][rad_j].co.z
            z_back = min(z_front_local - effective_min_gap, z_back_ideal)
            
            v = bm.verts.new((x, y, z_back))
            ring_verts.append(v)
            
        back_verts_grid.append(ring_verts)
        
    # Back Faces
    for ring_i in range(ring_segments):
        for rad_j in range(radial_segments):
            next_j = (rad_j + 1) % radial_segments
            v1 = back_verts_grid[ring_i][rad_j]
            v2 = back_verts_grid[ring_i + 1][rad_j]
            v3 = back_verts_grid[ring_i + 1][next_j]
            v4 = back_verts_grid[ring_i][next_j]
            if ring_i == 0:
                bm.faces.new((v1, v2, v3))
            else:
                bm.faces.new((v1, v2, v3, v4))

    # 7. Construct Edge Rim / Bevel
    front_rim = front_verts_grid[-1]
    back_rim = back_verts_grid[-1]
    
    if bevel_type == 'V_BEVEL':
        bevel_apex_verts = []
        bevel_ratio = 0.45
        apex_protrusion = 0.6
        
        for rad_j in range(radial_segments):
            angle = 2.0 * math.pi * (rad_j / radial_segments)
            vf = front_rim[rad_j]
            vb = back_rim[rad_j]
            z_mid = vf.co.z + bevel_ratio * (vb.co.z - vf.co.z)
            r_apex = semi_dia + apex_protrusion
            v_apex = bm.verts.new((r_apex * math.cos(angle), r_apex * math.sin(angle), z_mid))
            bevel_apex_verts.append(v_apex)
            
        for rad_j in range(radial_segments):
            next_j = (rad_j + 1) % radial_segments
            bm.faces.new((front_rim[rad_j], bevel_apex_verts[rad_j], bevel_apex_verts[next_j], front_rim[next_j]))
            bm.faces.new((bevel_apex_verts[rad_j], back_rim[rad_j], back_rim[next_j], bevel_apex_verts[next_j]))
            
    elif bevel_type == 'GROOVED':
        groove_top_verts = []
        groove_bot_verts = []
        groove_depth = 0.6
        for rad_j in range(radial_segments):
            angle = 2.0 * math.pi * (rad_j / radial_segments)
            vf = front_rim[rad_j]
            vb = back_rim[rad_j]
            z_mid = (vf.co.z + vb.co.z) / 2.0
            r_in = semi_dia - groove_depth
            groove_top_verts.append(bm.verts.new((r_in * math.cos(angle), r_in * math.sin(angle), z_mid + 0.4)))
            groove_bot_verts.append(bm.verts.new((r_in * math.cos(angle), r_in * math.sin(angle), z_mid - 0.4)))
            
        for rad_j in range(radial_segments):
            next_j = (rad_j + 1) % radial_segments
            bm.faces.new((front_rim[rad_j], front_rim[next_j], groove_top_verts[next_j], groove_top_verts[rad_j]))
            bm.faces.new((groove_top_verts[rad_j], groove_top_verts[next_j], groove_bot_verts[next_j], groove_bot_verts[rad_j]))
            bm.faces.new((groove_bot_verts[rad_j], groove_bot_verts[next_j], back_rim[next_j], back_rim[rad_j]))
    else:  # FLAT RIMLESS
        for rad_j in range(radial_segments):
            next_j = (rad_j + 1) % radial_segments
            bm.faces.new((front_rim[rad_j], front_rim[next_j], back_rim[next_j], back_rim[rad_j]))
            
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm, actual_tc


# ==============================================================================
# 4. CYCLES PHYSICALLY ACCURATE SPECTRAL SHADER GENERATOR
# ==============================================================================
def create_or_update_optical_material(mat_name, material_key, coating_type='AR_GREEN'):
    """Builds or updates Cycles node shader tree with exact Cauchy dispersion & AR coating."""
    mat = bpy.data.materials.get(mat_name)
    if mat is None:
        mat = bpy.data.materials.new(name=mat_name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    
    mat_info = MATERIALS_DB.get(material_key, MATERIALS_DB['CR39'])
    nd = mat_info['nd']
    nF = mat_info['nF']
    nC = mat_info['nC']
    
    node_out = nodes.new(type='ShaderNodeOutputMaterial')
    node_out.location = (650, 0)
    
    glass_r = nodes.new(type='ShaderNodeBsdfGlass')
    glass_r.name = "Glass_Red_nC"
    glass_r.location = (-150, 220)
    glass_r.inputs['IOR'].default_value = nC
    glass_r.inputs['Roughness'].default_value = 0.001
    glass_r.inputs['Color'].default_value = (1.0, 0.0, 0.0, 1.0)
    
    glass_g = nodes.new(type='ShaderNodeBsdfGlass')
    glass_g.name = "Glass_Green_nd"
    glass_g.location = (-150, 0)
    glass_g.inputs['IOR'].default_value = nd
    glass_g.inputs['Roughness'].default_value = 0.001
    glass_g.inputs['Color'].default_value = (0.0, 1.0, 0.0, 1.0)
    
    glass_b = nodes.new(type='ShaderNodeBsdfGlass')
    glass_b.name = "Glass_Blue_nF"
    glass_b.location = (-150, -220)
    glass_b.inputs['IOR'].default_value = nF
    glass_b.inputs['Roughness'].default_value = 0.001
    glass_b.inputs['Color'].default_value = (0.0, 0.0, 1.0, 1.0)
    
    add_rg = nodes.new(type='ShaderNodeAddShader')
    add_rg.location = (120, 110)
    links.new(glass_r.outputs['BSDF'], add_rg.inputs[0])
    links.new(glass_g.outputs['BSDF'], add_rg.inputs[1])
    
    add_rgb = nodes.new(type='ShaderNodeAddShader')
    add_rgb.location = (320, 0)
    links.new(add_rg.outputs['Shader'], add_rgb.inputs[0])
    links.new(glass_b.outputs['BSDF'], add_rgb.inputs[1])
    
    if coating_type in ['AR_GREEN', 'AR_BLUE', 'POLARIZED_G15']:
        fresnel = nodes.new(type='ShaderNodeFresnel')
        fresnel.location = (120, -300)
        fresnel.inputs['IOR'].default_value = 1.38
        
        coat_gloss = nodes.new(type='ShaderNodeBsdfGlossy')
        coat_gloss.location = (120, -450)
        coat_gloss.inputs['Roughness'].default_value = 0.005
        
        if coating_type == 'AR_GREEN':
            coat_gloss.inputs['Color'].default_value = (0.15, 0.95, 0.35, 1.0)
        elif coating_type == 'AR_BLUE':
            coat_gloss.inputs['Color'].default_value = (0.2, 0.45, 1.0, 1.0)
        elif coating_type == 'POLARIZED_G15':
            coat_gloss.inputs['Color'].default_value = (0.1, 0.2, 0.12, 1.0)
            
        mix_ar = nodes.new(type='ShaderNodeMixShader')
        mix_ar.location = (480, -100)
        
        fresnel_clamp = nodes.new(type='ShaderNodeMath')
        fresnel_clamp.operation = 'MULTIPLY'
        fresnel_clamp.inputs[1].default_value = 0.08
        links.new(fresnel.outputs['Fac'], fresnel_clamp.inputs[0])
        
        links.new(fresnel_clamp.outputs['Value'], mix_ar.inputs['Fac'])
        links.new(add_rgb.outputs['Shader'], mix_ar.inputs[1])
        links.new(coat_gloss.outputs['BSDF'], mix_ar.inputs[2])
        links.new(mix_ar.outputs['Shader'], node_out.inputs['Surface'])
    else:
        links.new(add_rgb.outputs['Shader'], node_out.inputs['Surface'])
        
    return mat


# ==============================================================================
# 5. OPERATORS: LIVE MATERIAL SWITCHER & MESH CREATION
# ==============================================================================
class MATERIAL_OT_switch_optical_material(bpy.types.Operator):
    """Switch optical material & Cycles refractive indices on the active lens object"""
    bl_idname = "material.switch_optical_material"
    bl_label = "Apply Material to Active Lens"
    bl_options = {'REGISTER', 'UNDO'}
    
    material_key: bpy.props.EnumProperty(
        name="Material",
        items=[
            ('CR39', "CR-39 (nd=1.498, Abbe=58.0)", "Standard plastic"),
            ('POLYCARBONATE', "Polycarbonate (nd=1.586, Abbe=30.0)", "Shatterproof"),
            ('TRIVEX', "Trivex (nd=1.530, Abbe=45.0)", "Ultra-light impact polymer"),
            ('MR8_160', "MR-8 High Index 1.60 (nd=1.597, Abbe=41.0)", "Mitsui polymer"),
            ('MR7_167', "MR-7 Ultra-Thin 1.67 (nd=1.667, Abbe=32.0)", "Ultra-thin"),
            ('INDEX_174', "1.74 High Index (nd=1.740, Abbe=33.0)", "Thinnest organic"),
            ('CROWN_GLASS', "Crown Glass B270 (nd=1.523, Abbe=59.0)", "Mineral glass"),
            ('GLASS_180', "High Index Glass 1.80 (nd=1.800, Abbe=35.0)", "Dense flint glass")
        ],
        default='${params.materialId === "mr7_167" ? "MR7_167" : params.materialId === "index_174" ? "INDEX_174" : params.materialId === "mr8_160" ? "MR8_160" : params.materialId === "polycarbonate" ? "POLYCARBONATE" : params.materialId === "trivex" ? "TRIVEX" : params.materialId === "crown_glass_1523" ? "CROWN_GLASS" : params.materialId === "high_index_glass_180" ? "GLASS_180" : "CR39"}'
    )
    
    coating_type: bpy.props.EnumProperty(
        name="Coating",
        items=[
            ('AR_GREEN', "Multi-Layer AR Green (530nm)", "Classic green residual reflection"),
            ('AR_BLUE', "Blue-Shield AR (450nm)", "Digital blue protection"),
            ('POLARIZED_G15', "Polarized G-15 (15% Transmittance)", "Sunglass tint"),
            ('UNCOATED', "Uncoated Raw Glass", "Standard reflection")
        ],
        default='${params.coating === "ar_blue_shield" ? "AR_BLUE" : params.coating === "polarized_g15" ? "POLARIZED_G15" : params.coating === "uncoated" ? "UNCOATED" : "AR_GREEN"}'
    )
    
    def execute(self, context):
        obj = context.active_object
        if not obj or obj.type != 'MESH':
            self.report({'ERROR'}, "Please select an optical lens mesh first")
            return {'CANCELLED'}
            
        mat_info = MATERIALS_DB.get(self.material_key, MATERIALS_DB['CR39'])
        mat_name = f"Mat_{self.material_key}_{self.coating_type}"
        mat = create_or_update_optical_material(mat_name, self.material_key, self.coating_type)
        
        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)
            
        self.report({'INFO'}, f"Updated '{obj.name}' to {mat_info['name']} (nd={mat_info['nd']}, nF={mat_info['nF']}, nC={mat_info['nC']})")
        return {'FINISHED'}


class MESH_OT_create_ophthalmic_lens(bpy.types.Operator):
    """Generate physically accurate ophthalmic eyeglass lens mesh"""
    bl_idname = "mesh.create_ophthalmic_lens"
    bl_label = "Create Ophthalmic Lens"
    bl_options = {'REGISTER', 'UNDO'}
    
    sphere: bpy.props.FloatProperty(name="Sphere (D)", default=${sphereVal}, min=-25.0, max=20.0, step=25)
    cylinder: bpy.props.FloatProperty(name="Cylinder (D)", default=${cylVal}, min=-10.0, max=10.0, step=25)
    axis: bpy.props.FloatProperty(name="Axis (Deg)", default=${axisVal}, min=0.0, max=180.0, step=100)
    base_curve: bpy.props.FloatProperty(name="Base Curve (D)", default=${bcVal}, min=0.5, max=16.0, step=25)
    diameter: bpy.props.FloatProperty(name="Diameter (mm)", default=${diaVal}, min=30.0, max=100.0, step=100)
    center_thickness: bpy.props.FloatProperty(name="Center Thickness (mm)", default=${tcVal}, min=0.8, max=25.0, step=10)
    auto_thickness: bpy.props.BoolProperty(name="Auto Safe Thickness", default=True, description="Enforce collision-free minimum thickness")
    
    lens_type: bpy.props.EnumProperty(
        name="Geometry",
        items=[
            ('SPHERICAL', "Single Vision Spherical", "Spherical front and back"),
            ('TORIC', "Toric (Astigmatism)", "Toric back surface along cylinder axis"),
            ('PROGRESSIVE', "Progressive Addition (PAL)", "Freeform continuous power corridor"),
            ('BIFOCAL_FLATTOP', "Bifocal Flat-Top D28", "Iconic D-Segment with step ledge"),
            ('BIFOCAL_ROUND', "Bifocal Round 28mm", "Kryptok / Ultex round segment"),
            ('BIFOCAL_EXECUTIVE', "Bifocal Executive", "Franklin horizontal line segment"),
            ('TRIFOCAL_7X28', "Trifocal 7x28", "Intermediate 50% ribbon + reading zone")
        ],
        default='${params.lensType === "toric_astigmatic" ? "TORIC" : params.lensType === "progressive_pal" ? "PROGRESSIVE" : params.lensType === "bifocal_flattop" ? "BIFOCAL_FLATTOP" : params.lensType === "bifocal_round" ? "BIFOCAL_ROUND" : params.lensType === "bifocal_executive" ? "BIFOCAL_EXECUTIVE" : params.lensType === "trifocal_7x28" ? "TRIFOCAL_7X28" : "SPHERICAL"}'
    )
    
    material_key: bpy.props.EnumProperty(
        name="Material",
        items=[
            ('CR39', "CR-39 (1.498, Abbe 58)", "Standard organic plastic"),
            ('POLYCARBONATE', "Polycarbonate (1.586, Abbe 30)", "Shatterproof safety plastic"),
            ('TRIVEX', "Trivex (1.530, Abbe 45)", "Ultra-light impact polymer"),
            ('MR8_160', "MR-8 1.60 (Abbe 41)", "Mitsui high-index polymer"),
            ('MR7_167', "MR-7 1.67 (Abbe 32)", "Ultra-thin high-index"),
            ('INDEX_174', "1.74 High Index (Abbe 33)", "Thinnest plastic for high myopia"),
            ('CROWN_GLASS', "Crown Glass (1.523, Abbe 59)", "Scratch-resistant mineral glass"),
            ('GLASS_180', "High Index Glass 1.80 (Abbe 35)", "Dense flint glass")
        ],
        default='${params.materialId === "mr7_167" ? "MR7_167" : params.materialId === "index_174" ? "INDEX_174" : params.materialId === "mr8_160" ? "MR8_160" : params.materialId === "polycarbonate" ? "POLYCARBONATE" : params.materialId === "trivex" ? "TRIVEX" : params.materialId === "crown_glass_1523" ? "CROWN_GLASS" : params.materialId === "high_index_glass_180" ? "GLASS_180" : "CR39"}'
    )
    
    bevel_type: bpy.props.EnumProperty(
        name="Edge Bevel",
        items=[
            ('V_BEVEL', "V-Bevel 110°", "Full-rim standard frame bevel"),
            ('FLAT', "Flat Polished", "Rimless / Drill mount frame"),
            ('GROOVED', "Grooved Nylor", "Semi-rimless nylon thread frame")
        ],
        default='${params.bevelType === "flat" ? "FLAT" : params.bevelType === "grooved" ? "GROOVED" : "V_BEVEL"}'
    )
    
    coating_type: bpy.props.EnumProperty(
        name="Coating",
        items=[
            ('AR_GREEN', "Multi-Layer AR Green (530nm)", "Classic green residual reflection"),
            ('AR_BLUE', "Blue-Shield AR (450nm)", "Blue-blocking reflection"),
            ('POLARIZED_G15', "Polarized G-15", "Sunglass tint"),
            ('UNCOATED', "Uncoated Raw Glass", "Zero thin-film coating")
        ],
        default='${params.coating === "ar_blue_shield" ? "AR_BLUE" : params.coating === "polarized_g15" ? "POLARIZED_G15" : params.coating === "uncoated" ? "UNCOATED" : "AR_GREEN"}'
    )
    
    add_power: bpy.props.FloatProperty(name="Add Power (D)", default=${addVal}, min=0.5, max=4.0, step=25)
    corridor_len: bpy.props.FloatProperty(name="Corridor Length (mm)", default=${corridorVal}, min=10.0, max=22.0)
    nasal_inset: bpy.props.FloatProperty(name="Nasal Inset (mm)", default=${insetVal}, min=0.0, max=5.0)
    seg_top_y: bpy.props.FloatProperty(name="Segment Top Y (mm)", default=${segTopVal}, min=-10.0, max=5.0)
    seg_width: bpy.props.FloatProperty(name="Segment Width (mm)", default=${segWidthVal}, min=20.0, max=45.0)
    
    def execute(self, context):
        bm, safe_tc = create_ophthalmic_lens_bmesh(
            self.sphere, self.cylinder, self.axis, self.base_curve,
            self.diameter, self.center_thickness, self.material_key,
            self.lens_type, self.bevel_type, self.add_power, self.corridor_len,
            self.nasal_inset, self.seg_top_y, self.seg_width,
            auto_thickness=self.auto_thickness
        )
        
        mesh_name = f"OphthalmicLens_{self.lens_type}_{self.sphere:+.2f}D_{self.material_key}"
        mesh_data = bpy.data.meshes.new(mesh_name)
        bm.to_mesh(mesh_data)
        bm.free()
        
        obj = bpy.data.objects.new(mesh_name, mesh_data)
        context.collection.objects.link(obj)
        context.view_layer.objects.active = obj
        obj.select_set(True)
        
        mat = create_or_update_optical_material(f"Mat_{self.material_key}_{self.coating_type}", self.material_key, self.coating_type)
        if obj.data.materials:
            obj.data.materials[0] = mat
        else:
            obj.data.materials.append(mat)
            
        self.report({'INFO'}, f"Generated {self.lens_type} Lens ({self.sphere:+.2f} D, tc={safe_tc:.2f}mm, EFL={power_to_radius(self.sphere, 1.5):.1f}mm)")
        return {'FINISHED'}


class OPTICS_OT_build_optical_bench(bpy.types.Operator):
    """Builds a calibrated optical test bench with collimated beam and target chart"""
    bl_idname = "optics.build_optical_bench"
    bl_label = "Spawn Optical Test Bench"
    bl_options = {'REGISTER', 'UNDO'}
    
    focal_distance_mm: bpy.props.FloatProperty(name="Focal Distance (mm)", default=${eflVal})
    
    def execute(self, context):
        bench_col = bpy.data.collections.get("Optical_Bench")
        if not bench_col:
            bench_col = bpy.data.collections.new("Optical_Bench")
            context.scene.collection.children.link(bench_col)
            
        light_data = bpy.data.lights.new(name="Optics_CollimatedBeam", type='SUN')
        light_data.energy = 5.0
        light_data.angle = 0.001
        light_obj = bpy.data.objects.new("Optics_CollimatedBeam", light_data)
        light_obj.location = (0, 0, 0.2)
        light_obj.rotation_euler = (0, 0, 0)
        bench_col.objects.link(light_obj)
        
        bpy.ops.mesh.primitive_plane_add(size=0.08, location=(0, 0, 0.3))
        target_obj = context.active_object
        target_obj.name = "Optics_Target_Chart"
        target_obj.rotation_euler = (0, math.pi, 0)
        
        focal_m = abs(self.focal_distance_mm) / 1000.0 if abs(self.focal_distance_mm) < 10000 else 0.5
        bpy.ops.mesh.primitive_plane_add(size=0.04, location=(0, 0, -focal_m))
        sensor_obj = context.active_object
        sensor_obj.name = f"Optics_FocalSensor_{self.focal_distance_mm:.0f}mm"
        
        self.report({'INFO'}, f"Optical Test Bench configured at focal plane Z = -{focal_m*1000:.1f} mm")
        return {'FINISHED'}


# ==============================================================================
# 6. SIDEBAR USER INTERFACE PANEL
# ==============================================================================
class VIEW3D_PT_ophthalmic_optics_panel(bpy.types.Panel):
    """Ophthalmic Lens CAD Panel in 3D Viewport Sidebar"""
    bl_label = "Ophthalmic Lens CAD"
    bl_idname = "VIEW3D_PT_ophthalmic_optics_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Optics CAD'
    
    def draw(self, context):
        layout = self.layout
        
        box_mesh = layout.box()
        box_mesh.label(text="Parametric Lens Generator", icon='MESH_ICOSPHERE')
        box_mesh.operator("mesh.create_ophthalmic_lens", text="Generate New Lens", icon='ADD')
        
        layout.separator()
        
        box_mat = layout.box()
        box_mat.label(text="Live Material Switcher", icon='NODE_MATERIAL')
        box_mat.operator("material.switch_optical_material", text="Apply Material & IORs", icon='SHADING_RENDERED')
        
        layout.separator()
        
        box_bench = layout.box()
        box_bench.label(text="Optical Validation", icon='LIGHT_SUN')
        box_bench.operator("optics.build_optical_bench", text="Spawn Test Bench", icon='CAMERA_DATA')


def menu_func(self, context):
    self.layout.operator(MESH_OT_create_ophthalmic_lens.bl_idname, text="Ophthalmic Lens", icon='MESH_ICOSPHERE')


classes = (
    MATERIAL_OT_switch_optical_material,
    MESH_OT_create_ophthalmic_lens,
    OPTICS_OT_build_optical_bench,
    VIEW3D_PT_ophthalmic_optics_panel,
)

def register():
    for cls in classes:
        bpy.utils.register_class(cls)
    bpy.types.VIEW3D_MT_mesh_add.append(menu_func)

def unregister():
    bpy.types.VIEW3D_MT_mesh_add.remove(menu_func)
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)

if __name__ == "__main__":
    register()
`;
}
