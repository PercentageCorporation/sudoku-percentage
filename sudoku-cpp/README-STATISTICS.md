# Hint statistics

This version adds per-technique execution statistics modeled on `tryHint` / `logHint` in the JavaScript `hints.js` and `hintStore.js`.

## Native C++

`HintEngine::findNextHint` records each technique attempted, including unsuccessful searches. A `Solver` owns its own engine and retains statistics across `nextStep()` / `solve()` calls.

```cpp
sudoku::Solver solver(board);
solver.solve();
std::cout << solver.statistics().toJson() << '\n';
solver.resetStatistics();
```

For direct use:

```cpp
sudoku::HintEngine engine;
auto hint = engine.findNextHint(board);
std::cout << engine.statistics().toJson() << '\n';
engine.resetStatistics();
```

`toJson()` returns `{ "functions": [...], "types": [...] }`, with the same field names and numeric rounding as JS `getHintStats()`. Functions are sorted by descending total milliseconds; types by descending count. Times are measured using `std::chrono::steady_clock` in milliseconds. C++ and JS timings should not be expected to be identical.

## WebAssembly

`getSudokuHint(boardJson, "next")` now uses the same persistent statistics-enabled engine as `getNextSudokuHint(boardJson)`. Other named-technique calls still bypass statistics. Three exported methods share that persistent `HintEngine`:

- `getNextSudokuHint(boardJson)` – execute the full hint priority list and accumulate timings.
- `getHintStats()` – return a JSON string of the accumulated statistics.
- `resetHintStats()` – clear the counters.

For example:

```js
const hint = JSON.parse(module.getNextSudokuHint(boardJson));
const stats = JSON.parse(module.getHintStats());
module.resetHintStats();
```

**Integration note:** Both `getSudokuHint(boardJson, "next")` and `getNextSudokuHint(boardJson)` accumulate statistics. Named-technique calls do not. Statistics are instance-local in native C++, and module-global for the WASM wrapper.

The JSON shape matches JavaScript `getHintStats()` exactly: arrays of function and type rows, with the same field names, sorting and rounding. To store C++ rows in the existing Zustand `hintStats` object, first convert the arrays back to keyed records (see `README-STATS-INTEGRATION.md`).
