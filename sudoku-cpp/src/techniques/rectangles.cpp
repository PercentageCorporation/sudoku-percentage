#include "sudoku/techniques.hpp"
#include <algorithm>
#include <array>
#include <bit>
#include <set>
#include <vector>

namespace sudoku::techniques {
namespace {
bool candidate(const Board& b,int i,int v) { return !b.cells[i].value && (b.cells[i].candidates & digitBit(v)); }
bool sees(int a,int b) { return a!=b && (cellRow(a)==cellRow(b)||cellCol(a)==cellCol(b)||cellSquare(a)==cellSquare(b)); }
std::vector<int> sharedTargets(const Board& b,const std::vector<int>& corners,int digit) {
    std::vector<int> result;
    for(int i=0;i<81;++i) {
        if(std::find(corners.begin(),corners.end(),i)!=corners.end()||!candidate(b,i,digit)) continue;
        if(std::all_of(corners.begin(),corners.end(),[&](int c){return sees(i,c);})) result.push_back(i);
    }
    return result;
}
std::optional<Hint> hintFor(const Board& b,const std::string& type,const std::array<int,4>& corners,
                            const std::vector<std::pair<int,int>>& removals) {
    Hint h; h.type=type; h.message="Unique Rectangle "+type.substr(2); h.supportCells.assign(corners.begin(),corners.end());
    for(auto [cell,digit]:removals) if(candidate(b,cell,digit))
        h.deductions.push_back({Operation::RemoveCandidate,cell,digit});
    if(h.deductions.empty()) return std::nullopt;
    return h;
}
// Sound uniqueness check for Types 6/7. Enumerate rectangle assignments under
// a proposed corner value, respecting candidate masks and all houses touching
// the rectangle. If every feasible assignment is a deadly two-digit rectangle,
// that value is impossible in a puzzle assumed to have a unique solution.
// Outside candidates are used only to establish necessary house coverage;
// ignoring other restrictions is conservative, not a source of false hints.
bool forcesDeadly(const Board& b, const std::array<int,4>& corners,
                  int x, int y, int target, int digit) {
    std::vector<const House*> houses;
    for (int kind=0;kind<3;++kind) for(int h=0;h<9;++h) {
        const House& house=kind==0?Rows[h]:kind==1?Cols[h]:Squares[h];
        bool touches=false;
        for(int i:corners) if(std::find(house.begin(),house.end(),i)!=house.end()) touches=true;
        if(touches) houses.push_back(&house);
    }
    std::array<int,4> assigned{};
    int feasible=0;
    bool nonDeadly=false;
    auto visit=[&](auto&& self,int depth)->void {
        if(depth==4) {
            for(const House* hp:houses) {
                for(int v:{x,y}) {
                    bool present=false, outside=false;
                    for(int k=0;k<4;++k)
                        if(std::find(hp->begin(),hp->end(),corners[k])!=hp->end() && assigned[k]==v) present=true;
                    if(!present) for(int i:*hp) {
                        if(std::find(corners.begin(),corners.end(),i)!=corners.end()) continue;
                        if(b.cells[i].value==v || candidate(b,i,v)) {outside=true;break;}
                    }
                    if(!present&&!outside) return;
                }
            }
            ++feasible;
            for(int v:assigned) if(v!=x&&v!=y) {nonDeadly=true;break;}
            return;
        }
        int cell=corners[depth];
        Mask mask=b.cells[cell].candidates;
        if(cell==target) mask &= digitBit(digit);
        for(int v=1;v<=9;++v) if(mask&digitBit(v)) {
            bool conflict=false;
            for(int k=0;k<depth;++k)
                if(assigned[k]==v && sees(cell,corners[k])) {conflict=true;break;}
            if(conflict) continue;
            assigned[depth]=v;
            self(self,depth+1);
        }
    };
    visit(visit,0);
    return feasible>0&&!nonDeadly;
}
// A rectangle must span exactly two rows, two columns and exactly two boxes.
// The two boxes must share a band or a stack, avoiding four-box patterns.
bool validRectangle(const std::array<int,4>& a) {
    std::set<int> boxes; for(int i:a) boxes.insert(cellSquare(i));
    return boxes.size()==2;
}
}
std::optional<Hint> uniqueRectangles(const Board& b) {
    for(int phase=0;phase<2;++phase)
    for(int r0=0;r0<8;++r0) for(int r1=r0+1;r1<9;++r1)
    for(int c0=0;c0<8;++c0) for(int c1=c0+1;c1<9;++c1) {
        const std::array<int,4> a{cellIndex(r0,c0),cellIndex(r0,c1),cellIndex(r1,c0),cellIndex(r1,c1)};
        if(!validRectangle(a)) continue;
        for(int x=1;x<=8;++x) for(int y=x+1;y<=9;++y) {
            Mask pair=digitBit(x)|digitBit(y);
            bool all=true; std::vector<int> extra,pure;
            for(int i:a) {
                Mask m=b.cells[i].candidates;
                if(b.cells[i].value||(m&pair)!=pair) {all=false;break;}
                if(m==pair) pure.push_back(i); else extra.push_back(i);
            }
            if(!all||pure.empty()) continue;
            if(phase==0) {
            if(extra.size()==1 && pure.size()==3) {
                if(auto h=hintFor(b,"urType1",a,{{extra[0],x},{extra[0],y}})) return h;
            }
            if(extra.size()==2 && pure.size()==2) {
                bool adjacent=sees(extra[0],extra[1]);
                Mask e0=b.cells[extra[0]].candidates&~pair, e1=b.cells[extra[1]].candidates&~pair;
                if(adjacent && e0==e1 && std::popcount(static_cast<unsigned>(e0))==1) {
                    int v=std::countr_zero(static_cast<unsigned>(e0))+1;
                    std::vector<std::pair<int,int>> rem;
                    for(int t:sharedTargets(b,extra,v)) rem.push_back({t,v});
                    if(auto h=hintFor(b,"urType2",a,rem)) return h;
                }
                // Type 5: two diagonal extra corners sharing one extra digit.
                // Type 2 above handles the adjacent two-corner arrangement.
                if(!adjacent && e0==e1 && std::popcount(static_cast<unsigned>(e0))==1) {
                    int v=std::countr_zero(static_cast<unsigned>(e0))+1;
                    std::vector<std::pair<int,int>> rem;
                    for(int t:sharedTargets(b,extra,v)) rem.push_back({t,v});
                    if(auto h=hintFor(b,"urType5",a,rem)) return h;
                }
                if(adjacent) {
                    // Type 3: the extra digits form a virtual cell in the common house.
                    Mask extras=e0|e1;
                    if(std::popcount(static_cast<unsigned>(extras))>=2 && std::popcount(static_cast<unsigned>(extras))<=3) {
                        for(int kind=0;kind<3;++kind) {
                            int h0=kind==0?cellRow(extra[0]):kind==1?cellCol(extra[0]):cellSquare(extra[0]);
                            int h1=kind==0?cellRow(extra[1]):kind==1?cellCol(extra[1]):cellSquare(extra[1]);
                            if(h0!=h1) continue;
                            const House& house=kind==0?Rows[h0]:kind==1?Cols[h0]:Squares[h0];
                            int needed=std::popcount(static_cast<unsigned>(extras))-1;
                            std::vector<int> eligible;
                            for(int i:house) if(i!=extra[0]&&i!=extra[1]&&!b.cells[i].value &&
                                b.cells[i].candidates && !(b.cells[i].candidates&~extras)) eligible.push_back(i);
                            // Enumerate combinations of one or two additional cells.
                            for(int p=0;p<(int)eligible.size();++p) for(int q=-1;q<(int)eligible.size();++q) {
                                if(needed==1 && q!=-1) continue;
                                if(needed==2 && q<=p) continue;
                                Mask unionMask=extras|b.cells[eligible[p]].candidates;
                                if(q>=0) unionMask|=b.cells[eligible[q]].candidates;
                                if(unionMask!=extras) continue;
                                std::vector<std::pair<int,int>> rem;
                                for(int i:house) {
                                    if(i==extra[0]||i==extra[1]||i==eligible[p]||(q>=0&&i==eligible[q])) continue;
                                    for(int v=1;v<=9;++v) if(extras&digitBit(v)) rem.push_back({i,v});
                                }
                                if(auto h=hintFor(b,"urType3",a,rem)) return h;
                            }
                        }
                    }
                    // Type 4: one base digit is conjugate in the shared house of extra corners.
                    for(int kind=0;kind<3;++kind) {
                        int h0=kind==0?cellRow(extra[0]):kind==1?cellCol(extra[0]):cellSquare(extra[0]);
                        int h1=kind==0?cellRow(extra[1]):kind==1?cellCol(extra[1]):cellSquare(extra[1]);
                        if(h0!=h1) continue;
                        const House& house=kind==0?Rows[h0]:kind==1?Cols[h0]:Squares[h0];
                        for(int strong:{x,y}) {
                            int count=0;
                            for(int i:house) if(candidate(b,i,strong)) ++count;
                            if(count!=2) continue;
                            int other=strong==x?y:x;
                            if(auto h=hintFor(b,"urType4",a,{{extra[0],other},{extra[1],other}})) return h;
                        }
                    }
                }
            }
            // Type 5: one pure corner, three corners with exactly the same
            // single extra candidate. Eliminate it from common peers.
            if(extra.size()==3 && pure.size()==1) {
                Mask commonExtra=b.cells[extra[0]].candidates&~pair;
                if(std::popcount(static_cast<unsigned>(commonExtra))==1 &&
                   std::all_of(extra.begin(),extra.end(),[&](int i){
                       return (b.cells[i].candidates&~pair)==commonExtra;
                   })) {
                    int v=std::countr_zero(static_cast<unsigned>(commonExtra))+1;
                    std::vector<std::pair<int,int>> rem;
                    for(int t:sharedTargets(b,extra,v)) rem.push_back({t,v});
                    if(auto h=hintFor(b,"urType5",a,rem)) return h;
                }
            }
            }
            if(phase==1) {
            // Type 6: two diagonal bivalue corners. Only report a removal
            // from an extra corner when it provably forces a deadly rectangle.
            if(extra.size()==2 && pure.size()==2 && !sees(pure[0],pure[1])) {
                for(int v:{x,y}) {
                    std::vector<std::pair<int,int>> removals;
                    for(int corner:extra)
                        if(forcesDeadly(b,a,x,y,corner,v)) removals.push_back({corner,v});
                    if(auto h=hintFor(b,"urType6",a,removals)) return h;
                }
            }
            // Type 7: two diagonal bivalue corners, or one bivalue corner.
            // Check the bivalue corners (two-corner case) or the corner
            // diagonally opposite the sole bivalue corner (three-corner case).
            if((extra.size()==2 && pure.size()==2 && !sees(pure[0],pure[1])) ||
               (extra.size()==3 && pure.size()==1)) {
                std::vector<int> targets;
                if(pure.size()==2) targets=pure;
                else for(int i:extra)
                    if(cellRow(i)!=cellRow(pure[0]) && cellCol(i)!=cellCol(pure[0])) targets.push_back(i);
                for(int corner:targets) for(int v:{x,y})
                    if(forcesDeadly(b,a,x,y,corner,v))
                        if(auto h=hintFor(b,"urType7",a,{{corner,v}})) return h;
            }
            }
        }
    }
    return std::nullopt;
}

std::optional<Hint> emptyRectangles(const Board& b) {
    // For each box and digit, find empty row/column intersections (all candidate
    // locations lie in their union), then combine with an external strong link.
    for(int s=0;s<9;++s) for(int v=1;v<=9;++v) {
        std::vector<int> inBox;
        for(int i:Squares[s]) if(candidate(b,i,v)) inBox.push_back(i);
        if(inBox.size()<2||inBox.size()>5) continue;
        for(int r=(s/3)*3;r<(s/3)*3+3;++r)
        for(int c=(s%3)*3;c<(s%3)*3+3;++c) {
            if(!std::all_of(inBox.begin(),inBox.end(),[&](int i){return cellRow(i)==r||cellCol(i)==c;})) continue;
            // Need at least one candidate on each arm; intersection must be empty.
            bool armRow=false,armCol=false;
            for(int i:inBox) {
                if(cellRow(i)==r&&cellCol(i)==c) {armRow=false;armCol=false;break;}
                if(cellRow(i)==r) armRow=true;
                if(cellCol(i)==c) armCol=true;
            }
            if(!armRow||!armCol) continue;
            for(int kind=0;kind<2;++kind) for(int h=0;h<9;++h) {
                const House& house=kind==0?Rows[h]:Cols[h];
                std::vector<int> ends;
                for(int i:house) if(candidate(b,i,v)) ends.push_back(i);
                if(ends.size()!=2||cellSquare(ends[0])==cellSquare(ends[1])) continue;
                for(int side=0;side<2;++side) {
                    int near=ends[side],far=ends[1-side];
                    if(cellSquare(near)==s||cellSquare(far)==s) continue;
                    if(kind==0 && cellCol(near)!=c) continue;
                    if(kind==1 && cellRow(near)!=r) continue;
                    int target=kind==0?cellIndex(r,cellCol(far)):cellIndex(cellRow(far),c);
                    if(!candidate(b,target,v)||target==near||target==far) continue;
                    Hint hint;hint.type="emptyRectangle";hint.message="Empty Rectangle";
                    hint.supportCells=inBox;hint.supportCells.push_back(near);hint.supportCells.push_back(far);
                    hint.square=s;hint.deductions.push_back({Operation::RemoveCandidate,target,v});
                    return hint;
                }
            }
        }
    }
    return std::nullopt;
}
} // namespace sudoku::techniques
