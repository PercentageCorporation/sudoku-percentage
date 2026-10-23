#include "sudoku/fixture.hpp"
#include "sudoku/techniques.hpp"
#include <iostream>
#include <stdexcept>
#include <vector>
#include <string>
using namespace sudoku;
int main(int argc, char** argv) {
    if (argc != 3) return 2;
    try {
        const auto fixture = loadFixture(argv[1]);
        if (!fixture.board.valid()) throw std::runtime_error("Invalid candidate state");
        const bool row = std::string(argv[2]) == "row";
        const auto hint = techniques::lockedCandidates2(fixture.board);
        if (!hint || hint->type != "locked2") throw std::runtime_error("No locked2 hint");
        const std::vector<int> support = row ? std::vector<int>{39,41} : std::vector<int>{38,41,44};
        const std::vector<int> targets = row ? std::vector<int>{37,43,44} : std::vector<int>{37,39,42,43};
        const int value = row ? 2 : 7;
        if (hint->square != 4 || hint->row != (row ? 4 : -1) || hint->col != (row ? -1 : 5))
            throw std::runtime_error("Wrong house");
        if (hint->supportCells != support) throw std::runtime_error("Wrong supporting cells");
        if (hint->deductions.size() != targets.size()) throw std::runtime_error("Wrong deduction count");
        for (std::size_t i=0;i<targets.size();++i) {
            const auto& d=hint->deductions[i];
            if (d.operation != Operation::RemoveCandidate || d.cell != targets[i] || d.value != value)
                throw std::runtime_error("Wrong deduction");
        }
        std::cout << "PASS: locked2 " << argv[2] << '\n';
    } catch (const std::exception& e) {
        std::cerr << "FAIL: " << e.what() << '\n'; return 1;
    }
}
