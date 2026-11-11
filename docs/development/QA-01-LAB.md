# QA-01 — Lucem QA Lab

La guía vigente del auditor está en `docs/qa/`:

- `QA-LAB-ARCHITECTURE.md`
- `NEW-FEATURE-QUALITY-CONTRACT.md`
- `QA-LAB-USER-GUIDE.md`
- `QA-LAB-REPORT-SCHEMA.md`

El SPEC de Planner es `SPEC-QA-01.md`; el SPEC existente `SPEC.md` se preserva para DEV-DATA-01. Instala el alias local con `npm link` y ejecuta `lucem-audit --help`. La auditoría mutable requiere el target local `lucem_qa`; los perfiles de observación pública son read-only y no conectan a staging.
