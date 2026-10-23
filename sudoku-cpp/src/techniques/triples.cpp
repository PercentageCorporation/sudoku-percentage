#include "sudoku/techniques.hpp"
#include <bit>
namespace sudoku::techniques {
namespace {
std::optional<Hint> search(const Board& board, const House& house, int kind, int number, bool hidden) {
    for(int i=0;i<9;++i) for(int j=i+1;j<9;++j) for(int k=j+1;k<9;++k) {
        const int ids[3]={house[i],house[j],house[k]};
        if(board.cells[ids[0]].value || board.cells[ids[1]].value || board.cells[ids[2]].value) continue;
        Mask bits=0;
        if(!hidden) {
            for(int id:ids) {
                Mask m=board.cells[id].candidates;
                int n=std::popcount(static_cast<unsigned>(m));
                if(n<2 || n>3) {bits=0;break;}
                bits|=m;
            }
            if(std::popcount(static_cast<unsigned>(bits))!=3) continue;
        } else {
            for(int x=1;x<=9 && !bits;++x) for(int y=x+1;y<=9 && !bits;++y) for(int z=y+1;z<=9;++z) {
                Mask trial=digitBit(x)|digitBit(y)|digitBit(z);
                bool outside=false;
                for(int n=0;n<9;++n) if(n!=i && n!=j && n!=k && !board.cells[house[n]].value && (board.cells[house[n]].candidates&trial)) outside=true;
                if(outside) continue;
                Mask unionMask=0;
                for(int id:ids) unionMask|=board.cells[id].candidates&trial;
                if(unionMask!=trial) continue;
                // Every digit must occur in at least two cells, as in the JS hidden-triple counter.
                bool counts=true;
                for(int digit=1;digit<=9;++digit) if(trial&digitBit(digit)) {
                    int count=0;
                    for(int id:ids) if(board.cells[id].candidates&digitBit(digit)) ++count;
                    if(count<2) counts=false;
                }
                if(counts) {bits=trial;break;}
            }
            if(!bits) continue;
        }
        Hint hint;
        hint.type=hidden?"hiddenTriple":"nakedTriple";
        hint.message=hidden?"Hidden triple":"Naked triple";
        hint.supportCells={ids[0],ids[1],ids[2]};
        if(kind==0) hint.row=number; else if(kind==1) hint.col=number; else hint.square=number;
        for(int n=0;n<9;++n) {
            int id=house[n];
            if(board.cells[id].value) continue;
            bool selected=n==i || n==j || n==k;
            Mask remove=hidden ? (selected ? static_cast<Mask>(board.cells[id].candidates & ~bits) : 0)
                               : (!selected ? static_cast<Mask>(board.cells[id].candidates & bits) : 0);
            for(int digit=1;digit<=9;++digit) if(remove&digitBit(digit)) hint.deductions.push_back({Operation::RemoveCandidate,id,digit});
        }
        if(!hint.deductions.empty()) return hint;
    }
    return std::nullopt;
}
}
std::optional<Hint> nakedTriples(const Board& board) {
    for(int h=0;h<9;++h) {
        if(auto hint=search(board,Rows[h],0,h,false)) return hint;
        if(auto hint=search(board,Cols[h],1,h,false)) return hint;
        if(auto hint=search(board,Squares[h],2,h,false)) return hint;
    }
    return std::nullopt;
}
std::optional<Hint> hiddenTriples(const Board& board) {
    for(int kind=0;kind<3;++kind) for(int h=0;h<9;++h) {
        const House& house=kind==0?Rows[h]:kind==1?Cols[h]:Squares[h];
        if(auto hint=search(board,house,kind,h,true)) return hint;
    }
    return std::nullopt;
}
}
