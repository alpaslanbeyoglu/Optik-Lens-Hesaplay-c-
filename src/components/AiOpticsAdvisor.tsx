import React from 'react';
import { LensParameters, CalculatedOptics } from '../types/optics';
import { Sparkles, ShieldCheck, AlertTriangle, Lightbulb, Check, ChevronRight } from 'lucide-react';

interface AiOpticsAdvisorProps {
  params: LensParameters;
  optics: CalculatedOptics;
  onApplyVogel: () => void;
  onApplyHigherIndex: (materialId: string) => void;
}

export const AiOpticsAdvisor: React.FC<AiOpticsAdvisorProps> = ({
  params,
  optics,
  onApplyVogel,
  onApplyHigherIndex
}) => {
  const recommendations: {
    type: 'success' | 'warning' | 'info';
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
  }[] = [];

  // 1. Check Base Curve vs Vogel's Rule
  const bcDelta = Math.abs(params.baseCurve - optics.recommendedBaseCurveVogel);
  if (bcDelta > 1.25) {
    recommendations.push({
      type: 'warning',
      title: 'Optimal Olmayan Taban Eğrisi (Base Curve)',
      description: `Seçilen ön yüz eğrisi (+${params.baseCurve.toFixed(2)} D), Vogel kuralına göre hesaplanan ideal değerden (+${optics.recommendedBaseCurveVogel.toFixed(2)} D) sapmaktadır. Bu durum periferik marjinal astigmatizmaya (Oblique Astigmatism) yol açabilir.`,
      actionLabel: `İdeal Taban Eğrisini Uygula (+${optics.recommendedBaseCurveVogel.toFixed(2)} D)`,
      onAction: onApplyVogel
    });
  } else {
    recommendations.push({
      type: 'success',
      title: 'Taban Eğrisi (Base Curve) Uyumu Mükemmel',
      description: `Ön yüz eğrisi (+${params.baseCurve.toFixed(2)} D), Tscherning elipsine ve Vogel kuralına uygundur. Kenar distorsiyonu minimuma indirilmiştir.`
    });
  }

  // 2. High Myopia Edge Thickness Warning
  if (params.sphere < -4.0 && (params.materialId === 'cr39' || params.materialId === 'crown_glass_1523')) {
    recommendations.push({
      type: 'warning',
      title: 'Yüksek Miyopide Kalın Kenar Uyarısı',
      description: `Mevcut reçetede (${params.sphere.toFixed(2)} D), ${optics.material.name} kullanıldığında kenar kalınlığı ${optics.calculatedMaxEdgeThickness_mm.toFixed(1)} mm'ye ulaşmaktadır. MR-7 1.67 veya 1.74 High-Index kullanarak kenar kalınlığını %35'e kadar inceltebilirsiniz.`,
      actionLabel: '1.67 High-Index Materyale Geç',
      onAction: () => onApplyHigherIndex('mr7_167')
    });
  }

  // 3. Chromatic Aberration / Abbe Warning
  if (optics.material.abbeVd < 35 && Math.abs(params.sphere) >= 3.5) {
    recommendations.push({
      type: 'info',
      title: 'Kromatik Aberasyon (Renk Saçılması) Bildirimi',
      description: `Düşük Abbe değerli materyallerde (V_d = ${optics.material.abbeVd}), camın kenarlarında renk saçılması (Boyuna Kromatik Aberasyon: ${Math.abs(optics.longitudinalChromaticAberration_D).toFixed(2)} D) gözlemlenecektir. Blender Cycles renderında renk ayrışması belirginleşecektir.`
    });
  }

  // 4. Rimless / Drill Mount Safety Check
  if (params.bevelType === 'flat' && (params.materialId === 'cr39' || params.materialId === 'crown_glass_1523')) {
    recommendations.push({
      type: 'warning',
      title: 'Faset / Çerçevesiz Montaj Kırılma Riski',
      description: 'Düz kenarlı (faset/vida delikli) çerçeveler için CR-39 ve Mineral Cam çatlama riski taşır. Trivex veya Polikarbonat elastik darbe dayanımı nedeniyle önerilir.'
    });
  }

  // 5. Blender Cycles Tip
  recommendations.push({
    type: 'info',
    title: 'Blender Cycles Fiziksel Optik Tavsiyesi',
    description: `Camın odak uzaklığı EFL = ${Math.abs(optics.effectiveFocalLength_mm).toFixed(1)} mm olarak hesaplanmıştır. Blender'da "Spawn Optical Test Bench" butonunu kullanarak sensör düzlemini tam bu mesafeye otomatik yerleştirebilirsiniz.`
  });

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-xl space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
          OPTİK MÜHENDİSLİK DANIŞMANI &amp; FİZİKSEL DOĞRULAMA
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {recommendations.map((rec, idx) => (
          <div
            key={idx}
            className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-2.5 ${
              rec.type === 'warning'
                ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                : rec.type === 'success'
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : 'bg-slate-950 border-slate-800 text-slate-300'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 font-semibold text-xs text-slate-100">
                {rec.type === 'warning' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                {rec.type === 'success' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                {rec.type === 'info' && <Lightbulb className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                <span>{rec.title}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {rec.description}
              </p>
            </div>

            {rec.actionLabel && rec.onAction && (
              <button
                onClick={rec.onAction}
                className="self-start flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-mono border border-slate-700 transition-colors"
              >
                <span>{rec.actionLabel}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
