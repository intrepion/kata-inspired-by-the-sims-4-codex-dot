# Hearth & Hollow

An original, playable household simulation kata inspired by the recognizable live-mode loop of **The Sims 4**. Guide Mira and Rowan through a quiet day at Juniper House: walk through a furnished home, queue activities, care for six needs, share a conversation, and furnish a new reading corner.

This is a bounded learning project, not a reproduction of the complete game. All characters, geometry, names, writing, home layout and interface styling are original. No EA assets are included. Not affiliated with or endorsed by Electronic Arts.

## Play locally

Requires Node.js 22.12+ (Node 24 used for validation) and a browser with WebGL.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5218/**. The server binds only to loopback and refuses to take a different port when 5218 is occupied. Existing games and their saves are untouched. No public website is deployed.

```sh
npm test          # deterministic characteristic behavior tests
npm run check     # JavaScript module/syntax validation
npm run build     # production bundle in dist/
```

## Controls

| Input | Result |
|---|---|
| Household portrait | Select Mira or Rowan; each retains a separate queue |
| Click furniture / its world label | Context menu → queue its interaction |
| Click open floor | Context menu → walk there |
| Click the other resident's label | Select them or queue a friendly conversation |
| Queue × | Cancel that pending or active action |
| Space / 0 | Toggle pause / pause |
| 1 / 2 / 3 | Normal / double / triple simulation speed |
| Q / E, camera ↶ / ↷ | Rotate the elevated 3D camera |
| Scroll, camera ＋ / − | Zoom |
| Arrow keys | Pan |
| ⌂ View | Reset camera |
| Buy nook | Pause, then click a valid free floor square to spend 90 credits |
| Escape | Close context menu / leave buy mode |
| Save | Save the household in this browser |

The in-game Guide explains the loop. Six actions fit in each queue. Travel happens before need restoration. Household members automatically seek care after three idle simulated seconds when their lowest need falls below 35; player commands interrupt autonomous actions. Autonomy stays on in normal play.

Meals cost eight credits when the resident arrives. One furnishing serves one resident at a time. Sleep restores energy, showering hygiene, the toilet bladder, leisure fun, meals hunger, and conversations both residents' social needs. Chat also raises their shared friendship. A low need below 22 yields an Uncomfortable mood; fun above 72 and social above 65 yield Happy, with 10% faster object need restoration. These thresholds and rates are original kata tuning.

Buying requires both queues to be empty. The new nook cannot overlap a resident, furnishing, decoration or wall, and must preserve access to every usable object from both residents. This is deliberately much smaller than a full build/buy editor.

## Saving

Autosaves every ten seconds and on page exit; manual Save is also available. The versioned key is `hearth-hollow-v1` in this origin's localStorage. Position, clock, needs, queues, funds, furniture and friendship persist. Invalid saves recover to a playable initial household. No offline elapsed-time catch-up runs. Camera position is session-only. Localhost and 127.0.0.1 have separate browser saves. Storage errors show a visible notice.

## Research and fidelity

Research combined official EA documentation with direct observation of the official **The Sims** channel's [Gameplay Walkthrough Official Trailer](https://www.youtube.com/watch?v=YfZOMo7q1Iw). The footage was opened in local Chrome; sampled live-mode segments around 4:01, 8:03 and 10:04 showed social positioning, character context choices, selectable household UI and object-centered activity. This observation informs the spatial, contextual interaction approach; it is not evidence for exact hidden simulation rates.

| Official evidence | Retained here | Deliberate limit |
|---|---|---|
| [EA cheats FAQ](https://www.ea.com/games/the-sims/the-sims-4/faq/cheats): needs decay normally, need-related unhappiness, household funds, placement grid; teleport/disabled decay are cheats | Continuous need decay, mood, funds, physical navigation and grid placement | Original accelerated rates and costs, no cheats |
| [EA September 22, 2026 gameplay update](https://www.ea.com/en/games/the-sims/the-sims-4/news/update-9-22-2026): queues, autonomous interactions, navigation, social positioning and 2×/3× speeds | Separate cancellable queues, idle autonomy, routes through doorway gaps, nearby chat and time controls | Four-neighbor grid rather than navmesh; one action at a time, no full multitasking; autonomy uses lowest need rather than traits/preferences |
| [EA rotation guide](https://help.ea.com/en/articles/the-sims/the-sims-4/how-to-rotate-sims-4/): build selection, grid placement, 45° and free object rotation | A bounded grid purchase, with camera orbit/zoom/pan | No object rotation, moving/selling, wall editing, catalogue or free placement; camera controls are kata controls |
| [EA death guide](https://help.ea.com/en/articles/the-sims/the-sims-4/sims-4-deaths/): hunger and extreme emotions can have severe consequences | Needs matter to comfort and behavior | Forgiving sandbox: no death, aging, accidents, careers, travel, full moodlets, personality/romance systems, aspirations, skills, expansions or full economy |

There is one shared friendship number and a compact mood calculation. No claim is made that the exact need rates, social rules, action durations, funds, home size or camera mappings match The Sims 4. Normal time advances two game minutes per real second; 2× and 3× scale that simulation. The starting 420 credits make purchases/meals bounded; there is no income system. Residents visually enter beds only after routing to them; other interactions use simple gestures rather than a full character animation system. Meal preparation and eating are folded into a single refrigerator activity. Residents do not block each other's walking cells, although object use is exclusive.

## Engineering and validation

`src/sim.js` contains serializable state and public simulation commands; `src/main.js` handles Three.js, projected accessible labels, camera and DOM input. The separation supports deterministic tests without a GPU. See [design contract](docs/design.md), [glossary](CONTEXT.md), [architecture decision](docs/adr/0001-simulation-boundary.md), and [acceptance evidence](docs/acceptance.md).

The characteristic suite covers actual movement/restoration timing, walls/doorways/decorative footprints, six needs, queue order/cancellation, time ratios, autonomy/player priority, exclusive objects, social proximity and reciprocal conversation completion, mood effects, valid/invalid purchases, save continuity and malformed-save recovery. CI runs checks, tests, production build and dependency auditing on each push. Manual Chrome input acceptance additionally checks the camera and visible household loop.

Root `.gitignore` includes the current official [Linux](https://github.com/github/gitignore/blob/main/Global/Linux.gitignore), [Windows](https://github.com/github/gitignore/blob/main/Global/Windows.gitignore) and [macOS](https://github.com/github/gitignore/blob/main/Global/macOS.gitignore) templates, fetched October 16, 2026, plus project ignores.

## License

[MIT](LICENSE). Three.js, Vite and other dependencies retain their own licenses. Optional Google Fonts supply DM Sans and Libre Caslon Display; system/Georgia fallbacks work if unavailable.
