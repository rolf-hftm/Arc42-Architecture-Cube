# Arc42 - 3D Architecture Space

![Arc42 3D Architecture Space Demo](img/demo.png)

This is a small Angular + Three.js demo that helps you discuss architectural approaches in an **arc42** / software-architecture course.

### What this cube shows

The "Architecture Space" cube is a didactic tool to make software architecture styles and patterns visually comparable. Instead of talking about architecture only in theory, different approaches are placed in a multi-dimensional coordinate system so you can discuss trade-offs.

- Axes (X, Y, Z): Each axis represents a property on a 0..100 scale. By default:
  - X (Structure): from rigid layered to domain-centric boundaries (ports & adapters / hexagonal)
  - Y (Granularity): from coarse-grained monoliths to fine-grained, independently deployable units (microservices)
  - Z (Focus): from technology-driven to domain-driven (DDD)
- Points (spheres): Each point represents a specific architectural approach; its position encodes the combination of the three properties. Color indicates category (structural, strategic, deployment).
- 4th dimension (point size): Sphere size encodes Coupling. Small = loosely coupled, large = tightly coupled.
- Goal: Provide a basis to discuss trade-offs. Values are didactic estimates, not scientific facts; they are meant to be challenged and adapted during a course.

Important note on the dataset: In addition to holistic architecture styles, the dataset intentionally includes individual patterns (e.g., Saga, Event Sourcing, etc.). While such patterns are not full architectures, placing them in the same space helps contrast their characteristics with architectural styles, reveal interactions and trade-offs, and provide concrete anchors for classroom discussion. This deliberate inclusion broadens comparison and fosters critical thinking about where and how a pattern shifts structure, granularity, focus, or coupling.

The image above shows the interactive 3D space where various architectural patterns are mapped as spheres within a coordinate system, allowing for visual comparison of their characteristics.

The idea: place approaches (Monolith, Modular Monolith, Layered, Hexagonal, DDD, Microservices, Pipe & Filter, Broker, …) into a **multi-dimensional space** so you can talk about trade-offs and relationships.

## What you see

* A **3D cube** represents three chosen dimensions (X/Y/Z), each on a **0..100** scale.
* Each **dot** is one architectural approach.
* The **dot size** encodes a **4th dimension** (default: **Coupling**).

You can change:

* which dimensions are shown on **X/Y/Z**
* which dimension drives **point size**
* which **categories** and **individual approaches** are visible

> The values are a didactic estimation, not a scientific truth.
> Adjust them for your course discussion.

## Dimensions

Recommended interpretation:

* **Structure**: rigid layered → inside-out / ports & adapters
* **Granularity**: monolith → many independently deployable units
* **Focus**: technology-driven → domain-driven
* **Coupling**: loosely coupled → tightly coupled (**0 = low, 100 = high**)

### Coupling vs. cohesion (important note)

* **Coupling** = how strongly components depend on each other **across** boundaries.
* **Cohesion** = how strongly things that belong together are kept **inside** the same boundary.

In this demo:

* **Coupling values are direct (not inverted):**
  **low number = low coupling**, **high number = high coupling**.
* If **Coupling** drives point size:
  **bigger point = higher (tighter) coupling**.

## How to use in class

1. Start with **all approaches enabled**.
2. Explain the current axis mapping (X/Y/Z) and what **point size** means.
3. Use the filters to reduce noise:

* toggle **categories**
* toggle **individual approaches**

4. Ask participants to challenge values: *“Where would you move Event Sourcing? Why?”*
   Then change the numbers live in the dataset.

## Run

### Local Development

```bash
npm install
npm start
```

Open: [http://localhost:4200](http://localhost:4200)

### Docker

You can also run the application using Docker Compose:

```bash
docker compose -f docker/compose.yml up -d --build
```

Open: [http://localhost:8080](http://localhost:8080)

To stop the container:

```bash
docker compose -f docker/compose.yml down
```

### Docker Hub (pull and run without building)

If you do **not** want to build the image locally, you can pull the prebuilt image from Docker Hub and run it directly.

> The container exposes the application on internal port **80**.

#### 1) Pull the image

```bash
docker pull jfr1/arc42-architecture-cube:latest
```

(Optional: use an explicit version tag)

```bash
docker pull jfr1/arc42-architecture-cube:1.0.0
```

#### 2) Run the container

Map a local port (e.g. **8080**) to the container’s port **80**:

```bash
docker run --rm -d \
  --name arc42-architecture-cube \
  -p 8080:80 \
  jfr1/arc42-architecture-cube:latest
```

Open: [http://localhost:8080](http://localhost:8080)

#### 3) Stop the container

If you started it with `-d` (detached mode):

```bash
docker stop arc42-architecture-cube
```

#### Notes (multi-arch)

The Docker Hub image is published as a multi-architecture image. Docker will automatically pull the correct variant for your system (e.g. **linux/amd64** on typical Linux servers and **linux/arm64** on Apple Silicon).

## Customize the dataset

Edit the array `approaches` in:

`src/app/architecture-space/architecture-space.component.ts`

Each approach contains:

* `category`: `structural` | `strategic` | `deployment`
* `values`: `{ structure, granularity, focus, coupling }`

## Notes

* The cube faces are transparent; the **inner grid** (3 mid-planes) makes the **2×2×2** partition (8 sub-cubes) easier to see.
* Axis lines are color-coded (X blue, Y green, Z amber) to make the spatial orientation clearer.

## Interaction

* **Auto-rotate** (default ON) slowly rotates the camera so the cube is immediately readable.
* **Click a point** to open a short in-cube info card with:

  * what the approach is about (one sentence),
  * its 0..100 values (with quick “low/mid/high” interpretation),
  * and its position on the currently selected X/Y/Z axes.

## Interpreting the dimensions

This demo uses four teaching dimensions:

* **Structure**: low = layered / technical structure → high = domain-centric boundaries (ports/adapters, clean boundaries)
* **Granularity**: low = monolithic / coarse-grained → high = distributed / fine-grained
* **Focus**: low = technology-driven → high = domain-driven
* **Coupling**: low = loosely coupled → high = tightly coupled (**encoded via sphere size** by default)

### Links

Each approach can optionally define a `url` field. When present, the right-side panel shows a **Read more** link.

## License

MIT - Author: Rolf Jufer ([rolf.jufer@hftm.ch](mailto:rolf.jufer@hftm.ch))
