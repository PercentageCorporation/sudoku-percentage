#include "sudoku/techniques.hpp"
#include <cassert>
#include <iostream>

int main() {
    sudoku::Board b;
    // A solved valid grid, converted from row/column coordinates into the
    // project's square-major indices.
    constexpr int grid[9][9] = {
        {5,3,4,6,7,8,9,1,2}, {6,7,2,1,9,5,3,4,8},
        {1,9,8,3,4,2,5,6,7}, {8,5,9,7,6,1,4,2,3},
        {4,2,6,8,5,3,7,9,1}, {7,1,3,9,2,4,8,5,6},
        {9,6,1,5,3,7,2,8,4}, {2,8,7,4,1,9,6,3,5},
        {3,4,5,2,8,6,1,7,9}
    };
    for (int r = 0; r < 9; ++r)
        for (int c = 0; c < 9; ++c) {
            int ix = ((r / 3) * 3 + c / 3) * 9 + (r % 3) * 3 + c % 3;
            b.cells[ix].value = grid[r][c];
        }
    assert(b.valid() && b.solved());
    assert(!sudoku::techniques::forcingChains(b));
    assert(!sudoku::techniques::biforce(b));

    // Missing digit with no possible location is a contradiction even if
    // other unsolved cells still have nonempty candidate sets.
    auto impossible = b;
    for (int c = 0; c < 2; ++c) {
        int ix = c;
        impossible.cells[ix].value = 0;
        impossible.cells[ix].candidates = sudoku::digitBit(c == 0 ? 3 : 5);
    }
    assert(!impossible.valid());
    assert(!sudoku::techniques::forcingChains(impossible));
    assert(!sudoku::techniques::biforce(impossible));
    std::cout << "forcing validation smoke tests passed\n";
}
