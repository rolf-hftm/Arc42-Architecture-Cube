import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

type DimensionKey = 'structure' | 'granularity' | 'focus' | 'coupling';
type CategoryKey = 'structural' | 'strategic' | 'deployment';

type Approach = {
  id: string;
  name: string;
  category: CategoryKey;
  description: string;
  url?: string;
  values: Record<DimensionKey, number>; // 0..100
};

type DimensionOption = { key: DimensionKey; label: string };
type CategoryOption = { key: CategoryKey; label: string; color: string };

@Component({
  selector: 'app-architecture-space',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './architecture-space.component.html',
  styleUrls: ['./architecture-space.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchitectureSpaceComponent implements AfterViewInit, OnDestroy {
  @ViewChild('viewport', { static: true }) viewportRef!: ElementRef<HTMLDivElement>;

  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);

  // ===== UI model =====
  dimensions: DimensionOption[] = [
    { key: 'structure', label: 'Structure' },
    { key: 'granularity', label: 'Granularity' },
    { key: 'focus', label: 'Focus' },
    { key: 'coupling', label: 'Coupling' },
  ];

  dimensionEnabled: Record<DimensionKey, boolean> = {
    structure: true,
    granularity: true,
    focus: true,
    coupling: true,
  };

  enabledDimensionsList: DimensionOption[] = [];

  categories: CategoryOption[] = [
    { key: 'structural', label: 'Structural', color: '#2563eb' },
    { key: 'strategic', label: 'Strategic', color: '#059669' },
    { key: 'deployment', label: 'Deployment', color: '#d97706' },
  ];

  axisX: DimensionKey = 'structure';
  axisY: DimensionKey = 'granularity';
  axisZ: DimensionKey = 'focus';

  // 4th dimension encoding
  sizeDimension: DimensionKey = 'coupling';


// Remember what the user *wanted* to map to axes/size (so re‑enabling a dimension can restore it)
preferredAxisX: DimensionKey = 'structure';
preferredAxisY: DimensionKey = 'granularity';
preferredAxisZ: DimensionKey = 'focus';
preferredSizeDimension: DimensionKey = 'coupling';

private axisForcedX = false;
private axisForcedY = false;
private axisForcedZ = false;
private sizeForced = false;

  // Readability controls
  pointLabelMode: 'hover' | 'selected' | 'hover+selected' | 'all' | 'off' = 'hover';
  tickLabelMode: 'endpoints' | 'all' | 'none' = 'endpoints';

  showClusters = false;

  // Cube visuals
  showCubeFaces = true;
  cubeFaceOpacity = 0.14;

  // Inner grid = 3 mid-planes to make 2x2x2 (=8) sub-cubes readable
  showInnerGrid = true;
  innerGridOpacity = 0.06;

  // Camera auto-rotation (OrbitControls)
  autoRotate = true;
  autoRotateSpeed = 0.7;

  // Point details popup
  scale = 22; // world size for 0..100 mapped to [-scale, +scale]

  categoryEnabled: Record<CategoryKey, boolean> = {
    structural: true,
    strategic: true,
    deployment: true,
  };

  // Individual approach visibility (default: all on)
  approachEnabled: Record<string, boolean> = {};

  selected: Approach | null = null;

  showAbout = false;

  // ===== Dataset =====
  approaches: Approach[] = [

// Historical baseline: a single deployable unit (often the starting point)
{
  id: 'monolith',
  name: 'Monolith',
  category: 'deployment',
  description:
    'A single deployable application (often one codebase + one database). It can be perfectly fine for many teams, but tends to create high coupling over time if boundaries are not enforced.',
  url: 'https://en.wikipedia.org/wiki/Monolithic_application',
  values: { structure: 5, granularity: 5, focus: 10, coupling: 90 },
},
{
  id: 'modular-monolith',
  name: 'Modular Monolith',
  category: 'deployment',
  description:
    'Still one deployable unit, but internally split into clear modules / bounded contexts with enforced boundaries. A pragmatic “middle step” before microservices — keeping operational simplicity while improving coupling and testability.',
  url: 'https://martinfowler.com/articles/modular-monolith.html',
  values: { structure: 65, granularity: 15, focus: 75, coupling: 45 },
},


    {
      id: 'layered',
      name: 'Layered Architecture',
      category: 'structural',
      description:
        'Separates UI, business rules, and data access into strict layers. Great for learning and simple CRUD, but can hard‑wire dependencies and make domain logic drift into the wrong layer.',
      url: 'https://en.wikipedia.org/wiki/Layered_architecture',
      values: { structure: 10, granularity: 10, focus: 20, coupling: 70 },
    },
    {
      id: 'hexagonal',
      name: 'Hexagonal (Ports & Adapters)',
      category: 'structural',
      description:
        'Puts the domain and use cases in the center. External technology (web, DB, messaging) connects via ports (interfaces) and adapters (implementations), making testing easier and technology swaps safer.',
      url: 'https://alistair.cockburn.us/hexagonal-architecture/',
      values: { structure: 85, granularity: 20, focus: 65, coupling: 20 },
    },
    {
      id: 'onion',
      name: 'Onion Architecture',
      category: 'structural',
      description:
        'A domain‑centric layering where all dependencies point inward. Infrastructure is kept at the edges, while the core domain stays independent; encourages clear boundaries and testability.',
      url: 'https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/',
      values: { structure: 80, granularity: 20, focus: 70, coupling: 20 },
    },
    {
      id: 'clean',
      name: 'Clean Architecture',
      category: 'structural',
      description:
        'Generalizes inside‑out dependency rules with concentric rings: entities → use cases → interface adapters → frameworks. Helps keep business rules stable while allowing UI/DB/framework changes.',
      url: 'https://8thlight.com/blog/uncle-bob/2012/08/13/the-clean-architecture.html',
      values: { structure: 90, granularity: 25, focus: 70, coupling: 15 },
    },
    {
      id: 'ddd',
      name: 'Domain-Driven Design (DDD)',
      category: 'strategic',
      description:
        'A strategic approach to align software with the business model: ubiquitous language, bounded contexts, aggregates, and domain events. Often combined with modular structures to reduce complexity.',
      url: 'https://en.wikipedia.org/wiki/Domain-driven_design',
      values: { structure: 65, granularity: 45, focus: 95, coupling: 40 },
    },
    {
      id: 'microservices',
      name: 'Microservices',
      category: 'deployment',
      description:
        'A distributed style with small, independently deployable services, each owning its data and lifecycle. Enables independent scaling and delivery, but increases operational, observability, and integration complexity.',
      url: 'https://martinfowler.com/articles/microservices.html',
      values: { structure: 55, granularity: 95, focus: 70, coupling: 25 },
    },
    {
      id: 'eda',
      name: 'Event-Driven Architecture',
      category: 'deployment',
      description:
        'Components publish events instead of calling each other directly. Promotes loose coupling and scalability, but requires careful handling of ordering, retries, and eventual consistency.',
      url: 'https://en.wikipedia.org/wiki/Event-driven_architecture',
      values: { structure: 60, granularity: 70, focus: 65, coupling: 15 },
    },
    {
      id: 'cqrs',
      name: 'CQRS',
      category: 'structural',
      description:
        'Separates command (write) and query (read) responsibilities, often with different models and storage. While technically a pattern, it significantly impacts the structural focus of an application.',
      url: 'https://martinfowler.com/bliki/CQRS.html',
      values: { structure: 70, granularity: 55, focus: 75, coupling: 30 },
    },
    {
      id: 'event-sourcing',
      name: 'Event Sourcing',
      category: 'structural',
      description:
        'Captures all changes to an application state as a sequence of events. Instead of storing current state, it stores the history of events, enabling audit logs, time-travel, and high decoupling.',
      url: 'https://martinfowler.com/eaaDev/EventSourcing.html',
      values: { structure: 75, granularity: 60, focus: 80, coupling: 20 },
    },
    {
      id: 'saga',
      name: 'Saga Pattern',
      category: 'structural',
      description:
        'Manages distributed transactions by using a sequence of local transactions, each updating its own database and publishing an event or message to trigger the next transaction.',
      url: 'https://microservices.io/patterns/data/saga.html',
      values: { structure: 65, granularity: 80, focus: 70, coupling: 35 },
    },
    {
      id: 'soa',
      name: 'SOA',
      category: 'deployment',
      description:
        'Enterprise service orientation with shared contracts and governance, often mediated by an ESB. Useful for large heterogeneous landscapes, but can become centralized and heavyweight if overused.',
      url: 'https://en.wikipedia.org/wiki/Service-oriented_architecture',
      values: { structure: 45, granularity: 80, focus: 55, coupling: 45 },
    },
    {
      id: 'serverless',
      name: 'Serverless',
      category: 'deployment',
      description:
        'Runs code as on‑demand functions managed by a cloud provider. Reduces server ops and scales automatically; trade‑offs include vendor lock‑in, cold starts, and debugging distributed flows.',
      url: 'https://en.wikipedia.org/wiki/Serverless_computing',
      values: { structure: 50, granularity: 100, focus: 45, coupling: 25 },
    },
    {
      id: 'pipe-filter',
      name: 'Pipe & Filter',
      category: 'structural',
      description:
        'A processing pipeline where data flows through a chain of independent transformation steps (filters). Excellent for ETL, compilers, and streaming — each step stays focused and replaceable.',
      url: 'https://en.wikipedia.org/wiki/Pipeline_(software)',
      values: { structure: 70, granularity: 45, focus: 35, coupling: 30 },
    },
    {
      id: 'clean-architecture',
      name: 'Clean Architecture',
      category: 'structural',
      description:
        'A variation of Onion/Hexagonal architecture by Robert C. Martin. It emphasizes dependency inversion and strict boundaries to keep the core business logic independent of frameworks and UI.',
      url: 'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html',
      values: { structure: 90, granularity: 20, focus: 80, coupling: 15 },
    },
    {
      id: 'data-mesh',
      name: 'Data Mesh',
      category: 'strategic',
      description:
        'A decentralized architectural framework for data management. It treats data as a product and shifts ownership to domain-aligned teams, applying microservices principles to the data world.',
      url: 'https://martinfowler.com/articles/data-mesh-principles.html',
      values: { structure: 60, granularity: 85, focus: 90, coupling: 40 },
    },
    {
      id: 'p2p',
      name: 'Peer-to-Peer',
      category: 'deployment',
      description:
        'A decentralized network where participants (peers) are equally privileged and share resources directly without a central server. Highly resilient but complex to coordinate.',
      url: 'https://en.wikipedia.org/wiki/Peer-to-peer',
      values: { structure: 30, granularity: 100, focus: 20, coupling: 10 },
    },
    {
      id: 'blackboard',
      name: 'Blackboard',
      category: 'structural',
      description:
        'Specialized architectural style for problems with no deterministic solution. Multiple independent "experts" (knowledge sources) work on a shared data store (blackboard) to build a solution.',
      url: 'https://en.wikipedia.org/wiki/Blackboard_system',
      values: { structure: 40, granularity: 50, focus: 30, coupling: 40 },
    },

  ];

  // ===== Three.js objects =====
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private labelRenderer!: CSS2DRenderer;
  private controls!: OrbitControls;
  private rafId: number | null = null;

  private raycaster = new THREE.Raycaster();
  private pointerNDC = new THREE.Vector2();

  private cubeGroup = new THREE.Group();
  private axesGroup = new THREE.Group();
  private pointsGroup = new THREE.Group();
  private clustersGroup = new THREE.Group();

  private pointMeshes = new Map<string, THREE.Mesh>();
  private labelObjects = new Map<string, CSS2DObject>();

  private hoveredId: string | null = null;

  ngAfterViewInit(): void {
    this.initThree();
    this.applyViewSettings();
    this.initApproachEnabled();
    this.updateEnabledDimensionList();

    this.preferredAxisX = this.axisX;
    this.preferredAxisY = this.axisY;
    this.preferredAxisZ = this.axisZ;
    this.preferredSizeDimension = this.sizeDimension;
    this.applyMappingAndFilters();
    this.updateLabelVisibility();
    this.startLoop();

    window.addEventListener('resize', this.onResize, { passive: true });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);

    if (this.rafId != null) cancelAnimationFrame(this.rafId);

    this.controls?.dispose();
    this.renderer?.dispose();

    const host = this.viewportRef.nativeElement;
    host.querySelectorAll('canvas, .css2d-overlay').forEach((n) => n.remove());
  }

  resetView(): void {
    this.camera.position.set(42, 30, 42);
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = this.autoRotateSpeed;
  }


applyViewSettings(): void {
  // Toggle OrbitControls auto-rotation without rebuilding the scene
  if (this.controls) {
    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = this.autoRotateSpeed;
  }
  this.cdr.markForCheck();
}





selectedAxisSnapshot(): Array<{ axis: 'X' | 'Y' | 'Z' | 'S'; dim: DimensionKey; label: string; value: number; note: string }> {
  if (!this.selected) return [];
  const s = this.selected;
  const dims: Array<{ axis: 'X' | 'Y' | 'Z' | 'S'; dim: DimensionKey }> = [
    { axis: 'X', dim: this.axisX },
    { axis: 'Y', dim: this.axisY },
    { axis: 'Z', dim: this.axisZ },
    { axis: 'S', dim: this.sizeDimension }, // size dimension
  ];
  return dims.map((d) => {
    const v = s.values[d.dim];
    return {
      axis: d.axis,
      dim: d.dim,
      label: this.labelOf(d.dim),
      value: v,
      note: this.describeDimension(d.dim, v),
    };
  });
}


  openAbout(): void {
    this.showAbout = true;
    this.cdr.markForCheck();
  }

  closeAbout(): void {
    this.showAbout = false;
    this.cdr.markForCheck();
  }
onAxisChange(): void {
  // The user explicitly chose these mappings.
  this.preferredAxisX = this.axisX;
  this.preferredAxisY = this.axisY;
  this.preferredAxisZ = this.axisZ;
  this.preferredSizeDimension = this.sizeDimension;

  this.axisForcedX = false;
  this.axisForcedY = false;
  this.axisForcedZ = false;
  this.sizeForced = false;

  this.applyMappingAndFilters();
}

onDimensionToggle(): void {
  // If an axis/size mapping was forced away due to a disabled dimension,
  // re‑enabling that dimension should restore the last user choice.
  const enabled = (k: DimensionKey) => this.dimensionEnabled[k];

  if (this.axisForcedX && enabled(this.preferredAxisX)) {
    this.axisX = this.preferredAxisX;
    this.axisForcedX = false;
  }
  if (this.axisForcedY && enabled(this.preferredAxisY)) {
    this.axisY = this.preferredAxisY;
    this.axisForcedY = false;
  }
  if (this.axisForcedZ && enabled(this.preferredAxisZ)) {
    this.axisZ = this.preferredAxisZ;
    this.axisForcedZ = false;
  }
  if (this.sizeForced && enabled(this.preferredSizeDimension)) {
    this.sizeDimension = this.preferredSizeDimension;
    this.sizeForced = false;
  }

  this.applyMappingAndFilters();
}



  applyMappingAndFilters(): void {
    this.enforceEnabledDimensions();
    this.updateEnabledDimensionList();

    this.rebuildCube();
    this.rebuildAxes();
    this.updatePoints();
    this.rebuildClusters();

    // If the selected approach is hidden by filters, deselect it
    if (this.selected) {
      const selVisible = !!this.approachEnabled[this.selected.id] && this.categoryEnabled[this.selected.category];
      if (!selVisible) this.selected = null;
    }

    this.updateLabelVisibility();
    this.cdr.markForCheck();
  }

  // ===== Init =====
  private initThree(): void {
    const host = this.viewportRef.nativeElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf7f7f7);

    const w = host.clientWidth || 800;
    const h = host.clientHeight || 600;

    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 2000);
    this.camera.position.set(42, 30, 42);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    host.appendChild(this.renderer.domElement);

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(w, h);
    this.labelRenderer.domElement.classList.add('css2d-overlay');
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.inset = '0';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    host.appendChild(this.labelRenderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.target.set(0, 0, 0);
    this.controls.update();

    this.controls.autoRotate = this.autoRotate;
    this.controls.autoRotateSpeed = this.autoRotateSpeed;

    // renderer: light theme + soft shadows (slightly more "realistic")
this.renderer.outputColorSpace = THREE.SRGBColorSpace;
this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
this.renderer.toneMappingExposure = 1.05;
this.renderer.shadowMap.enabled = true;
this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
// (property exists in Three; keep cast for typings across versions)
(this.renderer as unknown as { physicallyCorrectLights?: boolean }).physicallyCorrectLights = true;

// environment lighting (IBL) to make materials feel less "flat"
const pmrem = new THREE.PMREMGenerator(this.renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
this.scene.environment = envTex;
pmrem.dispose();


// lights (key + fill + subtle sky)
this.scene.add(new THREE.AmbientLight(0xffffff, 0.28));

const hemi = new THREE.HemisphereLight(0xffffff, 0xb0b7c3, 0.45);
hemi.position.set(0, 60, 0);
this.scene.add(hemi);

const key = new THREE.DirectionalLight(0xffffff, 0.95);
key.position.set(40, 70, 35);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1;
key.shadow.camera.far = 250;
key.shadow.camera.left = -80;
key.shadow.camera.right = 80;
key.shadow.camera.top = 80;
key.shadow.camera.bottom = -80;
key.shadow.bias = -0.00035;
this.scene.add(key);

const fill = new THREE.DirectionalLight(0xffffff, 0.35);
fill.position.set(-55, 35, -35);
this.scene.add(fill);

// shadow catcher plane (keeps cube readable but adds depth)
const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(260, 260),
  new THREE.ShadowMaterial({ opacity: 0.16 })
);
shadowPlane.rotation.x = -Math.PI / 2;
shadowPlane.position.y = -this.scale - 8;
shadowPlane.receiveShadow = true;
shadowPlane.renderOrder = -20;
this.scene.add(shadowPlane);

// subtle ground grid (helps depth perception, stays unobtrusive)
const grid = new THREE.GridHelper(240, 24, 0x94a3b8, 0xe2e8f0);
grid.position.y = shadowPlane.position.y + 0.02;
grid.renderOrder = -19;
const gm = (grid as unknown as { material: any }).material;
const applyGridMat = (m: any) => {
  if (!m) return;
  m.transparent = true;
  m.opacity = 0.22;
  m.depthWrite = false;
};
if (Array.isArray(gm)) gm.forEach(applyGridMat);
else applyGridMat(gm);
this.scene.add(grid);


    // groups
    this.scene.add(this.cubeGroup);
    this.scene.add(this.axesGroup);
    this.scene.add(this.pointsGroup);
    this.scene.add(this.clustersGroup);

    // points & labels
    this.buildPoints();

    // interactions
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove, { passive: true });
    this.renderer.domElement.addEventListener('click', this.onClick);
  }

