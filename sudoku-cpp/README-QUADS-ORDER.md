# Quads and JavaScript technique order

`src/techniques/quads.cpp` ports the naked `quads()` implementation from the supplied `quads.js`. The JS `hiddenQuads()` is a placeholder and was not ported.

`HintEngine::findNextHint()` now follows the 26-entry JavaScript order supplied by the user. The original C++ implementation names `xWing`, `xChain`, `xyChain`, `xyWing`, `xyzWing`, `wWing`, `wxyzWing`, `forcingChains`, and `biforce` correspond to JS `XWing`, `XChain`, `XYChain`, `XYWing`, `XYZWing`, `WWing`, `WXYZWing`, `forcing`, and `forcingBV`.

For the loops-first experiment, configure with `cmake -S . -B build-loops -DSUDOKU_LOOPS_FIRST=ON`. This moves only loops to the beginning; it does not duplicate loops later. Default is OFF, preserving JavaScript normal order.

The named-technique dispatcher now recognizes `quads` and `als`. Tests cover a synthetic naked quad, and existing regression tests. This does not establish full JS/C++ deduction parity.
