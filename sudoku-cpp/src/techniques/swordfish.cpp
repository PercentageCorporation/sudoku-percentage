#include "sudoku/techniques.hpp"
#include <array>
#include <vector>
namespace sudoku::techniques {
namespace {
bool has(const Board& b,int c,int d) {return !b.cells[c].value && (b.cells[c].candidates & digitBit(d));}
using Cells=std::vector<int>;
struct Fish {int digit; std::array<int,3> rows,cols; std::array<Cells,3> baseCells;};
std::optional<Hint> findFish(const Board& b, const Fish& f, bool rowBased) {
    Hint h; h.type="swordfish";h.message="Swordfish";
    for(const auto& group:f.baseCells) for(int c:group) h.supportCells.push_back(c);
    for(int i=0;i<3;++i) {
        const House& house=rowBased?Cols[f.cols[i]]:Rows[f.rows[i]];
        for(int c:house) {
            bool support=false;
            for(int s:f.baseCells[i]) if(c==s) support=true;
            if(!support&&has(b,c,f.digit)) h.deductions.push_back({Operation::RemoveCandidate,c,f.digit});
        }
    }
    if(h.deductions.empty()) return std::nullopt;
    return h;
}
}
std::optional<Hint> swordfish(const Board& b) {
    std::vector<Fish> rowFish,colFish;
    for(int d=1;d<=9;++d) {
        std::vector<int> row23,col23;
        for(int i=0;i<9;++i) {
            int rn=0,cn=0;
            for(int c:Rows[i]) rn+=has(b,c,d);
            for(int c:Cols[i]) cn+=has(b,c,d);
            if(rn==2||rn==3) row23.push_back(i);
            if(cn==2||cn==3) col23.push_back(i);
        }
        for(bool rowBased:{true,false}) {
            const auto& base=rowBased?row23:col23;
            for(std::size_t i=0;i<base.size();++i)
            for(std::size_t j=i+1;j<base.size();++j)
            for(std::size_t k=j+1;k<base.size();++k) {
                std::array<int,3> chosen{base[i],base[j],base[k]};
                Cells covers;
                // Match columnsInCommon23 / rowsInCommon23: cover groups with >1 occurrences,
                // but count all cover positions having at least one occurrence.
                for(int cover=0;cover<9;++cover) {
                    Cells group;
                    for(int bi:chosen) {
                        int c=rowBased?cellIndex(bi,cover):cellIndex(cover,bi);
                        if(has(b,c,d)) group.push_back(c);
                    }
                    if(!group.empty()) covers.push_back(cover);
                }
                if(covers.size()!=3) continue;
                // Revised JS requires exactly three cover groups, each with 2 or 3 candidates.
                bool threeGroups=true;
                for(int cover:covers) {
                    int members=0;
                    for(int bi:chosen) members+=has(b,rowBased?cellIndex(bi,cover):cellIndex(cover,bi),d);
                    if(members<2) {threeGroups=false;break;}
                }
                if(!threeGroups) continue;
                Fish f{d,{}, {}, {}};
                if(rowBased) {f.rows=chosen;f.cols={covers[0],covers[1],covers[2]};}
                else {f.cols=chosen;f.rows={covers[0],covers[1],covers[2]};}
                for(int n=0;n<3;++n) for(int bi:chosen) {
                    int c=rowBased?cellIndex(bi,covers[n]):cellIndex(covers[n],bi);
                    if(has(b,c,d)) f.baseCells[n].push_back(c);
                }
                (rowBased?rowFish:colFish).push_back(f);
            }
        }
    }
    for(const auto& f:rowFish) if(auto h=findFish(b,f,true)) return h;
    for(const auto& f:colFish) if(auto h=findFish(b,f,false)) return h;
    return std::nullopt;
}
} // namespace sudoku::techniques
