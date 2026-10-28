#include "sudoku/engine.hpp"
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <sstream>
#include <vector>

namespace sudoku {
void HintStatistics::record(const std::string& name, const std::optional<Hint>& result, double ms) {
    auto& f = functions_[name];
    ++f.calls;
    f.time += ms;
    f.maxTime = std::max(f.maxTime, ms);
    if (result) {
        ++f.successes;
        f.successTime += ms;
        auto& t = types_[result->type.empty() ? name : result->type];
        ++t.count;
        t.time += ms;
    } else f.failureTime += ms;
}
void HintStatistics::reset() { functions_.clear(); types_.clear(); }
namespace {
double rounded(double value, int digits) {
    const double scale = std::pow(10., digits);
    return std::round(value * scale) / scale;
}
std::string quote(const std::string& s) {
    std::string out = "\"";
    for (char c : s) {
        if (c == '"' || c == '\\') out += '\\';
        if (c == '\n') { out += "\\n"; continue; }
        out += c;
    }
    return out + '"';
}
}
std::string HintStatistics::toJson() const {
    using F = std::pair<std::string, FunctionStats>;
    using T = std::pair<std::string, TypeStats>;
    std::vector<F> fs(functions_.begin(), functions_.end());
    std::vector<T> ts(types_.begin(), types_.end());
    std::stable_sort(fs.begin(), fs.end(), [](const F& a, const F& b) { return a.second.time > b.second.time; });
    std::stable_sort(ts.begin(), ts.end(), [](const T& a, const T& b) { return a.second.count > b.second.count; });
    std::ostringstream o;
    o << std::setprecision(12) << "{\"functions\":[";
    bool first = true;
    for (const auto& [name, f] : fs) {
        if (!first) o << ',';
        first = false;
        o << "{\"function\":" << quote(name) << ",\"calls\":" << f.calls
          << ",\"successes\":" << f.successes
          << ",\"successPct\":" << rounded(100. * f.successes / f.calls, 1)
          << ",\"totalMs\":" << rounded(f.time, 2)
          << ",\"successMs\":" << rounded(f.successTime, 2)
          << ",\"failureMs\":" << rounded(f.failureTime, 2)
          << ",\"avgMs\":" << rounded(f.time / f.calls, 3)
          << ",\"maxMs\":" << rounded(f.maxTime, 2) << '}';
    }
    o << "],\"types\":[";
    first = true;
    for (const auto& [name, t] : ts) {
        if (!first) o << ',';
        first = false;
        o << "{\"type\":" << quote(name) << ",\"count\":" << t.count
          << ",\"totalMs\":" << rounded(t.time, 2) << '}';
    }
    return o.str() + "]}";
}
} // namespace sudoku
