#pragma once
#include <array>
#include "sudoku/constants.hpp"
#include <cstdint>
#include <optional>
#include <map>
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

struct FunctionStats {
    std::uint64_t calls = 0, successes = 0;
    double time = 0, successTime = 0, failureTime = 0, maxTime = 0;
};
struct TypeStats {
    std::uint64_t count = 0;
    double time = 0;
};
class HintStatistics {
public:
    void record(const std::string& function, const std::optional<Hint>& result, double elapsedMs);
    void reset();
    const std::map<std::string, FunctionStats>& functions() const { return functions_; }
    const std::map<std::string, TypeStats>& types() const { return types_; }
    // Same field names and sort order as JavaScript getHintStats().
    std::string toJson() const;
private:
    std::map<std::string, FunctionStats> functions_;
    std::map<std::string, TypeStats> types_;
};

class HintEngine {
public:
    std::optional<Hint> findNextHint(const Board& board) const;
    const HintStatistics& statistics() const { return statistics_; }
    void resetStatistics() const { statistics_.reset(); }
private:
    mutable HintStatistics statistics_;
};

class Solver {
public:
    explicit Solver(Board board) : board_(board) {}
    std::optional<Step> nextStep();
    std::vector<Step> solve(int maxSteps = 1000);
    const Board& board() const { return board_; }
    const HintStatistics& statistics() const { return engine_.statistics(); }
    void resetStatistics() { engine_.resetStatistics(); }
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
