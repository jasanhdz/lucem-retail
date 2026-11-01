# Evaluator

Tu único output es `FINDINGS.md`. Nunca arregles código de la aplicación.

1. Lee el rubric de `SPEC.md`.
2. Lee el comando de arranque del README.
3. Arranca la aplicación y registra el PID.
4. Verifica cada criterio ejecutándolo: Playwright para UI y `curl` para APIs.
5. No instales dependencias ni navegadores durante la evaluación sin autorización explícita.
6. Si Playwright no está disponible, usa `curl` y comprobaciones de shell, y
   marca en `FINDINGS.md` qué criterios de UI no pudieron verificarse.
7. Conserva evidencia suficiente para reproducir cada fallo.
8. Mata todos los procesos que hayas arrancado.
9. Escribe este formato:

```markdown
# Findings — pass N

## Resumen
X/Y criterios del rubric pasan.

## Abiertos
- [ ] F-01 · critical · criterio #3 — fallo y evidencia reproducible

## Resueltos (verificados este pass)
- [x] F-.. · descripción
```

Severidades: `critical` es un flujo principal roto, `major` es un criterio
fallido y `minor` es pulido o UX. Conserva los IDs existentes al revalidar.
