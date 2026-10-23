#include "sudoku/techniques.hpp"
#include <array>
#include <vector>
namespace sudoku::techniques {
namespace {
// A pair of base houses has exactly the same two cover positions.
std::optional<Hint> findFish(const Board& board, bool rows, int digit) {
    const auto& bases = rows ? Rows : Cols;
    const auto& covers = rows ? Cols : Rows;
    std::array<std::vector<int>, 9> positions;
    for (int b = 0; b < 9; ++b) {
        for (int cell : bases[b])
            if (!board.cells[cell].value && (board.cells[cell].candidates & digitBit(digit)))
                positions[b].push_back(rows ? cellCol(cell) : cellRow(cell));
    }
    for (int a = 0; a < 9; ++a) {
        if (positions[a].size() != 2) continue;
        for (int b = a + 1; b < 9; ++b) {
            if (positions[b] != positions[a]) continue;
            Hint hint;
            hint.type = "xWing";
            hint.message = "X-Wing";
            for (int base : {a, b})
                for (int cover : positions[a])
                    hint.supportCells.push_back(rows ? cellIndex(base, cover) : cellIndex(cover, base));
            for (int cover : positions[a])
                for (int cell : covers[cover]) {
                    const int base = rows ? cellRow(cell) : cellCol(cell);
                    if (base != a && base != b && !board.cells[cell].value &&
                        (board.cells[cell].candidates & digitBit(digit)))
                        hint.deductions.push_back({Operation::RemoveCandidate, cell, digit});
                }
            if (!hint.deductions.empty()) return hint;
        }
    }
    return std::nullopt;
}
}
std::optional<Hint> xWing(const Board& board) {
    // Match wings.js: digits ascending, row-based before column-based.
    for (int digit = 1; digit <= 9; ++digit) {
        if (auto hint = findFish(board, true, digit)) return hint;
        if (auto hint = findFish(board, false, digit)) return hint;
    }
    return std::nullopt;
}
} // namespace sudoku::techniques
