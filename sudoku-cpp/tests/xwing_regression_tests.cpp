#include "sudoku/fixture.hpp"
#include "sudoku/techniques.hpp"
#include <array>
#include <iostream>
#include <stdexcept>
#include <vector>

int main(int argc, char** argv) {
    if (argc != 2) {
        std::cerr << "Usage: sudoku_xwing_regression_tests FILE.json\n";
        return 2;
    }
    try {
        const auto fixture = sudoku::loadFixture(argv[1]);
        if (!fixture.board.valid()) throw std::runtime_error("Invalid candidate state");
        const auto hint = sudoku::techniques::xWing(fixture.board);
        if (!hint) throw std::runtime_error("X-Wing not found");
        const std::vector<int> expectedCorners{6, 57, 25, 76};
        if (hint->type != "xWing" || hint->supportCells != expectedCorners)
            throw std::runtime_error("Unexpected X-Wing type or supporting corners");
        if (hint->deductions.size() != 1)
            throw std::runtime_error("Unexpected number of X-Wing eliminations");
        const auto& d = hint->deductions.front();
        if (d.operation != sudoku::Operation::RemoveCandidate || d.cell != 68 || d.value != 3)
            throw std::runtime_error("Unexpected X-Wing elimination");
        std::cout << "PASS: column X-Wing, corners 6,57,25,76, remove 3 from cell 68\n";
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "FAIL: " << e.what() << '\n';
        return 1;
    }
}
