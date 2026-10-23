#include "sudoku/fixture.hpp"
#include "sudoku/techniques.hpp"
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>
using namespace sudoku;
int main(int argc,char**argv) {
    if(argc!=4) return 2;
    try {
        auto fixture=loadFixture(argv[1]);
        if(!fixture.board.valid()) throw std::runtime_error("Invalid board");
        std::string expected=argv[2];
        auto h=expected=="emptyRectangle"?techniques::emptyRectangles(fixture.board):techniques::uniqueRectangles(fixture.board);
        if(!h || h->type!=expected) throw std::runtime_error("Unexpected or missing technique");
        std::string actual;
        for(const auto& d:h->deductions) {
            if(d.operation!=Operation::RemoveCandidate || !(fixture.board.cells[d.cell].candidates&digitBit(d.value)))
                throw std::runtime_error("Invalid deduction");
            if(!actual.empty()) actual+=",";
            actual+=std::to_string(d.cell)+":"+std::to_string(d.value);
        }
        if(actual!=argv[3]) throw std::runtime_error("Deduction mismatch: "+actual);
        std::cout<<"PASS: "<<expected<<" "<<actual<<"\n";
    } catch(const std::exception& e) {std::cerr<<"FAIL: "<<e.what()<<"\n";return 1;}
}
