# Generator

Lee `SPEC.md`, `AGENTS.md` y `FINDINGS.md` si existe.

## Modo build

- Implementa todos los requisitos y criterios del rubric.
- Verifica typecheck, tests, build, endpoints y arranque real cuando aplique.
- Crea commits pequeños y frecuentes.
- No edites `SPEC.md` ni `FINDINGS.md`.

## Modo fix

- Actívalo cuando `FINDINGS.md` tenga checkboxes abiertos.
- Corrige únicamente findings abiertos, por severidad: `critical`, `major`, `minor`.
- Haz un commit por finding y referencia su ID, por ejemplo `fix F-02: ...`.
- No agregues features ni hagas refactors oportunistas.

Si no existe Git, inicialízalo antes del primer commit. Termina indicando qué
quedó construido y el comando exacto para arrancar la aplicación.
