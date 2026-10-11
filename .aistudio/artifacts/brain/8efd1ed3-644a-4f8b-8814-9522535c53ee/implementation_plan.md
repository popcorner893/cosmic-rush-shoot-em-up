# Nuevo Menú Principal - Cosmic Rush

Sustitución completa del menú de inicio previo (eliminando el formulario de piloto y la selección de perfil táctico) para integrar la nueva portada oficial basada en la imagen proporcionada (**Main_Menu.jfif**), incorporando los cinco botones interactivos con resplandor neón, efectos de sonido retro de sintetizador y redirección del botón **Historia** al juego actual.

---

## Decisiones Críticas y Preferencias Confirmadas

> [!IMPORTANT]
> Decisiones de diseño y comportamiento confirmadas en la fase de consulta:

- **Efecto Visual al Pasar el Cursor (Hover)**: Resplandor neón exterior con sutil aumento de escala (`transform: scale(1.03)` junto a `box-shadow` reactiva de color cian/dorado sobre los botones).
- **Efectos de Sonido Retro**: Sí, síntesis de audio procedural retro (Web Audio API) con tonos sutiles de sintetizador para eventos `mouseenter` (hover suave) y `click` (confirmación arcade).
- **Fidelidad Estricta a la Portada**: Se utiliza directamente la imagen oficial del menú proporcionada (`Main_Menu.jfif`), sin recreaciones abstractas ni menús genéricos, posicionando los interactores sobre las áreas de los botones:
  1. **Iniciar sesión** (superior derecha).
  2. **Historia** (derecha inferior, primer botón - **único con acción activa**: inicia el juego).
  3. **Infinito** (derecha inferior, segundo botón - inactivo temporalmente).
  4. **Ranking** (derecha inferior, tercer botón - inactivo temporalmente).
  5. **Insertar Código** (inferior izquierda - inactivo temporalmente).
- **Eliminación Total de Perfil Táctico**: Se retira de la portada inicial todo el bloque de selección de naves/avatares ("Fénix", "Valkiria", "Titán-9", "Espectro") y el campo de texto de piloto obligatorio para dar paso directo a la experiencia arcade inmersiva.

---

## 1. Visión General y Concepto

- **Qué hace**: Presenta una portada de inicio de alta fidelidad visual en formato panorámico 16:9 con la ilustración oficial de *Cosmic Rush*, sobre la cual los jugadores pueden interactuar con los cinco botones temáticos.
- **Flujo Principal**:
  1. Al cargar la página, se muestra la portada de *Cosmic Rush* a pantalla completa (dentro del contenedor 16:9 del juego).
  2. Al pasar el ratón sobre cualquiera de los 5 botones, se produce una reacción visual inmediata (borde con resplandor neón y sutil expansión) junto con un sutil sonido sintetizado.
  3. Al pulsar **Historia**, se ejecuta la transición directa al juego existente: se oculta el menú principal, se activa el HUD panorámico y comienza la oleada espacial de la nave.
  4. Los botones **Infinito**, **Ranking**, **Insertar Código** e **Iniciar sesión** cuentan con respuesta visual y sonora al hover/click, pero no disparan acciones externas ni interfieren con el juego actual.

---

## 2. Experiencia de Usuario y Diseño Visual

![Portada del Menú Principal](Main_Menu.jfif)

### A. Estructura de la Portada
- Contenedor `#mainMenuOverlay` adaptado a la relación de aspecto 16:9 del juego, ocupando el 100% del marco visual sin alterar las proporciones de la ilustración.
- Fondo establecido con la imagen oficial `Main_Menu.jfif`.
- Botones mapeados con precisión porcentual para adaptarse de manera responsiva:
  - **Iniciar Sesión**: Posicionado en `top: 4.5%`, `right: 3%`, con icono y tipografía arcade acorde a la ilustración.
  - **Historia**: Posicionado en `top: 57.5%`, `right: 3%`, ancho ~20%, alto ~11%.
  - **Infinito**: Posicionado en `top: 71.5%`, `right: 3%`, ancho ~20%, alto ~11%.
  - **Ranking**: Posicionado en `top: 85.5%`, `right: 3%`, ancho ~20%, alto ~11%.
  - **Insertar Código**: Posicionado en `bottom: 4.5%`, `left: 3%`, ancho ~21%, alto ~8.5%.