approachesForCategory(category: CategoryKey): Approach[] {
  return this.approaches.filter((a) => a.category === category);
}

setAllApproaches(visible: boolean): void {
  for (const a of this.approaches) this.approachEnabled[a.id] = visible;
  this.applyMappingAndFilters();
}

setApproachesForCategory(category: CategoryKey, visible: boolean): void {
  for (const a of this.approaches) {
    if (a.category === category) this.approachEnabled[a.id] = visible;
  }
  this.applyMappingAndFilters();
}

  // ===== Utilities =====
  private clearGroup(group: THREE.Group): void {
    for (let i = group.children.length - 1; i >= 0; i--) {
      const child = group.children[i];
      group.remove(child);

      const anyChild = child as unknown as {
        element?: HTMLElement;
        geometry?: THREE.BufferGeometry;
        material?: THREE.Material | THREE.Material[];
      };

      if (anyChild.element) anyChild.element.remove();
      if (anyChild.geometry) anyChild.geometry.dispose();
      if (anyChild.material) {
        const m = anyChild.material;
        if (Array.isArray(m)) m.forEach((mm) => mm.dispose());
        else m.dispose();
      }
    }
  }

  private valueToCoord(value0to100: number): number {
    const v = THREE.MathUtils.clamp(value0to100, 0, 100);
    return ((v - 50) / 50) * this.scale;
  }

  private labelOf(key: DimensionKey): string {
    return this.dimensions.find((d) => d.key === key)?.label ?? key;
  }

