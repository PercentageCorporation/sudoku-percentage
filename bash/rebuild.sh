#!/bin/bash

// this needs to be run from the .../sudoku/sudoku-cpp directory
# rebuild
cmake --build build -j
cmake --build build-wasm --target sudoku_wasm -j
# copy the needed files for javascript
cp ./build-wasm/sudoku.js ../packages/common/src/wasm/sudoku.js
cp ./build-wasm/sudoku.wasm ../packages/common/src/wasm/sudoku.wasm
