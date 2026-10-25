#include "sudoku/fixture.hpp"
#include "sudoku/techniques.hpp"
#include <algorithm>
#include <iostream>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>
int main(int argc,char** argv) {
    if(argc!=4) return 2;
    try {
        auto f=sudoku::loadFixture(argv[1]);
        if(!f.board.valid()) throw std::runtime_error("Invalid board");
        std::string type=argv[2];
        auto h=type=="swordfish"?sudoku::techniques::swordfish(f.board):sudoku::techniques::suedecoq(f.board);
        if(!h) throw std::runtime_error("No hint returned");
        if(h->type!=(type=="swordfish"?"swordfish":"sdc")) throw std::runtime_error("Wrong hint type");
        if(type=="sdcI" && h->message!="SuedeCoq I") throw std::runtime_error("Wrong SDC variant");
        if(type=="sdcII" && h->message!="SuedeCoq II") throw std::runtime_error("Wrong SDC variant");
        std::vector<std::pair<int,int>> expected,actual;
        std::string csv=argv[3];size_t p=0;
        while(p<csv.size()) {
            auto q=csv.find(',',p);
            std::string item=csv.substr(p,q==std::string::npos?q:q-p);
            auto colon=item.find(':');
            if(colon==std::string::npos) throw std::runtime_error("Expected cell:digit");
            expected.emplace_back(std::stoi(item.substr(0,colon)),std::stoi(item.substr(colon+1)));
            if(q==std::string::npos) break;
            p=q+1;
        }
        for(auto d:h->deductions) {
            if(d.operation!=sudoku::Operation::RemoveCandidate) throw std::runtime_error("Wrong operation");
            if(f.board.cells[d.cell].value || !(f.board.cells[d.cell].candidates&sudoku::digitBit(d.value)))
                throw std::runtime_error("Elimination of absent candidate");
            actual.emplace_back(d.cell,d.value);
        }
        std::sort(expected.begin(),expected.end());std::sort(actual.begin(),actual.end());
        if(expected!=actual) {
            std::cerr<<"Expected:";for(auto [c,d]:expected)std::cerr<<' '<<c<<':'<<d;
            std::cerr<<" Actual:";for(auto [c,d]:actual)std::cerr<<' '<<c<<':'<<d;
            throw std::runtime_error("Wrong eliminations");
        }
    } catch(const std::exception& e) {std::cerr<<"FAIL "<<e.what()<<'\n';return 1;}
    return 0;
}
