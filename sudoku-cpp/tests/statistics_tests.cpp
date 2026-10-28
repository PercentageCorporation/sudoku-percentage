#include "sudoku/engine.hpp"
#include <cassert>
#include <string>
int main() {
    sudoku::HintStatistics stats;
    stats.record("loops", std::nullopt, 2.5);
    sudoku::Hint h;
    h.type = "aicI";
    stats.record("loops", h, 1.5);
    auto f = stats.functions().at("loops");
    assert(f.calls == 2 && f.successes == 1 && f.time == 4);
    assert(f.successTime == 1.5 && f.failureTime == 2.5 && f.maxTime == 2.5);
    assert(stats.types().at("aicI").count == 1);
    const std::string json = stats.toJson();
    assert(json.find("\"successPct\":50") != std::string::npos);
    assert(json.find("\"type\":\"aicI\"") != std::string::npos);
    assert(json.find("\"function\":\"loops\"") != std::string::npos);
    assert(json.find("\"totalMs\":4") != std::string::npos);
    assert(json.find("\"successMs\":1.5") != std::string::npos);
    assert(json.find("\"failureMs\":2.5") != std::string::npos);
    assert(json.find("\"avgMs\":2") != std::string::npos);
    assert(json.find("\"maxMs\":2.5") != std::string::npos);
    assert(json.find("\"count\":1") != std::string::npos);
    stats.reset();
    assert(stats.toJson() == "{\"functions\":[],\"types\":[]}");
}
