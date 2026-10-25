#include "sudoku/techniques.hpp"
#include <algorithm>
#include <bit>
#include <functional>
#include <set>
#include <vector>

namespace sudoku::techniques {
namespace {
using Cells = std::vector<int>;
bool has(const Board& b,int c,int d) { return !b.cells[c].value && (b.cells[c].candidates & digitBit(d)); }
bool sees(int a,int b) { return cellRow(a)==cellRow(b)||cellCol(a)==cellCol(b)||cellSquare(a)==cellSquare(b); }
int count(Mask m) { return std::popcount(static_cast<unsigned>(m)); }
Cells seenTargets(const Board& b,int d,const Cells& visible,const Cells& excluded) {
    Cells out;
    for(int c=0;c<81;++c) {
        if(!has(b,c,d)||std::find(excluded.begin(),excluded.end(),c)!=excluded.end()) continue;
        if(std::all_of(visible.begin(),visible.end(),[&](int v){return sees(c,v);})) out.push_back(c);
    }
    return out;
}
std::optional<Hint> make(const char* type,int digit,const Cells& support,const Cells& targets) {
    if(targets.empty()) return std::nullopt;
    Hint h; h.type=type; h.message=type; h.supportCells=support;
    for(int c:targets) h.deductions.push_back({Operation::RemoveCandidate,c,digit});
    return h;
}
struct Pair {int a,b;};
std::vector<std::pair<int,Pair>> conjugates(const Board& b) {
    std::vector<std::pair<int,Pair>> out;
    // One pair per house, in house order. A pair can occur in several houses;
    // keep that multiplicity to match the JavaScript conjugate traversal.
    for(int d=1;d<=9;++d) for(int kind=0;kind<3;++kind) for(int h=0;h<9;++h) {
        const auto& house=kind==0?Rows[h]:kind==1?Cols[h]:Squares[h];
        Cells v; for(int c:house) if(has(b,c,d)) v.push_back(c);
        if(v.size()==2) out.push_back({d,{v[0],v[1]}});
    }
    return out;
}
}

std::optional<Hint> xChain(const Board& b) {
    const auto cp=conjugates(b);
    struct Link {int pair,a,z,parent;};
    for(int d=1;d<=9;++d) {
        std::vector<Pair> pairs;
        for(const auto& [digit,p]:cp) if(digit==d) pairs.push_back(p);
        for(const Pair& start:pairs) for(int orientation=0;orientation<2;++orientation) {
            std::vector<Link> chain{{0,orientation?start.b:start.a,orientation?start.a:start.b,-1}};
            std::function<void(int)> grow=[&](int ix) {
                const auto current=chain[ix];
                for(int i=1;i<static_cast<int>(pairs.size());++i) {
                    if(std::any_of(chain.begin(),chain.end(),[&](const Link& l){return l.pair==i;})) continue;
                    auto p=pairs[i];
                    if(current.a==p.a||current.a==p.b||current.z==p.a||current.z==p.b) continue;
                    bool used=false;
                    for(int j=ix;j>=0;j=chain[j].parent)
                        if(chain[j].a==p.a||chain[j].a==p.b||chain[j].z==p.a||chain[j].z==p.b) {used=true;break;}
                    if(used) continue;
                    int a=-1,z=-1;
                    if(cellRow(current.z)==cellRow(p.a)||cellCol(current.z)==cellCol(p.a)) {a=p.a;z=p.b;}
                    else if(cellRow(current.z)==cellRow(p.b)||cellCol(current.z)==cellCol(p.b)) {a=p.b;z=p.a;}
                    if(a<0) continue;
                    int next=static_cast<int>(chain.size());
                    chain.push_back({i,a,z,ix});
                    grow(next);
                }
            };
            grow(0);
            // JS scans the constructed tree backwards, retaining odd-length paths.
            for(int ix=static_cast<int>(chain.size())-1;ix>=1;--ix) {
                std::vector<Link> path;
                for(int j=ix;j>=0;j=chain[j].parent) path.push_back(chain[j]);
                if(path.size()<3||path.size()%2==0) continue;
                std::reverse(path.begin(),path.end());
                int ep0=path.front().a, ep1=path.back().z;
                Cells full,parity1,parity2;
                for(auto l:path) {full.push_back(l.a);full.push_back(l.z);parity2.push_back(l.a);parity1.push_back(l.z);}
                auto targets=seenTargets(b,d,{ep0,ep1},{ep0,ep1});
                if(std::any_of(targets.begin(),targets.end(),[&](int c){return std::find(full.begin(),full.end(),c)!=full.end();})) continue;
                // Preserve JS behavior: it emits X-Chain hints only for cycles.
                if(!sees(ep0,ep1)) continue;
                std::set<int> tgts(targets.begin(),targets.end());
                for(std::size_t k=1;k<path.size();++k) {
                    int a=path[k-1].z,z=path[k].a;
                    const House* house=nullptr;
                    if(cellRow(a)==cellRow(z)) house=&Rows[cellRow(a)];
                    else if(cellCol(a)==cellCol(z)) house=&Cols[cellCol(a)];
                    else if(cellSquare(a)==cellSquare(z)) house=&Squares[cellSquare(a)];
                    if(!house) continue;
                    for(int c:*house) if(has(b,c,d)&&std::find(full.begin(),full.end(),c)==full.end()) tgts.insert(c);
                }
                if(!tgts.empty()) {
                    Cells result(tgts.begin(),tgts.end());
                    // JavaScript's Hint carries parity1 and parity2; the current C++
                    // Hint structure retains the full chain as supportCells.
                    return make("xChain",d,full,result);
                }
            }
        }
    }
    return std::nullopt;
}

std::optional<Hint> xyChain(const Board& b) {
    struct Link {int out,cell,parent;};
    Cells bivalue;
    for(int c=0;c<81;++c) if(!b.cells[c].value&&count(b.cells[c].candidates)==2) bivalue.push_back(c);
    struct Path {int digit;Cells cells;Cells targets;};
    std::vector<Path> paths;
    for(int start:bivalue) {
        int v0=std::countr_zero(static_cast<unsigned>(b.cells[start].candidates))+1;
        int v1=std::countr_zero(static_cast<unsigned>(b.cells[start].candidates&~digitBit(v0)))+1;
        for(int orientation=0;orientation<2;++orientation) {
            int end=orientation?v0:v1, next=orientation?v1:v0;
            std::vector<Link> links{{end,start,-1}};
            std::function<void(int,int)> grow=[&](int ix,int digit) {
                int current=links[ix].cell;
                for(int c:bivalue) {
                    if(c==current||!has(b,c,digit)||!sees(current,c)) continue;
                    // JS checks the entire accumulated link tree, not just ancestors.
                    if(std::any_of(links.begin(),links.end(),[&](const Link& l){return l.cell==c;})) return;
                    int other=std::countr_zero(static_cast<unsigned>(b.cells[c].candidates&~digitBit(digit)))+1;
                    int child=static_cast<int>(links.size());
                    links.push_back({other,c,ix});
                    grow(child,other);
                }
            };
            grow(0,next);
            if(links.size()<=2) continue;
            for(int ix=static_cast<int>(links.size())-1;ix>=0;--ix) {
                if(links[ix].out!=end) continue;
                Cells path;
                for(int j=ix;j>=0;j=links[j].parent) path.push_back(links[j].cell);
                if(path.size()<3) continue;
                std::reverse(path.begin(),path.end());
                auto tgts=seenTargets(b,end,{path.front(),path.back()},{path.front(),path.back()});
                if(!tgts.empty()) paths.push_back({end,path,tgts});
            }
        }
    }
    std::stable_sort(paths.begin(),paths.end(),[](const Path& a,const Path& b){
        if(a.digit!=b.digit) return a.digit<b.digit;
        return a.targets.size()>b.targets.size();
    });
    if(paths.empty()) return std::nullopt;
    return make("xyChain",paths.front().digit,paths.front().cells,paths.front().targets);
}
} // namespace sudoku::techniques
