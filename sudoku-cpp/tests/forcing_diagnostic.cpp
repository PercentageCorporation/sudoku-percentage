#include "sudoku/fixture.hpp"
#include "sudoku/techniques.hpp"
#include <iostream>
#include <cstdlib>
int main(int argc,char**argv) {
    if(argc!=4) {std::cerr<<"Usage: sudoku_forcing_diagnostic <fixture.json> <cell> <digit>\n";return 2;}
    try {
        auto fixture=sudoku::loadFixture(argv[1]);
        sudoku::techniques::diagnoseForcingAssumption(fixture.board,std::atoi(argv[2]),std::atoi(argv[3]),std::cout);
    } catch(const std::exception& e) {std::cerr<<e.what()<<"\n";return 1;}
}
