#include "sudoku/techniques.hpp"
namespace sudoku::techniques {
std::optional<Hint> lockedCandidates1(const Board& board) {
    // Match locked.js: only candidate counts 2 or 3 within a square;
    // prefer pointing along a row over pointing along a column.
    for (int square = 0; square < 9; ++square) {
        for (int value = 1; value <= 9; ++value) {
            std::vector<int> supporting;
            for (int index : Squares[square])
                if (!board.cells[index].value && (board.cells[index].candidates & digitBit(value)))
                    supporting.push_back(index);
            if (supporting.size() < 2 || supporting.size() > 3) continue;
            for (int kind = 0; kind < 2; ++kind) {
                const int houseIndex = kind == 0 ? cellRow(supporting[0]) : cellCol(supporting[0]);
                bool same = true;
                for (int index : supporting)
                    if ((kind == 0 ? cellRow(index) : cellCol(index)) != houseIndex) same = false;
                if (!same) continue;
                const House& house = kind == 0 ? Rows[houseIndex] : Cols[houseIndex];
                Hint hint;
                hint.type = "locked";
                hint.message = "Locked candidates (pointing)";
                hint.supportCells = supporting;
                hint.square = square;
                if (kind == 0) hint.row = houseIndex;
                else hint.col = houseIndex;
                for (int index : house)
                    if (cellSquare(index) != square && !board.cells[index].value &&
                        (board.cells[index].candidates & digitBit(value)))
                        hint.deductions.push_back({Operation::RemoveCandidate, index, value});
                if (!hint.deductions.empty()) return hint;
            }
        }
    }
    return std::nullopt;
}

std::optional<Hint> lockedCandidates2(const Board& board) {
    // Claiming: a digit's remaining positions in a row/column all lie
    // in one square, so remove it elsewhere in that square.
    for (int value = 1; value <= 9; ++value) {
        for (int kind = 0; kind < 2; ++kind) { // rows before columns
            for (int line = 0; line < 9; ++line) {
                const House& house = kind == 0 ? Rows[line] : Cols[line];
                std::vector<int> support;
                int square = -1;
                bool multipleSquares = false;
                for (int index : house) {
                    const Cell& cell = board.cells[index];
                    if (cell.value || !(cell.candidates & digitBit(value))) continue;
                    if (square >= 0 && square != cellSquare(index)) {
                        multipleSquares = true;
                        break;
                    }
                    square = cellSquare(index);
                    support.push_back(index);
                }
                if (multipleSquares || support.size() < 2) continue;
                Hint hint;
                hint.type = "locked2";
                hint.message = "Locked candidates Type 2 (claiming)";
                hint.supportCells = support;
                hint.square = square;
                if (kind == 0) hint.row = line;
                else hint.col = line;
                for (int index : Squares[square]) {
                    if ((kind == 0 ? cellRow(index) : cellCol(index)) == line) continue;
                    const Cell& cell = board.cells[index];
                    if (!cell.value && (cell.candidates & digitBit(value)))
                        hint.deductions.push_back({Operation::RemoveCandidate, index, value});
                }
                if (!hint.deductions.empty()) return hint;
            }
        }
    }
    return std::nullopt;
}
}