private describeDimension(key: DimensionKey, value: number): string {
  // Value is expected to be in 0..100. We translate it into a short, human-readable hint.
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const level =
    v < 25 ? 'very low' :
    v < 45 ? 'low' :
    v < 60 ? 'medium' :
    v < 80 ? 'high' : 'very high';

  switch (key) {
    case 'structure':
      return `${level} structural organisation`;
    case 'granularity':
      return `${level} service granularity (monolith ↔ distributed)`;
    case 'focus':
      return `${level} domain focus (technical ↔ domain-driven)`;
    case 'coupling':
      return `${level} coupling (low ↔ high)`;
    default:
      return level;
  }
}


  private categoryColor(category: CategoryKey): string {
    return this.categories.find((c) => c.key === category)?.color ?? '#111827';
  }

  // Initialize per-approach visibility (default: all on)
  private initApproachEnabled(): void {
    // Ensure all known approaches have an entry (default true)
    for (const a of this.approaches) {
      if (this.approachEnabled[a.id] === undefined) this.approachEnabled[a.id] = true;
    }
    // Remove stale entries
    for (const id of Object.keys(this.approachEnabled)) {
      if (!this.approaches.some((a) => a.id === id)) delete this.approachEnabled[id];
    }
  }

  private firstEnabledDimension(): DimensionKey {
    return this.dimensions.find((d) => this.dimensionEnabled[d.key])?.key ?? 'structure';
  }

