#include "sudoku/fixture.hpp"
#include "sudoku/techniques.hpp"
#include <iostream>
int main(int argc,char**argv) {
  if(argc!=2) return 2;
  auto f=sudoku::loadFixture(argv[1]);
  auto h=sudoku::techniques::loops(f.board);
  if(!h) {std::cout<<"No loops hint\n";return 0;}
  std::cout<<h->type<<"\n";
  for(const auto& d:h->deductions) {
    std::cout<<d.cell<<":"<<d.value<<"\n";
    if(d.cell==69 && d.value==7 && d.operation==sudoku::Operation::RemoveCandidate) return 1;
  }
  return 0;
}
