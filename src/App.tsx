import React, { useState, useMemo } from 'react';
import { LensParameters } from './types/optics';
import { calculateLensOptics } from './utils/opticsMath';
import { ThreeLensViewer } from './components/ThreeLensViewer';
import { RaytraceCanvas } from './components/RaytraceCanvas';
import { OpticalMetricsHud } from './components/OpticalMetricsHud';
import { PrescriptionControls } from './components/PrescriptionControls';
import { SpectralAndThicknessCharts } from './components/SpectralAndThicknessCharts';
import { BlenderAddonExporter } from './components/BlenderAddonExporter';
import { AiOpticsAdvisor } from './components/AiOpticsAdvisor';
import { ChromaticAberrationVisualizer } from './components/ChromaticAberrationVisualizer';
import {
  Glasses,
  Download,
  Terminal,
  Activity,
  Layers,
  BookOpen,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function App() {
  // Default Prescription: -4.50 D Myopia with -1.25 D Astigmatism on MR-8 1.60 material
  const [params, setParams] = useState<LensParameters>({
    sphere: -4.50,
    cylinder: -1.25,
    axis: 180,
    baseCurve: 3.25,
    lensType: 'toric_astigmatic',
    diameter: 70,
    centerThickness: 1.4,
    autoCenterThickness: true,
    minEdgeThickness: 1.2,
    materialId: 'mr8_160',
    bevelType: 'v_bevel',
    coating: 'ar_green_multi',
    addPower: 2.00,
    corridorLength: 14
  });

  const [activeSection, setActiveSection] = useState<'cad_workbench' | 'raytracing' | 'blender_addon' | 'docs'>('cad_workbench');

  // Real-time Optical Physics Engine Calculations
  const calculatedOptics = useMemo(() => {
    return calculateLensOptics(params);
  }, [params]);

  const handleParamChange = (updated: Partial<LensParameters>) => {
    setParams(prev => ({ ...prev, ...updated }));
  };

  const handleApplyVogel = () => {
    setParams(prev => ({ ...prev, baseCurve: calculatedOptics.recommendedBaseCurveVogel }));
  };

  const handleApplyHigherIndex = (materialId: string) => {
    setParams(prev => ({ ...prev, materialId }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* 1. TOP BAR CONTRACT (Strict 3-Zone Contract) */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5">
          <Glasses className="w-5 h-5 text-cyan-400" />
          <span className="text-lg font-bold tracking-tight text-slate-100 font-mono">
            OphthalmicOptics CAD
          </span>
        </div>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveSection('cad_workbench')}
            className={`transition-colors hover:text-slate-200 ${
              activeSection === 'cad_workbench' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-1' : ''
            }`}
          >
            3D Lens CAD
          </button>
          <button
            onClick={() => setActiveSection('raytracing')}
            className={`transition-colors hover:text-slate-200 ${
              activeSection === 'raytracing' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-1' : ''
            }`}
          >
            Snell Ray Tracing
          </button>
          <button
            onClick={() => setActiveSection('blender_addon')}
            className={`transition-colors hover:text-slate-200 ${
              activeSection === 'blender_addon' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-1' : ''
            }`}
          >
            Blender Eklentisi (.py)
          </button>
          <button
            onClick={() => setActiveSection('docs')}
            className={`transition-colors hover:text-slate-200 ${
              activeSection === 'docs' ? 'text-cyan-400 font-semibold border-b-2 border-cyan-400 pb-1' : ''
            }`}
          >
            Optik Formüller
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveSection('blender_addon')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-sm transition-colors whitespace-nowrap font-mono"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Blender'a Aktar</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Real-time Optical Telemetry & Metrics HUD */}
        <OpticalMetricsHud optics={calculatedOptics} params={params} />

        {/* SECTION 1: 3D CAD WORKBENCH & PRESCRIPTION */}
        {activeSection === 'cad_workbench' && (
          <div className="space-y-6">
            {/* Split View: 3D Viewport on Left, Prescription Controls on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 3D WebGL Parametric Lens Viewport */}
              <div className="lg:col-span-7">
                <ThreeLensViewer params={params} optics={calculatedOptics} />
              </div>

              {/* Prescription & Geometry Controls */}
              <div className="lg:col-span-5">
                <PrescriptionControls
                  params={params}
                  onChange={handleParamChange}
                  recommendedVogelBC={calculatedOptics.recommendedBaseCurveVogel}
                />
              </div>
            </div>

            {/* Chromatic Aberration & Abbe Dispersion Visualizer */}
            <ChromaticAberrationVisualizer
              params={params}
              optics={calculatedOptics}
              onSelectMaterial={handleApplyHigherIndex}
            />

            {/* AI Optics Advisor & Verification */}
            <AiOpticsAdvisor
              params={params}
              optics={calculatedOptics}
              onApplyVogel={handleApplyVogel}
              onApplyHigherIndex={handleApplyHigherIndex}
            />

            {/* Spectral & Thickness Profiles */}
            <SpectralAndThicknessCharts params={params} optics={calculatedOptics} />
          </div>
        )}

        {/* SECTION 2: 2D SNELL'S LAW RAY TRACING & WAVEFRONT */}
        {activeSection === 'raytracing' && (
          <div className="space-y-6">
            <RaytraceCanvas params={params} optics={calculatedOptics} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PrescriptionControls
                params={params}
                onChange={handleParamChange}
                recommendedVogelBC={calculatedOptics.recommendedBaseCurveVogel}
              />
              <SpectralAndThicknessCharts params={params} optics={calculatedOptics} />
            </div>
          </div>
        )}

        {/* SECTION 3: BLENDER PYTHON ADD-ON EXPORTER */}
        {activeSection === 'blender_addon' && (
          <div className="space-y-6">
            <BlenderAddonExporter params={params} optics={calculatedOptics} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ThreeLensViewer params={params} optics={calculatedOptics} />
              <PrescriptionControls
                params={params}
                onChange={handleParamChange}
                recommendedVogelBC={calculatedOptics.recommendedBaseCurveVogel}
              />
            </div>
          </div>
        )}

        {/* SECTION 4: DOCUMENTATION & OPTICAL PHYSICS FORMULAS */}
        {activeSection === 'docs' && (
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-6 shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-bold text-slate-100">
                  GÖZLÜK CAMI TASARIMI &amp; FİZİKSEL OPTİK DOKÜMANTASYONU
                </h2>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Eklentinin ve simülatörün kullandığı matematiksel denklemler, optik standartlar ve Blender Cycles render ilkeleri.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-300">
              {/* Card 1: Thick Lensmaker's Equation */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <h3 className="font-semibold text-cyan-400 text-sm">1. Kalın Mercek Denklemi (Thick Lens Equation)</h3>
                <p className="text-slate-400 leading-relaxed">
                  Gözlük camları kalınlık (tc) içerdiği için ince mercek yaklaşımı yerine tam kalın mercek formülü uygulanır:
                </p>
                <div className="p-2.5 bg-slate-900 rounded font-mono text-cyan-300 text-[11px]">
                  F = F1 + F2 - (t / n) · F1 · F2
                </div>
                <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
                  <li><strong className="text-slate-200">F1:</strong> Ön yüz kırma gücü (Base Curve) = (n - 1) / R1</li>
                  <li><strong className="text-slate-200">F2:</strong> Arka yüz kırma gücü = (1 - n) / R2</li>
                  <li><strong className="text-slate-200">t:</strong> Merkez kalınlığı (metre cinsinden)</li>
                  <li><strong className="text-slate-200">n:</strong> Materyalin 587.6 nm (d-line) kırılma indisi</li>
                </ul>
              </div>

              {/* Card 2: Sagitta Mathematics */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <h3 className="font-semibold text-cyan-400 text-sm">2. Sagitta (Derinlik) &amp; Kenar Kalınlığı Hesabı</h3>
                <p className="text-slate-400 leading-relaxed">
                  Blender BMesh yüzey noktalarının Z koordinatları tam küresel ve asferik sagitta formülüyle hesaplanır:
                </p>
                <div className="p-2.5 bg-slate-900 rounded font-mono text-cyan-300 text-[11px]">
                  s(y) = R - √(R² - y²) = (c · y²) / [1 + √(1 - (1+K)·c²·y²)]
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Kenar kalınlığı (te): <span className="text-slate-200 font-mono">te = tc - s_front + s_back</span>
                </p>
              </div>

              {/* Card 3: Cauchy Spectral Dispersion */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <h3 className="font-semibold text-cyan-400 text-sm">3. Cauchy Işık Kırılması (Chromatic Dispersion)</h3>
                <p className="text-slate-400 leading-relaxed">
                  Blender Cycles shader'ında kırmızı (656.3 nm), sarı (587.6 nm) ve mavi (486.1 nm) dalga boyları için Abbe sayısına göre kırılma indisi ayrıştırılır:
                </p>
                <div className="p-2.5 bg-slate-900 rounded font-mono text-cyan-300 text-[11px]">
                  n(λ) = A + B / λ² + C / λ⁴
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Abbe Sayısı Vd = (nd - 1) / (nF - nC). Yüksek Abbe değeri (örn: CR-39 Vd=58), minimum renk saçılması demektir.
                </p>
              </div>

              {/* Card 4: Vogel's Rule & Tscherning Ellipse */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
                <h3 className="font-semibold text-cyan-400 text-sm">4. Vogel Taban Eğrisi Kuralı (Base Curve Optimization)</h3>
                <p className="text-slate-400 leading-relaxed">
                  Gözün bakış ekseni camın merkezinden saptığında marjinal astigmatizmayı sıfırlayan optimal taban eğrisi seçimi:
                </p>
                <div className="p-2.5 bg-slate-900 rounded font-mono text-cyan-300 text-[11px]">
                  Artı Camlar için: BC = SPH + 6.00 D<br />
                  Eksi Camlar için: BC = (SPH / 2) + 6.00 D
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500 font-mono">
        <span>OphthalmicOptics CAD Studio · Blender 4.x / 5.x Python Add-on &amp; Photorealistic Cycles Spectral Raytracing</span>
      </footer>
    </div>
  );
}
