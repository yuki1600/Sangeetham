# `docs/assets/`

Static images, diagrams, and other binary docs referenced from the PRD and ADRs.

## Files this directory should contain

| File | Referenced from | Notes |
|---|---|---|
| `zoned-layout-mockup.png` | [PRD §1, §2](../PRD.md#the-mockup) | The user's hand-drawn mockup of the three-zone Sangeetham Song View layout (Audio Control Zone / Song Track Zone / Bottom Bar). **Action required:** drop the image file into this directory. The PRD currently includes a textual representation as a fallback. |

## Conventions

- PNG for screenshots and mockups, SVG for diagrams that need to scale.
- Filenames use kebab-case.
- Anything added here should be referenced from at least one Markdown file in `docs/`. Orphan assets get deleted in cleanup passes.
