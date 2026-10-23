# Sudoku C++ engine — initial prototype

Portable C++20 static library with a native regression-test executable.

## Build on Debian

```sh
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
ctest --test-dir build --output-on-failure
```

## Implemented

- Square-major indexing compatible with `constants.js`.
- `Board` of 81 values and candidate bitmasks (bit 0 is digit 1).
- `Board::initializeCandidates()` for values-only input.
- `HintEngine::findNextHint()` with `singletons`, `singleCounts`, and `lockedCandidates1` in original priority order.
- `Solver::nextStep()` and `Solver::solve()` with per-deduction change records.
- Basic validity checks and regression tests.

## Important constraints

- For web integration, import **active** candidates directly. Do **not** call `initializeCandidates()` on an imported interactive state: it would reintroduce logically eliminated candidates.
- `findNextHint()` is read-only. `nextStep()` applies changes to its private board.
- No WebAssembly binding is included yet; first validate the native interface and hint behavior.
- No ALS, AIC, forcing, or other advanced algorithms have been translated yet.
- Hint messages are placeholders. Complex highlighting metadata needs a separate design pass.
- The solver stops when no supported hint is found; it does **not** claim to solve every Sudoku.
- The input board must be a consistent Sudoku candidate state. The initial validator checks duplicates, candidate legality, and missing house digits.

## Next steps

1. Add fixture files containing 81 values and 81 candidate masks, captured from the JS engine.
2. Add tests for hidden singles and locked candidates with explicit expected deductions.
3. Expand hint explanation fields based on ALS/AIC output needs.
4. Introduce a stable C API / Emscripten bindings after native behavior is validated.

## Export and inspect real JavaScript board states

Copy `tools/exportBoard.js` into the web application's source tree (adjust its
`cellStore` import if needed). Import and call `downloadSudokuFixture('my-puzzle-step-01')`
from a temporary debug button or browser-console-accessible debug function.
The download contains 81 **square-major** values and 81 active-candidate lists.
It does not use the separate UI candidate/elimination history, and does not
recompute candidates. Never use the original unfiltered candidate list here.

Place the downloaded JSON in `tests/fixtures/` and run:

```sh
cmake -S . -B build
cmake --build build
./build/sudoku_fixture_tests tests/fixtures/my-puzzle-step-01.json
ctest --test-dir build --output-on-failure
```

The fixture reader rejects malformed dimensions, candidate digits, solved-cell
candidate lists, unsupported schema/indexing, and inconsistent Sudoku boards.
It prints the first supported hint and deductions. The bundled `one_missing.json`
fixture is registered in CTest; additional captured files can be examined using
the executable directly. **The tool does not yet compare against JavaScript
expected hints**: capture and record those expectations before using this as a
cross-language equivalence test. No third-party JSON dependency is required;
the reader intentionally supports only the documented fixture schema.

For more demanding techniques, compare deductions semantically rather than
requiring the same first hint when search order differs.

## Regression tests from the JavaScript application

The files `tests/fixtures/single.json` and `single_row.json` are actual exported
square-major board states, including their active candidates. The test executable
`tests/regression_tests.cpp` asserts the **first** hint's technique, operation,
cell index (zero-based), and digit, and returns nonzero if they differ.

- `single.json`: `cell`, place 2 at index 4.
- `single_row.json`: `cellR`, place 3 at index 21.

Run `cmake -S . -B build && cmake --build build && ctest --test-dir build --output-on-failure`.
For a manual assertion use:
`./build/sudoku_regression_tests tests/fixtures/single.json cell 4 2`.

When adding a locked-candidate fixture, verify the actual elimination(s), then add
a test that checks the `locked` hint and its removal deductions. The current
regression executable is intentionally limited to one value-placement deduction;
it should be extended for elimination hints rather than weakening its assertions.

### Locked candidate regression fixture

