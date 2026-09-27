import React, { useState } from 'react';
import { LensParameters, CalculatedOptics } from '../types/optics';
import { generateBlenderPythonAddon, generateBlenderManifest } from '../utils/blenderAddonGenerator';
import JSZip from 'jszip';
import { Download, Copy, Check, Terminal, FileCode, CheckCircle2, Box, Archive, AlertCircle } from 'lucide-react';

interface BlenderAddonExporterProps {
  params: LensParameters;
  optics: CalculatedOptics;
}

export const BlenderAddonExporter: React.FC<BlenderAddonExporterProps> = ({ params, optics }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'zip_install' | 'scripting' | 'cycles'>('zip_install');
  const [isZipping, setIsZipping] = useState<boolean>(false);

  const pythonCode = generateBlenderPythonAddon(params, optics);
  const manifestCode = generateBlenderManifest();

  const handleCopy = () => {
    navigator.clipboard.writeText(pythonCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. Download clean single-file .py
  const handleDownloadPy = () => {
    const blob = new Blob([pythonCode], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Strictly valid python identifier with NO internal dots:
    link.setAttribute('download', 'ophthalmic_lens_cad.py');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 2. Download Blender 4.2+ / 5.2 Extension .zip package (contains __init__.py + blender_manifest.toml)
  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      // Main package directory
      zip.file('__init__.py', pythonCode);
      zip.file('blender_manifest.toml', manifestCode);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'ophthalmic_lens_cad.zip');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const handleExportJson = () => {
    const spec = {
      project: "Ophthalmic Lens CAD Specification",
      version: "2.1.0",
      timestamp: new Date().toISOString(),
      prescription: {
        sphere_d: params.sphere,
        cylinder_d: params.cylinder || 0,
        axis_deg: params.axis || 0,
        base_curve_d: params.baseCurve,
        lens_type: params.lensType,
        add_power_d: params.addPower || 0,
        corridor_length_mm: params.corridorLength || 14
      },
      material: {
        id: optics.material.id,
        name: optics.material.name,
        refractive_index_nd: optics.material.nd,
        abbe_number_vd: optics.material.abbeVd,
        density_g_cm3: optics.material.density,
        cauchy_a: optics.material.cauchyA,
        cauchy_b: optics.material.cauchyB,
        cauchy_c: optics.material.cauchyC
      },
      geometry_calculated: {
        front_radius_r1_mm: optics.r1_front_mm,
        back_radius_r2_sph_mm: optics.r2_back_sphere_mm,
        back_radius_r2_cyl_mm: optics.r2_back_cyl_mm,
        center_thickness_mm: optics.calculatedCenterThickness_mm,
        min_edge_thickness_mm: optics.calculatedMinEdgeThickness_mm,
        max_edge_thickness_mm: optics.calculatedMaxEdgeThickness_mm,
        front_sag_mm: optics.frontSag_mm,
        back_sag_max_mm: optics.backSagMax_mm,
        blank_diameter_mm: params.diameter,
        bevel_type: params.bevelType,
        weight_grams: optics.lensWeight_grams,
        volume_cm3: optics.lensVolume_cm3
      },
      optics_calculated: {
        total_equivalent_power_d: optics.totalEquivalentPowerD,
        effective_focal_length_mm: optics.effectiveFocalLength_mm,
        back_focal_length_mm: optics.backFocalLength_mm,
        longitudinal_chromatic_aberration_d: optics.longitudinalChromaticAberration_D,
        transverse_chromatic_aberration_mm: optics.transverseChromaticAberration_mm,
        coating_type: params.coating
      }
    };

    const blob = new Blob([JSON.stringify(spec, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ophthalmic_lens_spec.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-2xl space-y-6">
      {/* Fix Notification Box */}
      <div className="p-3.5 bg-cyan-950/40 border border-cyan-500/40 rounded-xl flex items-start gap-3 text-xs">
        <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-slate-300">
          <div className="font-semibold text-cyan-200">
            Blender 5.2 / 4.2+ "No module named" Hatası Düzeltildi
          </div>
          <p className="text-slate-400 leading-relaxed">
            Blender 5.2 ve 4.2+ yeni Extensions sisteminde dosya adında nokta/virgül bulunan eklentileri (<code className="text-cyan-300">...plus7.00D.py</code>) Python paket ayırıcı olarak algılayıp modül hatası vermekteydi. Dosya adlandırması standart <code className="text-cyan-300 font-mono">ophthalmic_lens_cad.py</code> olarak sabitlendi ve ayrıca Blender 5.2 Extensions uyumlu <code className="text-cyan-300 font-mono">.zip</code> paketi eklendi.
          </p>
        </div>
      </div>

      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">
              BLENDER 4.x / 5.2 UYUMLU PYTHON EKLENTİSİ
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Blender 5.2, 5.0 ve 4.x ile tam uyumlu; parametrik kalın mercek formülleri, Cauchy spektral kırılma ve Cycles cam shader ağacı.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Direct ZIP Extension Download */}
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md transition-colors font-mono font-bold"
            title="Blender 5.2 / 4.2+ Extensions uyumlu .zip paketi"
          >
            <Archive className="w-4 h-4" />
            <span>{isZipping ? 'Paketleniyor...' : 'Blender 5.x / 4.x (.zip) İndir'}</span>
          </button>

          {/* Single File .py Download */}
          <button
            onClick={handleDownloadPy}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors font-mono"
            title="Tek dosya ophthalmic_lens_cad.py"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>.py Dosyası</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? 'Kopyalandı!' : 'Kodu Kopyala'}</span>
          </button>
        </div>
      </div>

      {/* Code Preview & Instructions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Code Viewer (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-950 rounded-t-lg border-t border-x border-slate-800 text-[11px] font-mono text-slate-400">
            <span className="text-cyan-400 font-semibold">ophthalmic_lens_cad.py</span>
            <span>Blender 4.0 - 5.2 Standard</span>
          </div>
          <div className="w-full h-[400px] bg-slate-950 border border-slate-800 rounded-b-lg p-3 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed select-all">
            <pre className="whitespace-pre">{pythonCode}</pre>
          </div>
        </div>

        {/* Right: Installation Tabs (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Guide Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveGuideTab('zip_install')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeGuideTab === 'zip_install' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Zip ile Kurulum
            </button>
            <button
              onClick={() => setActiveGuideTab('scripting')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeGuideTab === 'scripting' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2. Kurulumsuz Çalıştırma
            </button>
            <button
              onClick={() => setActiveGuideTab('cycles')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeGuideTab === 'cycles' ? 'bg-cyan-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              3. Cycles Ayarları
            </button>
          </div>

          {/* Tab 1: ZIP Extension Install */}
          {activeGuideTab === 'zip_install' && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3 text-xs text-slate-300">
              <h3 className="font-semibold text-slate-100 flex items-center gap-1.5 text-sm">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span>Blender 5.2 / 4.2+ Kurulum Adımları:</span>
              </h3>

              <div className="space-y-2.5 pt-1">
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">1</span>
                  <div>
                    <strong className="text-slate-200">ZIP Dosyasını İndirin:</strong> Yukarıdaki <code className="text-cyan-400 bg-slate-900 px-1 py-0.5 rounded font-mono">.zip İndir</code> butonuna basın.
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">2</span>
                  <div>
                    <strong className="text-slate-200">Blender Preferences'ı Açın:</strong> <code className="text-slate-300 bg-slate-900 px-1 py-0.5 rounded">Edit &gt; Preferences</code> penceresine gidin.
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">3</span>
                  <div>
                    <strong className="text-slate-200">Install from Disk:</strong> Sağ üstteki açılır menüden (veya Add-ons sekmesindeki ok simgesinden) <span className="text-cyan-300 font-mono font-semibold">"Install from Disk..."</span> seçip indirdiğiniz <code className="text-cyan-400">ophthalmic_lens_cad.zip</code> dosyasını seçin.
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">4</span>
                  <div>
                    <strong className="text-slate-200">Kullanın:</strong> 3D Viewport'ta <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px] border border-slate-700">N</kbd> tuşuna basıp sağ paneldeki <span className="text-cyan-400 font-mono">Optics CAD</span> sekmesinden veya <kbd className="bg-slate-800 px-1.5 py-0.5 rounded text-[11px] border border-slate-700">Shift + A</kbd> &gt; <span className="text-slate-200">Mesh &gt; Ophthalmic Lens</span> ile camınızı oluşturun!
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Scripting Workspace Run */}
          {activeGuideTab === 'scripting' && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3 text-xs text-slate-300">
              <h3 className="font-semibold text-slate-100 flex items-center gap-1.5 text-sm">
                <Terminal className="w-4 h-4 text-amber-400" />
                <span>Kurulum Yapmadan 10 Saniyede Çalıştırma:</span>
              </h3>

              <div className="space-y-2 text-slate-400 leading-relaxed">
                <p>
                  Eklenti kurmakla uğraşmak istemiyorsanız, Blender'ın dahili Python editörünü kullanarak anında çalıştırabilirsiniz:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>Yukarıdaki <strong className="text-cyan-300">"Kodu Kopyala"</strong> butonuna basın.</li>
                  <li>Blender'ın en üst çalışma alanı sekmelerinden <strong className="text-slate-100">Scripting</strong> alanına geçin.</li>
                  <li>Metin editöründe <strong className="text-slate-100">+ New</strong> butonuna basıp kodu yapıştırın (<kbd className="bg-slate-800 px-1 py-0.5 rounded">Ctrl+V</kbd>).</li>
                  <li>Sağ üstteki <strong className="text-cyan-400 font-mono">Run Script (Alt+P)</strong> butonuna basın!</li>
                </ol>
                <p className="text-emerald-400 text-[11px] font-semibold pt-1">
                  ✓ Panel ve Shift+A menüsü anında aktifleşir!
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Cycles Dispersion Render */}
          {activeGuideTab === 'cycles' && (
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 space-y-3 text-xs text-slate-300">
              <h3 className="font-semibold text-slate-100 flex items-center gap-1.5 text-sm">
                <Box className="w-4 h-4 text-cyan-400" />
                <span>Cycles Optik Kırılma ve Kostik Ayarları:</span>
              </h3>

              <p className="text-slate-400 leading-relaxed">
                Işığın gözlük camından geçerken gökkuşağı renklerine ayrılması ve odak noktasında toplanması için:
              </p>

              <ul className="list-disc list-inside space-y-1.5 text-slate-300 pl-1">
                <li>Render Engine: <strong className="text-slate-100">Cycles</strong> (<code className="text-cyan-400">GPU Compute</code>).</li>
                <li><strong className="text-slate-100">Light Paths &gt; Max Bounces:</strong> Transmission: <span className="font-mono text-cyan-400">12</span>, Transparent: <span className="font-mono text-cyan-400">8</span>.</li>
                <li><strong className="text-slate-100">Caustics:</strong> Refractive Caustics açık olsun.</li>
                <li>Paneldeki <strong className="text-cyan-300">"Spawn Test Bench"</strong> butonuna basarak lazer ışık düzeneğini oluşturun.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
