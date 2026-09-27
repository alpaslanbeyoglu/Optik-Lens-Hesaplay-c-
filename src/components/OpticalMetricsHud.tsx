import React from 'react';
import { CalculatedOptics, LensParameters } from '../types/optics';
import { Gauge, ShieldAlert, Cpu, Sparkles, Scale, Crosshair } from 'lucide-react';

interface OpticalMetricsHudProps {
  optics: CalculatedOptics;
  params: LensParameters;
}

export const OpticalMetricsHud: React.FC<OpticalMetricsHudProps> = ({ optics, params }) => {
  const isEdgeTooThin = optics.calculatedMinEdgeThickness_mm < 1.0;
  const isCenterTooThin = optics.calculatedCenterThickness_mm < optics.material.fdaMinCenterThickness;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Equivalent Power */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>EQUIV. POWER</span>
          <span className="text-cyan-400">F_tot</span>
        </div>
        <div className="mt-1.5 flex items-baseline">
          <span className="text-2xl font-bold font-mono text-cyan-400 tabular-nums">
            {optics.totalEquivalentPowerD > 0 ? `+${optics.totalEquivalentPowerD.toFixed(2)}` : optics.totalEquivalentPowerD.toFixed(2)}
          </span>
          <span className="text-xs font-mono text-slate-500 ml-1.5 uppercase">D</span>
        </div>
        <div className="text-[10px] font-mono text-slate-500 truncate mt-1">
          F1: +{optics.frontPowerD.toFixed(2)}D · F2: {optics.backPowerSphereD.toFixed(2)}D
        </div>
      </div>

      {/* 2. Effective Focal Length */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>FOCAL LENGTH</span>
          <span className="text-amber-400">EFL</span>
        </div>
        <div className="mt-1.5 flex items-baseline">
          <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {Math.abs(optics.effectiveFocalLength_mm) > 9999 ? '∞' : Math.abs(optics.effectiveFocalLength_mm).toFixed(1)}
          </span>
          <span className="text-xs font-mono text-slate-500 ml-1.5 uppercase">mm</span>
        </div>
        <div className="text-[10px] font-mono text-slate-500 truncate mt-1">
          BFL: {Math.abs(optics.backFocalLength_mm) > 9999 ? '∞' : optics.backFocalLength_mm.toFixed(1)} mm
        </div>
      </div>

      {/* 3. Center & Edge Thickness */}
      <div className={`border rounded-xl p-3.5 flex flex-col justify-between ${
        isEdgeTooThin || isCenterTooThin
          ? 'bg-amber-950/20 border-amber-500/40'
          : 'bg-slate-900/90 border-slate-800/80'
      }`}>
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>THICKNESS</span>
          {(isEdgeTooThin || isCenterTooThin) && <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
        </div>
        <div className="mt-1.5 flex items-baseline">
          <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {optics.calculatedCenterThickness_mm.toFixed(2)}
          </span>
          <span className="text-xs font-mono text-slate-500 ml-1.5 uppercase">mm tc</span>
        </div>
        <div className="text-[10px] font-mono text-slate-400 truncate mt-1">
          Edge Min: <span className="font-semibold text-slate-200">{optics.calculatedMinEdgeThickness_mm.toFixed(2)} mm</span>
        </div>
      </div>

      {/* 4. Lens Mass & Density */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>MASS / WEIGHT</span>
          <Scale className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="mt-1.5 flex items-baseline">
          <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {optics.lensWeight_grams.toFixed(1)}
          </span>
          <span className="text-xs font-mono text-slate-500 ml-1.5 uppercase">g</span>
        </div>
        <div className="text-[10px] font-mono text-slate-500 truncate mt-1">
          Vol: {optics.lensVolume_cm3.toFixed(2)} cm³ · ρ={optics.material.density}
        </div>
      </div>

      {/* 5. Abbe Dispersion & LCA */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>ABBE DISPERSION</span>
          <span className="text-cyan-400">V_d</span>
        </div>
        <div className="mt-1.5 flex items-baseline">
          <span className="text-2xl font-bold font-mono text-slate-100 tabular-nums">
            {optics.material.abbeVd.toFixed(1)}
          </span>
          <span className="text-xs font-mono text-slate-500 ml-1.5 uppercase">Vd</span>
        </div>
        <div className="text-[10px] font-mono text-slate-500 truncate mt-1">
          LCA: {Math.abs(optics.longitudinalChromaticAberration_D).toFixed(3)} D
        </div>
      </div>

      {/* 6. Base Curve Optimization */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
        <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>VOGEL BASE CURVE</span>
          <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="mt-1.5 flex items-baseline">
          <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            +{optics.recommendedBaseCurveVogel.toFixed(2)}
          </span>
          <span className="text-xs font-mono text-slate-500 ml-1.5 uppercase">D</span>
        </div>
        <div className="text-[10px] font-mono text-slate-500 truncate mt-1">
          Current BC: +{params.baseCurve.toFixed(2)} D
        </div>
      </div>
    </div>
  );
};
