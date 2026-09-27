import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { LensParameters, CalculatedOptics } from '../types/optics';
import {
  calculateSphericalSag,
  calculateToricSag,
  calculateMultifocalSurfaceSag
} from '../utils/opticsMath';
import { Eye, Layers, Maximize2, RotateCcw, Zap, Compass, Sparkles, Activity } from 'lucide-react';

interface ThreeLensViewerProps {
  params: LensParameters;
  optics: CalculatedOptics;
}

export const ThreeLensViewer: React.FC<ThreeLensViewerProps> = ({ params, optics }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const lensMeshRef = useRef<THREE.Mesh | null>(null);
  const rayGroupRef = useRef<THREE.Group | null>(null);
  const axisGroupRef = useRef<THREE.Group | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Viewport Settings
  const [viewMode, setViewMode] = useState<'glass' | 'curvature' | 'wireframe' | 'cutaway'>('glass');
  const [showRays, setShowRays] = useState<boolean>(true);
  const [showAxis, setShowAxis] = useState<boolean>(true);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);

  // Orbit state
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: Math.PI / 4,
    phi: Math.PI / 3,
    radius: 140
  });

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070b14');
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 1000);
    cameraRef.current = camera;
    updateCameraPosition();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // Lighting (Studio Optical Setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    keyLight.position.set(80, 100, 90);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    fillLight.position.set(-80, -40, -60);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x06b6d4, 3.2);
    rimLight.position.set(0, -90, 80);
    scene.add(rimLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(200, 20, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -50;
    scene.add(gridHelper);

    // Groups
    const rayGroup = new THREE.Group();
    scene.add(rayGroup);
    rayGroupRef.current = rayGroup;

    const axisGroup = new THREE.Group();
    scene.add(axisGroup);
    axisGroupRef.current = axisGroup;

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Mouse Interaction for Orbiting
    const onMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      cameraAngleRef.current.theta += deltaX * 0.008;
      cameraAngleRef.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraAngleRef.current.phi - deltaY * 0.008));

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
      updateCameraPosition();
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      cameraAngleRef.current.radius = Math.max(40, Math.min(350, cameraAngleRef.current.radius + e.deltaY * 0.15));
      updateCameraPosition();
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('wheel', onWheel, { passive: false });

    // Animation Loop
    let lastTime = performance.now();
    const animate = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (autoRotate && !isDraggingRef.current) {
        cameraAngleRef.current.theta += dt * 0.35;
        updateCameraPosition();
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
      animFrameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('wheel', onWheel);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      renderer.dispose();
    };
  }, []);

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;
    const { theta, phi, radius } = cameraAngleRef.current;
    const x = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(0, 0, 0);
  };

  // Rebuild 3D Lens Mesh when parameters change
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Remove old lens mesh
    if (lensMeshRef.current) {
      scene.remove(lensMeshRef.current);
      lensMeshRef.current.geometry.dispose();
      if (Array.isArray(lensMeshRef.current.material)) {
        lensMeshRef.current.material.forEach(m => m.dispose());
      } else {
        lensMeshRef.current.material.dispose();
      }
      lensMeshRef.current = null;
    }

    // Geometry parameters
    const radialSegs = 72;
    const ringSegs = 32;
    const semiDia = params.diameter / 2.0;
    const tc = optics.calculatedCenterThickness_mm;
    const R1 = optics.r1_front_mm;
    const R2_sph = optics.r2_back_sphere_mm;
    const R2_cyl = optics.r2_back_cyl_mm || R2_sph;
    const axis = params.axis || 0;
    const nd = optics.refractiveIndex;
    const addPower = params.addPower || 2.0;
    const corridorLen = params.corridorLength || 14;
    const nasalInset = params.nasalInsetMm || 2.5;
    const segTopY = params.segmentTopY || -2.0;
    const segWidth = params.segmentWidthMm || 28.0;

    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];

    const isMultifocal = [
      'progressive_pal',
      'bifocal_flattop',
      'bifocal_round',
      'bifocal_executive',
      'trifocal_7x28'
    ].includes(params.lensType);

    const maxAngle = viewMode === 'cutaway' ? Math.PI * 1.5 : Math.PI * 2.0;

    // 1. Front Surface Vertices (Apex at Z = 0)
    const frontGrid: number[][] = [];
    for (let r = 0; r <= ringSegs; r++) {
      const ring: number[] = [];
      const frac = r / ringSegs;
      const radius = semiDia * Math.sin(frac * Math.PI / 2.0);

      for (let s = 0; s <= radialSegs; s++) {
        const theta = (s / radialSegs) * maxAngle;
        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);

        let z = 0;
        let localAddPower = 0;

        if (isMultifocal) {
          z = -calculateMultifocalSurfaceSag(
            R1, x, y, params.lensType, addPower, corridorLen, nd,
            nasalInset, segTopY, segWidth
          );

          // Calculate local addition power for Curvature Heatmap
          if (params.lensType === 'progressive_pal') {
            const corridorTop = 4.0;
            const corridorBottom = -(corridorLen - 4.0);
            if (y >= corridorTop) localAddPower = 0;
            else if (y <= corridorBottom) localAddPower = addPower;
            else {
              const t = (corridorTop - y) / (corridorTop - corridorBottom);
              localAddPower = addPower * (10.0 * Math.pow(t, 3) - 15.0 * Math.pow(t, 4) + 6.0 * Math.pow(t, 5));
            }
          } else if (y <= segTopY) {
            localAddPower = addPower;
          }
        } else {
          z = -calculateSphericalSag(R1, radius);
        }

        const vIdx = vertices.length / 3;
        vertices.push(x, y, z);
        uvs.push(0.5 + (x / params.diameter), 0.5 + (y / params.diameter));

        // Vertex Color (for Curvature / Power Heatmap)
        if (viewMode === 'curvature') {
          const powerRatio = Math.min(1.0, localAddPower / Math.max(0.1, addPower));
          // Color ramp: Distance (Cyan) -> Intermediate (Amber) -> Near Reading (Red/Magenta)
          const hue = 0.55 - (powerRatio * 0.45); // 0.55 (cyan) to 0.10 (amber/red)
          const color = new THREE.Color().setHSL(Math.max(0, hue), 0.85, 0.5);
          colors.push(color.r, color.g, color.b);
        } else {
          colors.push(1, 1, 1);
        }

        ring.push(vIdx);
      }
      frontGrid.push(ring);
    }

    // Front Faces
    for (let r = 0; r < ringSegs; r++) {
      for (let s = 0; s < radialSegs; s++) {
        const v1 = frontGrid[r][s];
        const v2 = frontGrid[r][s + 1];
        const v3 = frontGrid[r + 1][s + 1];
        const v4 = frontGrid[r + 1][s];
        indices.push(v1, v2, v3);
        indices.push(v1, v3, v4);
      }
    }

    // 2. Back Surface Vertices (Apex at Z = -tc)
    const backGrid: number[][] = [];
    for (let r = 0; r <= ringSegs; r++) {
      const ring: number[] = [];
      const frac = r / ringSegs;
      const radius = semiDia * Math.sin(frac * Math.PI / 2.0);

      for (let s = 0; s <= radialSegs; s++) {
        const theta = (s / radialSegs) * maxAngle;
        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);

        let sagBack = 0;
        if (params.lensType === 'toric_astigmatic') {
          const radAxis = (axis * Math.PI) / 180.0;
          const xRot = x * Math.cos(radAxis) + y * Math.sin(radAxis);
          const yRot = -x * Math.sin(radAxis) + y * Math.cos(radAxis);
          sagBack = calculateSphericalSag(R2_sph, Math.abs(xRot)) + calculateSphericalSag(R2_cyl, Math.abs(yRot));
        } else {
          sagBack = calculateSphericalSag(R2_sph, radius);
        }

        const isBackConcave = optics.backPowerSphereD <= 0.001;
        const zIdeal = isBackConcave ? (-tc - sagBack) : (-tc + sagBack);

        // Fetch corresponding front surface vertex Z for collision-free barrier
        const frontVertexIdx = frontGrid[r][s];
        const zFrontLocal = vertices[frontVertexIdx * 3 + 2];
        const minGap = Math.min(params.minEdgeThickness || 1.2, 0.8);
        const z = Math.min(zFrontLocal - minGap, zIdeal);

        const vIdx = vertices.length / 3;
        vertices.push(x, y, z);
        uvs.push(0.5 + (x / params.diameter), 0.5 + (y / params.diameter));

        if (viewMode === 'curvature') {
          colors.push(0.15, 0.25, 0.45); // muted back surface
        } else {
          colors.push(1, 1, 1);
        }

        ring.push(vIdx);
      }
      backGrid.push(ring);
    }

    // Back Faces (inward winding)
    for (let r = 0; r < ringSegs; r++) {
      for (let s = 0; s < radialSegs; s++) {
        const v1 = backGrid[r][s];
        const v2 = backGrid[r + 1][s];
        const v3 = backGrid[r + 1][s + 1];
        const v4 = backGrid[r][s + 1];
        indices.push(v1, v2, v3);
        indices.push(v1, v3, v4);
      }
    }

    // 3. Edge Rim / Bevel
    const frontRim = frontGrid[ringSegs];
    const backRim = backGrid[ringSegs];

    for (let s = 0; s < radialSegs; s++) {
      const vf1 = frontRim[s];
      const vf2 = frontRim[s + 1];
      const vb1 = backRim[s];
      const vb2 = backRim[s + 1];
      indices.push(vf1, vb1, vb2);
      indices.push(vf1, vb2, vf2);
    }

    // 4. Cutaway Wall Caps
    if (viewMode === 'cutaway') {
      for (let r = 0; r < ringSegs; r++) {
        indices.push(frontGrid[r][0], backGrid[r][0], backGrid[r + 1][0]);
        indices.push(frontGrid[r][0], backGrid[r + 1][0], frontGrid[r + 1][0]);
      }
      for (let r = 0; r < ringSegs; r++) {
        indices.push(frontGrid[r][radialSegs], frontGrid[r + 1][radialSegs], backGrid[r + 1][radialSegs]);
        indices.push(frontGrid[r][radialSegs], backGrid[r + 1][radialSegs], backGrid[r][radialSegs]);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Material Selection
    let material: THREE.Material;

    if (viewMode === 'wireframe') {
      material = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        wireframe: true,
        transparent: true,
        opacity: 0.85
      });
    } else if (viewMode === 'curvature') {
      material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.3,
        metalness: 0.1,
        side: THREE.DoubleSide
      });
    } else {
      // Physical Glass Material
      let glassTint = 0xffffff;
      let transmission = 0.96;

      if (params.coating === 'polarized_g15') {
        glassTint = 0x223826;
        transmission = 0.35;
      } else if (params.coating === 'ar_blue_shield') {
        glassTint = 0xf0f7ff;
      }

      material = new THREE.MeshPhysicalMaterial({
        color: glassTint,
        metalness: 0.05,
        roughness: 0.02,
        transmission: transmission,
        thickness: tc * 2,
        ior: nd,
        transparent: true,
        opacity: 0.88,
        reflectivity: 0.6,
        clearcoat: params.coating !== 'uncoated' ? 1.0 : 0.2,
        clearcoatRoughness: 0.01,
        side: THREE.DoubleSide
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = tc / 2.0;
    scene.add(mesh);
    lensMeshRef.current = mesh;

    // Optical Axis and Multifocal Markings
    if (axisGroupRef.current) {
      const axisGroup = axisGroupRef.current;
      while (axisGroup.children.length > 0) {
        axisGroup.remove(axisGroup.children[0]);
      }

      if (showAxis) {
        // Optical Axis Line
        const axisPoints = [
          new THREE.Vector3(0, 0, 70),
          new THREE.Vector3(0, 0, -Math.min(180, Math.max(70, Math.abs(optics.effectiveFocalLength_mm))))
        ];
        const axisGeom = new THREE.BufferGeometry().setFromPoints(axisPoints);
        const axisMat = new THREE.LineDashedMaterial({
          color: 0x38bdf8,
          dashSize: 3,
          gapSize: 2,
          opacity: 0.6,
          transparent: true
        });
        const axisLine = new THREE.Line(axisGeom, axisMat);
        axisLine.computeLineDistances();
        axisGroup.add(axisLine);

        // Multifocal Corridor / Segment Line Visualizer
        if (isMultifocal) {
          if (params.lensType === 'progressive_pal') {
            // Umbilical corridor path line
            const corridorPts = [
              new THREE.Vector3(0, 4, 1.0),
              new THREE.Vector3(-nasalInset * 0.5, -3, 1.0),
              new THREE.Vector3(-nasalInset, -(corridorLen - 4), 1.0)
            ];
            const corridorGeom = new THREE.BufferGeometry().setFromPoints(corridorPts);
            const corridorMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
            axisGroup.add(new THREE.Line(corridorGeom, corridorMat));
          } else if (params.lensType === 'bifocal_flattop') {
            // D-Segment top dividing line
            const halfW = segWidth / 2.0;
            const segPts = [
              new THREE.Vector3(-nasalInset - halfW * 0.85, segTopY, 1.0),
              new THREE.Vector3(-nasalInset + halfW * 0.85, segTopY, 1.0)
            ];
            const segGeom = new THREE.BufferGeometry().setFromPoints(segPts);
            const segMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2 });
            axisGroup.add(new THREE.Line(segGeom, segMat));
          }
        }
      }
    }

    // 3D Snell Rays
    if (rayGroupRef.current) {
      const rayGroup = rayGroupRef.current;
      while (rayGroup.children.length > 0) {
        rayGroup.remove(rayGroup.children[0]);
      }

      if (showRays) {
        const rayColors = [0xef4444, 0xeab308, 0x06b6d4];
        const rayHeights = [-18, -10, -3, 0, 3, 10, 18];
        const efl = optics.effectiveFocalLength_mm;

        rayColors.forEach((col, cIdx) => {
          const chromaticDelta = (cIdx - 1) * (efl / optics.material.abbeVd);
          const focalZ = -efl - chromaticDelta + tc / 2.0;

          rayHeights.forEach(y => {
            const startPt = new THREE.Vector3(0, y, 60);
            const frontSag = -calculateSphericalSag(R1, Math.abs(y));
            const frontPt = new THREE.Vector3(0, y, frontSag + tc / 2.0);
            const backSag = -calculateSphericalSag(R2_sph, Math.abs(y));
            const backPt = new THREE.Vector3(0, y * 0.96, -tc - backSag + tc / 2.0);
            
            let endPt: THREE.Vector3;
            if (params.sphere < 0) {
              endPt = new THREE.Vector3(0, y * 2.2, -80);
            } else {
              endPt = new THREE.Vector3(0, 0, focalZ);
            }

            const pts = [startPt, frontPt, backPt, endPt];
            const rayGeom = new THREE.BufferGeometry().setFromPoints(pts);
            const rayMat = new THREE.LineBasicMaterial({
              color: col,
              transparent: true,
              opacity: cIdx === 1 ? 0.85 : 0.5
            });
            rayGroup.add(new THREE.Line(rayGeom, rayMat));
          });
        });
      }
    }
  }, [params, optics, viewMode, showRays, showAxis]);

  const resetCamera = () => {
    cameraAngleRef.current = { theta: Math.PI / 4, phi: Math.PI / 3, radius: 140 };
    updateCameraPosition();
  };

  return (
    <div className="relative w-full h-[520px] bg-slate-950 border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      {/* 3D Viewport Header HUD */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 pointer-events-auto">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold uppercase">{params.lensType.replace('_', ' ')}</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400 font-semibold">{params.diameter} mm ⌀</span>
          <span className="text-slate-600">|</span>
          <span>n_d={optics.refractiveIndex.toFixed(3)}</span>
        </div>

        {/* View Mode Segmented Controls */}
        <div className="flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-lg border border-slate-800 pointer-events-auto">
          <button
            onClick={() => setViewMode('glass')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'glass' ? 'bg-cyan-500 text-slate-950 shadow-sm font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Glass
          </button>
          <button
            onClick={() => setViewMode('curvature')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
              viewMode === 'curvature' ? 'bg-cyan-500 text-slate-950 shadow-sm font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="3D Yüzey Kırma Gücü & Koridor Isı Haritası"
          >
            <Activity className="w-3 h-3" />
            <span>Güç Haritası</span>
          </button>
          <button
            onClick={() => setViewMode('wireframe')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'wireframe' ? 'bg-cyan-500 text-slate-950 shadow-sm font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Topology
          </button>
          <button
            onClick={() => setViewMode('cutaway')}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              viewMode === 'cutaway' ? 'bg-cyan-500 text-slate-950 shadow-sm font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cutaway Sag
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="w-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Bottom Floating Control Bar */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowRays(!showRays)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showRays
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Snell Light Beams</span>
          </button>
          <button
            onClick={() => setShowAxis(!showAxis)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              showAxis
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Optical Axis &amp; Markings</span>
          </button>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`px-2.5 py-1.5 text-xs rounded-lg border transition-colors ${
              autoRotate
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle 360 Turntable Auto-Rotation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetCamera}
            className="px-2.5 py-1.5 text-xs rounded-lg border bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200"
            title="Reset Camera View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
