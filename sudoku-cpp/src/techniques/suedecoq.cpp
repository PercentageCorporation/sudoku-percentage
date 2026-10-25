#include "sudoku/techniques.hpp"
#include <algorithm>
#include <bit>
#include <vector>
namespace sudoku::techniques {
namespace {
using Cells=std::vector<int>;
bool has(const Board& b,int c,int d) {return !b.cells[c].value&&(b.cells[c].candidates&digitBit(d));}
bool open(const Board& b,int c) {return !b.cells[c].value;}
bool contains(const Cells& a,int c) {return std::find(a.begin(),a.end(),c)!=a.end();}
Mask mask(const Board& b,int c) {return b.cells[c].candidates;}
int count(Mask m) {return std::popcount(static_cast<unsigned>(m));}
Cells targets(const Board& b,const House& house,Mask digits,const Cells& excluded) {
    Cells out;
    for(int c:house) if(!contains(excluded,c)&&open(b,c)&&(mask(b,c)&digits)) out.push_back(c);
    return out;
}
void add(Hint& h,const Board& b,const Cells& ts,Mask digits) {
    for(int c:ts) for(int d=1;d<=9;++d)
        if((digits&digitBit(d))&&has(b,c,d)) h.deductions.push_back({Operation::RemoveCandidate,c,d});
}
std::optional<Hint> typeII(const Board& b) {
    for(int bp=0;bp<81;++bp) {
        if(!open(b,bp)||count(mask(b,bp))!=2) continue;
        int br=cellRow(bp),bc=cellCol(bp),sq=cellSquare(bp);
        const House& sh=Squares[sq];
        for(int i=0;i<9;++i) {int a=sh[i];if(a==bp||!open(b,a)) continue;
        for(int j=i+1;j<9;++j) {int c=sh[j];if(c==bp||!open(b,c)) continue;
        for(int k=j+1;k<9;++k) {int e=sh[k];if(e==bp||!open(b,e)) continue;
            Mask unionMask=mask(b,a)|mask(b,c)|mask(b,e);
            if(count(unionMask)!=5||(unionMask&mask(b,bp))!=mask(b,bp)) continue;
            int row=(cellRow(a)==cellRow(c)&&cellRow(c)==cellRow(e))?cellRow(a):-1;
            int col=(cellCol(a)==cellCol(c)&&cellCol(c)==cellCol(e))?cellCol(a):-1;
            if(row<0&&col<0) continue;
            if(row==br||col==bc) continue;
            Mask rest=unionMask&~mask(b,bp);
            const House& rh=row>=0?Rows[row]:Cols[col];
            for(int other:rh) {
                if(cellSquare(other)==sq||!open(b,other)||count(mask(b,other))!=2) continue;
                if((rest&mask(b,other))!=mask(b,other)) continue;
                Mask extra=rest&~mask(b,other);
                Mask sqDigits=extra|mask(b,bp),rcDigits=extra|mask(b,other);
                Cells sqTargets=targets(b,sh,sqDigits,{a,c,e,bp});
                Cells rcTargets=targets(b,rh,rcDigits,{a,c,e,other});
                if(sqTargets.empty()&&rcTargets.empty()) break;
                Hint h;h.type="sdc";h.message="SuedeCoq II";h.supportCells={a,c,e,bp,other};
                add(h,b,sqTargets,sqDigits);add(h,b,rcTargets,rcDigits);
                if(!h.deductions.empty()) return h;
                break;
            }
        }}}
    }
    return std::nullopt;
}
std::optional<Hint> typeI(const Board& b) {
    for(int sq=0;sq<9;++sq) {
        const House& sh=Squares[sq];
        for(int i=0;i<9;++i) {int a=sh[i];if(!open(b,a)||count(mask(b,a))>4) continue;
        for(int j=i+1;j<9;++j) {int c=sh[j];if(!open(b,c)||count(mask(b,c))>4) continue;
            Mask base=mask(b,a)|mask(b,c);
            if(count(base)>4) continue;
            int row=cellRow(a)==cellRow(c)?cellRow(a):-1;
            int col=cellCol(a)==cellCol(c)?cellCol(a):-1;
            if(row<0&&col<0) continue;
            for(int k=0;k<9;++k) {int wing=sh[k];
                if(wing==a||wing==c||!open(b,wing)||count(mask(b,wing))!=2) continue;
                if(row==cellRow(wing)||col==cellCol(wing)) continue;
                Mask wingMask=mask(b,wing),squareDigits=0,otherDigits=0;
                Cells squareSupport{a,c,wing};
                if((base&wingMask)==wingMask) {
                    squareDigits=wingMask;otherDigits=base&~wingMask;
                } else if(base&wingMask) {
                    // Preserve the last qualifying trivalue partner, as in the JS loop.
                    bool found=false;
                    for(int l=0;l<9;++l) {int partner=sh[l];
                        if(partner==a||partner==c||partner==wing||!open(b,partner)||count(mask(b,partner))!=3) continue;
                        if(row==cellRow(partner)||col==cellCol(partner)) continue;
                        Mask pm=mask(b,partner);
                        if((pm&wingMask)!=wingMask) continue;
                        Mask odd=pm&~wingMask;
                        if(!(odd&base)) continue;
                        found=true;squareDigits=wingMask|odd;otherDigits=base&~squareDigits;
                        squareSupport={a,c,wing,partner};
                    }
                    if(!found) continue;
                } else continue;
                const House& rh=row>=0?Rows[row]:Cols[col];
                for(int other:rh) {
                    if(cellSquare(other)==sq||!open(b,other)||count(mask(b,other))!=2) continue;
                    if((otherDigits&mask(b,other))!=mask(b,other)) continue;
                    Cells sqTargets=targets(b,sh,squareDigits,squareSupport);
                    Cells rcExcluded=squareSupport;rcExcluded.push_back(other);
                    Cells rcTargets=targets(b,rh,mask(b,other),rcExcluded);
                    if(sqTargets.empty()&&rcTargets.empty()) break;
                    Hint h;h.type="sdc";h.message="SuedeCoq I";h.supportCells=squareSupport;h.supportCells.push_back(other);
                    add(h,b,sqTargets,squareDigits);add(h,b,rcTargets,mask(b,other));
                    if(!h.deductions.empty()) return h;
                    break;
                }
            }
        }}
    }
    return std::nullopt;
}
}
std::optional<Hint> suedecoq(const Board& b) {
    if(auto h=typeII(b)) return h;
    return typeI(b);
}
} // namespace sudoku::techniques
