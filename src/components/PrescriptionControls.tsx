import React from 'react';
import { LensParameters, LensType, BevelType, CoatingType } from '../types/optics';
import { OPTICAL_MATERIALS } from '../utils/materialsData';
import { Sliders, Sparkles, Wand2, Shield, Glasses, CircleDot, ChevronDown, Layers } from 'lucide-react';

interface PrescriptionControlsProps {
  params: LensParameters;
  onChange: (updated: Partial<LensParameters>) => void;
  recommendedVogelBC: number;
}

export const PrescriptionControls: React.FC<PrescriptionControlsProps> = ({
  params,
  onChange,
  recommendedVogelBC
}) => {
  // Preset Library
  const applyPreset = (presetKey: string) => {
    switch (presetKey) {
      case 'high_myopia':
        onChange({
          sphere: -6.0,
          cylinder: -0.75,
          axis: 180,
          baseCurve: 2.0,
          lensType: 'single_vision_aspheric',
          materialId: 'mr7_167',
          diameter: 65,
          coating: 'ar_green_multi',
          bevelType: 'v_bevel',
          autoCenterThickness: true
        });
        break;
      case 'astigmatism':
        onChange({
          sphere: -3.25,
          cylinder: -2.0,
          axis: 90,
          baseCurve: 3.5,
          lensType: 'toric_astigmatic',
          materialId: 'polycarbonate',
          diameter: 70,
          coating: 'ar_green_multi',
          bevelType: 'v_bevel',
          autoCenterThickness: true
        });
        break;
      case 'progressive_pal':
        onChange({
          sphere: 1.5,
          cylinder: -0.5,
          axis: 15,
          baseCurve: 5.5,
          lensType: 'progressive_pal',
          addPower: 2.0,
          corridorLength: 14,
          nasalInsetMm: 2.5,
          materialId: 'mr8_160',
          diameter: 70,
          coating: 'ar_blue_shield',
          bevelType: 'v_bevel',
          autoCenterThickness: true
        });
        break;
      case 'bifocal_flattop':
        onChange({
          sphere: 2.0,
          cylinder: 0,
          axis: 0,
          baseCurve: 6.0,
          lensType: 'bifocal_flattop',
          addPower: 2.25,
          segmentTopY: -2.0,
          segmentWidthMm: 28.0,
          nasalInsetMm: 2.5,
          materialId: 'cr39',
          diameter: 70,
          coating: 'ar_green_multi',
          bevelType: 'v_bevel',
          autoCenterThickness: true
        });
        break;
      case 'trifocal_7x28':
        onChange({
          sphere: 1.75,
          cylinder: -0.75,
          axis: 90,
          baseCurve: 5.75,
          lensType: 'trifocal_7x28',
          addPower: 2.5,
          segmentTopY: -2.0,
          segmentWidthMm: 28.0,
          nasalInsetMm: 2.5,
          materialId: 'mr8_160',
          diameter: 70,
          coating: 'ar_green_multi',
          bevelType: 'v_bevel',
          autoCenterThickness: true
        });
        break;
      case 'sunglass_polarized':
        onChange({
          sphere: -2.0,
          cylinder: 0,
          axis: 0,
          baseCurve: 4.5,
          lensType: 'single_vision_spherical',
          materialId: 'crown_glass_1523',
          diameter: 75,
          coating: 'polarized_g15',
          bevelType: 'v_bevel',
          autoCenterThickness: true
        });
        break;
    }
  };

  const isMultifocal = [
    'progressive_pal',
    'bifocal_flattop',
    'bifocal_round',
    'bifocal_executive',
    'trifocal_7x28'
  ].includes(params.lensType);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl space-y-5">
      {/* Header & Preset Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3.5">
        <div className="flex items-center gap-2">
          <Glasses className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-100">
            OPHTHALMIC PRESCRIPTION &amp; PARAMETRIC GEOMETRY
          </h2>
        </div>

        {/* Quick Presets Menu */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] font-mono text-slate-400 mr-1">Presets:</span>
          <button
            onClick={() => applyPreset('high_myopia')}
            className="px-2 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors whitespace-nowrap font-mono"
          >
            -6.00D 1.67
          </button>
          <button
            onClick={() => applyPreset('progressive_pal')}
            className="px-2 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-cyan-500/40 transition-colors whitespace-nowrap font-mono font-semibold"
          >
            PAL Freeform
          </button>
          <button
            onClick={() => applyPreset('bifocal_flattop')}
            className="px-2 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-amber-500/40 transition-colors whitespace-nowrap font-mono font-semibold"
          >
            Bifocal D28
          </button>
          <button
            onClick={() => applyPreset('trifocal_7x28')}
            className="px-2 py-0.5 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors whitespace-nowrap font-mono"
          >
            Trifocal 7x28
          </button>
        </div>
      </div>

      {/* Grid: 2 Columns of Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Left Column: Refractive Powers & Geometry */}
        <div className="space-y-4">
          {/* Lens Geometry Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Lens Design Type (Optik Tasarım Tipi)
            </label>
            <select
              value={params.lensType}
              onChange={e => onChange({ lensType: e.target.value as LensType })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <optgroup label="Single Vision (Tek Odaklı)">
                <option value="single_vision_spherical">Single Vision Spherical (Küresel Menisküs)</option>
                <option value="single_vision_aspheric">Single Vision Aspheric (Atorik Asferik)</option>
                <option value="toric_astigmatic">Toric / Astigmatic (Silindirik Astigmat)</option>
              </optgroup>
              <optgroup label="Multifocal &amp; Presbyopia (Çok Odaklı)">
                <option value="progressive_pal">Progressive Addition Lens (PAL Serbest Form Koridor)</option>
                <option value="bifocal_flattop">Bifocal Flat-Top D28 (Klasik D-Segment)</option>
                <option value="bifocal_round">Bifocal Round 28mm (Kryptok Yuvarlak Segment)</option>
                <option value="bifocal_executive">Bifocal Executive (Franklin Tam Bölmeli)</option>
                <option value="trifocal_7x28">Trifocal 7x28 (Ara Mesafe + Yakın Segment)</option>
              </optgroup>
            </select>
          </div>

          {/* Sphere (D) */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <span className="font-semibold text-slate-300">Sphere Power (SPH)</span>
              <span className="font-mono text-cyan-400 font-bold tabular-nums">
                {params.sphere > 0 ? `+${params.sphere.toFixed(2)}` : params.sphere.toFixed(2)} D
              </span>
            </div>
            <input
              type="range"
              min="-14.00"
              max="10.00"
              step="0.25"
              value={params.sphere}
              onChange={e => onChange({ sphere: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 bg-slate-950 rounded-lg h-2 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
              <span>-14.00 D (Severe Myopia)</span>
              <span>0.00 (Plano)</span>
              <span>+10.00 D (Hyperopia)</span>
            </div>
          </div>

          {/* Cylinder & Axis */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="font-semibold text-slate-300">Cylinder (CYL)</span>
                <span className="font-mono text-cyan-400 font-bold tabular-nums">
                  {(params.cylinder || 0).toFixed(2)} D
                </span>
              </div>
              <input
                type="range"
                min="-6.00"
                max="0.00"
                step="0.25"
                value={params.cylinder || 0}
                onChange={e => onChange({ cylinder: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 bg-slate-950 rounded-lg h-2 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="font-semibold text-slate-300">Axis (θ)</span>
                <span className="font-mono text-cyan-400 font-bold tabular-nums">
                  {params.axis || 0}°
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="180"
                step="1"
                value={params.axis || 0}
                onChange={e => onChange({ axis: parseInt(e.target.value, 10) })}
                className="w-full accent-cyan-400 bg-slate-950 rounded-lg h-2 cursor-pointer"
              />
            </div>
          </div>

          {/* Base Curve (Front Surface) */}
          <div>
            <div className="flex justify-between items-center mb-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-300">Base Curve (Front F1)</span>
                <button
                  onClick={() => onChange({ baseCurve: recommendedVogelBC })}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/40 text-[10px] text-cyan-300 hover:bg-cyan-900/80 transition-colors font-mono"
                  title="Apply Vogel's Rule for optimal zero-astigmatism base curve"
                >
                  <Wand2 className="w-2.5 h-2.5" />
                  <span>Vogel (+{recommendedVogelBC.toFixed(2)}D)</span>
                </button>
              </div>
              <span className="font-mono text-cyan-400 font-bold tabular-nums">
                +{params.baseCurve.toFixed(2)} D
              </span>
            </div>
            <input
              type="range"
              min="0.50"
              max="12.00"
              step="0.25"
              value={params.baseCurve}
              onChange={e => onChange({ baseCurve: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 bg-slate-950 rounded-lg h-2 cursor-pointer"
            />
          </div>

          {/* Multifocal / Progressive / Bifocal Parameters Block */}
          {isMultifocal && (
            <div className="p-3.5 bg-slate-950 rounded-lg border border-cyan-500/40 space-y-3">
              <div className="text-xs font-semibold text-cyan-300 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Multifocal Parametreleri ({params.lensType.replace('_', ' ')})</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Yakın Ekleme</span>
              </div>

              {/* Add Power & Corridor / Segment Height */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex justify-between text-[11px] mb-1 font-mono text-slate-300">
                    <span>Add Power (Yakın):</span>
                    <span className="text-cyan-400 font-bold">+{params.addPower?.toFixed(2)} D</span>
                  </div>
                  <input
                    type="range"
                    min="0.75"
                    max="4.00"
                    step="0.25"
                    value={params.addPower || 2.0}
                    onChange={e => onChange({ addPower: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 bg-slate-900 rounded-lg h-1.5"
                  />
                </div>

                {params.lensType === 'progressive_pal' ? (
                  <div>
                    <div className="flex justify-between text-[11px] mb-1 font-mono text-slate-300">
                      <span>Koridor Boyu:</span>
                      <span className="text-cyan-400 font-bold">{params.corridorLength} mm</span>
                    </div>
                    <input
                      type="range"
                      min="11"
                      max="18"
                      step="1"
                      value={params.corridorLength || 14}
                      onChange={e => onChange({ corridorLength: parseInt(e.target.value, 10) })}
                      className="w-full accent-cyan-400 bg-slate-900 rounded-lg h-1.5"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-[11px] mb-1 font-mono text-slate-300">
                      <span>Segment Üstü (Y):</span>
                      <span className="text-amber-400 font-bold">{params.segmentTopY ?? -2.0} mm</span>
                    </div>
                    <input
                      type="range"
                      min="-8"
                      max="2"
                      step="0.5"
                      value={params.segmentTopY ?? -2.0}
                      onChange={e => onChange({ segmentTopY: parseFloat(e.target.value) })}
                      className="w-full accent-amber-400 bg-slate-900 rounded-lg h-1.5"
                    />
                  </div>
                )}
              </div>

              {/* Nasal Inset & Segment Width */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-900">
                <div>
                  <div className="flex justify-between text-[11px] mb-1 font-mono text-slate-400">
                    <span>Nasal Inset:</span>
                    <span className="text-slate-200">{params.nasalInsetMm ?? 2.5} mm</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="4.0"
                    step="0.5"
                    value={params.nasalInsetMm ?? 2.5}
                    onChange={e => onChange({ nasalInsetMm: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-400 bg-slate-900 rounded-lg h-1.5"
                    title="Reading convergence nasal inset (standard 2.5 mm)"
                  />
                </div>

                {params.lensType !== 'progressive_pal' && params.lensType !== 'bifocal_executive' && (
                  <div>
                    <div className="flex justify-between text-[11px] mb-1 font-mono text-slate-400">
                      <span>Segment Genişliği:</span>
                      <span className="text-slate-200">{params.segmentWidthMm ?? 28} mm</span>
                    </div>
                    <input
                      type="range"
                      min="22"
                      max="38"
                      step="2"
                      value={params.segmentWidthMm ?? 28}
                      onChange={e => onChange({ segmentWidthMm: parseInt(e.target.value, 10) })}
                      className="w-full accent-amber-400 bg-slate-900 rounded-lg h-1.5"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Material, Edge Bevel & Sizing */}
        <div className="space-y-4">
          {/* Material Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Optical Material &amp; Refractive Index (n_d / Abbe V_d)
            </label>
            <select
              value={params.materialId}
              onChange={e => onChange({ materialId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {OPTICAL_MATERIALS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} — n={m.nd.toFixed(3)}, Vd={m.abbeVd}
                </option>
              ))}
            </select>
          </div>

          {/* Diameter & Sizing */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="font-semibold text-slate-300">Blank Diameter</span>
                <span className="font-mono text-cyan-400 font-bold tabular-nums">
                  {params.diameter} mm
                </span>
              </div>
              <input
                type="range"
                min="55"
                max="80"
                step="5"
                value={params.diameter}
                onChange={e => onChange({ diameter: parseInt(e.target.value, 10) })}
                className="w-full accent-cyan-400 bg-slate-950 rounded-lg h-2 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="font-semibold text-slate-300">Center Thickness</span>
                <span className="font-mono text-cyan-400 font-bold tabular-nums">
                  {params.autoCenterThickness ? 'AUTO (Safe)' : `${params.centerThickness} mm`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onChange({ autoCenterThickness: !params.autoCenterThickness })}
                  className={`flex-1 py-1 px-2 text-[11px] font-mono rounded border transition-colors ${
                    params.autoCenterThickness
                      ? 'bg-cyan-950 border-cyan-500/60 text-cyan-300 font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {params.autoCenterThickness ? '● Auto Min. Sag' : 'Manual Lock'}
                </button>
              </div>
            </div>
          </div>

          {/* Edge Bevel Profile */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Edge Bevel Profile (Edging Machine Tooling)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onChange({ bevelType: 'v_bevel' })}
                className={`py-2 px-2 text-xs rounded-lg border text-center transition-colors ${
                  params.bevelType === 'v_bevel'
                    ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-mono text-[11px]">V-Bevel 110°</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Full Rim Frame</div>
              </button>

              <button
                onClick={() => onChange({ bevelType: 'flat' })}
                className={`py-2 px-2 text-xs rounded-lg border text-center transition-colors ${
                  params.bevelType === 'flat'
                    ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-mono text-[11px]">Flat Polished</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Rimless / Drill</div>
              </button>

              <button
                onClick={() => onChange({ bevelType: 'grooved' })}
                className={`py-2 px-2 text-xs rounded-lg border text-center transition-colors ${
                  params.bevelType === 'grooved'
                    ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-mono text-[11px]">Nylor Groove</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Semi-Rimless</div>
              </button>
            </div>
          </div>

          {/* Optical Coating & Shader Type */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Surface Optical Coating (Anti-Reflective / Tint)
            </label>
            <select
              value={params.coating}
              onChange={e => onChange({ coating: e.target.value as CoatingType })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="ar_green_multi">Multi-Layer AR Coating (530nm Green Residual Sheen)</option>
              <option value="ar_blue_shield">Blue-Shield Digital AR (450nm Blue Reflection)</option>
              <option value="ar_achromatic">Achromatic Ultra-Clear AR (Neutral Broadband &lt;0.2%)</option>
              <option value="polarized_g15">Polarized G-15 Sunglass Tint (15% Transmittance)</option>
              <option value="uncoated">Uncoated Raw Glass (4.2% Fresnel Reflection)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
