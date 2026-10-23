#include "sudoku/techniques.hpp"
#include <cassert>
#include <iostream>
int main() {
    sudoku::Board board;
    for (auto& cell : board.cells) cell.candidates = sudoku::allDigits;
    // Digit 5 occurs only in columns 1 and 7 of rows 0 and 3.
    for (int row : {0, 3})
        for (int col = 0; col < 9; ++col)
            if (col != 1 && col != 7)
                board.cells[sudoku::cellIndex(row, col)].candidates &=
                    static_cast<sudoku::Mask>(~sudoku::digitBit(5));
    auto hint = sudoku::techniques::xWing(board);
    assert(hint && hint->type == "xWing");
    assert(hint->supportCells.size() == 4);
    assert(hint->deductions.size() == 14);
    for (auto d : hint->deductions) {
        assert(d.operation == sudoku::Operation::RemoveCandidate);
        assert(d.value == 5);
        assert(sudoku::cellCol(d.cell) == 1 || sudoku::cellCol(d.cell) == 7);
        assert(sudoku::cellRow(d.cell) != 0 && sudoku::cellRow(d.cell) != 3);
    }
    std::cout << "X-Wing row-based test passed\n";
}
