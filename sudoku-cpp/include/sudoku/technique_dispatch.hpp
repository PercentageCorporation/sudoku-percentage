#pragma once

#include "sudoku/techniques.hpp"
#include <stdexcept>
#include <string>

namespace sudoku {
// Exact technique names exposed by the WebAssembly JSON interface.
// Keep this dispatcher usable in native tests (no Emscripten dependency).
inline std::optional<Hint> findHintByName(const Board& board, const std::string& name) {
    if (name == "next") return HintEngine{}.findNextHint(board);
    if (name == "singletons") return techniques::singletons(board);
    if (name == "singleCounts") return techniques::singleCounts(board);
    if (name == "lockedCandidates1") return techniques::lockedCandidates1(board);
    if (name == "lockedCandidates2") return techniques::lockedCandidates2(board);
    if (name == "nakedPairs") return techniques::nakedPairs(board);
    if (name == "nakedTriples") return techniques::nakedTriples(board);
    if (name == "hiddenPairs") return techniques::hiddenPairs(board);
    if (name == "hiddenTriples") return techniques::hiddenTriples(board);
    if (name == "quads") return techniques::quads(board);
    if (name == "als") return techniques::als(board);
    if (name == "uniqueRectangles") return techniques::uniqueRectangles(board);
    if (name == "emptyRectangles") return techniques::emptyRectangles(board);
    if (name == "xWing") return techniques::xWing(board);
    if (name == "swordfish") return techniques::swordfish(board);
    if (name == "xyWing") return techniques::xyWing(board);
    if (name == "xyzWing") return techniques::xyzWing(board);
    if (name == "wWing") return techniques::wWing(board);
    if (name == "wxyzWing") return techniques::wxyzWing(board);
    if (name == "xChain") return techniques::xChain(board);
    if (name == "xyChain") return techniques::xyChain(board);
    if (name == "colors") return techniques::colors(board);
    if (name == "colorWing") return techniques::colorWing(board);
    if (name == "suedecoq") return techniques::suedecoq(board);
    if (name == "loops") return techniques::loops(board);
    if (name == "forcing" || name == "forcingChains") return techniques::forcingChains(board);
    if (name == "biforce") return techniques::biforce(board);
    throw std::invalid_argument("Unknown technique: " + name);
}
} // namespace sudoku
