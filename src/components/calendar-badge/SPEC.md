# Calendar badge

Shared Czech day/month/year badge, preserving the Gallery design. Receives a valid Date or ISO date string and renders native `time` with an ISO datetime and an accessible full-date label. An optional label prefix supplies context such as “Zveřejněno”. Invalid dates fail the build.

All visible date parts and the accessible label use the same timezone: UTC by default for album publication dates; workshop callers supply Europe/Prague for scheduled instants. No content querying, client JavaScript or inference of event state. Callers decide whether to render it and position it with `class`; the component owns the warm surface, typography and proportions.
