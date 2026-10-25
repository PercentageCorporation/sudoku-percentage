#include "sudoku/techniques.hpp"
#include <algorithm>
#include <array>
#include <bit>
#include <functional>
#include <numeric>
#include <ostream>
#include <vector>

namespace sudoku::techniques {
namespace {
using State = Board;
constexpr int invalid = -1, unknown = 0, solved = 2;
constexpr int maxNodes = 20000;
thread_local std::ostream* trace = nullptr;
void logState(const State& s, const char* stage) {
    if (!trace) return;
    *trace << stage << "\n";
    for (int i=0;i<81;++i) if (!s.cells[i].value) {
        *trace << "  " << i << ":";
        for(int d=1;d<=9;++d) if(s.cells[i].candidates & digitBit(d)) *trace << d;
        *trace << " ";
        if(i%9==8) *trace << "\n";
    }
    *trace << "\n";
}
void explainInvalid(const State& s) {
    if(!trace) return;
    for(int kind=0;kind<3;++kind) for(int h=0;h<9;++h) {
        const House& house=kind==0?Rows[h]:kind==1?Cols[h]:Squares[h];
        const char* label=kind==0?"row":kind==1?"column":"square";
        Mask placed=0;
        for(int ix:house) if(int d=s.cells[ix].value) {
            if(placed & digitBit(d)) *trace << "CONTRADICTION duplicate " << d << " in " << label << " " << h << "\n";
            placed |= digitBit(d);
        }
        for(int ix:house) if(!s.cells[ix].value && !s.cells[ix].candidates)
            *trace << "CONTRADICTION cell " << ix << " has no candidates (" << label << " " << h << ")\n";
        for(int d=1;d<=9;++d) if(!(placed & digitBit(d))) {
            bool found=false;
            for(int ix:house) if(!s.cells[ix].value && (s.cells[ix].candidates & digitBit(d))) found=true;
            if(!found) *trace << "CONTRADICTION missing digit " << d << " has no location in " << label << " " << h << "\n";
        }
    }
}

bool sees(int a, int b) {
    return a != b && (cellRow(a) == cellRow(b) || cellCol(a) == cellCol(b) || cellSquare(a) == cellSquare(b));
}

// Never recreate a previously removed candidate. All speculative boards are
// copied from the current board, and only intersect their existing masks.
void restrictCandidates(State& s) {
    for (int i = 0; i < 81; ++i) {
        auto& c = s.cells[i];
        if (c.value) { c.candidates = 0; continue; }
        Mask legal = allDigits;
        for (int j = 0; j < 81; ++j)
            if (s.cells[j].value && sees(i, j))
                legal &= static_cast<Mask>(~digitBit(s.cells[j].value));
        c.candidates &= legal;
    }
}

bool consistent(const State& s) {
    // Board::valid includes duplicate placements, empty candidate sets,
    // and missing digits with no remaining position in every house.
    bool ok=s.valid();
    if(!ok) explainInvalid(s);
    return ok;
}

bool place(State& s, int ix, int digit) {
    if (s.cells[ix].value && s.cells[ix].value != digit) return false;
    if (!s.cells[ix].value && !(s.cells[ix].candidates & digitBit(digit))) return false;
    if(trace) *trace << "ASSIGN " << ix << "=" << digit << "\n";
    s.cells[ix].value = static_cast<std::uint8_t>(digit);
    s.cells[ix].candidates = 0;
    restrictCandidates(s);
    return consistent(s);
}

// Propagate naked and hidden singles to a fixed point; conflicting singles
// or any impossible house invalidate the assumption.
int propagate(State& s) {
    for (;;) {
        restrictCandidates(s);
        if (!consistent(s)) return invalid;
        logState(s, "After candidate restriction");
        if (s.solved()) return solved;
        std::array<int, 81> assignments{};
        for (int i = 0; i < 81; ++i)
            if (!s.cells[i].value && std::popcount(static_cast<unsigned>(s.cells[i].candidates)) == 1)
                assignments[i] = std::countr_zero(static_cast<unsigned>(s.cells[i].candidates)) + 1;
        for (int kind = 0; kind < 3; ++kind)
            for (int h = 0; h < 9; ++h) {
                const House& house = kind == 0 ? Rows[h] : kind == 1 ? Cols[h] : Squares[h];
                for (int digit = 1; digit <= 9; ++digit) {
                    int last = -1, count = 0;
                    bool already = false;
                    for (int ix : house) {
                        if (s.cells[ix].value == digit) { already = true; break; }
                        if (!s.cells[ix].value && (s.cells[ix].candidates & digitBit(digit))) { last = ix; ++count; }
                    }
                    if (already) continue;
                    if (count == 0) {
                        if(trace) *trace << "CONTRADICTION missing digit " << digit << " in " << (kind==0?"row":kind==1?"column":"square") << " " << h << "\n";
                        return invalid;
                    }
                    if (count == 1) {
                        if (assignments[last] && assignments[last] != digit) {
                            if(trace) *trace << "CONTRADICTION conflicting singles at cell " << last << ": " << assignments[last] << " and " << digit << "\n";
                            return invalid;
                        }
                        assignments[last] = digit;
                    }
                }
            }
        bool changed = false;
        for (int i = 0; i < 81; ++i)
            if (assignments[i]) {
                if (!place(s, i, assignments[i])) return invalid;
                changed = true;
            }
        if (!changed) return unknown;
    }
}

Hint elimination(int ix, int digit, const char* type) {
    Hint h;
    h.type = type;
    h.message = std::string(type) + ": assumption " + std::to_string(ix) + "=" + std::to_string(digit) + " contradicts the board";
    h.supportCells = {ix};
    h.deductions.push_back({Operation::RemoveCandidate, ix, digit});
    return h;
}

int startingCell(const State& s) {
    // Match forcing2.js: bivalue first, then most distinct conjugate
    // links, and only then the first trivalue cell.
    for (int i = 0; i < 81; ++i)
        if (!s.cells[i].value && std::popcount(static_cast<unsigned>(s.cells[i].candidates)) == 2) return i;

    std::array<int, 81> strengths{};
    // JS scans rows, columns, then squares; duplicate (digit, cell pair)
    // links across houses are counted only once.
    std::vector<std::array<int, 3>> seen;
    for (int kind = 0; kind < 3; ++kind)
        for (int h = 0; h < 9; ++h) {
            const House& house = kind == 0 ? Rows[h] : kind == 1 ? Cols[h] : Squares[h];
            for (int digit = 1; digit <= 9; ++digit) {
                int first = -1, second = -1, count = 0;
                for (int ix : house)
                    if (!s.cells[ix].value && (s.cells[ix].candidates & digitBit(digit))) {
                        if (count == 0) first = ix;
                        else if (count == 1) second = ix;
                        ++count;
                    }
                if (count != 2) continue;
                // JS stores cells in house traversal order; normalize the
                // pair so equivalent links across houses are deduplicated.
                auto key = std::array<int, 3>{digit, std::min(first, second), std::max(first, second)};
                if (std::find(seen.begin(), seen.end(), key) != seen.end()) continue;
                seen.push_back(key);
                ++strengths[first];
                ++strengths[second];
            }
        }
    int best = -1, bestStrength = 0;
    for (int i = 0; i < 81; ++i)
        if (strengths[i] > bestStrength) {
            bestStrength = strengths[i];
            best = i;
        }
    if (best >= 0) return best;
    for (int i = 0; i < 81; ++i)
        if (!s.cells[i].value && std::popcount(static_cast<unsigned>(s.cells[i].candidates)) == 3) return i;
    return -1;
}

// A branch is invalid only when EVERY possible continuation is invalid.
// Hitting the node budget yields unknown, never a false contradiction.
int explore(State s, int& budget) {
    if (--budget < 0) return unknown;
    int status = propagate(s);
    if (status != unknown) return status;
    int ix = startingCell(s);
    if (ix < 0) return unknown;
    Mask mask = s.cells[ix].candidates;
    bool sawUnknown = false;
    for (int digit = 1; digit <= 9; ++digit) {
        if (!(mask & digitBit(digit))) continue;
        State next = s;
        int child = place(next, ix, digit) ? explore(next, budget) : invalid;
        if (child == solved) return solved;
        if (child == unknown) sawUnknown = true;
    }
    return sawUnknown ? unknown : invalid;
}
} // namespace

std::optional<Hint> forcingChains(const Board& board) {
    if (!board.valid()) return std::nullopt;
    std::array<int, 81> strength{};
    for (int i = 0; i < 81; ++i)
        if (!board.cells[i].value && std::popcount(static_cast<unsigned>(board.cells[i].candidates)) == 2)
            ++strength[i];
    for (int kind = 0; kind < 3; ++kind)
        for (int h = 0; h < 9; ++h) {
            const House& house = kind == 0 ? Rows[h] : kind == 1 ? Cols[h] : Squares[h];
            for (int digit = 1; digit <= 9; ++digit) {
                std::vector<int> matches;
                for (int ix : house)
                    if (!board.cells[ix].value && (board.cells[ix].candidates & digitBit(digit))) matches.push_back(ix);
                if (matches.size() == 2) for (int ix : matches) ++strength[ix];
            }
        }
    std::vector<int> order(81);
    std::iota(order.begin(), order.end(), 0);
    std::stable_sort(order.begin(), order.end(), [&](int a, int b) { return strength[a] > strength[b]; });
    for (int ix : order) {
        if (!strength[ix]) break;
        for (int digit = 1; digit <= 9; ++digit) {
            if (!(board.cells[ix].candidates & digitBit(digit))) continue;
            State next = board;
            if (!place(next, ix, digit) || propagate(next) == invalid)
                return elimination(ix, digit, "forced");
        }
    }
    return std::nullopt;
}

std::optional<Hint> biforce(const Board& board) {
    if (!board.valid()) return std::nullopt;
    int ix = startingCell(board);
    if (ix < 0) return std::nullopt;
    for (int digit = 1; digit <= 9; ++digit) {
        if (!(board.cells[ix].candidates & digitBit(digit))) continue;
        State next = board;
        int budget = maxNodes;
        int result = place(next, ix, digit) ? explore(next, budget) : invalid;
        if (result == invalid) return elimination(ix, digit, "forced2");
        // A solved speculative branch is not proof of a forced placement;
        // it must not be emitted as a deduction without uniqueness proof.
    }
    return std::nullopt;
}
} // namespace sudoku::techniques

namespace sudoku::techniques {
void diagnoseForcingAssumption(const Board& board, int ix, int digit, std::ostream& out) {
    trace=&out;
    out << "Forcing diagnostic: cell " << ix << " = " << digit << "\n";
    out << "Original board valid: " << (board.valid()?"yes":"no") << "\n";
    State next=board;
    bool placed=place(next,ix,digit);
    int result=placed?propagate(next):invalid;
    out << "RESULT: " << (result==invalid?"CONTRADICTION":result==solved?"SOLVED":"NO CONTRADICTION") << "\n";
    trace=nullptr;
}
}
