# INDY-5 Turbo Burger

> An automated restaurant, simulated in NVIDIA Isaac Sim.

A Universal Robots arm with three interchangeable end-effectors — a parallel gripper, a spatula-style flipper, and a smasher plate — cooks, flips, smashes, and assembles smash burgers on a fully simulated kitchen line. Built as a CS 4850 senior project at Kennesaw State University, Spring 2026.

**[→ Project website](https://pahtolo.github.io/turbo-burger-site/)** · **[→ Final report (PDF)](docs/FinalReport.pdf)** · [Status: 🟡 Core infra ready · flip in progress]

---

## What it does

Turbo Burger models a stationary burger workcell end-to-end:

- **Workcell layout.** A UR arm sits at the center. A stove sits in front of it. A handoff plane sits behind it.
- **Perception.** A Python script drives the patty material through a color ramp (raw pink → browned → charred) and emits a readiness flag.
- **Control.** A finite state machine sequences arm motion and end-effector swaps: `INIT → HOME → PICK_PATTY → PLACE_ON_STOVE → SMASH → WAIT_COOK_SIDE_A → FLIP → WAIT_COOK_SIDE_B → PICK_FROM_STOVE → PLACE_ON_ASSEMBLY → HANDOFF`.
- **Environment.** A USD scene holds the arm, ingredients, stove, handoff plane, and workcell geometry. Everything runs in-process inside Isaac Sim.

## Status

| Area | State | Notes |
|---|---|---|
| Scene & arm init | ✅ | Arm spawns in home pose, validates joint angles. |
| Perception | ✅ | Readiness flag emits correctly on cook and on failure injection. |
| Collision safety | ✅ | No unintended collisions during full runs. |
| Gripper actuation | 🟡 | Attaches visually but does not actuate reliably — blocks pick/place. |
| Flip trajectory | 🟡 | Scaffolded; does not yet consistently invert the patty. |
| Full cycle | ⬜ | Pending the two items above. |

Test results: **6 passed, 3 failed, 0 skipped** (see the [final report](docs/FinalReport.pdf) for details).

## Requirements

- NVIDIA Isaac Sim 5.10
- Python 3.11 (Isaac Sim's embedded interpreter)
- Ubuntu 24.04 LTS (developed and tested)
- NVIDIA GPU (developed on RTX 3060 Ti)

## Quick start

```bash
# Clone
git clone https://github.com/Pahtolo/turbo-burger-site.git
cd INDY-05---Turbo-Burger

# TODO: document the exact launch command the team settled on, e.g.:
# ./run.sh
# or
# $ISAAC_SIM_PATH/python.sh scripts/main.py
```

> **TODO (team):** fill in the actual launch command, any required environment variables, and the path to the scene file.

## Repo layout

```
INDY-05---Turbo-Burger/
├── assets/           # Website meshes and media
│   ├── ur5e.glb
│   └── universal-robots-graphical-documentation-terms.txt
├── scripts/          # Python modules: arm, end-effectors, patty  [TODO: confirm]
│   ├── arm_controller.py
│   ├── end_effector_manager.py
│   ├── patty_state.py
│   ├── recipe_runner.py
│   └── scene_loader.py
├── docs/             # Final report, design artifacts
├── tests/            # Test cases TC-01 through TC-09             [TODO: confirm]
├── index.html        # Project website entry point
├── styles.css        # Website styling
├── main.js           # Scroll choreography and UI behavior
├── arm-scene.js      # Three.js UR5e-labeled arm and patty workcell scenes
├── DEPLOY.md         # How to publish the site
└── README.md
```

> **TODO (team):** swap this for the actual tree once the layout is finalized.

## Architecture

Three cooperating layers, all in one Python process inside Isaac Sim:

1. **Simulated environment** — USD scene with the arm, workcell geometry, and ingredient spawn points.
2. **Perception layer** — `patty_state` samples cook state and publishes a readiness enum.
3. **Controller layer** — `recipe_runner` FSM commands arm motion and end-effector swaps in response to readiness events.

Communication between layers is in-process (shared Python state). No external bus, no network hop.

See the [final report](docs/FinalReport.pdf) §3 for the full architecture breakdown, data models, and design rationale.

## Team

| Name | Role |
|---|---|
| Will Martin | Team Lead · Developer · Website |
| Michael Collins | Developer · Documentation |
| Logan Nelson | Developer · Documentation |

## Website

The project website is a static GitHub Pages bundle at the repo root. It uses Three.js from a CDN plus a local arm mesh rendered as the project's UR5e version. See [`DEPLOY.md`](DEPLOY.md) for setup.

The arm mesh is a derivative of Universal Robots graphical documentation. Keep `assets/universal-robots-graphical-documentation-terms.txt` with the site assets when publishing.

## License

> **TODO (team):** pick a license (MIT is a common default for student projects) and add `LICENSE` at the repo root.

## Course

CS 4850 · Section 02 · Kennesaw State University · Spring 2026
