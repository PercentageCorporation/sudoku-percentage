#include "sudoku/fixture.hpp"
#include <fstream>
#include <iterator>
#include <iostream>
int main(int argc, char** argv) {
    if (argc != 2) return 2;
    std::ifstream in(argv[1]);
    std::string json((std::istreambuf_iterator<char>(in)), std::istreambuf_iterator<char>());
    auto parsed = sudoku::parseFixtureJson(json);
    auto file = sudoku::loadFixture(argv[1]);
    if (!parsed.board.valid()) return 3;
    for (int i = 0; i < 81; ++i)
        if (parsed.board.cells[i].value != file.board.cells[i].value ||
            parsed.board.cells[i].candidates != file.board.cells[i].candidates) return 4;
    std::cout << "JSON interface parser matched fixture parser\n";
}
