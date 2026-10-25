#include "sudoku/fixture.hpp"
#include "sudoku/techniques.hpp"
#include <algorithm>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>
int main(int argc,char** argv) {
 if(argc!=5) return 2;
 try {
 auto f=sudoku::loadFixture(argv[1]);
 if(!f.board.valid()) throw std::runtime_error("Invalid board");
 std::string type=argv[2];
 auto h=type=="colorWing"?sudoku::techniques::colorWing(f.board):sudoku::techniques::colors(f.board);
 if(!h) throw std::runtime_error("No hint returned");
 std::cerr<<"FOUND "<<h->type<<" deductions:";
 for(auto d:h->deductions) std::cerr<<" "<<d.cell<<":"<<d.value;
 std::cerr<<"\n";
 if(h->type!=type) throw std::runtime_error("Wrong hint type");
 int digit=std::stoi(argv[3]);
 std::vector<int> expected,actual;
 std::string csv=argv[4];size_t p=0;
 while(p<csv.size()) {auto q=csv.find(',',p);expected.push_back(std::stoi(csv.substr(p,q==std::string::npos?q:q-p)));if(q==std::string::npos)break;p=q+1;}
 for(auto d:h->deductions) {if(d.operation!=sudoku::Operation::RemoveCandidate||d.value!=digit) throw std::runtime_error("Wrong candidate");actual.push_back(d.cell);}
 std::sort(expected.begin(),expected.end());std::sort(actual.begin(),actual.end());
 if(expected!=actual) throw std::runtime_error("Wrong targets");
 }catch(const std::exception& e){std::cerr<<"FAIL "<<e.what()<<"\n";return 1;}
 return 0;
}
