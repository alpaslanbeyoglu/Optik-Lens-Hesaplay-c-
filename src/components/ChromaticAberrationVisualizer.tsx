import React, { useState, useMemo } from 'react';
import { LensParameters, CalculatedOptics } from '../types/optics';
import { OPTICAL_MATERIALS } from '../utils/materialsData';
import { Eye, Sparkles, Sliders, AlertTriangle, CheckCircle2, Layers, ZoomIn, Info } from 'lucide-react';

interface ChromaticAberrationVisualizerProps {
  params: LensParameters;
  optics: CalculatedOptics;
  onSelectMaterial?: (materialId: string) => void;
}

export const ChromaticAberrationVisualizer: React.FC<ChromaticAberrationVisualizerProps> = ({
  params,
  optics,
  onSelectMaterial
}) => {
  // Gaze distance from optical center (mm) - from 0 (optical center) to blank radius (e.g. 30mm)
  const maxGazeMm = params.diameter / 2.0;
  const [gazeDistanceMm, setGazeDistanceMm] = useState<number>(20.0);
  const [testTarget, setTestTarget] = useState<'text' | 'edge' | 'star' | 'siemens'>('text');
  const [magnification, setMagnification] = useState<number>(2.5);

  // Physics calculations for Chromatic Aberration at gaze distance:
  // Prentice's Rule: Prism Diopter Δ = Decentration_cm * Equivalent_Power_D
  const gazeCm = gazeDistanceMm / 10.0;
  const totalPower = optics.totalEquivalentPowerD;
  const prismDiopters = Math.abs(gazeCm * totalPower);

  // Transverse Chromatic Aberration (TCA) in Prism Diopters: TCA = Δ / Vd
  const abbeVd = optics.material.abbeVd;
  const tca_prism = abbeVd > 0 ? prismDiopters / abbeVd : 0;

  // Angular color spread in arcminutes (1 Prism Diopter = ~34.38 arcminutes = 0.573 degrees)
  const angularSpreadArcmin = tca_prism * 34.38;

  // Retinal blur circle diameter in micrometers (assumes standard eye nodal distance = 17mm)
  // Blur_um = 17000 um * tan(angularSpread in radians)
  const angularSpreadRad = (angularSpreadArcmin / 60.0) * (Math.PI / 180.0);
  const retinalBlurUm = Math.round(17000.0 * Math.tan(angularSpreadRad) * 10.0) / 10.0;

  // Pixel shift on display simulation (proportional to TCA and magnification)
  const pixelShift = Math.min(18, tca_prism * 14 * magnification);

  // Estimated Snellen Visual Acuity degradation due to peripheral chromatic dispersion
  // 1 arcminute resolution = 20/20. With chromatic blur, effective resolution decreases
  const effectiveArcmin = Math.max(1.0, 1.0 + angularSpreadArcmin * 0.45);
  const snellenDenominator = Math.round(20 * effectiveArcmin);

  // Perceived Edge Sharpness Score (100% = Diffraction limited, down to ~40% for severe blur)
  const edgeSharpnessPercent = Math.max(25, Math.round(100 - tca_prism * 95));

  // Material benchmark comparison list
  const materialComparison = useMemo(() => {
    return OPTICAL_MATERIALS.map(mat => {
      const matTca = (gazeCm * Math.abs(totalPower)) / mat.abbeVd;
      const matBlur = Math.round(17000.0 * Math.tan((matTca * 34.38 / 60.0) * (Math.PI / 180.0)) * 10.0) / 10.0;
      const matSharpness = Math.max(25, Math.round(100 - matTca * 95));
      return {
        ...mat,
        tca: matTca,
        blurUm: matBlur,
        sharpness: matSharpness,
        isCurrent: mat.id === optics.material.id
      };
    }).sort((a, b) => b.abbeVd - a.abbeVd);
  }, [gazeCm, totalPower, optics.material.id]);

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold tracking-wide text-slate-100">
              ABBE DEĞERİ &amp; KROMATİK ABERASYON (EDGE SHARPNESS &amp; COLOR FRINGING)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Göz bakış açısı camın merkezinden kenarlara kaydıkça (Off-Axis), prizmatik kırılma ve Abbe sayısı ($V_d$) nedeniyle dalga boyları ayrışarak kenar netliğinde renk saçılmasına (halo) yol açar.
          </p>
        </div>

        {/* Current Abbe Badge */}
        <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
          <span className="text-slate-400">Aktif Materyal:</span>
          <span className="text-cyan-400 font-bold">{optics.material.code}</span>
          <span className="text-slate-600">|</span>
          <span className="text-amber-400 font-bold">V_d = {optics.material.abbeVd.toFixed(1)}</span>
        </div>
      </div>

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visual Simulation Viewport (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Target Controls & Zoom */}
          <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            {/* Target Select Buttons */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-slate-400 mr-1.5 hidden sm:inline">Test Hedefi:</span>
              <button
                onClick={() => setTestTarget('text')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  testTarget === 'text' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Snellen Metin
              </button>
              <button
                onClick={() => setTestTarget('edge')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  testTarget === 'edge' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Yüksek Kontrast Kenar
              </button>
              <button
                onClick={() => setTestTarget('star')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  testTarget === 'star' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Nokta Işık (PSF)
              </button>
              <button
                onClick={() => setTestTarget('siemens')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  testTarget === 'siemens' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Siemens Yıldızı
              </button>
            </div>

            {/* Magnification */}
            <div className="flex items-center gap-1 text-xs font-mono text-slate-400">
              <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
              <span>{magnification}x</span>
              <input
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={magnification}
                onChange={e => setMagnification(parseFloat(e.target.value))}
                className="w-16 accent-cyan-400 bg-slate-900 h-1.5 cursor-pointer ml-1"
                title="Büyütme Faktörü"
              />
            </div>
          </div>

          {/* Optical Through-The-Lens Simulation Display */}
          <div className="relative w-full h-64 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center select-none">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

            {/* Simulated RGB Chromatic Fringe Rendering */}
            <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center">
              {testTarget === 'text' && (
                <div className="space-y-2">
                  {/* High Contrast Letter with RGB Sub-Pixel Shift */}
                  <div className="relative inline-block">
                    {/* Red wavelength layer (656.3nm) */}
                    <span
                      className="absolute font-black tracking-widest text-red-500 transition-transform duration-75 select-none"
                      style={{
                        fontSize: `${42 * (magnification * 0.5 + 0.5)}px`,
                        transform: `translate(${pixelShift}px, 0px)`,
                        opacity: pixelShift > 0.3 ? 0.75 : 0,
                        filter: 'blur(0.8px)',
                        mixBlendMode: 'screen'
                      }}
                    >
                      E P T O Z
                    </span>

                    {/* Blue wavelength layer (486.1nm) */}
                    <span
                      className="absolute font-black tracking-widest text-cyan-400 transition-transform duration-75 select-none"
                      style={{
                        fontSize: `${42 * (magnification * 0.5 + 0.5)}px`,
                        transform: `translate(${-pixelShift * 0.9}px, 0px)`,
                        opacity: pixelShift > 0.3 ? 0.8 : 0,
                        filter: 'blur(0.8px)',
                        mixBlendMode: 'screen'
                      }}
                    >
                      E P T O Z
                    </span>

                    {/* Main High-Contrast White Core */}
                    <span
                      className="relative font-black tracking-widest text-slate-100 select-none block"
                      style={{
                        fontSize: `${42 * (magnification * 0.5 + 0.5)}px`,
                        filter: `blur(${Math.max(0, (pixelShift - 1) * 0.2)}px)`
                      }}
                    >
                      E P T O Z
                    </span>
                  </div>

                  {/* Subline */}
                  <div className="text-[11px] font-mono text-slate-400 flex items-center justify-center gap-3 pt-1">
                    <span>Eşdeğer Keskinlik: <strong className="text-cyan-400">20/{snellenDenominator}</strong></span>
                    <span className="text-slate-600">·</span>
                    <span>Renk Saçılması: <strong className="text-amber-400">{pixelShift.toFixed(1)} px</strong></span>
                  </div>
                </div>
              )}

              {testTarget === 'edge' && (
                <div className="w-full max-w-xs space-y-2">
                  <div className="h-28 w-full bg-slate-900 border border-slate-800 relative rounded-lg overflow-hidden flex">
                    {/* Left half: Solid white slit */}
                    <div className="w-1/2 h-full bg-white relative">
                      {/* Red fringe bleed on the right edge */}
                      {pixelShift > 0.5 && (
                        <div
                          className="absolute right-0 top-0 bottom-0 bg-red-500 blur-[1px] opacity-80"
                          style={{ width: `${pixelShift * 2}px`, transform: 'translateX(50%)' }}
                        />
                      )}
                    </div>
                    {/* Right half: Dark field */}
                    <div className="w-1/2 h-full bg-slate-950 relative">
                      {/* Blue fringe bleed on the dark edge */}
                      {pixelShift > 0.5 && (
                        <div
                          className="absolute left-0 top-0 bottom-0 bg-cyan-400 blur-[1px] opacity-80"
                          style={{ width: `${pixelShift * 2}px`, transform: 'translateX(-50%)' }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 text-center">
                    Bıçak Ağzı (Knife-Edge) Keskinlik Ayrışması · Retinal Dağılım: <strong className="text-cyan-400">{retinalBlurUm} µm</strong>
                  </div>
                </div>
              )}

              {testTarget === 'star' && (
                <div className="flex flex-col items-center space-y-3">
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* Red flare */}
                    <div
                      className="absolute w-8 h-8 rounded-full bg-red-500/60 blur-md transition-transform"
                      style={{ transform: `translateX(${pixelShift * 2.5}px)` }}
                    />
                    {/* Blue flare */}
                    <div
                      className="absolute w-8 h-8 rounded-full bg-cyan-400/60 blur-md transition-transform"
                      style={{ transform: `translateX(${-pixelShift * 2.5}px)` }}
                    />
                    {/* Core spot */}
                    <div
                      className="w-4 h-4 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                      style={{ transform: `scale(${1 + pixelShift * 0.1})` }}
                    />
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Noktasal Yayılım Fonksiyonu (PSF) · Açısal Ayrışma: <strong className="text-amber-400">{angularSpreadArcmin.toFixed(2)}' (arcmin)</strong>
                  </div>
                </div>
              )}

              {testTarget === 'siemens' && (
                <div className="flex flex-col items-center space-y-2">
                  <div className="relative w-24 h-24 rounded-full border border-slate-700 overflow-hidden flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full animate-pulse">
                      {[...Array(16)].map((_, i) => (
                        <path
                          key={i}
                          d={`M 50 50 L ${50 + 50 * Math.cos((i * 22.5 * Math.PI) / 180)} ${50 + 50 * Math.sin((i * 22.5 * Math.PI) / 180)} A 50 50 0 0 1 ${50 + 50 * Math.cos(((i * 22.5 + 11.25) * Math.PI) / 180)} ${50 + 50 * Math.sin(((i * 22.5 + 11.25) * Math.PI) / 180)} Z`}
                          fill={i % 2 === 0 ? '#ffffff' : '#090d16'}
                        />
                      ))}
                    </svg>
                    {pixelShift > 1.0 && (
                      <div
                        className="absolute inset-0 rounded-full border-2 border-cyan-400/40 pointer-events-none"
                        style={{ filter: `blur(${pixelShift * 0.5}px)` }}
                      />
                    )}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Radyal Çözünürlük Sınırı (Siemens Star)
                  </div>
                </div>
              )}
            </div>

            {/* Position Indicator HUD */}
            <div className="absolute top-2.5 left-3 text-[10px] font-mono text-slate-400 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded border border-slate-800">
              Göz Ekseni Mesafesi: <span className="text-cyan-400 font-bold">{gazeDistanceMm} mm</span> {gazeDistanceMm === 0 ? '(Optik Merkez)' : '(Kenar Görüşü)'}
            </div>

            <div className="absolute top-2.5 right-3 text-[10px] font-mono text-slate-400 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded border border-slate-800">
              Prizmatik Etki (Δ): <span className="text-amber-400 font-bold">{prismDiopters.toFixed(2)} Δ</span>
            </div>
          </div>

          {/* Gaze Distance Slider */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-300 font-semibold">Göz Bakış Açısı / Camın Merkezinden Uzaklık (y)</span>
              <span className="text-cyan-400 font-bold tabular-nums">{gazeDistanceMm.toFixed(1)} mm / {maxGazeMm} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max={maxGazeMm}
              step="1"
              value={gazeDistanceMm}
              onChange={e => setGazeDistanceMm(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 bg-slate-900 rounded-lg h-2 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>0 mm (Optik Merkez - Sıfır Aberasyon)</span>
              <span>15 mm (Standart Göz Hareketi)</span>
              <span>{maxGazeMm} mm (Maksimum Kenar Çerçevesi)</span>
            </div>
          </div>
        </div>

        {/* Right Column: Physical Metrics & Material Comparison Matrix (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Key Optical Telemetry Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono uppercase text-slate-400">ENİNE KROMATİK ABERASYON (TCA)</div>
              <div className="text-xl font-bold font-mono text-cyan-400 tabular-nums">
                {tca_prism.toFixed(3)} <span className="text-xs text-slate-500">Δ</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                TCA = Δ / V_d ({prismDiopters.toFixed(2)} / {optics.material.abbeVd})
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="text-[10px] font-mono uppercase text-slate-400">KENAR NETLİK SKORU</div>
              <div className={`text-xl font-bold font-mono tabular-nums ${
                edgeSharpnessPercent >= 80 ? 'text-emerald-400' : edgeSharpnessPercent >= 60 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                %{edgeSharpnessPercent} <span className="text-xs text-slate-500">Netlik</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500">
                {edgeSharpnessPercent >= 80 ? 'Kristal Netlik' : edgeSharpnessPercent >= 60 ? 'Hafif Renk Saçılması' : 'Belirgin Renk Halesi'}
              </div>
            </div>
          </div>

          {/* Material Abbe Ranking Benchmark List */}
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200 border-b border-slate-800/80 pb-2">
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Materyal Abbe Değerleri ve {gazeDistanceMm}mm'deki Netlik</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Abbe (V_d)</span>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {materialComparison.map(mat => (
                <div
                  key={mat.id}
                  onClick={() => onSelectMaterial && onSelectMaterial(mat.id)}
                  className={`p-2 rounded-lg border text-xs font-mono flex items-center justify-between transition-all cursor-pointer ${
                    mat.isCurrent
                      ? 'bg-cyan-950/60 border-cyan-500/60 text-cyan-200 font-bold shadow-sm'
                      : 'bg-slate-900/60 border-slate-800/60 text-slate-300 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      mat.abbeVd >= 50 ? 'bg-emerald-400' : mat.abbeVd >= 40 ? 'bg-cyan-400' : mat.abbeVd >= 35 ? 'bg-amber-400' : 'bg-rose-400'
                    }`} />
                    <span className="truncate max-w-[130px]">{mat.name.split('(')[0]}</span>
                    {mat.isCurrent && <span className="text-[9px] bg-cyan-500 text-slate-950 px-1 py-0.2 rounded font-sans uppercase">Aktif</span>}
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-slate-400">Vd: <strong className="text-slate-100">{mat.abbeVd}</strong></span>
                    <span className={`${mat.sharpness >= 80 ? 'text-emerald-400' : mat.sharpness >= 60 ? 'text-amber-400' : 'text-rose-400'}`}>
                      %{mat.sharpness}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Blender Cycles Node Connection Tip */}
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <Info className="w-3.5 h-3.5 text-cyan-400" />
              <span>Blender Cycles Shader Ağacı Karşılığı:</span>
            </div>
            <p className="leading-relaxed">
              Eklenti, seçilen materyalin Abbe sayısına göre <code className="text-cyan-300">n_F = {optics.material.nF.toFixed(4)}</code> (Mavi) ve <code className="text-red-400">n_C = {optics.material.nC.toFixed(4)}</code> (Kırmızı) indislerini hesaplar ve Cycles'ta 3 ayrı Glass BSDF noduna bağlar.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
