import React, { useState, useMemo } from 'react';
import { LensParameters, CalculatedOptics } from '../types/optics';
import { calculateCoatingReflectanceCurve, calculateProgressiveMap, calculateSphericalSag } from '../utils/opticsMath';
import { calculateWavelengthIndex } from '../utils/materialsData';
import { LineChart, BarChart2, Shield, Eye, Layers } from 'lucide-react';

interface SpectralAndThicknessChartsProps {
  params: LensParameters;
  optics: CalculatedOptics;
}

export const SpectralAndThicknessCharts: React.FC<SpectralAndThicknessChartsProps> = ({ params, optics }) => {
  const [activeTab, setActiveTab] = useState<'coating' | 'sag' | 'dispersion' | 'progressive'>('coating');

  // 1. Coating Spectral Reflectance Curve
  const coatingData = useMemo(() => {
    return calculateCoatingReflectanceCurve(optics.material, params.coating);
  }, [optics.material, params.coating]);

  // 2. Sagitta Thickness Profile
  const sagProfileData = useMemo(() => {
    const points: { r: number; zFront: number; zBack: number; thickness: number }[] = [];
    const semiDia = params.diameter / 2.0;
    const tc = optics.calculatedCenterThickness_mm;
    const R1 = optics.r1_front_mm;
    const R2 = optics.r2_back_sphere_mm;

    for (let r = -semiDia; r <= semiDia; r += 1.0) {
      const zF = -calculateSphericalSag(R1, Math.abs(r));
      const zB = -tc - calculateSphericalSag(R2, Math.abs(r));
      const thick = zF - zB;
      points.push({ r, zFront: zF, zBack: zB, thickness: thick });
    }
    return points;
  }, [params.diameter, optics.calculatedCenterThickness_mm, optics.r1_front_mm, optics.r2_back_sphere_mm]);

  // 3. Cauchy Dispersion Curve n(lambda)
  const dispersionData = useMemo(() => {
    const points: { lambda: number; n: number }[] = [];
    for (let l = 380; l <= 780; l += 10) {
      points.push({
        lambda: l,
        n: calculateWavelengthIndex(optics.material, l)
      });
    }
    return points;
  }, [optics.material]);

  // 4. Progressive Corridor Map
  const progressiveGrid = useMemo(() => {
    return calculateProgressiveMap(params.sphere, params.addPower || 2.0, params.corridorLength || 14, 24);
  }, [params.sphere, params.addPower, params.corridorLength]);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl flex flex-col">
      {/* Tab bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800/80">
          <button
            onClick={() => setActiveTab('coating')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'coating' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            AR Coating Spectral R(λ)
          </button>
          <button
            onClick={() => setActiveTab('sag')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'sag' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sagitta Profile z(r)
          </button>
          <button
            onClick={() => setActiveTab('dispersion')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'dispersion' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cauchy Dispersion n(λ)
          </button>
          {[
            'progressive_pal',
            'bifocal_flattop',
            'bifocal_round',
            'bifocal_executive',
            'trifocal_7x28'
          ].includes(params.lensType) && (
            <button
              onClick={() => setActiveTab('progressive')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'progressive' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Multifocal Güç Haritası
            </button>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400 hidden sm:block">
          {activeTab === 'coating' && `Residual Reflectance: ${params.coating}`}
          {activeTab === 'sag' && `tc: ${optics.calculatedCenterThickness_mm.toFixed(2)} mm / te: ${optics.calculatedMinEdgeThickness_mm.toFixed(2)} mm`}
          {activeTab === 'dispersion' && `Abbe Vd = ${optics.material.abbeVd} · Δn = ${optics.abbeDispersionIndexSpread.toFixed(4)}`}
          {activeTab === 'progressive' && `Add: +${params.addPower?.toFixed(2)} D · Corridor: ${params.corridorLength} mm`}
        </div>
      </div>

      {/* Tab Content 1: AR Coating Reflectance Curve */}
      {activeTab === 'coating' && (
        <div className="space-y-3">
          <div className="h-56 w-full relative">
            <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
              {/* Spectral gradient background */}
              <defs>
                <linearGradient id="spectrumGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
                  <stop offset="18%" stopColor="#2563eb" stopOpacity="0.15" />
                  <stop offset="38%" stopColor="#06b6d4" stopOpacity="0.15" />
                  <stop offset="55%" stopColor="#22c55e" stopOpacity="0.15" />
                  <stop offset="72%" stopColor="#eab308" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.15" />
                </linearGradient>
              </defs>
              <rect x="40" y="10" width="440" height="160" fill="url(#spectrumGradient)" rx="4" />

              {/* Grid Lines */}
              {[0, 25, 50, 75, 100].map(pct => {
                const y = 170 - (pct / 100) * 160;
                return (
                  <g key={pct}>
                    <line x1="40" y1={y} x2="480" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                    <text x="35" y={y + 3} textAnchor="end" fill="#64748b" fontSize="9" fontFamily="monospace">
                      {(pct * 0.1).toFixed(1)}%
                    </text>
                  </g>
                );
              })}

              {/* Wavelength Grid Labels */}
              {[400, 450, 500, 550, 600, 650, 700, 750].map(wl => {
                const x = 40 + ((wl - 380) / 400) * 440;
                return (
                  <g key={wl}>
                    <line x1={x} y1="10" x2={x} y2="170" stroke="#1e293b" strokeDasharray="3 3" />
                    <text x={x} y="185" textAnchor="middle" fill="#64748b" fontSize="9" fontFamily="monospace">
                      {wl}nm
                    </text>
                  </g>
                );
              })}

              {/* Reflectance Line Plot */}
              {(() => {
                const maxRefl = 10.0; // scale up to 10%
                const pathD = coatingData.map((d, i) => {
                  const x = 40 + ((d.wavelength - 380) / 400) * 440;
                  const y = 170 - (Math.min(maxRefl, d.reflectance) / maxRefl) * 160;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ');

                return (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                );
              })()}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 font-mono px-2">
            <span>Violet (380nm)</span>
            <span className="text-cyan-400 font-semibold">Green Minimum: 530nm (R &lt; 0.35%)</span>
            <span>Near IR (780nm)</span>
          </div>
        </div>
      )}

      {/* Tab Content 2: Sagitta Profile */}
      {activeTab === 'sag' && (
        <div className="space-y-3">
          <div className="h-56 w-full relative">
            <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
              {/* Background grid */}
              <rect x="40" y="10" width="440" height="160" fill="#0b0f19" rx="4" />
              
              {/* Optical center line */}
              <line x1="260" y1="10" x2="260" y2="170" stroke="#06b6d4" strokeDasharray="4 4" strokeWidth="1.5" />
              <text x="260" y="186" textAnchor="middle" fill="#06b6d4" fontSize="9" fontFamily="monospace">
                Center (0 mm)
              </text>

              {/* Front curve & Back curve */}
              {(() => {
                const semiDia = params.diameter / 2.0;
                const minZ = Math.min(...sagProfileData.map(p => p.zBack));
                const maxZ = Math.max(...sagProfileData.map(p => p.zFront));
                const rangeZ = Math.max(4, maxZ - minZ);

                const frontPath = sagProfileData.map((d, i) => {
                  const x = 40 + ((d.r + semiDia) / (2 * semiDia)) * 440;
                  const y = 30 + ((maxZ - d.zFront) / rangeZ) * 120;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ');

                const backPath = sagProfileData.map((d, i) => {
                  const x = 40 + ((d.r + semiDia) / (2 * semiDia)) * 440;
                  const y = 30 + ((maxZ - d.zBack) / rangeZ) * 120;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ');

                return (
                  <g>
                    <path d={frontPath} fill="none" stroke="#22c55e" strokeWidth="2.5" />
                    <path d={backPath} fill="none" stroke="#ef4444" strokeWidth="2.5" />
                  </g>
                );
              })()}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs font-mono px-2 text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-1 bg-green-500 inline-block rounded-sm"></span>
              <span>Front Surface Sag F1 (+{optics.frontPowerD.toFixed(2)} D)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-1 bg-red-500 inline-block rounded-sm"></span>
              <span>Back Surface Sag F2 ({optics.backPowerSphereD.toFixed(2)} D)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 3: Cauchy Dispersion */}
      {activeTab === 'dispersion' && (
        <div className="space-y-3">
          <div className="h-56 w-full relative">
            <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
              <rect x="40" y="10" width="440" height="160" fill="#0b0f19" rx="4" />
              
              {/* Plot dispersion line */}
              {(() => {
                const minN = optics.material.nC - 0.005;
                const maxN = optics.material.nF + 0.015;
                const pathD = dispersionData.map((d, i) => {
                  const x = 40 + ((d.lambda - 380) / 400) * 440;
                  const y = 170 - ((d.n - minN) / (maxN - minN)) * 160;
                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }).join(' ');

                return (
                  <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                );
              })()}
            </svg>
          </div>

          <div className="flex items-center justify-between text-xs font-mono px-2 text-slate-400">
            <span>n_F (486.1nm) = {optics.material.nF.toFixed(4)}</span>
            <span className="text-amber-400 font-semibold">n_d (587.6nm) = {optics.material.nd.toFixed(4)}</span>
            <span>n_C (656.3nm) = {optics.material.nC.toFixed(4)}</span>
          </div>
        </div>
      )}

      {/* Tab Content 4: Progressive Corridor Heatmap */}
      {activeTab === 'progressive' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Mean Power Corridor */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-xs font-mono text-slate-300 font-semibold mb-2">
                Mean Power Distribution (Diopters)
              </div>
              <div className="grid grid-cols-24 gap-[1px] aspect-square w-full">
                {progressiveGrid.map((cell, idx) => {
                  const addFrac = Math.max(0, (cell.meanPower - params.sphere) / (params.addPower || 2.0));
                  const hue = 200 - addFrac * 160; // 200 (cyan/blue) to 40 (amber/red)
                  return (
                    <div
                      key={idx}
                      className="w-full h-full rounded-[1px]"
                      style={{ backgroundColor: `hsl(${hue}, 85%, ${35 + addFrac * 25}%)` }}
                      title={`(${cell.x.toFixed(1)}mm, ${cell.y.toFixed(1)}mm): ${cell.meanPower.toFixed(2)} D`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
                <span>Distance: {params.sphere.toFixed(2)}D</span>
                <span>Near Add: +{(params.sphere + (params.addPower || 2)).toFixed(2)}D</span>
              </div>
            </div>

            {/* Unwanted Surface Astigmatism (Minkwitz Lobes) */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="text-xs font-mono text-slate-300 font-semibold mb-2">
                Unwanted Astigmatism (Minkwitz Aberration)
              </div>
              <div className="grid grid-cols-24 gap-[1px] aspect-square w-full">
                {progressiveGrid.map((cell, idx) => {
                  const astigFrac = Math.min(1.0, cell.unwantedAstigmatism / (params.addPower || 2.0));
                  const hue = 140 - astigFrac * 140; // 140 (green: zero astig) to 0 (red: high astig)
                  return (
                    <div
                      key={idx}
                      className="w-full h-full rounded-[1px]"
                      style={{ backgroundColor: `hsl(${hue}, 80%, ${20 + astigFrac * 35}%)` }}
                      title={`Astigmatism: ${cell.unwantedAstigmatism.toFixed(2)} D`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
                <span className="text-emerald-400">Clear Corridor (&lt;0.25D)</span>
                <span className="text-rose-400">Lateral Lobes</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
