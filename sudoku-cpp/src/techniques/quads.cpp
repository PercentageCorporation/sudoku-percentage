#include "sudoku/techniques.hpp"
#include <bit>
#include <vector>

namespace sudoku::techniques {
namespace {
std::optional<Hint> findQuads(const Board& board, const House& house) {
    std::vector<int> eligible;
    for (int cell : house)
        if (!board.cells[cell].value && std::popcount(static_cast<unsigned>(board.cells[cell].candidates)) > 1)
            eligible.push_back(cell);
    if (eligible.size() < 5) return std::nullopt;
    for (std::size_t i = 0; i < eligible.size(); ++i)
        for (std::size_t j = i + 1; j < eligible.size(); ++j)
            for (std::size_t k = j + 1; k < eligible.size(); ++k)
                for (std::size_t l = k + 1; l < eligible.size(); ++l) {
                    const int a = eligible[i], b = eligible[j], c = eligible[k], d = eligible[l];
                    Mask values = board.cells[a].candidates | board.cells[b].candidates |
                                  board.cells[c].candidates | board.cells[d].candidates;
                    if (std::popcount(static_cast<unsigned>(values)) != 4) continue;
                    Hint hint;
                    hint.type = "quad";
                    hint.message = "Quad";
                    hint.supportCells = {a,b,c,d};
                    for (int cell : house) {
                        if (cell == a || cell == b || cell == c || cell == d || board.cells[cell].value) continue;
                        Mask remove = board.cells[cell].candidates & values;
                        for (int value = 1; value <= 9; ++value)
                            if (remove & digitBit(value))
                                hint.deductions.push_back({Operation::RemoveCandidate, cell, value});
                    }
                    if (!hint.deductions.empty()) return hint;
                }
    return std::nullopt;
}
} // namespace
std::optional<Hint> quads(const Board& board) {
    for (int h = 0; h < 9; ++h) {
        if (auto hint = findQuads(board, Rows[h])) return hint;
        if (auto hint = findQuads(board, Cols[h])) return hint;
        if (auto hint = findQuads(board, Squares[h])) return hint;
    }
    return std::nullopt;
}
} // namespace sudoku::techniques
