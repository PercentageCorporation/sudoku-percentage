#include "sudoku/engine.hpp"
#include "sudoku/techniques.hpp"
#include <bit>
#include <chrono>
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
    const auto timed = [&](const char* name, auto fn) -> std::optional<Hint> {
        const auto start = std::chrono::steady_clock::now();
        auto result = fn(board);
        const auto end = std::chrono::steady_clock::now();
        const double elapsed = std::chrono::duration<double, std::milli>(end - start).count();
        statistics_.record(name, result, elapsed);
        return result;
    };
#ifdef SUDOKU_LOOPS_FIRST
    if (auto hint = timed("loops", techniques::loops)) return hint;
#endif
    if (auto hint = timed("singletons", techniques::singletons)) return hint;
    if (auto hint = timed("singleCounts", techniques::singleCounts)) return hint;
    if (auto hint = timed("nakedPairs", techniques::nakedPairs)) return hint;
    if (auto hint = timed("nakedTriples", techniques::nakedTriples)) return hint;
    if (auto hint = timed("lockedCandidates1", techniques::lockedCandidates1)) return hint;
    if (auto hint = timed("lockedCandidates2", techniques::lockedCandidates2)) return hint;
    if (auto hint = timed("hiddenPairs", techniques::hiddenPairs)) return hint;
    if (auto hint = timed("hiddenTriples", techniques::hiddenTriples)) return hint;
    if (auto hint = timed("quads", techniques::quads)) return hint;
    if (auto hint = timed("uniqueRectangles", techniques::uniqueRectangles)) return hint;
    if (auto hint = timed("emptyRectangles", techniques::emptyRectangles)) return hint;
    if (auto hint = timed("suedecoq", techniques::suedecoq)) return hint;
    if (auto hint = timed("XWing", techniques::xWing)) return hint;
    if (auto hint = timed("XChain", techniques::xChain)) return hint;
    if (auto hint = timed("XYChain", techniques::xyChain)) return hint;
    if (auto hint = timed("XYWing", techniques::xyWing)) return hint;
    if (auto hint = timed("XYZWing", techniques::xyzWing)) return hint;
    if (auto hint = timed("WWing", techniques::wWing)) return hint;
    if (auto hint = timed("WXYZWing", techniques::wxyzWing)) return hint;
    if (auto hint = timed("swordfish", techniques::swordfish)) return hint;
    if (auto hint = timed("colors", techniques::colors)) return hint;
    if (auto hint = timed("colorWing", techniques::colorWing)) return hint;
    if (auto hint = timed("als", techniques::als)) return hint;
#ifndef SUDOKU_LOOPS_FIRST
    if (auto hint = timed("loops", techniques::loops)) return hint;
#endif
    if (auto hint = timed("forcing", techniques::forcingChains)) return hint;
    if (auto hint = timed("forcingBV", techniques::biforce)) return hint;
    return std::nullopt;
}

} // namespace sudoku
