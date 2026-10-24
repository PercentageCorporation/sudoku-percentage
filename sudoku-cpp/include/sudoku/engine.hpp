#pragma once
#include <array>
#include "sudoku/constants.hpp"
#include <cstdint>
#include <optional>
#include <string>
#include <vector>

namespace sudoku {
using Mask = std::uint16_t;
constexpr Mask digitBit(int digit) { return static_cast<Mask>(1u << (digit - 1)); }
constexpr Mask allDigits = 0x1ff;

struct Cell {
    std::uint8_t value = 0;
    Mask candidates = 0;
};

struct Board {
    std::array<Cell, 81> cells{};
    bool valid() const;
    bool solved() const;
    // Recompute legal candidates for a values-only board; not used for imported
    // candidate states, where previous logical eliminations must be preserved.
    void initializeCandidates();
};

enum class Operation { PlaceValue, RemoveCandidate };
struct Deduction {
    Operation operation;
    int cell;
    int value;
};
struct Change {
    Deduction deduction;
    bool changed;
};

// House and support information is optional. Advanced techniques can extend
// the explanation without changing the core deduction/application contract.
struct Hint {
    std::string type;
    std::string message;
    std::vector<int> supportCells;
    std::vector<Deduction> deductions;
    int row = -1, col = -1, square = -1;
};

struct Step {
    int number;
    Hint hint;
    std::vector<Change> changes;
};

class HintEngine {
public:
    std::optional<Hint> findNextHint(const Board& board) const;
};

class Solver {
public:
    explicit Solver(Board board) : board_(board) {}
    std::optional<Step> nextStep();
    std::vector<Step> solve(int maxSteps = 1000);
    const Board& board() const { return board_; }
    const std::vector<Step>& history() const { return history_; }
private:
    Board board_;
    HintEngine engine_;
    std::vector<Step> history_;
};

// Apply a deduction; value placements also remove that value from peers.
// Returns whether the requested change was new. Throws on invalid deductions.
bool apply(Board& board, const Deduction& deduction);
} // namespace sudoku
