#include "sudoku/techniques.hpp"
#include <algorithm>
#include <bit>
#include <vector>

namespace sudoku::techniques {
namespace {
using Cells = std::vector<int>;
bool has(const Board& b,int c,int d) { return !b.cells[c].value && (b.cells[c].candidates & digitBit(d)); }
bool sees(int a,int b) { return a!=b && (cellRow(a)==cellRow(b)||cellCol(a)==cellCol(b)||cellSquare(a)==cellSquare(b)); }
int count(Mask m) { return std::popcount(static_cast<unsigned>(m)); }
Mask mask(const Board& b,int c) { return b.cells[c].value ? 0 : b.cells[c].candidates; }
Cells bivalues(const Board& b) { Cells v; for(int i=0;i<81;++i) if(count(mask(b,i))==2) v.push_back(i); return v; }
Cells targets(const Board& b,int d,const Cells& visible,const Cells& excluded) {
    Cells result;
    for(int i=0;i<81;++i) {
        if(!has(b,i,d)||std::find(excluded.begin(),excluded.end(),i)!=excluded.end()) continue;
        bool all=true;
        for(int c:visible) if(!sees(i,c)) { all=false; break; }
        if(all) result.push_back(i);
    }
    return result;
}
std::optional<Hint> make(const char* type,const Cells& support,int digit,const Cells& targets) {
    if(targets.empty()) return std::nullopt;
    Hint h; h.type=type; h.message=type; h.supportCells=support;
    for(int c:targets) h.deductions.push_back({Operation::RemoveCandidate,c,digit});
    return h;
}
} // namespace

std::optional<Hint> xyWing(const Board& b) {
    auto bv=bivalues(b);
    for(int p:bv) {
        Mask pm=mask(b,p);
        Cells wings;
        for(int w:bv) if(w!=p && sees(p,w)) wings.push_back(w);
        for(size_t i=0;i<wings.size();++i) for(size_t j=i+1;j<wings.size();++j) {
            int a=wings[i],c=wings[j];
            Mask am=mask(b,a),cm=mask(b,c),z=am&cm;
            if(count(z)!=1 || (pm&z) || count(am&pm)!=1 || count(cm&pm)!=1 || (am&pm)==(cm&pm) || sees(a,c)) continue;
            int digit=std::countr_zero(static_cast<unsigned>(z))+1;
            if(auto h=make("xyWing",{p,a,c},digit,targets(b,digit,{a,c},{p,a,c}))) return h;
        }
    }
    return std::nullopt;
}

std::optional<Hint> xyzWing(const Board& b) {
    for(int p=0;p<81;++p) {
        Mask pm=mask(b,p);
        if(count(pm)!=3) continue;
        for(int a:Squares[cellSquare(p)]) {
            Mask am=mask(b,a);
            if(a==p||count(am)!=2||(am&pm)!=am) continue;
            for(int c=0;c<81;++c) {
                Mask cm=mask(b,c);
                if(count(cm)!=2||(cm&pm)!=cm||cm==am||cellSquare(c)==cellSquare(p)||
                   (cellRow(c)!=cellRow(p)&&cellCol(c)!=cellCol(p))) continue;
                Mask z=am&cm;
                if(count(z)!=1) continue;
                int digit=std::countr_zero(static_cast<unsigned>(z))+1;
                Cells tgts;
                for(int t:Squares[cellSquare(p)])
                    if(t!=p&&t!=a&&has(b,t,digit)&&
                       (cellRow(t)==cellRow(c)||cellCol(t)==cellCol(c))) { tgts.push_back(t); break; }
                if(auto h=make("xyzWing",{p,a,c},digit,tgts)) return h;
            }
        }
    }
    return std::nullopt;
}

std::optional<Hint> wWing(const Board& b) {
    auto bv=bivalues(b);
    for(size_t i=0;i<bv.size();++i) for(size_t j=i+1;j<bv.size();++j) {
        int a=bv[i],c=bv[j]; Mask m=mask(b,a);
        if(m!=mask(b,c)||sees(a,c)) continue;
        for(int d=1;d<=9;++d) if(m&digitBit(d)) {
            // Scan conjugate pairs by digit, rows then columns then squares.
            for(int kind=0;kind<3;++kind) for(int h=0;h<9;++h) {
                const House& house=kind==0?Rows[h]:kind==1?Cols[h]:Squares[h];
                Cells pair;
                for(int x:house) if(has(b,x,d)) pair.push_back(x);
                if(pair.size()!=2) continue;
                int u=pair[0],v=pair[1];
                if(a==u||a==v||c==u||c==v) continue;
                int other=std::countr_zero(static_cast<unsigned>(m&~digitBit(d)))+1;
                if(sees(a,u)&&sees(c,v)) {
                    if(auto hint=make("wWing",{a,u,v,c},other,targets(b,other,{a,c},{a,c,u,v}))) return hint;
                } else if(sees(a,v)&&sees(c,u)) {
                    if(auto hint=make("wWing",{a,v,u,c},other,targets(b,other,{a,c},{a,c,u,v}))) return hint;
                }
            }
        }
    }
    return std::nullopt;
}

std::optional<Hint> wxyzWing(const Board& b) {
    auto bv=bivalues(b);
    for(int w:bv) {
        Mask wm=mask(b,w);
        // JavaScript searches pivot candidates in the bivalue cell's square.
        for(int p:Squares[cellSquare(w)]) {
            if(p==w) continue;
            int shared=(cellRow(w)==cellRow(p))+(cellCol(w)==cellCol(p))+(cellSquare(w)==cellSquare(p));
            Mask pm=mask(b,p);
            if(shared!=1||count(pm)<2||count(pm)>4||count(wm|pm)>4||!(wm&pm)) continue;
            for(int kind=0;kind<2;++kind) {
                const House& house=kind==0?Rows[cellRow(p)]:Cols[cellCol(p)];
                for(int i=0;i<9;++i) {
                    int a=house[i]; Mask am=mask(b,a);
                    if(a==p||count(am)<2||count(am)>3) continue;
                    for(int j=i+1;j<9;++j) {
                        int c=house[j]; Mask cm=mask(b,c);
                        if(c==p||count(cm)<2||count(cm)>3||!(am&cm)||count(wm|pm|am|cm)>4) continue;
                        Mask common=wm&pm, wing2=am|cm;
                        int W=0;
                        if(count(common)==1) W=std::countr_zero(static_cast<unsigned>(common))+1;
                        else if(count(common)==2 && count(common&wing2)==1)
                            W=std::countr_zero(static_cast<unsigned>(common&~wing2))+1;
                        else continue;
                        Mask zm=wm&~digitBit(W);
                        if(count(zm)!=1||!(wing2&zm)||!(pm&wing2)) continue;
                        if((am&digitBit(W))&&cellSquare(a)!=cellSquare(p)) continue;
                        if((cm&digitBit(W))&&cellSquare(c)!=cellSquare(p)) continue;
                        int z=std::countr_zero(static_cast<unsigned>(zm))+1;
                        Cells zcells{w};
                        if(pm&zm) zcells.push_back(p);
                        if(am&zm) zcells.push_back(a);
                        if(cm&zm) zcells.push_back(c);
                        if(auto hint=make("wxyzWing",{p,w,a,c},z,targets(b,z,zcells,{p,w,a,c}))) return hint;
                    }
                }
            }
        }
    }
    return std::nullopt;
}
} // namespace sudoku::techniques
