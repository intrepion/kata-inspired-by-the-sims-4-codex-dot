# 1. Separate deterministic household rules from rendering

Status: accepted

A small household simulation needs behavior tests that do not depend on GPU rendering or wall-clock delays. Keep serializable household state and public commands in `src/sim.js`, and the camera, drawing and DOM input in `src/main.js`. The renderer drives short fixed maximum substeps. This trades rich asynchronous interactions for reproducible bounded behavior, straightforward saves and testable physical routing.
