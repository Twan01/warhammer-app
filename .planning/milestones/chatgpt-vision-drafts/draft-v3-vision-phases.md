# HobbyForge — Phase Index (v0.2.5+)

This file is a lightweight index. Each milestone has its own roadmap file.

| Version | Name | Phases | File | Status |
|---------|------|--------|------|--------|
| v0.2.5 | Recipes 2.0 / Painting Studio | 37–41 | `v0.2.5-ROADMAP.md` | In Progress |
| v0.2.6 | Rules Sync 2.0 / Rules Data Hub | 42–46 | `v0.2.6-ROADMAP.md` | Planned |
| v2.7 | Points & Army Lists 2.0 | 47–50 | `v2.7-ROADMAP.md` | Planned |
| v2.8 | Game Day Mode | 51–53 | `v2.8-ROADMAP.md` | Planned |
| v2.9 | Battle Intelligence 2.0 | 54–57 | `v2.9-ROADMAP.md` | Planned |
| v2.10 | Smart Planning / Next Best Action | 58–59 | `v2.10-ROADMAP.md` | Planned |
| v2.11 | Smart Wishlist / Budget Optimizer | 60–61 | `v2.11-ROADMAP.md` | Planned |

**Total:** 7 milestones, 25 phases (37–61)

## Dependency chain

```
v0.2.5 (37-41)  Recipes 2.0           ← IN PROGRESS
     ↓
v0.2.6 (42-46)  Rules Sync 2.0        ← foundation for all rules-dependent features
     ↓
v2.7 (47-50)  Army Lists 2.0        ← needs rules data from v0.2.6
     ↓
v2.8 (51-53)  Game Day Mode         ← needs list readiness from v2.7
     ↓
v2.9 (54-57)  Battle Intelligence   ← needs game day flow from v2.8
     ↓
v2.10 (58-59) Smart Planning        ← needs battle data from v2.9
     ↓
v2.11 (60-61) Smart Wishlist        ← needs recommendations from v2.10
```

## Vision

See `v3.0-ROADMAP.md` for the original product vision, constraints, and baseline audit.
