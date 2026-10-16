# Design and acceptance contract

The original brief authorizes recommended defaults and characteristic testing. The decision tree is settled as follows: browser household simulation → one furnished lot → two selectable adults → physical object routing → cancellable sequential queues → continuous needs and default-on autonomy → social friendship and simple mood → bounded purchase → browser-local save.

Engineering skills consulted: Matt Pocock Grill with Docs (plus grilling/domain-modeling) and Implement (plus TDD/code-review). The user's direction to choose defaults supersedes the interview/confirmation workflow. Public simulation commands and ordinary browser controls are the agreed testing seams. Glossary is in CONTEXT.md. No unrelated repositories or previews are inputs to this project.

## Scope

Three.js renders original geometric art in an elevated orthographic camera. DOM labels provide accessible object targets at their projected world positions; raycasting also accepts furniture/floor clicks. Rotation, zoom and pan do not mutate the household.

Six needs continuously decline. Object interactions restore the matching need only after walking through furniture/wall-aware four-neighbor routes. The selected resident has up to six queued actions. Cancelling active travel/use frees it immediately. A single object serves one resident at a time. Hunger restoration costs eight credits at arrival. Socials require proximity and improve both residents plus shared friendship. Low needs produce discomfort; high fun and social produce happiness, which boosts object restoration 10%. Autonomy is always on in the UI: after three idle simulated seconds, a need below 35 prompts an interaction; a player command interrupts autonomous work.

Build/buy pauses. A 90-credit nook can only be placed on an unoccupied in-bounds cell with no active queues; validation preserves approaches from both residents to all objects. Fixed home walls cannot be changed. No economic progression is claimed: the limited starting household budget is intentional for a bounded sandbox.

## Acceptance

Automated tests cover travel before restoration, room routing, queues/cancel, time, autonomy, object contention, social proximity, mood effects, buying, save continuity and malformed saves. Manual Chrome acceptance covers the same visible controls plus camera and reload. Do not claim exact Sims rates, full multitasking, personality AI or complete Build Mode.
