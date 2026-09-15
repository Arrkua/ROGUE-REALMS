# ROGUE REALMS

Roguelike RPG por turnos y rutas, construido con HTML/CSS/JavaScript vanilla.

## Ejecutar
Abre `index.html` en un navegador o sirve la carpeta con cualquier servidor estático.

## GitHub Pages
1. Sube el contenido de esta carpeta a un repositorio.
2. En **Settings → Pages**, selecciona despliegue desde la rama principal y `/root`.
3. Guarda y espera a que GitHub publique el sitio.

No requiere Node, build ni dependencias locales.

## Estructura
- `index.html` — interfaz y pantallas.
- `style.css` — estilo 1280×720, responsive y pixel-art.
- `game.js` — mapa, run, combate por estados, furia, ataques, enemigos y recompensas.
- `assets/` — sprites SVG pixel-art con fondo transparente.

## Sistemas incluidos
- Mapa procedural de 8 capas con rutas ramificadas.
- Nodos Inicio, Combate, Élite, Evento, Descanso y Jefe.
- Combate con `PLAYER_TURN`, `RESOLVING`, `ENEMY_TURN`, `VICTORY`, `DEFEAT`.
- Furia máxima inicial 100 y mejora +20.
- GOLPE, TAJO PESADO, GOLPE ATURDIDOR y SEGUNDO ALIENTO.
- GOBLIN, TIZNADO y jefe Guardián del Bosque.
- Fuerza, Vitalidad, Curación y Furia máxima +20.
- Persistencia del contador de runs en `localStorage`.
