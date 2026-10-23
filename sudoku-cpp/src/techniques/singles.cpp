#include "sudoku/techniques.hpp"
#include <bit>
namespace sudoku::techniques {
std::optional<Hint> singletons(const Board& board) {
    for (int i = 0; i < 81; ++i) {
        const auto& cell = board.cells[i];
        if (cell.value || std::popcount(static_cast<unsigned>(cell.candidates)) != 1) continue;
        int value = std::countr_zero(static_cast<unsigned>(cell.candidates)) + 1;
        return Hint{"cell", "Naked single", {i}, {{Operation::PlaceValue, i, value}}, cellRow(i), cellCol(i), cellSquare(i)};
    }
    return std::nullopt;
}
std::optional<Hint> singleCounts(const Board& board) {
    // Match singles.js: for each house index, test row, then column, then square;
    // for each house, return the lowest candidate value appearing exactly once.
    for (int h = 0; h < 9; ++h) {
        for (int kind = 0; kind < 3; ++kind) {
            const House& house = kind == 0 ? Rows[h] : kind == 1 ? Cols[h] : Squares[h];
            for (int value = 1; value <= 9; ++value) {
                int count = 0, last = -1;
                for (int index : house) {
                    const Cell& cell = board.cells[index];
                    if (!cell.value && (cell.candidates & digitBit(value))) { ++count; last = index; }
                }
                if (count == 1) {
                    Hint hint;
                    hint.type = kind == 0 ? "cellR" : kind == 1 ? "cellC" : "cellS";
                    hint.message = "Hidden single";
                    hint.supportCells = {last};
                    hint.deductions = {{Operation::PlaceValue, last, value}};
                    if (kind == 0) hint.row = h;
                    if (kind == 1) hint.col = h;
                    if (kind == 2) hint.square = h;
                    return hint;
                }
            }
        }
    }
    return std::nullopt;
}
}
