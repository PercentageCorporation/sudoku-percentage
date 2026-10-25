# Square-major lookup tables

`include/sudoku/constants.hpp` generates at compile time the same coordinate tables as the JavaScript `constants.js`: `Rows`, `Cols`, `Squares`, `RCS`, `LinearToGrid`, `sqRowCells`, `sqColCells`, `sqRows012`, and `sqCols012`. All are zero-based and `inline constexpr`. Existing `cellIndex`, `cellRow`, `cellCol`, and `cellSquare` APIs now read those tables, so all techniques use the tables without source changes.

The UI-specific `LRUD`, `BLRUD`, and `bstyles` were deliberately not ported to the C++ solving engine.

Configure from scratch on your machine using `cmake -S . -B build`, then `cmake --build build -j4` and `ctest --test-dir build --output-on-failure`. Generated `build/` content is excluded from the ZIP.
