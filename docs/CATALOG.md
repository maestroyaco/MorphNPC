# Catálogo del cliente Spiritia

Se mantienen los 3.050 NPC originales y se añaden 146 ornamentos, 41 auras y
177 monturas. Las categorías comparten carrito; el ZIP organiza los archivos
en carpetas `npc`, `ornaments`, `auras` y `mounts`.

## Procedencia y vistas previas

`catalog.json` contiene el catálogo adicional. `catalog-sources.json` registra
la ruta relativa del archivo en `retroclient/clips`, su SHA-256, el símbolo,
el fotograma elegido y los hashes de los archivos publicados.

Las imágenes son capturas estáticas del renderizador JPEXS FFDec 21.1.3, no
dibujos sustitutos. Se recortan únicamente los márgenes transparentes. Para
monturas divididas, se componen las capas `staticR_back` y `staticR_front` en
sus coordenadas originales. Para auras se muestrean varios fotogramas de la
animación y se elige uno visible. El fondo oscuro facilita ver efectos blancos.

Las auras clásicas proceden de `clips/auras`; las demás, de `clips/sprites/auras`.
Sus nombres de descarga `classic-ID.swf` y `sprite-ID.swf` evitan colisiones:
para usarlas en el cliente hay que recuperar su nombre numérico original y
respetar la carpeta indicada en el registro de procedencia.

## Monturas y animaciones

Se inspeccionaron los símbolos de 2.209 SWF de `clips/sprites`, sin asumir que
todo el rango 7000 fuera de monturas. Se revisaron visualmente los candidatos
y se excluyeron objetos del mapa y las partes del jinete de `chevauchor`.

FFDec inspeccionó todos los símbolos exportados `walk*` y `run*` de las monturas
seleccionadas, incluyendo sus dependencias y líneas de tiempo anidadas. Cada
símbolo tiene animación con más de un fotograma; el resultado se guarda por
símbolo en `animation_max_frames`. Se descartaron `7000.swf` (estático) y
`9097.swf` (sin correr). **Los SWF publicados de monturas y auras son idénticos
byte a byte a los originales**, por lo que conservan todas sus animaciones,
direcciones y scripts. Las miniaturas estáticas no reemplazan el SWF.

Esta comprobación valida estructura, fotogramas y conservación de archivos;
no sustituye una prueba de cada montura montada dentro de un servidor de juego.

## Ornamentos

`clips/ornamentos.swf` es una biblioteca con símbolos `ornament_ID`. Cada
descarga individual conserva ese enlace y las definiciones necesarias,
incluidos gráficos y fuentes. También coloca el símbolo en el escenario para
que el archivo se pueda abrir por separado. No hace falta descargar toda la
biblioteca para obtener un ornamento.

## Verificación

```sh
node --check app.js
python -m unittest discover -s tests -v
python -m http.server 8765
```

También se verificaron en Chromium las cuatro categorías, búsqueda por ID,
paginación/historial, carrito persistente entre categorías, un ZIP mixto con
cuatro SWF, descarga individual y diseños de escritorio y móvil.
