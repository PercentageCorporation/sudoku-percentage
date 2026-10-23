#pragma once
#include <array>
#include <cstdint>
#include <optional>
#include <string>
#include <vector>

namespace sudoku {
using Mask = std::uint16_t;
constexpr Mask digitBit(int digit) { return static_cast<Mask>(1u << (digit - 1)); }
constexpr Mask allDigits = 0x1ff;

// Cell indices are square-major, matching constants.js: 0..8 are square 0.
constexpr int cellIndex(int row, int col) {
    return ((row / 3) * 3 + col / 3) * 9 + (row % 3) * 3 + col % 3;
}
constexpr int cellRow(int index) { return (index / 27) * 3 + (index % 9) / 3; }
constexpr int cellCol(int index) { return ((index / 9) % 3) * 3 + index % 3; }
constexpr int cellSquare(int index) { return index / 9; }

using House = std::array<int, 9>;
constexpr auto makeRows() {
    std::array<House, 9> houses{};
    for (int r = 0; r < 9; ++r)
        for (int c = 0; c < 9; ++c) houses[r][c] = cellIndex(r,c);
    return houses;
}
constexpr auto makeCols() {
    std::array<House, 9> houses{};
    for (int c = 0; c < 9; ++c)
        for (int r = 0; r < 9; ++r) houses[c][r] = cellIndex(r,c);
    return houses;
}
constexpr auto makeSquares() {
    std::array<House, 9> houses{};
    for (int s = 0; s < 9; ++s)
        for (int offset = 0; offset < 9; ++offset) houses[s][offset] = s * 9 + offset;
    return houses;
}
inline constexpr auto Rows = makeRows();
inline constexpr auto Cols = makeCols();
inline constexpr auto Squares = makeSquares();

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
