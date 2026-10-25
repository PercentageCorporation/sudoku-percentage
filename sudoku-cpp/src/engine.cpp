#include "sudoku/engine.hpp"
#include "sudoku/techniques.hpp"
#include <bit>
#include <stdexcept>
#include <utility>

namespace sudoku {
namespace {
bool sees(int a, int b) {
    return a != b && (cellRow(a) == cellRow(b) || cellCol(a) == cellCol(b) || cellSquare(a) == cellSquare(b));
}
Mask legalMask(const Board& board, int index) {
    Mask mask = allDigits;
    for (int peer = 0; peer < 81; ++peer)
        if (sees(index, peer) && board.cells[peer].value)
            mask &= static_cast<Mask>(~digitBit(board.cells[peer].value));
    return mask;
}
} // namespace

bool Board::valid() const {
    for (int i = 0; i < 81; ++i) {
        const auto& c = cells[i];
        if (c.value > 9 || (c.candidates & ~allDigits)) return false;
        if (c.value && c.candidates) return false;
        if (!c.value && !c.candidates) return false;
        for (int j = 0; j < i; ++j)
            if (c.value && c.value == cells[j].value && sees(i, j)) return false;
        if (!c.value && (c.candidates & ~legalMask(*this, i))) return false;
    }
    for (int kind = 0; kind < 3; ++kind)
        for (int h = 0; h < 9; ++h) {
            const House& house = kind == 0 ? Rows[h] : kind == 1 ? Cols[h] : Squares[h];
            for (int value = 1; value <= 9; ++value) {
                bool possible = false;
                for (int index : house) {
                    const Cell& c = cells[index];
                    if (c.value == value || (!c.value && (c.candidates & digitBit(value)))) {
                        possible = true;
                        break;
                    }
                }
                if (!possible) return false;
            }
        }
    return true;
}

bool Board::solved() const {
    if (!valid()) return false;
    for (const auto& c : cells) if (!c.value) return false;
    return true;
}

void Board::initializeCandidates() {
    for (int i = 0; i < 81; ++i)
        cells[i].candidates = cells[i].value ? 0 : legalMask(*this, i);
}

bool apply(Board& board, const Deduction& d) {
    if (d.cell < 0 || d.cell >= 81 || d.value < 1 || d.value > 9)
        throw std::invalid_argument("Invalid cell or digit");
    Cell& c = board.cells[d.cell];
    Mask bit = digitBit(d.value);
    if (d.operation == Operation::RemoveCandidate) {
        if (c.value || !(c.candidates & bit)) return false;
        if (c.candidates == bit) throw std::logic_error("Elimination would leave no candidates");
        c.candidates &= static_cast<Mask>(~bit);
        return true;
    }
    if (c.value == d.value) return false;
    if (c.value || !(c.candidates & bit)) throw std::logic_error("Invalid placement");
    for (int peer = 0; peer < 81; ++peer)
        if (sees(d.cell, peer)) {
            const Cell& other = board.cells[peer];
            if (other.value == d.value) throw std::logic_error("Duplicate placement");
            if (!other.value && other.candidates == bit)
                throw std::logic_error("Placement would leave a peer with no candidates");
        }
    c.value = static_cast<std::uint8_t>(d.value);
    c.candidates = 0;
    for (int peer = 0; peer < 81; ++peer)
        if (sees(d.cell, peer) && !board.cells[peer].value)
            board.cells[peer].candidates &= static_cast<Mask>(~bit);
    return true;
}

std::optional<Hint> HintEngine::findNextHint(const Board& board) const {
    if (!board.valid() || board.solved()) return std::nullopt;
    if (auto hint = techniques::singletons(board)) return hint;
    if (auto hint = techniques::singleCounts(board)) return hint;
    if (auto hint = techniques::lockedCandidates1(board)) return hint;
    if (auto hint = techniques::lockedCandidates2(board)) return hint;
    if (auto hint = techniques::nakedPairs(board)) return hint;
    if (auto hint = techniques::nakedTriples(board)) return hint;
    if (auto hint = techniques::hiddenPairs(board)) return hint;
    if (auto hint = techniques::hiddenTriples(board)) return hint;
    if (auto hint = techniques::xWing(board)) return hint;
    if (auto hint = techniques::swordfish(board)) return hint;
    if (auto hint = techniques::uniqueRectangles(board)) return hint;
    if (auto hint = techniques::emptyRectangles(board)) return hint;
    if (auto hint = techniques::xChain(board)) return hint;
    if (auto hint = techniques::xyChain(board)) return hint;
    if (auto hint = techniques::xyWing(board)) return hint;
    if (auto hint = techniques::xyzWing(board)) return hint;
    if (auto hint = techniques::wWing(board)) return hint;
    if (auto hint = techniques::wxyzWing(board)) return hint;
    if (auto hint = techniques::colors(board)) return hint;
    if (auto hint = techniques::colorWing(board)) return hint;
    if (auto hint = techniques::suedecoq(board)) return hint;
    if (auto hint = techniques::aic(board)) return hint;
    if (auto hint = techniques::forcingChains(board)) return hint;
    if (auto hint = techniques::biforce(board)) return hint;
    return std::nullopt;
}

} // namespace sudoku