private updateEnabledDimensionList(): void {
  this.enabledDimensionsList = this.dimensions.filter((d) => this.dimensionEnabled[d.key]);
}

  private enforceEnabledDimensions(): void {
  // Prevent "all off" (selectors and mapping would become undefined / confusing)
  const anyEnabled = this.dimensions.some((d) => this.dimensionEnabled[d.key]);
  if (!anyEnabled) {
    this.dimensionEnabled.structure = true;
  }

  const enabled = (k: DimensionKey) => this.dimensionEnabled[k];

  if (!enabled(this.axisX)) this.axisX = this.firstEnabledDimension();
  if (!enabled(this.axisY)) this.axisY = this.firstEnabledDimension();
  if (!enabled(this.axisZ)) this.axisZ = this.firstEnabledDimension();
  if (!enabled(this.sizeDimension)) this.sizeDimension = this.firstEnabledDimension();
}

  // ===== Cube (faces + edges + inner grid) =====
  private rebuildCube(): void {
    this.clearGroup(this.cubeGroup);

    if (!this.showCubeFaces) return;

    const size = this.scale * 2;
    const half = this.scale;

    const boxGeo = new THREE.BoxGeometry(size, size, size);

    const faceOpacity = THREE.MathUtils.clamp(this.cubeFaceOpacity, 0, 0.35);

    // BoxGeometry material order: +X, -X, +Y, -Y, +Z, -Z
    const matPX = new THREE.MeshPhysicalMaterial({
      color: 0x60a5fa, // blue (X)
      roughness: 0.35,
      metalness: 0.05,
      clearcoat: 0.15,
      envMapIntensity: 0.55,
      transparent: true,
      opacity: faceOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const matNX = matPX.clone();

    const matPY = new THREE.MeshPhysicalMaterial({
      color: 0x34d399, // green (Y)
      roughness: 0.35,
      metalness: 0.05,
      clearcoat: 0.15,
      envMapIntensity: 0.55,
      transparent: true,
      opacity: faceOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const matNY = matPY.clone();

    const matPZ = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24, // amber (Z)
      roughness: 0.35,
      metalness: 0.05,
      clearcoat: 0.15,
      envMapIntensity: 0.55,
      transparent: true,
      opacity: faceOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const matNZ = matPZ.clone();

    for (const m of [matPX, matNX, matPY, matNY, matPZ, matNZ]) {
      m.polygonOffset = true;
      m.polygonOffsetFactor = 1;
      m.polygonOffsetUnits = 1;
    }

    const cube = new THREE.Mesh(boxGeo, [matPX, matNX, matPY, matNY, matPZ, matNZ]);
    cube.receiveShadow = true;
    cube.renderOrder = -10;
    this.cubeGroup.add(cube);

    // Outer edges
    const edges = new THREE.EdgesGeometry(boxGeo);
    const edgeLines = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({
        color: 0x111827,
        transparent: true,
        opacity: 0.48,
      })
    );
    edgeLines.renderOrder = -9;
    this.cubeGroup.add(edgeLines);

// Corner markers (subtle) to make the cube read as a 3D object
const cornerMat = new THREE.MeshStandardMaterial({
  color: 0x64748b,
  roughness: 0.6,
  metalness: 0.05,
      envMapIntensity: 0.35,
  transparent: true,
  opacity: 0.55,
});
const cornerGeo = new THREE.SphereGeometry(0.55, 16, 16);
for (const sx of [-1, 1]) {
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const c = new THREE.Mesh(cornerGeo, cornerMat);
      c.position.set(sx * half, sy * half, sz * half);
      c.castShadow = true;
      c.receiveShadow = true;
      c.renderOrder = -8;
      this.cubeGroup.add(c);
    }
  }
}

    // Inner grid: 3 mid-planes (x=0, y=0, z=0) => 2x2x2 = 8 sub-cubes
    if (this.showInnerGrid) {
      const gOpacity = THREE.MathUtils.clamp(this.innerGridOpacity, 0, 0.25);

      const planeGeo = new THREE.PlaneGeometry(size, size);
      const planeMat = new THREE.MeshPhysicalMaterial({
        color: 0x94a3b8, // slate
        transparent: true,
        opacity: gOpacity,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      planeMat.polygonOffset = true;
      planeMat.polygonOffsetFactor = 2;
      planeMat.polygonOffsetUnits = 2;

      const outlineMat = new THREE.LineBasicMaterial({
        color: 0x111827,
        transparent: true,
        opacity: 0.22,
      });

      const addInnerPlane = (rot: THREE.Euler) => {
        const p = new THREE.Mesh(planeGeo, planeMat.clone());
        p.receiveShadow = true;
        p.rotation.copy(rot);
        p.renderOrder = -8;
        this.cubeGroup.add(p);

        const e = new THREE.EdgesGeometry(planeGeo);
        const l = new THREE.LineSegments(e, outlineMat);
        l.rotation.copy(rot);
        l.renderOrder = -7;
        this.cubeGroup.add(l);
      };

      // x=0 plane (YZ)
      addInnerPlane(new THREE.Euler(0, Math.PI / 2, 0));
      // y=0 plane (XZ)
      addInnerPlane(new THREE.Euler(Math.PI / 2, 0, 0));
      // z=0 plane (XY)
      addInnerPlane(new THREE.Euler(0, 0, 0));

      // emphasize intersection lines
      const centerLineMat = new THREE.LineBasicMaterial({
        color: 0x111827,
        transparent: true,
        opacity: 0.30,
      });

      const makeLine = (a: THREE.Vector3, b: THREE.Vector3) => {
        const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
        const line = new THREE.Line(geo, centerLineMat);
        line.renderOrder = -6;
        this.cubeGroup.add(line);
      };

      makeLine(new THREE.Vector3(-half, 0, 0), new THREE.Vector3(half, 0, 0));
      makeLine(new THREE.Vector3(0, -half, 0), new THREE.Vector3(0, half, 0));
      makeLine(new THREE.Vector3(0, 0, -half), new THREE.Vector3(0, 0, half));
    }
  }

  // ===== Axes (ticks + labels) =====
  private rebuildAxes(): void {
    this.clearGroup(this.axesGroup);

const axesMatX = new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.55 }); // blue
const axesMatY = new THREE.LineBasicMaterial({ color: 0x059669, transparent: true, opacity: 0.55 }); // green
const axesMatZ = new THREE.LineBasicMaterial({ color: 0xd97706, transparent: true, opacity: 0.55 }); // amber
const tickMat = new THREE.LineBasicMaterial({ color: 0x111827, transparent: true, opacity: 0.25 });

const makeAxisLine = (from: THREE.Vector3, to: THREE.Vector3, mat: THREE.Material) => {
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  return new THREE.Line(geo, mat as THREE.LineBasicMaterial);
};

this.axesGroup.add(makeAxisLine(new THREE.Vector3(-this.scale, 0, 0), new THREE.Vector3(this.scale, 0, 0), axesMatX));
this.axesGroup.add(makeAxisLine(new THREE.Vector3(0, -this.scale, 0), new THREE.Vector3(0, this.scale, 0), axesMatY));
this.axesGroup.add(makeAxisLine(new THREE.Vector3(0, 0, -this.scale), new THREE.Vector3(0, 0, this.scale), axesMatZ));

    const shouldLabelTick = (v: number): boolean => {
      if (this.tickLabelMode === 'none') return false;
      if (this.tickLabelMode === 'all') return true;
      return v === 0 || v === 50 || v === 100;
    };

    const ticks = 11; // 0..100 step 10
    const tickHalf = 0.45;

    for (let i = 0; i < ticks; i++) {
      const v = i * 10;
      const x = this.valueToCoord(v);
      const y = this.valueToCoord(v);
      const z = this.valueToCoord(v);

      this.axesGroup.add(this.makeTick(new THREE.Vector3(x, -tickHalf, 0), new THREE.Vector3(x, tickHalf, 0), tickMat));
      if (shouldLabelTick(v)) this.axesGroup.add(this.makeTickLabel(String(v), new THREE.Vector3(x, -tickHalf - 0.6, 0)));

      this.axesGroup.add(this.makeTick(new THREE.Vector3(-tickHalf, y, 0), new THREE.Vector3(tickHalf, y, 0), tickMat));
      if (shouldLabelTick(v)) this.axesGroup.add(this.makeTickLabel(String(v), new THREE.Vector3(tickHalf + 0.6, y, 0)));

      this.axesGroup.add(this.makeTick(new THREE.Vector3(0, -tickHalf, z), new THREE.Vector3(0, tickHalf, z), tickMat));
      if (shouldLabelTick(v)) this.axesGroup.add(this.makeTickLabel(String(v), new THREE.Vector3(0, -tickHalf - 0.6, z)));
    }

    this.axesGroup.add(this.makeAxisTitle(`X: ${this.labelOf(this.axisX)}`, new THREE.Vector3(this.scale + 2.0, 0, 0), 'axisX'));
    this.axesGroup.add(this.makeAxisTitle(`Y: ${this.labelOf(this.axisY)}`, new THREE.Vector3(0, this.scale + 2.0, 0), 'axisY'));
    this.axesGroup.add(this.makeAxisTitle(`Z: ${this.labelOf(this.axisZ)}`, new THREE.Vector3(0, 0, this.scale + 2.0), 'axisZ'));
  }

  private makeTick(a: THREE.Vector3, b: THREE.Vector3, mat: THREE.Material): THREE.Line {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    return new THREE.Line(geo, mat as THREE.LineBasicMaterial);
  }

  private makeTickLabel(text: string, position: THREE.Vector3): THREE.Object3D {
    const el = document.createElement('div');
    el.className = 'tickLabel';
    el.textContent = text;

    const obj = new CSS2DObject(el);
    obj.position.copy(position);
    return obj;
  }

  private makeAxisTitle(text: string, position: THREE.Vector3, extraClass: string = ''): THREE.Object3D {
    const el = document.createElement('div');
    el.className = extraClass ? `axisLabel ${extraClass}` : 'axisLabel';
    el.textContent = text;

    const obj = new CSS2DObject(el);
    obj.position.copy(position);
    return obj;
  }

  // ===== Points + labels =====
  private buildPoints(): void {
    const sphere = new THREE.SphereGeometry(1, 18, 18);

    for (const a of this.approaches) {
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(this.categoryColor(a.category)),
        roughness: 0.35,
        metalness: 0.05,
        envMapIntensity: 0.85,
      });

      const mesh = new THREE.Mesh(sphere, mat);
      mesh.castShadow = true;
      mesh.renderOrder = 10;
      mesh.userData = { id: a.id };
      this.pointsGroup.add(mesh);
      this.pointMeshes.set(a.id, mesh);

      const el = document.createElement('div');
      el.className = 'label';
      el.textContent = a.name;
      el.style.display = 'none';

      const label = new CSS2DObject(el);
      label.position.set(0, 1.6, 0);
      mesh.add(label);
      this.labelObjects.set(a.id, label);
    }
  }

  private updatePoints(): void {
    for (const a of this.approaches) {
      const mesh = this.pointMeshes.get(a.id);
      if (!mesh) continue;

      const visible = this.categoryEnabled[a.category] && !!this.approachEnabled[a.id];
      mesh.visible = visible;

      const x = this.valueToCoord(a.values[this.axisX]);
      const y = this.valueToCoord(a.values[this.axisY]);
      const z = this.valueToCoord(a.values[this.axisZ]);
      mesh.position.set(x, y, z);

const sizeValue = a.values[this.sizeDimension];
// Stronger size encoding to make the 4th dimension (default: Coupling) clearly visible.
// 0..100 -> scale ~0.55..1.95 (non-linear for more contrast).
const t = THREE.MathUtils.clamp(sizeValue / 100, 0, 1);
const base = 0.45 + Math.pow(t, 1.15) * 1.80;
      (mesh.userData as Record<string, unknown>)['baseScale'] = base;
      mesh.scale.set(base, base, base);

      (mesh.material as THREE.MeshStandardMaterial).color = new THREE.Color(this.categoryColor(a.category));
    }
  }

  private setLabelVisible(id: string, visible: boolean): void {
    const obj = this.labelObjects.get(id);
    if (!obj) return;

    obj.visible = visible;
    const el = (obj as unknown as { element?: HTMLElement }).element;
    if (el) el.style.display = visible ? '' : 'none';
  }

  private updateLabelVisibility(): void {
    for (const a of this.approaches) {
      const mesh = this.pointMeshes.get(a.id);
      const enabled = !!mesh && mesh.visible;

      if (!enabled) {
        this.setLabelVisible(a.id, false);
        continue;
      }

      const isHover = this.hoveredId === a.id;
      const isSelected = this.selected?.id === a.id;

      let show = false;
      switch (this.pointLabelMode) {
        case 'all':
          show = true;
          break;
        case 'hover':
          show = isHover;
          break;
        case 'selected':
          show = isSelected;
          break;
        case 'hover+selected':
          show = isHover || isSelected;
          break;
        case 'off':
          show = false;
          break;
      }

      this.setLabelVisible(a.id, show);
    }
  }

  // ===== Cluster outlines =====
  private rebuildClusters(): void {
    this.clearGroup(this.clustersGroup);
    if (!this.showClusters) return;

    for (const c of this.categories) {
      if (!this.categoryEnabled[c.key]) continue;

      const meshes = this.approaches
        .filter((a) => a.category === c.key)
        .map((a) => this.pointMeshes.get(a.id))
        .filter((m): m is THREE.Mesh => !!m && m.visible);

      if (!meshes.length) continue;

      const centroid = new THREE.Vector3(0, 0, 0);
      for (const m of meshes) centroid.add(m.position);
      centroid.multiplyScalar(1 / meshes.length);

      let radius = 2.0;
      for (const m of meshes) radius = Math.max(radius, m.position.distanceTo(centroid) + 2.0);

      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 18, 18),
        new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(c.color),
          wireframe: true,
        })
      );
      bubble.position.copy(centroid);
      bubble.renderOrder = -1;
      this.clustersGroup.add(bubble);

      const label = this.makeAxisTitle(`${c.label}`, centroid.clone().add(new THREE.Vector3(0, radius + 1.2, 0)));
      this.clustersGroup.add(label);
    }
  }

  // ===== Render loop =====
  private startLoop(): void {
    const tick = () => {
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.labelRenderer.render(this.scene, this.camera);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  // ===== Interaction =====
  private onPointerMove = (ev: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointerNDC.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNDC.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);

    this.raycaster.setFromCamera(this.pointerNDC, this.camera);
    const hits = this.raycaster.intersectObjects([...this.pointMeshes.values()], false);

    const hit = hits[0]?.object as THREE.Object3D | undefined;
    const hitId = (hit?.userData as Record<string, unknown> | undefined)?.['id'] as string | undefined;
    const next = hitId ?? null;

    if (next !== this.hoveredId) {
      if (this.hoveredId) {
        const prev = this.pointMeshes.get(this.hoveredId);
        if (prev) {
          const base = (prev.userData as Record<string, unknown>)['baseScale'] as number | undefined;
          const b = typeof base === 'number' ? base : 1;
          prev.scale.set(b, b, b);
          (prev.material as THREE.MeshStandardMaterial).emissive.setHex(0x000000);
        }
      }

      this.hoveredId = next;

      if (this.hoveredId) {
        const mesh = this.pointMeshes.get(this.hoveredId);
        if (mesh) {
          const base = (mesh.userData as Record<string, unknown>)['baseScale'] as number | undefined;
          const b = typeof base === 'number' ? base : 1;
          mesh.scale.set(b * 1.25, b * 1.25, b * 1.25);
          (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x222222);
        }
      }

      this.updateLabelVisibility();
    }
  };

  private onClick = (ev: MouseEvent) => {
  // Determine click target via raycast (robust even if the mouse did not move before clicking)
  const rect = this.renderer.domElement.getBoundingClientRect();
  this.pointerNDC.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  this.pointerNDC.y = -(((ev.clientY - rect.top) / rect.height) * 2 - 1);

  this.raycaster.setFromCamera(this.pointerNDC, this.camera);
  const hits = this.raycaster.intersectObjects([...this.pointMeshes.values()], false);

  const hitId = (hits[0]?.object?.userData?.['id'] as string | undefined) ?? undefined;

  this.zone.run(() => {
    if (!hitId) {
      // Clicked empty space → clear selection
      this.selected = null;
      this.updateLabelVisibility();
      this.cdr.markForCheck();
      return;
    }

    const data = this.approaches.find((a) => a.id === hitId);
    this.selected = data ?? null;
    this.updateLabelVisibility();
    this.cdr.markForCheck();
  });
};




  private onResize = () => {
    const host = this.viewportRef.nativeElement;
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  };
}