`tests/fixtures/locked_xwing.json` captures the board before a locked-candidate
deduction (and a later X-Wing in the JavaScript solver). The regression
asserts that the first hint is `locked` and removes candidate 4 from
square-major cell index 12. The subsequent X-Wing is not yet tested, since
the C++ engine does not implement X-Wing.

## Technique modules

The engine dispatches to independent functions declared in
`include/sudoku/techniques.hpp`:

- `src/techniques/singles.cpp`: naked and hidden singles
- `src/techniques/locked.cpp`: locked candidates (pointing)
- `src/techniques/fish.cpp`: X-Wing (row and column orientations)
- `src/solver.cpp`: step application and history
- `src/engine.cpp`: board validation, candidate initialization, deduction
  application, and priority-based hint dispatch

X-Wing follows locked candidates in hint priority. The new `sudoku_fish_tests`
uses a synthetic candidate grid to exercise row-based X-Wing; a real exported
X-Wing fixture is still needed for cross-language regression coverage.

### Real column X-Wing regression

`tests/fixtures/XWing-Column.json` is an exported board immediately before a
column-oriented X-Wing. `regression_xwing_column` invokes the X-Wing technique
directly and asserts its four supporting cell indices (6, 57, 25, 76), plus
exactly one deduction: remove candidate 3 from cell 68. This is independent
of the engine's technique priority. Run with `ctest --test-dir build --output-on-failure`.

### Pair and triple techniques

The engine now calls naked pairs, naked triples, hidden pairs and hidden triples
(after locked candidates and before X-Wing). Their implementations are isolated
in `src/techniques/pairs.cpp` and `src/techniques/triples.cpp`.
The `sudoku_subset_tests` target checks one candidate elimination for each.
The original exported-board regressions are preserved. These are synthetic
subset tests; real exported-board fixtures for the new techniques are still useful.

## Rectangle techniques (incremental)

`src/techniques/rectangles.cpp` contains a square-major shared rectangle enumerator,
Unique Rectangle Type 1, Type 2, a limited Type 3 (virtual naked subset), Type 4,
and Empty Rectangle. The main hint engine invokes these after X-Wing.

Three positive regression fixtures currently confirm Type 3, Type 4 and Empty
Rectangle deductions. Type 1 and Type 2 implementations are **not yet validated**
against their intended fixture; `ur_type_1.json` yields no UR deduction and
`ur_type_2.json` currently yields Type 4. The Type 7 fixture also does not yield
a validated Type 7 deduction. Types 5, 6 and 7 are not implemented.
Do not interpret passing tests as complete validation of all rectangle types.
Unique Rectangles require a puzzle known to have a unique solution.

### Unique Rectangle Type 5 regressions

`ur_type_5_2.json` checks diagonal extra corners 9 and 71 with shared
extra candidate 9, removing candidate 9 at square-major index 63.
`ur_type_5_3.json` checks three extra corners 9, 69 and 71, with the
same elimination. The detector uses common-peer intersection and keeps
Type 2's adjacent two-corner case distinct.

### Unique Rectangle Types 6 and 7 (incremental)

Types 6 and 7 use a conservative local enumeration of rectangle assignments.
A candidate is removed only when **every feasible assignment under that
candidate** places just the two rectangle base digits in all four corners,
creating a swappable deadly pattern. Candidate masks are assumed to include
all genuine solution candidates, and the Sudoku is assumed to have a unique
solution. This is a sufficient test, not a complete implementation of every
published Type 6/7 pattern.

The `ur_type_7.json` regression checks elimination of candidate 1 at
square-major index 9. Type 6 has no positive regression fixture yet.
Earlier Types 1–5 retain search priority over Types 6/7.

### Unique Rectangle Type 6 regression

`tests/fixtures/ur_type_6.json` is a positive Type 6 fixture, saved before
candidate elimination. The expected deduction is removal of candidate 8 from
square-major cell index 28. Run `ctest --test-dir build --output-on-failure`
to check this case together with all existing regressions.
