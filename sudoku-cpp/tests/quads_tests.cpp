#include "sudoku/techniques.hpp"
#include <cassert>
#include <iostream>
using namespace sudoku;
int main() {
    Board b;
    // Synthetic row 0: four cells cover {1,2,3,4}, fifth has removable 1 and 4.
    for (auto& c : b.cells) { c.value = 9; c.candidates = 0; }
    auto set = [&](int pos, Mask m) { auto& c=b.cells[Rows[0][pos]]; c.value=0; c.candidates=m; };
    set(0,digitBit(1)|digitBit(2));
    set(1,digitBit(2)|digitBit(3));
    set(2,digitBit(3)|digitBit(4));
    set(3,digitBit(1)|digitBit(4));
    set(4,digitBit(1)|digitBit(4)|digitBit(5));
    auto h=techniques::quads(b);
    assert(h && h->type=="quad");
    assert(h->supportCells == std::vector<int>({Rows[0][0],Rows[0][1],Rows[0][2],Rows[0][3]}));
    assert(h->deductions.size()==2);
    assert(h->deductions[0].cell==Rows[0][4] && h->deductions[0].value==1);
    assert(h->deductions[1].cell==Rows[0][4] && h->deductions[1].value==4);
    set(4,digitBit(5));
    assert(!techniques::quads(b));
    std::cout << "quads tests passed\n";
}
