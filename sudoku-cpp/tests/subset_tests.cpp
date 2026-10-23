#include "sudoku/techniques.hpp"
#include <cassert>
#include <iostream>
using namespace sudoku;
static void set(Board& b,int row,int col,std::initializer_list<int> digits) {
    Mask m=0;for(int d:digits)m|=digitBit(d);
    b.cells[cellIndex(row,col)].candidates=m;
}
static void check(const std::optional<Hint>& hint,const char* type,int cell,int digit) {
    assert(hint && hint->type==type);
    bool found=false;
    for(const auto& d:hint->deductions) if(d.cell==cell && d.value==digit && d.operation==Operation::RemoveCandidate) found=true;
    assert(found);
}
int main(){
    {
        Board b;
        set(b,0,0,{1,2});set(b,0,1,{1,2});set(b,0,2,{1,2,3});
        check(techniques::nakedPairs(b),"nakedPair",cellIndex(0,2),1);
    }
    {
        Board b;
        set(b,0,0,{1,2,4});set(b,0,1,{1,2,5});set(b,0,2,{3,4});
        check(techniques::hiddenPairs(b),"hiddenPair",cellIndex(0,0),4);
    }
    {
        Board b;
        set(b,0,0,{1,2});set(b,0,1,{2,3});set(b,0,2,{1,3});set(b,0,3,{1,4});
        check(techniques::nakedTriples(b),"nakedTriple",cellIndex(0,3),1);
    }
    {
        Board b;
        set(b,0,0,{1,2,4});set(b,0,1,{2,3,5});set(b,0,2,{1,3,6});set(b,0,3,{4,5,6});
        check(techniques::hiddenTriples(b),"hiddenTriple",cellIndex(0,0),4);
    }
    std::cout<<"Four subset technique tests passed\n";
}