### B. Micro-interacciones de Hover y Sonido
- **Hover**:
  - `transform: scale(1.04) translateY(-2px);`
  - `box-shadow: 0 0 25px rgba(255, 200, 50, 0.6), inset 0 0 15px rgba(255, 255, 255, 0.4);`
  - Filtro de brillo sutil para realzar la tonalidad del botón original.
  - Cursor `pointer`.
- **Audio Procedural**:
  - `playMenuHoverSound()`: Tono breve de sintetizador (~600Hz a 800Hz, 40ms, volumen suave) para dar retroalimentación táctil de alta calidad.
  - `playMenuClickSound()`: Arpegio ascendente retro (~440Hz a 880Hz, 80ms) para confirmación de pulsación.

---

## 3. Decisiones Técnicas y Ajustes de Código

### A. Limpieza de Funcionalidades Obsoletas
- **Eliminar de `index.html`**:
  - El contenedor antiguo `.login-form-group` de "SELECCIONA TU PERFIL TÁCTICO" con sus 4 avatares (`data-avatar="phoenix"`, etc.).
  - El campo de texto `#pilotInput` de "INGRESA TU NOMBRE DE PILOTO".
  - La tarjeta antigua `#loginOverlay` con el botón `#btnStartGame` y `#btnShowLeaderboard`.
- **Reemplazar por `#mainMenuOverlay`**:
  - Estructura limpia y semántica con los 5 botones interactivos (`#btnMenuStory`, `#btnMenuEndless`, `#btnMenuRanking`, `#btnMenuCode`, `#btnMenuLogin`).

### B. Actualización en `js/game.js`
- Desacoplar el inicio del juego de la selección obligatoria de avatar/perfil táctico (estableciendo un perfil por defecto o manteniendo el estado sin bloquear).
- Conectar el evento `click` de `#btnMenuStory` para llamar a la función de inicio de partida (`startGame()` o equivalente), ocultando `#mainMenuOverlay` y mostrando el juego activo.
- Añadir listeners de hover con throttling para emitir los efectos de sonido sin saturar el canal de audio.

### C. Estilos en `css/arcade.css`
- Definición de `.main-menu-container` y `.menu-hotspot-btn` con posicionamiento absoluto porcentual, transiciones suaves de 150ms y efectos de resplandor neón adaptados a la paleta cálida y dorada de los botones de la imagen.

---

## 4. Arquitectura y Flujo del Menú

```
┌─────────────────────────────────────────────────────────────┐
│                 PANTALLA ARCADE (1280x720 HD)               │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │        #mainMenuOverlay (Imagen: Main_Menu.jfif)    │   │
│   │                                                     │   │
│   │                         [ 👤 INICIAR SESIÓN ]       │   │
│   │                                                     │   │
│   │            COSMIC RUSH                              │   │
│   │                                  [ HISTORIA ] ──────┼───► Inicia el juego actual
│   │                                  [ INFINITO ]       │     (Oculta menú, muestra HUD)
│   │                                  [ RANKING ]        │
│   │   [ INSERTAR CÓDIGO ]                               │   │
│   └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               ▲
                               │ Hover / Click
                               ▼
        ┌──────────────────────────────────────────────┐
        │       Motor de Audio (js/audio.js)           │
        │ - Hover: Beep retro suave sintetizado        │
        │ - Click: Tono arcade afirmativo              │
        └──────────────────────────────────────────────┘
```

---

## Verificación y Pruebas
1. Carga inicial: El menú principal muestra la ilustración completa con los 5 botones visibles en sus posiciones correctas en resolución 16:9.
2. Interacción de hover: Pasar el ratón por cada botón activa el resplandor neón, la escala y el sonido retro.
3. Acción de 'Historia': Hace clic en 'Historia', oculta la portada y lanza el juego en el canvas panorámico.
4. Resto de botones: Reaccionan con hover y sonido sin romper el flujo ni realizar acciones indebidas.
5. Verificación de compilación: Ejecución de `compile_applet` para confirmar la ausencia de errores.
