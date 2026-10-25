#include "sudoku/techniques.hpp"
#include <algorithm>
#include <array>
#include <deque>
#include <set>
#include <utility>
#include <vector>

namespace sudoku::techniques {
namespace {
using Cells=std::vector<int>;
using Pair=std::pair<int,int>;
using Pairs=std::vector<Pair>;
struct Conjugate {int value; Pair cells;};
bool contains(const Cells& v,int c) {return std::find(v.begin(),v.end(),c)!=v.end();}
bool has(const Board& b,int c,int d) {return !b.cells[c].value && (b.cells[c].candidates & digitBit(d));}
bool sees(int a,int c) {return a!=c&&(cellRow(a)==cellRow(c)||cellCol(a)==cellCol(c)||cellSquare(a)==cellSquare(c));}
std::vector<Conjugate> conjugates(const Board& b) {
    std::vector<Conjugate> out;
    for(int d=1;d<=9;++d) for(int kind=0;kind<3;++kind) for(int h=0;h<9;++h) {
        const House& house=kind==0?Rows[h]:kind==1?Cols[h]:Squares[h];
        Cells cells;
        for(int c:house) if(has(b,c,d)) cells.push_back(c);
        if(cells.size()==2) out.push_back({d,{cells[0],cells[1]}});
    }
    return out;
}
Pairs valuePairs(const std::vector<Conjugate>& cp,int d) {
    Pairs out; for(const auto& c:cp) if(c.value==d) out.push_back(c.cells); return out;
}
Cells mates(const Pairs& pairs,int c) {
    Cells out;
    for(auto [a,b]:pairs) {if(a==c) out.push_back(b); else if(b==c) out.push_back(a);}
    return out;
}
bool sameHouseWithin(const Cells& cells) {
    for(std::size_t i=0;i<cells.size();++i) for(std::size_t j=i+1;j<cells.size();++j)
        if(sees(cells[i],cells[j])) return true;
    return false;
}
std::optional<Hint> make(const char* type,int d,const Cells& support,const Cells& targets) {
    if(targets.empty()) return std::nullopt;
    Hint hint;hint.type=type;hint.message=type;hint.supportCells=support;
    for(int c:targets) hint.deductions.push_back({Operation::RemoveCandidate,c,d});
    return hint;
}
Cells allCandidateCells(const Board& b,int d) {
    Cells out;for(int c=0;c<81;++c) if(has(b,c,d)) out.push_back(c);return out;
}
bool matches(const Pairs& cluster,Pair p) {
    for(auto [a,b]:cluster) if(a==p.first||a==p.second||b==p.first||b==p.second) return true;
    return false;
}
bool inCluster(const Pairs& cluster,Pair p) {
    for(auto [a,b]:cluster) if((a==p.first&&b==p.second)||(a==p.second&&b==p.first)) return true;
    return false;
}
// Match JavaScript's getEndpoints: retain vertices occurring exactly once.
Cells endpoints(const Pairs& cluster) {
    Cells all;
    for(auto [a,b]:cluster) {all.push_back(a);all.push_back(b);}
    std::sort(all.begin(),all.end());
    Cells out;
    for(std::size_t i=0;i<all.size();) {
        std::size_t j=i+1;while(j<all.size()&&all[j]==all[i]) ++j;
        if(j==i+1) out.push_back(all[i]);
        i=j;
    }
    return out;
}
using Bipartite=std::vector<Pair>; // cell, parity
Bipartite bipartite(const Pairs& pairs) {
    if(pairs.empty()) return {};
    std::array<Cells,81> neighbors;
    for(auto [a,b]:pairs) {neighbors[a].push_back(b);neighbors[b].push_back(a);}
    std::array<int,81> parity;parity.fill(-1);
    std::deque<int> queue{pairs[0].first};parity[pairs[0].first]=0;
    while(!queue.empty()) {
        int a=queue.front();queue.pop_front();
        for(int b:neighbors[a]) if(parity[b]<0) {parity[b]=1-parity[a];queue.push_back(b);}
    }
    Bipartite result;
    for(int c=0;c<81;++c) if(parity[c]>=0) result.push_back({c,parity[c]});
    return result;
}
std::array<Cells,2> split(const Bipartite& bp) {
    std::array<Cells,2> result;
    for(auto [c,p]:bp) result[p].push_back(c);
    return result;
}
Cells targetsSeenByBoth(const Board& b,int d,const Cells& left,const Cells& right) {
    Cells out;
    for(int c=0;c<81;++c) if(has(b,c,d)) {
        bool l=false,r=false;
        for(int x:left) if(sees(c,x)) {l=true;break;}
        for(int x:right) if(sees(c,x)) {r=true;break;}
        if(l&&r) out.push_back(c);
    }
    return out;
}
} // namespace

std::optional<Hint> colors(const Board& b) {
    const auto cp=conjugates(b);
    for(int d=1;d<=9;++d) {
        auto pairs=valuePairs(cp,d);
        for(auto [first,second]:pairs) {
            (void)second;
            Cells red{first},blue;
            bool changed=true;
            while(changed) {
                changed=false;
                // Iterate over the live arrays, as JavaScript's forEach does.
                for(std::size_t i=0,n=red.size();i<n;++i)
                    for(int c:mates(pairs,red[i])) if(!contains(blue,c)) {blue.push_back(c);changed=true;}
                for(std::size_t i=0,n=blue.size();i<n;++i)
                    for(int c:mates(pairs,blue[i])) if(!contains(red,c)) {red.push_back(c);changed=true;}
            }
            if(red.size()+blue.size()<3) continue;
            bool redSame=sameHouseWithin(red),blueSame=sameHouseWithin(blue);
            if(redSame||blueSame) {
                const auto& invalid=redSame?red:blue;
                const auto& targets=redSame?blue:red;
                if(auto h=make("colorsII",d,invalid,targets)) return h;
            }
            Cells targets;
            for(int c:allCandidateCells(b,d)) {
                if(contains(red,c)||contains(blue,c)) continue;
                bool r=false,bl=false;
                for(int x:red) if(sees(c,x)) {r=true;break;}
                for(int x:blue) if(sees(c,x)) {bl=true;break;}
                if(r&&bl) targets.push_back(c);
            }
            if(!targets.empty()) {
                Cells support=red;support.insert(support.end(),blue.begin(),blue.end());
                return make("colorsI",d,support,targets);
            }
        }
    }
    return std::nullopt;
}

std::optional<Hint> colorWing(const Board& b) {
    const auto cp=conjugates(b);
    for(int d=1;d<=9;++d) {
        auto pairs=valuePairs(cp,d);
        if(pairs.size()<2) continue;
        std::vector<Pairs> clusters;
        for(auto p:pairs) {
            bool already=false;
            for(const auto& cluster:clusters) if(inCluster(cluster,p)) {already=true;break;}
            if(already) continue;
            Pairs cluster{p};
            bool added=true;
            while(added) {
                added=false;
                for(auto next:pairs) if(!inCluster(cluster,next)&&matches(cluster,next)) {
                    cluster.push_back(next);added=true;
                }
            }
            clusters.push_back(cluster);
        }
        for(std::size_t i=0;i<clusters.size();++i) for(std::size_t j=i+1;j<clusters.size();++j) {
            if(endpoints(clusters[i]).size()<2||endpoints(clusters[j]).size()<2) continue;
            auto bi=bipartite(clusters[i]),bj=bipartite(clusters[j]);
            using Bridge=std::pair<Pair,Pair>;
            std::vector<Bridge> bridges;
            for(auto a:bi) for(auto c:bj) if(sees(a.first,c.first)) bridges.push_back({a,c});
            if(bridges.empty()) continue;
            auto pi=split(bi),pj=split(bj);
            Cells support;
            for(auto [c,p]:bi) { (void)p;support.push_back(c); }
            for(auto [c,p]:bj) { (void)p;support.push_back(c); }
            if(bridges.size()==1) {
                int parityI=bridges[0].first.second,parityJ=bridges[0].second.second;
                if(auto h=make("colorWing",d,support,targetsSeenByBoth(b,d,pi[1-parityI],pj[1-parityJ]))) return h;
            } else {
                int p0=bridges[0].first.second,p1=bridges[0].second.second;
                bool same0=true,same1=true;
                for(const auto& bridge:bridges) {
                    if(bridge.first.second!=p0) same0=false;
                    if(bridge.second.second!=p1) same1=false;
                }
                if(same0&&!same1) {
                    // JavaScript eliminates the entire parity group.
                    if(auto h=make("colorWing",d,support,pi[p0])) return h;
                }
                // The JavaScript branch for same1&&!same0 calculates targets
                // but never adds them to the candidate hints. Preserve that.
            }
        }
    }
    return std::nullopt;
}
} // namespace sudoku::techniques
