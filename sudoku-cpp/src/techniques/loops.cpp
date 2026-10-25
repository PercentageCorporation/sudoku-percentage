#include "sudoku/techniques.hpp"
#include <algorithm>
#include <array>
#include <bit>
#include <string>
#include <vector>

namespace sudoku::techniques {
namespace {
using Digits = std::vector<int>;
struct Pair { int value, a, b; };
struct Bivalue { int cell; Digits digits; };
struct Node { int cell, in, out, parent; char link; Digits digits; std::vector<int> children; };
struct Point { int cell, in, out; };
using Path = std::vector<Point>;
using Targets = std::vector<std::pair<std::vector<int>,Digits>>;

bool has(const Board& b,int c,int d) { return !b.cells[c].value && (b.cells[c].candidates & digitBit(d)); }
bool sees(int a,int b) { return a!=b && (cellRow(a)==cellRow(b)||cellCol(a)==cellCol(b)||cellSquare(a)==cellSquare(b)); }
Digits digits(const Board& b,int c) { Digits d; for(int v=1;v<=9;++v) if(has(b,c,v)) d.push_back(v); return d; }
std::vector<int> targetsSeen(const Board& b,int value,int a,int c) {
    std::vector<int> t;
    for(int i=0;i<81;++i) if(i!=a&&i!=c&&has(b,i,value)&&sees(i,a)&&sees(i,c)) t.push_back(i);
    return t;
}
struct Search {
    const Board& b;
    std::vector<Pair> pairs;
    std::vector<Bivalue> bivals;
    std::array<std::vector<int>,81> byCell{};
    std::array<std::vector<int>,10> byValue{}, bvByValue{};
    std::vector<Node> chain;
    explicit Search(const Board& board):b(board) {
        auto scan=[&](const House& house,int value,bool dedup) {
            int a=-1,c=-1;
            for(int ix:house) if(has(b,ix,value)) {
                if(a<0) a=ix; else if(c<0) c=ix; else return;
            }
            if(c<0) return;
            if(dedup) for(int pi:byValue[value]) {
                const auto& p=pairs[pi]; if((p.a==a&&p.b==c)||(p.a==c&&p.b==a)) return;
            }
            int pi=static_cast<int>(pairs.size()); pairs.push_back({value,a,c});
            byCell[a].push_back(pi); byCell[c].push_back(pi); byValue[value].push_back(pi);
        };
        for(int value=1;value<=9;++value) {
            for(const auto& h:Rows) scan(h,value,false);
            for(const auto& h:Cols) scan(h,value,false);
            for(const auto& h:Squares) scan(h,value,true);
        }
        for(int i=0;i<81;++i) if(std::popcount(static_cast<unsigned>(b.cells[i].candidates))==2 && !b.cells[i].value)
            bivals.push_back({i,digits(b,i)});
        std::sort(bivals.begin(),bivals.end(),[](const auto& x,const auto& y){
            return x.digits[1]!=y.digits[1]?x.digits[1]<y.digits[1]:x.digits[0]<y.digits[0];
        });
        for(int i=0;i<static_cast<int>(bivals.size());++i) for(int v:bivals[i].digits) bvByValue[v].push_back(i);
    }
    bool inPath(int ep,int ix) const {
        for(;ix>=0;ix=chain[ix].parent) if(chain[ix].cell==ep) return true;
        return false;
    }
    int append(Node n) {
        int ix=static_cast<int>(chain.size());
        int parent=n.parent;
        chain.push_back(std::move(n));
        if(parent>=0) chain[parent].children.push_back(ix);
        return ix;
    }
    void next(int ix) {
        // Snapshot current node: appending can reallocate the vector.
        Node cur=chain[ix];
        if(cur.link=='w') {
            for(int pi:byCell[cur.cell]) {
                const auto& p=pairs[pi];
                if(p.value!=cur.in) continue;
                int other=p.a==cur.cell?p.b:p.a;
                if(inPath(other,ix)) continue;
                int ni=append({other,p.value,0,ix,'s',digits(b,other),{}});
                next(ni);
            }
            return;
        }
        for(int pi:byCell[cur.cell]) {
            const auto& p=pairs[pi];
            if(p.value==cur.in || p.value==cur.out || !has(b,cur.cell,p.value)) continue;
            int other=p.a==cur.cell?p.b:p.a;
            if(inPath(other,ix)) continue;
            int wi=append({cur.cell,p.value,0,ix,'w',cur.digits,{}});
            int si=append({other,p.value,0,wi,'s',digits(b,other),{}});
            next(si);
        }
        for(int pi:byValue[cur.in]) {
            const auto& p=pairs[pi];
            if(cur.cell==p.a||cur.cell==p.b) continue;
            int near=-1,far=-1;
            if(sees(cur.cell,p.a)) {near=p.a;far=p.b;}
            else if(sees(cur.cell,p.b)) {near=p.b;far=p.a;}
            if(near<0 || inPath(near,ix) || inPath(far,ix)) continue;
            int wi=append({near,cur.in,0,ix,'w',digits(b,near),{}});
            int si=append({far,p.value,0,wi,'s',digits(b,far),{}});
            next(si);
        }
        for(int bi:bvByValue[cur.in]) {
            const auto& bv=bivals[bi];
            if(!sees(cur.cell,bv.cell)||inPath(bv.cell,ix)) continue;
            int other=bv.digits[0]==cur.in?bv.digits[1]:bv.digits[0];
            int wi=append({bv.cell,cur.in,cur.in,ix,'w',bv.digits,{}});
            int si=append({bv.cell,other,cur.in,wi,'s',bv.digits,{}});
            next(si);
        }
    }
    std::vector<Path> paths() const {
        std::vector<Path> result;
        for(int i=static_cast<int>(chain.size())-1;i>=0;--i) {
            if(!chain[i].children.empty()) continue;
            Path p;
            for(int j=i;j>=0;j=chain[j].parent) p.push_back({chain[j].cell,chain[j].in,chain[j].out});
            if(p.size()<3) continue;
            std::reverse(p.begin(),p.end()); result.push_back(std::move(p));
        }
        return result;
    }
    Targets loopTargets(const Path& p) const {
        Targets t;
        for(int i=1;i+1<static_cast<int>(p.size());i+=2) {
            int a=p[i].cell,c=p[i+1].cell,v=p[i+1].in;
            if(a==c) {
                Digits remove;
                for(int d:digits(b,a)) if(d!=p[i].in && d!=p[i+1].in) remove.push_back(d);
                if(!remove.empty()) t.push_back({{a},remove});
            } else {
                auto cells=targetsSeen(b,v,a,c);
                if(!cells.empty()) t.push_back({std::move(cells),{v}});
            }
        }
        auto cells=targetsSeen(b,p[0].in,p[0].cell,p.back().cell);
        if(!cells.empty()) t.push_back({std::move(cells),{p[0].in}});
        return t;
    }
    std::optional<Hint> make(const std::string& type,const Path& p,const Targets& t) const {
        Hint h; h.type=type;
        h.message=(type=="aicI"?"AIC I":type=="aicII"?"AIC II":"AIC I Loop");
        // Keep path order, but remove duplicate support cells.
        for(const auto& pt:p) if(std::find(h.supportCells.begin(),h.supportCells.end(),pt.cell)==h.supportCells.end())
            h.supportCells.push_back(pt.cell);
        for(const auto& [cells,vals]:t) for(int cell:cells) for(int v:vals) if(has(b,cell,v)) {
            Deduction d{Operation::RemoveCandidate,cell,v};
            if(std::none_of(h.deductions.begin(),h.deductions.end(),[&](const Deduction& x){return x.cell==cell&&x.value==v;}))
                h.deductions.push_back(d);
        }
        if(h.deductions.empty()) return std::nullopt;
        return h;
    }
    std::optional<Hint> process(const std::vector<Path>& all) const {
        for(const auto& p:all) {
            for(int i=static_cast<int>(p.size())-1;i>3;i-=2) {
                int a=p[0].cell,c=p[i].cell,v=p[0].in;
                if(p[i].in!=v || !sees(a,c)) continue;
                if(!(b.cells[a].candidates & b.cells[c].candidates)) continue;
                Path prefix(p.begin(),p.begin()+i+1);
                auto t=loopTargets(prefix);
                if(!t.empty()) if(auto h=make("aicIloop",prefix,t)) return h;
            }
            for(int i=static_cast<int>(p.size())-1;i>3;i-=2) {
                int a=p[0].cell,c=p[i].cell,v=p[0].in,w=p[i].in;
                if(v==w||!sees(a,c)) continue;
                Targets t;
                if(has(b,a,w)) t.push_back({{a},{w}});
                if(has(b,c,v)) t.push_back({{c},{v}});
                if(!t.empty()) {
                    Path prefix(p.begin(),p.begin()+i+1);
                    if(auto h=make("aicII",prefix,t)) return h;
                }
            }
        }
        for(const auto& p:all) for(int i=static_cast<int>(p.size())-1;i>3;i-=2) {
            int a=p[0].cell,c=p[i].cell,v=p[0].in;
            if(p[i].in!=v||sees(a,c)) continue;
            Targets t;
            int corner0=Rows[cellRow(a)][cellCol(c)];
            int corner1=Rows[cellRow(c)][cellCol(a)];
            std::vector<int> corners;
            if(has(b,corner0,v)) corners.push_back(corner0);
            if(has(b,corner1,v)) corners.push_back(corner1);
            if(!corners.empty()) {
                t.push_back({corners,{v}});
                Path prefix(p.begin(),p.begin()+i+1);
                if(auto h=make("aicI",prefix,t)) return h;
            }
        }
        return std::nullopt;
    }
    std::optional<Hint> run(int a,Digits ac,int v,int bcell,Digits bc,int w,int out) {
        chain.clear();
        append({a,v,0,-1,'x',std::move(ac),{}});
        int ix=append({bcell,w,out,0,'s',std::move(bc),{}});
        next(ix);
        return process(paths());
    }
    std::optional<Hint> find() {
        for(const auto& bv:bivals) {
            if(auto h=run(bv.cell,bv.digits,bv.digits[0],bv.cell,bv.digits,bv.digits[1],bv.digits[0])) return h;
            if(auto h=run(bv.cell,bv.digits,bv.digits[1],bv.cell,bv.digits,bv.digits[0],bv.digits[1])) return h;
        }
        for(const auto& p:pairs) {
            if(auto h=run(p.a,digits(b,p.a),p.value,p.b,digits(b,p.b),p.value,0)) return h;
            if(auto h=run(p.b,digits(b,p.b),p.value,p.a,digits(b,p.a),p.value,0)) return h;
        }
        return std::nullopt;
    }
};
} // namespace
std::optional<Hint> aic(const Board& board) { return Search(board).find(); }
} // namespace sudoku::techniques
