#include "sudoku/fixture.hpp"
#include <iostream>
#include <stdexcept>
#include <string>
using namespace sudoku;
int main(int argc, char** argv) {
    if (argc != 2) { std::cerr << "Usage: sudoku_fixture_tests FILE.json\n"; return 2; }
    try {
        auto f = loadFixture(argv[1]);
        if (!f.board.valid()) throw std::runtime_error("Board is not a consistent candidate state");
        HintEngine engine;
        auto hint = engine.findNextHint(f.board);
        std::cout << "Fixture: " << f.name << "\n";
        if (!hint) std::cout << "No hint among implemented techniques\n";
        else {
            std::cout << "Hint: " << hint->type << "\n";
            for (const auto& d : hint->deductions)
                std::cout << (d.operation == Operation::PlaceValue ? "place" : "remove")
                          << " cell=" << d.cell << " digit=" << d.value << "\n";
        }
        return 0;
    } catch (const std::exception& e) { std::cerr << "Fixture error: " << e.what() << '\n'; return 1; }
}
