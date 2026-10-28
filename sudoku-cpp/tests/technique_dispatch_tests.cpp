#include "sudoku/fixture.hpp"
#include "sudoku/technique_dispatch.hpp"
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

int main(int argc, char** argv) {
    if (argc != 2) return 2;
    const auto fixture = sudoku::loadFixture(argv[1]);
    const auto& board = fixture.board;
    const std::vector<std::string> names = {
        "next", "singletons", "singleCounts", "lockedCandidates1", "lockedCandidates2",
        "nakedPairs", "nakedTriples", "hiddenPairs", "hiddenTriples",
        "uniqueRectangles", "emptyRectangles", "xWing", "swordfish", "xyWing",
        "xyzWing", "wWing", "wxyzWing", "xChain", "xyChain", "colors",
        "colorWing", "suedecoq", "loops", "forcing", "forcingChains", "biforce"
    };
    for (const auto& name : names) {
        try {
            (void)sudoku::findHintByName(board, name);
        } catch (const std::exception& e) {
            std::cerr << "Failed " << name << ": " << e.what() << '\n';
            return 1;
        }
    }
    bool threw = false;
    try { (void)sudoku::findHintByName(board, "nonexistentTechnique"); }
    catch (const std::invalid_argument&) { threw = true; }
    if (!threw) return 1;
    std::cout << "All " << names.size() << " technique names dispatched\n";
}
