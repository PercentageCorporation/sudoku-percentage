#pragma once
#include <array>

namespace sudoku {
// Square-major indexing, matching the JavaScript constants.js.
// The tables are generated at compile time and have no runtime setup cost.
using House = std::array<int, 9>;
using Houses = std::array<House, 9>;
using CellCoordinates = std::array<int, 3>; // row, column, square

namespace detail {
constexpr int indexFromRowCol(int row, int col) {
    return ((row / 3) * 3 + col / 3) * 9 + (row % 3) * 3 + col % 3;
}
constexpr int rowFromIndex(int index) { return (index / 27) * 3 + (index % 9) / 3; }
constexpr int colFromIndex(int index) { return ((index / 9) % 3) * 3 + index % 3; }
}

constexpr Houses makeRows() {
    Houses result{};
    for (int r = 0; r < 9; ++r)
        for (int c = 0; c < 9; ++c) result[r][c] = detail::indexFromRowCol(r, c);
    return result;
}
constexpr Houses makeCols() {
    Houses result{};
    for (int c = 0; c < 9; ++c)
        for (int r = 0; r < 9; ++r) result[c][r] = detail::indexFromRowCol(r, c);
    return result;
}
constexpr Houses makeSquares() {
    Houses result{};
    for (int s = 0; s < 9; ++s)
        for (int n = 0; n < 9; ++n) result[s][n] = s * 9 + n;
    return result;
}
constexpr std::array<CellCoordinates, 81> makeRCS() {
    std::array<CellCoordinates, 81> result{};
    for (int i = 0; i < 81; ++i)
        result[i] = {detail::rowFromIndex(i), detail::colFromIndex(i), i / 9};
    return result;
}
constexpr std::array<int, 81> makeLinearToGrid() {
    std::array<int, 81> result{};
    for (int r = 0; r < 9; ++r)
        for (int c = 0; c < 9; ++c) result[r * 9 + c] = detail::indexFromRowCol(r, c);
    return result;
}
constexpr std::array<std::array<std::array<int, 3>, 3>, 9> makeSquareRowCells() {
    std::array<std::array<std::array<int, 3>, 3>, 9> result{};
    for (int s = 0; s < 9; ++s)
        for (int r = 0; r < 3; ++r)
            for (int c = 0; c < 3; ++c) result[s][r][c] = s * 9 + r * 3 + c;
    return result;
}
constexpr std::array<std::array<std::array<int, 3>, 3>, 9> makeSquareColCells() {
    std::array<std::array<std::array<int, 3>, 3>, 9> result{};
    for (int s = 0; s < 9; ++s)
        for (int c = 0; c < 3; ++c)
            for (int r = 0; r < 3; ++r) result[s][c][r] = s * 9 + r * 3 + c;
    return result;
}
constexpr std::array<std::array<int, 3>, 9> makeSquareRows() {
    std::array<std::array<int, 3>, 9> result{};
    for (int s = 0; s < 9; ++s)
        for (int r = 0; r < 3; ++r) result[s][r] = (s / 3) * 3 + r;
    return result;
}
constexpr std::array<std::array<int, 3>, 9> makeSquareCols() {
    std::array<std::array<int, 3>, 9> result{};
    for (int s = 0; s < 9; ++s)
        for (int c = 0; c < 3; ++c) result[s][c] = (s % 3) * 3 + c;
    return result;
}

inline constexpr auto Rows = makeRows();
inline constexpr auto Cols = makeCols();
inline constexpr auto Squares = makeSquares();
inline constexpr auto RCS = makeRCS();
inline constexpr auto LinearToGrid = makeLinearToGrid();
inline constexpr auto sqRowCells = makeSquareRowCells();
inline constexpr auto sqColCells = makeSquareColCells();
inline constexpr auto sqRows012 = makeSquareRows();
inline constexpr auto sqCols012 = makeSquareCols();

// Compatibility helpers now read lookup tables instead of doing arithmetic.
constexpr int cellIndex(int row, int col) { return Rows[row][col]; }
constexpr int cellRow(int index) { return RCS[index][0]; }
constexpr int cellCol(int index) { return RCS[index][1]; }
constexpr int cellSquare(int index) { return RCS[index][2]; }

static_assert(Rows[0][3] == 9 && Cols[0][3] == 27);
static_assert(RCS[28][0] == 3 && RCS[28][1] == 1 && RCS[28][2] == 3);
static_assert(LinearToGrid[3] == 9);
static_assert(sqRowCells[5][1][2] == 50 && sqColCells[5][2][1] == 50);
} // namespace sudoku
