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
