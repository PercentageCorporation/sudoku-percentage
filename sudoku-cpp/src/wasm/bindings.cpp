#include "sudoku/engine.hpp"
#include "sudoku/fixture.hpp"
#include "sudoku/technique_dispatch.hpp"
#include <emscripten/bind.h>
#include <sstream>
#include <stdexcept>

namespace {
std::string quote(const std::string& s) {
    std::string out = "\"";
    for (unsigned char c : s) {
        if (c == '"' || c == '\\') { out += '\\'; out += static_cast<char>(c); }
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '\t') out += "\\t";
        else if (c < 32) { out += "?"; }
        else out += static_cast<char>(c);
    }
    return out + "\"";
}
std::string serialize(const std::optional<sudoku::Hint>& hint) {
    if (!hint) return "null";
    std::ostringstream o;
    o << "{\"type\":" << quote(hint->type)
      << ",\"message\":" << quote(hint->message)
      << ",\"row\":" << hint->row
      << ",\"col\":" << hint->col
      << ",\"square\":" << hint->square
      << ",\"supportCells\":[";
    for (size_t i=0;i<hint->supportCells.size();++i) {
        if (i) o << ',';
        o << hint->supportCells[i];
    }
    o << "],\"deductions\":[";
    for (size_t i=0;i<hint->deductions.size();++i) {
        if (i) o << ',';
        const auto& d=hint->deductions[i];
        o << "{\"operation\":" << quote(d.operation == sudoku::Operation::PlaceValue ? "place" : "remove")
          << ",\"cell\":" << d.cell << ",\"value\":" << d.value << '}';
    }
    o << "]}";
    return o.str();
}
std::string getSudokuHint(const std::string& boardJson, const std::string& name) {
    auto fixture = sudoku::parseFixtureJson(boardJson);
    if (!fixture.board.valid()) throw std::invalid_argument("Invalid Sudoku board");
    return serialize(sudoku::findHintByName(fixture.board, name));
}
}
EMSCRIPTEN_BINDINGS(sudoku_bridge) {
    emscripten::function("getSudokuHint", &getSudokuHint);
}
