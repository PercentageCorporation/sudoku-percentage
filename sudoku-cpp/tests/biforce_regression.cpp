#include "sudoku/fixture.hpp"
#include "sudoku/techniques.hpp"
#include <iostream>
int main(int argc, char** argv) {
    if (argc != 2) return 2;
    auto b = sudoku::loadFixture(argv[1]).board;
    auto h = sudoku::techniques::biforce(b);
    if (!h) { std::cout << "No deduction\n"; return 1; }
    for (const auto& d : h->deductions)
        std::cout << h->type << " cell=" << d.cell << " digit=" << d.value << "\n";
    return 0;
}
