# Arc42 - 3D Architecture Space

![Arc42 3D Architecture Space Demo](img/demo.png)

This is a small Angular + Three.js demo that helps you discuss architectural approaches in an **arc42** / software-architecture course.

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
4. Ask participants to challenge values: *“Where would you move CQRS? Why?”*
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

MIT - Author: Rolf Jufer (rolf.jufer@hftm.ch)


