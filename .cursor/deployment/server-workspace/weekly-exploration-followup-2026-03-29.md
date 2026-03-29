# Weekly exploration follow-up — 2026-03-29

## Snapshot (from `weekly-analysis-2026-03-29.md`)
- Total sources: 21 → **very low proven coverage**
- Proven: **1** (@serge_ai)
- Exploration: 20
- Rejected: 0

## 33% rule (practical)
- Target digest size ≈ 12 items → **~4 items** from exploration sources.
- With only 1 proven source, the “67% proven” side can’t be satisfied symmetrically.

## What I changed (system state)
Added **3 new RSS sources** into `source-status-tracking.json` as `auto_discovered` + queued them in `exploration_queue.high_priority`:
1) https://datamachina.substack.com/feed (AI research/tools)
2) https://www.roboticstomorrow.com/rss/news/ (robotics industry news)
3) https://aviationweek.com/rss.xml (aviation / eVTOL adjacency)

## Recommendations (next week)
- Keep rotation tight: prioritize exploration sources with 0–2 reactions until each hits **5–10 reactions**.
- Promotion gate suggestion (unchanged): promote to proven at ≥10 reactions and avg_rating ≥1.5.
- Add 0–1 sources/week after this (until proven reaches 3–5), otherwise exploration pool grows faster than feedback.

## Files
- Generated report: `weekly-analysis-2026-03-29.md`
- Updated: `source-status-tracking.json`
