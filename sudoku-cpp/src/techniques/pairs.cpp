#include "sudoku/techniques.hpp"
#include <bit>
namespace sudoku::techniques {
namespace {
std::optional<Hint> search(const Board& board, const House& house, int kind, int number, bool hidden) {
    for (int i=0;i<9;++i) for (int j=i+1;j<9;++j) {
        const int a=house[i], b=house[j];
        if (board.cells[a].value || board.cells[b].value) continue;
        Mask keep=0;
        if (!hidden) {
            keep=board.cells[a].candidates;
            if (std::popcount(static_cast<unsigned>(keep))!=2 || keep!=board.cells[b].candidates) continue;
        } else {
            for (int x=1;x<=9;++x) for (int y=x+1;y<=9;++y) {
                Mask bits=digitBit(x)|digitBit(y);
                if ((board.cells[a].candidates&bits)!=bits || (board.cells[b].candidates&bits)!=bits) continue;
                bool elsewhere=false;
                for (int k=0;k<9;++k) if(k!=i && k!=j && !board.cells[house[k]].value && (board.cells[house[k]].candidates&bits)) elsewhere=true;
                if (!elsewhere) {keep=bits;break;}
            }
            if (!keep) continue;
        }
        Hint hint;
        hint.type=hidden?"hiddenPair":"nakedPair";
        hint.message=hidden?"Hidden pair":"Naked pair";
        hint.supportCells={a,b};
        if(kind==0) hint.row=number; else if(kind==1) hint.col=number; else hint.square=number;
        for(int k=0;k<9;++k) {
            int index=house[k];
            if(board.cells[index].value) continue;
            Mask remove=hidden ? ((k==i || k==j) ? static_cast<Mask>(board.cells[index].candidates & ~keep) : 0)
                               : ((k!=i && k!=j) ? static_cast<Mask>(board.cells[index].candidates & keep) : 0);
            for(int value=1;value<=9;++value) if(remove&digitBit(value)) hint.deductions.push_back({Operation::RemoveCandidate,index,value});
        }
        if(!hint.deductions.empty()) return hint;
    }
    return std::nullopt;
}
}
std::optional<Hint> nakedPairs(const Board& board) {
    for(int h=0;h<9;++h) {
        if(auto hint=search(board,Rows[h],0,h,false)) return hint;
        if(auto hint=search(board,Cols[h],1,h,false)) return hint;
        if(auto hint=search(board,Squares[h],2,h,false)) return hint;
    }
    return std::nullopt;
}
std::optional<Hint> hiddenPairs(const Board& board) {
    for(int kind=0;kind<3;++kind) for(int h=0;h<9;++h) {
        const House& house=kind==0?Rows[h]:kind==1?Cols[h]:Squares[h];
        if(auto hint=search(board,house,kind,h,true)) return hint;
    }
    return std::nullopt;
}
}
