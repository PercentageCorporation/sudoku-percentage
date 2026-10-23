#include "sudoku/engine.hpp"
#include <stdexcept>
#include <utility>
namespace sudoku {
std::optional<Step> Solver::nextStep() {
    auto hint = engine_.findNextHint(board_);
    if (!hint) return std::nullopt;
    Board next = board_;
    Step step{static_cast<int>(history_.size()) + 1, std::move(*hint), {}};
    bool changed = false;
    for (const auto& deduction : step.hint.deductions) {
        bool didChange = apply(next, deduction);
        step.changes.push_back({deduction, didChange});
        changed |= didChange;
    }
    if (!changed || !next.valid()) throw std::logic_error("Hint did not produce a valid board change");
    board_ = std::move(next);
    history_.push_back(step);
    return step;
}

std::vector<Step> Solver::solve(int maxSteps) {
    if (maxSteps < 0) throw std::invalid_argument("Negative maxSteps");
    std::vector<Step> steps;
    for (int i = 0; i < maxSteps; ++i) {
        auto step = nextStep();
        if (!step) break;
        steps.push_back(std::move(*step));
    }
    return steps;
}
} // namespace sudoku
