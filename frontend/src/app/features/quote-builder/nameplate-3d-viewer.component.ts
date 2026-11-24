import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

@Component({
  selector: 'app-nameplate-3d-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full h-full min-h-[380px] bg-slate-950 rounded-md border border-slate-800 overflow-hidden select-none">
      <div #canvasHost class="w-full h-full min-h-[380px]"></div>

      <!-- Technical Dimension Overlay -->
      <div class="absolute top-3 left-3 bg-slate-900/90 border border-slate-700 rounded px-2.5 py-1.5 text-[11px] font-mono text-slate-200 space-y-0.5 pointer-events-none">
        <div class="text-amber-400 font-bold uppercase">MÔ PHỎNG VẬT LIỆU 3D (PBR)</div>
        <div class="tabular-nums">Dài × Rộng: {{ widthMm }} × {{ heightMm }} mm</div>
        <div class="tabular-nums">Độ dày phôi: {{ thicknessMm }} mm</div>
        <div>Bề mặt: {{ materialName || 'Inox 304' }} · {{ processName || 'Gia công' }}</div>
      </div>

      <!-- Camera Controls -->
      <div class="absolute bottom-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2">
        <span class="text-[11px] font-mono text-slate-400 bg-slate-900/85 px-2 py-1 rounded border border-slate-800">
          Kéo chuột trái: Xoay 360° · Cuộn: Phóng to · Chuột phải: Di chuyển
        </span>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            (click)="setCameraPreset('front')"
            class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-mono"
          >
            Mặt trước
          </button>
          <button
            type="button"
            (click)="setCameraPreset('iso')"
            class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-mono"
          >
            Góc nghiêng 3D
          </button>
          <button
            type="button"
            (click)="setCameraPreset('edge')"
            class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-mono"
          >
            Soi độ dày
          </button>
        </div>
      </div>

      @if (webglError()) {
        <div class="absolute inset-0 flex items-center justify-center bg-slate-950 text-xs text-slate-400 p-4 text-center">
          {{ webglError() }}
        </div>
      }
    </div>
  `,
})
export class Nameplate3dViewerComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('canvasHost', { static: true }) canvasHost!: ElementRef<HTMLDivElement>;

  @Input() widthMm = 80;
  @Input() heightMm = 50;
  @Input() thicknessMm = 1.0;
  @Input() materialCode = 'INOX_304';
  @Input() materialName = 'Inox 304';
  @Input() processCode = 'ETCHING';
  @Input() processName = 'Ăn mòn điện hóa';
  @Input() previewText = 'MÁY BƠM CÔNG NGHIỆP\nMODEL: TNI-304-PRO\nS/N: 2026-00849';
  @Input() cornerRivets = true;
  @Input() artworkDataUrl: string | null = null;

  readonly webglError = signal('');

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private plateGroup!: THREE.Group;
  private resizeObserver?: ResizeObserver;
  private animFrameId = 0;

  ngAfterViewInit(): void {
    this.initScene();
    this.rebuildPlate();
    this.animate();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    if (this.scene) {
      this.rebuildPlate();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
  }

  setCameraPreset(preset: 'front' | 'iso' | 'edge'): void {
    if (!this.camera || !this.controls) return;
    const maxDim = Math.max(this.widthMm, this.heightMm, 40) * 0.05;
    const dist = Math.max(4.5, maxDim * 1.45);

    if (preset === 'front') {
      this.camera.position.set(0, 0, dist);
    } else if (preset === 'edge') {
      this.camera.position.set(dist * 0.95, dist * 0.18, dist * 0.35);
    } else {
      this.camera.position.set(dist * 0.55, dist * 0.45, dist * 0.85);
    }
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  private initScene(): void {
    const host = this.canvasHost.nativeElement;
    const width = host.clientWidth || 600;
    const height = host.clientHeight || 420;

    try {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#090d16');

      this.camera = new THREE.PerspectiveCamera(38, width / height, 0.05, 100);
      this.camera.position.set(3.2, 2.4, 5.2);

      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(width, height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.25;
      host.appendChild(this.renderer.domElement);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.07;
      this.controls.minDistance = 1.5;
      this.controls.maxDistance = 25;

      // Industrial Studio Lighting (Key, Rim, Fill)
      const ambient = new THREE.AmbientLight(0xffffff, 0.75);
      this.scene.add(ambient);

      const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.4);
      keyLight.position.set(5, 7, 6);
      this.scene.add(keyLight);

      const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.5);
      rimLight.position.set(-6, -3, -4);
      this.scene.add(rimLight);

      const fillLight = new THREE.PointLight(0xf59e0b, 1.1, 20);
      fillLight.position.set(-3, 4, 4);
      this.scene.add(fillLight);

      // Subtle calibration grid floor
      const grid = new THREE.GridHelper(14, 28, 0x334155, 0x1e293b);
      grid.position.y = -2.2;
      this.scene.add(grid);

      this.plateGroup = new THREE.Group();
      this.scene.add(this.plateGroup);

      this.resizeObserver = new ResizeObserver(() => {
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (w > 0 && h > 0) {
          this.camera.aspect = w / h;
          this.camera.updateProjectionMatrix();
          this.renderer.setSize(w, h);
        }
      });
      this.resizeObserver.observe(host);
    } catch {
      this.webglError.set('Trình duyệt không hỗ trợ WebGL 3D. Vui lòng bật tăng tốc phần cứng.');
    }
  }

  private rebuildPlate(): void {
    if (!this.plateGroup) return;

    while (this.plateGroup.children.length > 0) {
      const child = this.plateGroup.children[0] as THREE.Mesh;
      child.geometry?.dispose();
      if (Array.isArray(child.material)) {
        child.material.forEach((m) => m.dispose());
      } else {
        child.material?.dispose();
      }
      this.plateGroup.remove(child);
    }

    // Scale 100mm -> 5.0 scene units
    const scale = 0.05;
    const w = Math.max(10, Number(this.widthMm) || 80) * scale;
    const h = Math.max(10, Number(this.heightMm) || 50) * scale;
    const t = Math.max(0.2, Number(this.thicknessMm) || 1.0) * scale;

    const palette = this.resolveMaterialPalette();
    const bumpTex = this.createBrushedMetalTexture();
    const faceTex = this.createEngravedFaceTexture(palette);

    const sideMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.baseHex),
      metalness: palette.metalness,
      roughness: palette.roughness,
    });

    const frontMat = new THREE.MeshStandardMaterial({
      map: faceTex,
      bumpMap: bumpTex,
      bumpScale: 0.008,
      metalness: palette.metalness,
      roughness: palette.roughness,
    });

    const boxGeo = new THREE.BoxGeometry(w, h, t);
    // BoxGeometry material order: +X, -X, +Y, -Y, +Z (front), -Z (back)
    const plateMesh = new THREE.Mesh(boxGeo, [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat]);
    this.plateGroup.add(plateMesh);

    // Corner rivet holes / pins
    if (this.cornerRivets) {
      const r = Math.min(w, h) * 0.032;
      const holeGeo = new THREE.CylinderGeometry(r, r, t + 0.01, 20);
      holeGeo.rotateX(Math.PI / 2);
      const holeMat = new THREE.MeshStandardMaterial({
        color: 0x090d16,
        metalness: 0.1,
        roughness: 0.9,
      });

      const marginX = w / 2 - r * 2.4;
      const marginY = h / 2 - r * 2.4;
      const offsets = [
        [-marginX, marginY],
        [marginX, marginY],
        [-marginX, -marginY],
        [marginX, -marginY],
      ];

      for (const [ox, oy] of offsets) {
        const rivet = new THREE.Mesh(holeGeo, holeMat);
        rivet.position.set(ox, oy, 0);
        this.plateGroup.add(rivet);
      }
    }
  }

  private resolveMaterialPalette(): {
    baseHex: string;
    inkHex: string;
    borderHex: string;
    metalness: number;
    roughness: number;
  } {
    const code = (this.materialCode || this.materialName || '').toUpperCase();
    const proc = (this.processCode || this.processName || '').toUpperCase();

    let baseHex = '#cbd5e1'; // Inox 304 steel
    let metalness = 0.88;
    let roughness = 0.26;

    if (code.includes('DONG') || code.includes('BRASS') || code.includes('COPPER')) {
      baseHex = '#d97706';
      metalness = 0.86;
      roughness = 0.28;
    } else if (code.includes('NHOM') || code.includes('ALUM')) {
      baseHex = '#e2e8f0';
      metalness = 0.82;
      roughness = 0.34;
    } else if (code.includes('MICA') || code.includes('ACRYLIC')) {
      baseHex = '#1e293b';
      metalness = 0.08;
      roughness = 0.18;
    }

    let inkHex = '#0f172a';
    let borderHex = '#1e293b';
    if (code.includes('MICA')) {
      inkHex = '#f8fafc';
      borderHex = '#f59e0b';
    } else if (proc.includes('LASER')) {
      inkHex = '#18181b';
      borderHex = '#27272a';
    } else if (proc.includes('UV')) {
      inkHex = '#b91c1c';
      borderHex = '#0f172a';
    }

    return { baseHex, inkHex, borderHex, metalness, roughness };
  }

  private createBrushedMetalTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 256, 256);

    for (let y = 0; y < 256; y++) {
      const v = 115 + Math.floor(Math.random() * 26);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(0, y, 256, 1);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  private createEngravedFaceTexture(palette: {
    baseHex: string;
    inkHex: string;
    borderHex: string;
  }): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = Math.max(256, Math.round(1024 * ((this.heightMm || 50) / (this.widthMm || 80))));
    const ctx = canvas.getContext('2d')!;

    // Metallic brushed background
    ctx.fillStyle = palette.baseHex;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = 0.08;
    for (let y = 0; y < canvas.height; y += 2) {
      ctx.fillStyle = y % 4 === 0 ? '#ffffff' : '#000000';
      ctx.fillRect(0, y, canvas.width, 1);
    }
    ctx.globalAlpha = 1.0;

    // Industrial border frame
    const pad = Math.round(Math.min(canvas.width, canvas.height) * 0.06);
    ctx.strokeStyle = palette.borderHex;
    ctx.lineWidth = 8;
    ctx.strokeRect(pad, pad, canvas.width - pad * 2, canvas.height - pad * 2);

    // Header bar
    const headerH = Math.round(canvas.height * 0.22);
    ctx.fillStyle = palette.borderHex;
    ctx.fillRect(pad, pad, canvas.width - pad * 2, headerH);

    const lines = (this.previewText || 'TEM NHÃN INOX 304')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    // Title inside header bar
    ctx.fillStyle = palette.baseHex;
    ctx.font = `bold ${Math.max(24, Math.round(headerH * 0.52))}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lines[0] || 'TEM THÔNG SỐ KỸ THUẬT', canvas.width / 2, pad + headerH / 2, canvas.width - pad * 3);

    // Body specification lines
    ctx.fillStyle = palette.inkHex;
    const bodyLines = lines.slice(1);
    const bodyTop = pad + headerH + 24;
    const bodyHeight = canvas.height - bodyTop - pad;
    const lineStep = bodyHeight / Math.max(1, bodyLines.length);

    bodyLines.forEach((line, idx) => {
      const fontSize = Math.max(20, Math.min(44, Math.round(lineStep * 0.45)));
      ctx.font = `600 ${fontSize}px "JetBrains Mono", monospace`;
      ctx.fillText(line, canvas.width / 2, bodyTop + lineStep * (idx + 0.5), canvas.width - pad * 3);
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private animate = (): void => {
    this.animFrameId = requestAnimationFrame(this.animate);
    this.controls?.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  };
}
