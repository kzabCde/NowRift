# Gameplay upgrade visual evidence

These are actual browser captures, using original NowRift assets. The two `before-*`
images reproduce defects on unmodified main `25f7746`. Calendar captures use the normal
production build of `b600a0b`, without test instrumentation, with the browser calendar
fixed to the stated date. Generated local-player IDs belong to isolated test profiles.

| Capture | Evidence |
| --- | --- |
| [Before: HUD at 360px](before-overlap-360.png) | Tracked quest overlaps the minimap on main. |
| [Before: service selection](before-map-service.png) | Selecting a service removes the Fast Travel action on main. |
| [Monthly calendar, 360px](monthly-calendar-360.png) | Seven date columns, today's 400 Gold, missed/future states and no horizontal overflow. |
| [Monthly calendar, 1440px](monthly-calendar-1440.png) | Calendar and selected-date reward details in separate columns. |
| [Thai month history](monthly-history-thai.png) | Gregorian February 2026 history after the real Bangkok midnight transition and a persisted final-day grant. |

Movement, collision, receipts, actual teleport destinations, camera/world state and
persistence are verified by the tests; a screenshot by itself is not proof of those
behaviors. The final test report records execution results and performance samples.

## Implemented world and controls

These captures come from the complete final instrumented browser run on the same
application source. Instrumentation supplies isolated fixtures; actual input, travel,
collision, persistence, UI and rendering use the production implementation.

| Capture | Evidence |
| --- | --- |
| [HUD at 360px](hud-360.png) | Status left, minimap right, tracked objective below the minimap. |
| [HUD at 1440px](hud-1440.png) | Reserved desktop HUD zones in the live city. |
| [Service selection and travel](town-map-service.png) | The actual registered landing and Fast Travel action remain visible. |
| [Regional destination travel](regional-fast-travel.png) | A discovered regional beacon selected away from a Rift Gate. |
| [Immersive native touch](immersive-touch.png) | Optional HUD hidden; interaction prompt, reveal handle and Pause remain. |
| [Custom controls](custom-controls.png) | Scrollable controls editor showing actual rebound keys, reset actions and focus. |
| [Free combat at 390px](free-hud-390.png) | Combat speed selection, essential health and separate quest/minimap zones. |
| [Story combat at 1440px](story-hud-1440.png) | Mission objective left, navigation/tracked quest right and real 4× selection. |

[Executed checks, performance and limitations](validation.md) ·
[Full modified-file list](changed-files.txt) ·
[Architecture and save migration](../../gameplay-qol.md)
