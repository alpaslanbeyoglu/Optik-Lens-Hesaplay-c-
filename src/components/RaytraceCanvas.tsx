import React, { useRef, useEffect, useState } from 'react';
import { LensParameters, CalculatedOptics } from '../types/optics';
import { traceOpticalRays, calculateSphericalSag } from '../utils/opticsMath';
import { Activity, Sliders, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';

interface RaytraceCanvasProps {
  params: LensParameters;
  optics: CalculatedOptics;
}

export const RaytraceCanvas: React.FC<RaytraceCanvasProps> = ({ params, optics }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rayDensity, setRayDensity] = useState<number>(7);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    const originX = width * 0.32;
    const originY = height * 0.5;
    const scale = 2.4 * zoomLevel;

    // Coordinate Grid
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
    ctx.lineWidth = 1;
    const gridSize = 20 * scale;

    for (let x = originX % gridSize; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = originY % gridSize; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Optical Axis (Y = 0)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();
    ctx.setLineDash([]);

    // 1. Draw Lens Cross-Section Geometry
    const semiDia = params.diameter / 2.0;
    const tc = optics.calculatedCenterThickness_mm;
    const R1 = optics.r1_front_mm;
    const R2 = optics.r2_back_sphere_mm;
    const isBackConcave = optics.backPowerSphereD <= 0;

    const numPoints = 80;
    const frontPts: { x: number; y: number }[] = [];
    const backPts: { x: number; y: number }[] = [];

    for (let i = 0; i <= numPoints; i++) {
      const yMm = -semiDia + (2 * semiDia * i) / numPoints;
      const frontSag = calculateSphericalSag(R1, Math.abs(yMm));
      const backSag = calculateSphericalSag(R2, Math.abs(yMm));

      // Front surface (Apex at X = 0)
      const canvasX_front = originX + frontSag * scale;
      const canvasY_front = originY + yMm * scale;
      frontPts.push({ x: canvasX_front, y: canvasY_front });

      // Back surface (Apex at X = tc)
      let backXmm = tc;
      if (isBackConcave) {
        // Meniscus: curves to right (+X)
        backXmm = tc + backSag;
      } else {
        // Biconvex: curves to left (-X)
        backXmm = Math.max(frontSag + 0.2, tc - backSag);
      }

      const canvasX_back = originX + backXmm * scale;
      const canvasY_back = originY + yMm * scale;
      backPts.push({ x: canvasX_back, y: canvasY_back });
    }

    // Fill Lens Body with Refractive Glass Glow
    ctx.beginPath();
    ctx.moveTo(frontPts[0].x, frontPts[0].y);
    for (let i = 1; i < frontPts.length; i++) {
      ctx.lineTo(frontPts[i].x, frontPts[i].y);
    }
    for (let i = backPts.length - 1; i >= 0; i--) {
      ctx.lineTo(backPts[i].x, backPts[i].y);
    }
    ctx.closePath();

    const glassGrad = ctx.createLinearGradient(
      originX,
      originY - semiDia * scale,
      originX + tc * scale,
      originY + semiDia * scale
    );
    glassGrad.addColorStop(0, 'rgba(6, 182, 212, 0.25)');
    glassGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.15)');
    glassGrad.addColorStop(1, 'rgba(6, 182, 212, 0.28)');
    ctx.fillStyle = glassGrad;
    ctx.fill();

    // Outline Lens Boundaries
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 2. Ray Heights Array
    const rayHeights: number[] = [];
    const step = (semiDia * 0.85 * 2) / (rayDensity - 1);
    for (let i = 0; i < rayDensity; i++) {
      rayHeights.push(-semiDia * 0.85 + i * step);
    }

    // 3. Trace Rays
    const rayResults = traceOpticalRays(params, optics, rayHeights);

    // Draw Light Rays
    rayResults.forEach(ray => {
      ctx.strokeStyle = ray.color;
      ctx.lineWidth = ray.wavelength_nm === 587.6 ? 1.5 : 1.0;
      ctx.globalAlpha = ray.wavelength_nm === 587.6 ? 0.9 : 0.65;

      ctx.beginPath();
      ray.points.forEach((pt, idx) => {
        const cx = originX + pt.x * scale;
        const cy = originY + pt.y * scale;
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      // For diverging minus lens: draw backwards dashed projection to virtual focus
      if (optics.totalEquivalentPowerD < 0 && Math.abs(ray.focalIntercept_x) < 500) {
        ctx.strokeStyle = ray.color;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        const pt2 = ray.points[2]; // back surface intersection
        if (pt2) {
          ctx.moveTo(originX + pt2.x * scale, originY + pt2.y * scale);
          ctx.lineTo(originX + ray.focalIntercept_x * scale, originY);
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    });

    ctx.globalAlpha = 1.0;

    // 4. Mark Focal Point
    const efl = optics.effectiveFocalLength_mm;
    const bfl = optics.backFocalLength_mm;
    const focalCanvasX = originX + (tc + bfl) * scale;

    if (focalCanvasX > 15 && focalCanvasX < width - 15 && Math.abs(efl) < 400) {
      ctx.strokeStyle = '#f59e0b';
      ctx.fillStyle = '#f59e0b';
      ctx.lineWidth = 1.5;

      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.moveTo(focalCanvasX, originY - 35);
      ctx.lineTo(focalCanvasX, originY + 35);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(focalCanvasX, originY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(
        `F' (${efl > 0 ? '+' : ''}${efl.toFixed(1)}mm)`,
        focalCanvasX + 6,
        originY - 12
      );
    }

    // 5. Annotate Thickness Dimensions
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '9px JetBrains Mono, monospace';

    // Center thickness
    ctx.fillText(`tc = ${tc.toFixed(2)} mm`, originX, originY + 50);

    // Edge thickness
    const topEdgeX1 = frontPts[frontPts.length - 1].x;
    const topY = frontPts[frontPts.length - 1].y;
    ctx.fillText(`te = ${optics.calculatedMinEdgeThickness_mm.toFixed(2)} mm`, topEdgeX1 - 10, topY - 14);

  }, [params, optics, rayDensity, zoomLevel]);

  return (
    <div className="w-full bg-slate-950 border border-slate-800/80 rounded-xl overflow-hidden shadow-xl flex flex-col">
      {/* 2D Raytracer Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            2D SNELL'S LAW OPTICAL BENCH &amp; DISPERSION FAN
          </h3>
        </div>

        {/* Ray density and zoom controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <span>Rays:</span>
            {[5, 7, 11].map(count => (
              <button
                key={count}
                onClick={() => setRayDensity(count)}
                className={`px-2 py-0.5 rounded font-mono text-[11px] transition-colors ${
                  rayDensity === count ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {count}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
            <button
              onClick={() => setZoomLevel(prev => Math.max(0.6, prev - 0.2))}
              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.min(2.2, prev + 0.2))}
              className="p-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="relative w-full h-[320px]">
        <canvas
          ref={canvasRef}
          width={840}
          height={320}
          className="w-full h-full block"
        />

        {/* Legend Overlay */}
        <div className="absolute bottom-2.5 right-3 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800/80 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-red-500 inline-block rounded-sm"></span>
            <span className="text-slate-400">C-line 656.3nm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-yellow-400 inline-block rounded-sm"></span>
            <span className="text-slate-400">d-line 587.6nm</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-cyan-400 inline-block rounded-sm"></span>
            <span className="text-slate-400">F-line 486.1nm</span>
          </div>
        </div>
      </div>
    </div>
  );
};
