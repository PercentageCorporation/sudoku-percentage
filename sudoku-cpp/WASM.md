# Sudoku WebAssembly bridge

The native C++ engine and tests remain unchanged. The optional Emscripten target produces
`build-wasm/sudoku.js` and `build-wasm/sudoku.wasm`.

## Build on Debian

Install/activate the Emscripten SDK (`emsdk`) and ensure `emcmake` is on PATH.

```sh
emcmake cmake -S . -B build-wasm -DSUDOKU_BUILD_WASM=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-wasm --target sudoku_wasm -j
```

This environment did not have Emscripten installed, so the WebAssembly output itself
has not been compiled here. Native tests can be run using normal CMake/CTest.

## Browser / Vite

Copy `sudoku.js` and `sudoku.wasm` together into `src/wasm/` (or automate this
in your Vite build). Import the generated ES module:

```js
import createSudokuModule from './wasm/sudoku.js';
const wasm = await createSudokuModule({
  locateFile: file => new URL(`./wasm/${file}`, import.meta.url).href
});

const board = {
  schema: 'sudoku-board-v1', indexing: 'square-major',
  values: /* 81 values */ [], candidates: /* 81 arrays */ []
};
const result = JSON.parse(wasm.getSudokuHint(JSON.stringify(board), 'next'));
// result is null or { type, message, row, col, square, supportCells,
//                     deductions: [{ operation: 'place'|'remove', cell, value }] }
```

`getSudokuHint(boardJson, technique)` accepts `next`, `biforce`, `forcing`,
`singletons`, or `singleCounts`. The result is the **C++ Hint structure**,
not yet the legacy JavaScript UI hint shape. An adapter is needed to map the
result into your existing UI's hint fields. Both sides use square-major indices.

Errors from invalid JSON/boards or unsupported technique names throw across the
Embind boundary. Call inside try/catch. The first call to the engine may be
computationally expensive; a Web Worker is recommended if searches block the UI.

Note: the current C++ Biforce result is not yet fully reconciled with the
JavaScript implementation. The bridge does not alter that algorithm.

## Call an individual technique

The second argument to `getSudokuHint(boardJson, techniqueName)` can be `next`
(the normal priority sequence) or any of these exact names:

`singletons`, `singleCounts`, `lockedCandidates1`, `lockedCandidates2`,
`nakedPairs`, `nakedTriples`, `hiddenPairs`, `hiddenTriples`,
`uniqueRectangles`, `emptyRectangles`, `xWing`, `swordfish`, `xyWing`,
`xyzWing`, `wWing`, `wxyzWing`, `xChain`, `xyChain`, `colors`, `colorWing`,
`suedecoq`, `loops`, `forcing`, `forcingChains`, `biforce`.

`forcing` is an alias for `forcingChains`. A known technique returning no
hint produces the JSON string `null`. Unknown names throw an exception.

```javascript
const hint = JSON.parse(sudoku.getSudokuHint(JSON.stringify(board), 'xyWing'));
// Use 'next' for normal operation.
```

After updating the C++ source, rebuild with:

```sh
cmake --build build-wasm --target sudoku_wasm -j
```

Then deploy the rebuilt `sudoku.js` and `sudoku.wasm` together.

## New link-based loops technique

Call `JSON.parse(sudoku.getSudokuHint(JSON.stringify(board), "loops"))`.
The `loops` implementation follows `loops(7).js` and returns `aicI`, `aicII`, or `aicIloop`. It replaces the older `aic` implementation. It limits recursive depth to 25 and the stored search tree to 10,000 links per start.
