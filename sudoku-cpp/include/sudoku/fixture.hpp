#pragma once
#include "sudoku/engine.hpp"
#include <string>

namespace sudoku {
struct Fixture {
    std::string name;
    Board board;
};
// Strict sudoku-board-v1 loader. Rejects malformed dimensions, indices and digits.
Fixture parseFixtureJson(const std::string& json);
Fixture loadFixture(const std::string& filename);
}
