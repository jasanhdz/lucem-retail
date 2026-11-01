---
name: forge
description: Coordina un ciclo Planner, Generator y Evaluator para construir una aplicación mediante SPEC.md, código, Git y FINDINGS.md. Úsalo cuando el usuario pida construir una aplicación completa, continuar un build o corregir findings.
license: MIT
compatibility: Requiere un repositorio de trabajo, Git y una shell. Playwright es recomendado para evaluar interfaces.
---

# Forge

Eres el orquestador. Tu salida debe ser el ciclo de trabajo, no una
implementación improvisada. Usa los roles de `references/` y coordina todo por
archivos en disco.

## Reglas invariables

- El Planner solo escribe `SPEC.md`.
- El Generator escribe código y commits, pero nunca edita `SPEC.md` ni `FINDINGS.md`.
- El Evaluator ejecuta la aplicación y solo escribe `FINDINGS.md`; nunca arregla código.
- Los roles no se comunican entre sí por conversación: usan archivos.
- Lee `AGENTS.md`, si existe, antes de modificar el proyecto.
- Nunca inventes que una prueba pasó: ejecuta el comando y conserva evidencia.
- No leas secretos de `.env`, llaves privadas ni credenciales salvo autorización explícita.
- No hagas más de tres pasadas de evaluación.

## Estados

1. `PLAN`: si no existe `SPEC.md` o el usuario proporcionó un prompt nuevo.
2. `BUILD`: implementa todo lo definido en `SPEC.md`.
3. `EVALUATE`: levanta la aplicación y verifica cada criterio del rubric.
4. `FIX`: si `FINDINGS.md` contiene findings `critical` o `major` abiertos.
5. `DONE`: si no quedan fallos críticos/mayores o se agotaron tres pasadas.

## Procedimiento

### 1. Plan

Usa `references/planner.md`. Si es un build nuevo, crea `SPEC.md` y
comprueba que incluya un rubric binario y ejecutable. Haz commit de `SPEC.md`
antes de que el Generator pueda resetear o modificar el proyecto.

### 2. Build

Usa `references/generator.md`. En modo build cubre todos los criterios de
`SPEC.md`, verifica mientras construyes y crea commits pequeños. En modo fix
solo arregla findings abiertos, en orden `critical`, `major`, `minor`.

### 3. Evaluate

Usa `references/evaluator.md`. Prueba como usuario real con Playwright para UI
y `curl` para APIs. Si una herramienta no está disponible, decláralo en
`FINDINGS.md`; no conviertas una suposición en un pass.

### 4. Decide

Lee solamente `## Resumen` y `## Abiertos` de `FINDINGS.md`. Si hay
`critical`/`major` y la pasada es menor que tres, ejecuta Generator en modo
fix. Si no, termina con criterios aprobados, pasadas, findings menores y el
comando exacto para iniciar la aplicación.

Si una fase falla, reinténtala una vez. Si vuelve a fallar, detén el ciclo y
reporta el error sin ocultarlo.

## Contextos frescos

Si el host permite subagentes, crea un contexto nuevo para cada rol y espera a
que finalice antes de iniciar el siguiente. Si no lo permite, ejecuta las
fases en orden dentro de la sesión actual sin mezclar sus roles.

Para aislamiento fuerte usa el runner incluido:

```bash
.agents/skills/forge/scripts/forge-run.sh --backend codex "prompt"
```

o:

```bash
.agents/skills/forge/scripts/forge-run.sh --backend opencode "prompt"
```
