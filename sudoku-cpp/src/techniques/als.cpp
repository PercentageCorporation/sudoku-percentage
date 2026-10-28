#include "sudoku/techniques.hpp"
#include <algorithm>
#include <bit>
#include <vector>

namespace sudoku::techniques {
namespace {
using Cells = std::vector<int>;
struct Als { Mask digits{}; Cells cells; };
bool has(const Board& b, int c, int d) { return !b.cells[c].value && (b.cells[c].candidates & digitBit(d)); }
bool sees(int a, int b) { return a != b && (cellRow(a)==cellRow(b) || cellCol(a)==cellCol(b) || cellSquare(a)==cellSquare(b)); }
bool contains(const Cells& a,int c) { return std::find(a.begin(),a.end(),c)!=a.end(); }
void collect(const Board& b, const House& house, std::vector<Als>& out) {
    Cells active;
    for(int c:house) if(!b.cells[c].value && std::popcount(static_cast<unsigned>(b.cells[c].candidates))>1) active.push_back(c);
    int n=static_cast<int>(active.size());
    for(int i=0;i<n;++i) for(int j=i+1;j<n;++j) {
        Mask ij=b.cells[active[i]].candidates|b.cells[active[j]].candidates;
        if(std::popcount(static_cast<unsigned>(ij))==3) out.push_back({ij,{active[i],active[j]}});
        for(int k=j+1;k<n;++k) {
            Mask ijk=ij|b.cells[active[k]].candidates;
            if(std::popcount(static_cast<unsigned>(ijk))==4) out.push_back({ijk,{active[i],active[j],active[k]}});
            for(int l=k+1;l<n;++l) {
                Mask ijkl=ijk|b.cells[active[l]].candidates;
                if(std::popcount(static_cast<unsigned>(ijkl))==5) out.push_back({ijkl,{active[i],active[j],active[k],active[l]}});
            }
        }
    }
}
Cells valueCells(const Board& b,int digit,const Als& a,const Als& other) {
    Cells out;
    for(int c:a.cells) if(has(b,c,digit)) out.push_back(c);
    for(int c:other.cells) if(has(b,c,digit)) out.push_back(c);
    return out;
}
Cells targetsSeenByAll(const Board& b,int digit,const Cells& valueCells,const Cells& excluded) {
    Cells out;
    if(valueCells.empty()) return out;
    for(int c=0;c<81;++c) {
        if(contains(excluded,c)||!has(b,c,digit)) continue;
        bool all=true;
        for(int v:valueCells) if(!sees(c,v)) {all=false;break;}
        if(all) out.push_back(c);
    }
    return out;
}
Cells targetsInHouses(const Board& b,Mask digits,const Als& a,const Cells& excluded) {
    Cells out;
    int r=cellRow(a.cells[0]),c=cellCol(a.cells[0]),s=cellSquare(a.cells[0]);
    for(int x:a.cells) {if(cellRow(x)!=r)r=-1;if(cellCol(x)!=c)c=-1;if(cellSquare(x)!=s)s=-1;}
    for(int ix=0;ix<81;++ix) {
        if(contains(excluded,ix)||b.cells[ix].value||!(b.cells[ix].candidates&digits)) continue;
        if((r>=0&&cellRow(ix)==r)||(c>=0&&cellCol(ix)==c)||(s>=0&&cellSquare(ix)==s)) out.push_back(ix);
    }
    return out;
}
void add(Hint& hint,const Board& b,const Cells& targets,Mask digits) {
    for(int c:targets) for(int d=1;d<=9;++d) if((digits&digitBit(d))&&has(b,c,d)) {
        bool duplicate=false;
        for(const auto& old:hint.deductions) if(old.cell==c&&old.value==d) {duplicate=true;break;}
        if(!duplicate) hint.deductions.push_back({Operation::RemoveCandidate,c,d});
    }
}
}
std::optional<Hint> als(const Board& b) {
    std::vector<Als> groups;
    for(int h=0;h<9;++h) {collect(b,Rows[h],groups);collect(b,Cols[h],groups);collect(b,Squares[h],groups);}
    for(size_t i=0;i<groups.size();++i) for(size_t j=i+1;j<groups.size();++j) {
        const Als& a=groups[i];const Als& z=groups[j];
        bool overlap=false, adjacent=false;
        for(int c:a.cells) for(int d:z.cells) {if(c==d) overlap=true;if(sees(c,d)) adjacent=true;}
        if(overlap||!adjacent) continue;
        Mask common=a.digits&z.digits;
        Cells rcc;
        for(int d=1;d<=9;++d) if(common&digitBit(d)) {
            Cells vc=valueCells(b,d,a,z);
            bool all=true;
            for(size_t p=0;p<vc.size()&&all;++p) for(size_t q=p+1;q<vc.size();++q)
                if(!sees(vc[p],vc[q])) {all=false;break;}
            if(all) rcc.push_back(d);
        }
        if(rcc.size()!=1&&rcc.size()!=2) continue;
        Cells all=a.cells;all.insert(all.end(),z.cells.begin(),z.cells.end());
        Hint hint;hint.supportCells=all;
        if(rcc.size()==1) {
            hint.type="alsXZ1";hint.message="ALS XZ 1";
            Mask zvals=common&~digitBit(rcc[0]);
            for(int d=1;d<=9;++d) if(zvals&digitBit(d)) {
                auto ts=targetsSeenByAll(b,d,valueCells(b,d,a,z),all);
                if(!ts.empty()) {add(hint,b,ts,digitBit(d));return hint;}
            }
        } else {
            hint.type="alsXZ2";hint.message="ALS XZ 2";
            for(int d:rcc) add(hint,b,targetsSeenByAll(b,d,valueCells(b,d,a,z),all),digitBit(d));
            Mask extrasA=a.digits&~digitBit(rcc[0])&~digitBit(rcc[1]);
            Mask extrasZ=z.digits&~digitBit(rcc[0])&~digitBit(rcc[1]);
            add(hint,b,targetsInHouses(b,extrasA,a,all),extrasA);
            add(hint,b,targetsInHouses(b,extrasZ,z,all),extrasZ);
            if(!hint.deductions.empty()) return hint;
        }
    }
    return std::nullopt;
}
} // namespace sudoku::techniques
