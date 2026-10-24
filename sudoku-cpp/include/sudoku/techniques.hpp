#pragma once
#include "sudoku/engine.hpp"
namespace sudoku::techniques {
std::optional<Hint> singletons(const Board& board);
std::optional<Hint> singleCounts(const Board& board);
std::optional<Hint> lockedCandidates1(const Board& board);
std::optional<Hint> lockedCandidates2(const Board& board);
std::optional<Hint> nakedPairs(const Board& board);
std::optional<Hint> nakedTriples(const Board& board);
std::optional<Hint> hiddenPairs(const Board& board);
std::optional<Hint> hiddenTriples(const Board& board);
std::optional<Hint> uniqueRectangles(const Board& board);
std::optional<Hint> emptyRectangles(const Board& board);
std::optional<Hint> xWing(const Board& board);
std::optional<Hint> xyWing(const Board& board);
std::optional<Hint> xyzWing(const Board& board);
std::optional<Hint> wWing(const Board& board);
std::optional<Hint> wxyzWing(const Board& board);
std::optional<Hint> aic(const Board& board);
}
