#include "sudoku/fixture.hpp"
#include <iostream>
#include <stdexcept>
#include <string>
#include <cstdlib>

using namespace sudoku;

int main(int argc, char** argv) {
    if (argc != 5 && argc != 6) {
        std::cerr << "Usage: sudoku_regression_tests FILE.json TYPE CELL DIGIT [place|remove]\n";
        return 2;
    }
    try {
        const auto fixture = loadFixture(argv[1]);
        if (!fixture.board.valid()) throw std::runtime_error("Invalid candidate state");
        const auto hint = HintEngine{}.findNextHint(fixture.board);
        if (!hint) throw std::runtime_error("No hint found");
        const int expectedCell = std::stoi(argv[3]);
        const int expectedDigit = std::stoi(argv[4]);
        const bool correctType = hint->type == argv[2];
        const Operation expectedOperation = argc == 6 && std::string(argv[5]) == "remove"
            ? Operation::RemoveCandidate : Operation::PlaceValue;
        const bool correctDeduction = hint->deductions.size() == 1 &&
            hint->deductions[0].operation == expectedOperation &&
            hint->deductions[0].cell == expectedCell &&
            hint->deductions[0].value == expectedDigit;
        if (!correctType || !correctDeduction) {
            std::cerr << "FAIL: " << fixture.name << ": expected " << argv[2]
                      << " " << (expectedOperation == Operation::PlaceValue ? "place" : "remove") << " cell=" << expectedCell << " digit=" << expectedDigit
                      << ", got type=" << hint->type;
            for (const auto& d : hint->deductions)
                std::cerr << " [" << (d.operation == Operation::PlaceValue ? "place" : "remove")
                          << " cell=" << d.cell << " digit=" << d.value << "]";
            std::cerr << '\n';
            return 1;
        }
        std::cout << "PASS: " << fixture.name << " -> " << hint->type
                  << " cell=" << expectedCell << " digit=" << expectedDigit << '\n';
        return 0;
    } catch (const std::exception& e) {
        std::cerr << "FAIL: " << e.what() << '\n';
        return 1;
    }
}
