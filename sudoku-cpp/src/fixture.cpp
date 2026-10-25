#include "sudoku/fixture.hpp"
#include <cctype>
#include <fstream>
#include <iterator>
#include <stdexcept>
#include <string_view>
#include <vector>

namespace sudoku {
namespace {
struct Reader {
    std::string text;
    size_t pos = 0;
    void ws() { while (pos < text.size() && std::isspace(static_cast<unsigned char>(text[pos]))) ++pos; }
    bool take(char c) { ws(); if (pos < text.size() && text[pos] == c) { ++pos; return true; } return false; }
    void expect(char c) { if (!take(c)) throw std::runtime_error(std::string("Expected '") + c + "' at byte " + std::to_string(pos)); }
    std::string string() {
        expect('"'); std::string out;
        while (pos < text.size()) {
            char c = text[pos++];
            if (c == '"') return out;
            if (c == '\\') {
                if (pos >= text.size()) break;
                char e = text[pos++];
                if (e != '"' && e != '\\' && e != '/') throw std::runtime_error("Unsupported JSON escape");
                out.push_back(e);
            } else { if (static_cast<unsigned char>(c) < 32) throw std::runtime_error("Invalid JSON string"); out.push_back(c); }
        }
        throw std::runtime_error("Unterminated JSON string");
    }
    int number() {
        ws(); size_t start = pos;
        if (pos < text.size() && text[pos] == '-') ++pos;
        while (pos < text.size() && std::isdigit(static_cast<unsigned char>(text[pos]))) ++pos;
        if (pos == start || (text[start] == '-' && pos == start + 1)) throw std::runtime_error("Expected integer");
        return std::stoi(text.substr(start, pos - start));
    }
    std::vector<int> ints() {
        expect('['); std::vector<int> a;
        if (take(']')) return a;
        do { a.push_back(number()); } while (take(','));
        expect(']'); return a;
    }
    std::vector<std::vector<int>> lists() {
        expect('['); std::vector<std::vector<int>> a;
        if (take(']')) return a;
        do { a.push_back(ints()); } while (take(','));
        expect(']'); return a;
    }
};
}
Fixture parseFixtureJson(const std::string& json) {
    Reader r{json};
    r.expect('{');
    std::string schema, indexing, name;
    std::vector<int> values;
    std::vector<std::vector<int>> candidates;
    bool seenSchema = false, seenIndexing = false, seenValues = false, seenCandidates = false, seenName = false;
    if (!r.take('}')) {
        do {
            std::string key = r.string(); r.expect(':');
            if (key == "schema" && !seenSchema) { schema = r.string(); seenSchema = true; }
            else if (key == "indexing" && !seenIndexing) { indexing = r.string(); seenIndexing = true; }
            else if (key == "name" && !seenName) { name = r.string(); seenName = true; }
            else if (key == "values" && !seenValues) { values = r.ints(); seenValues = true; }
            else if (key == "candidates" && !seenCandidates) { candidates = r.lists(); seenCandidates = true; }
            else throw std::runtime_error("Unexpected or repeated fixture key: " + key);
        } while (r.take(','));
        r.expect('}');
    }
    r.ws();
    if (r.pos != r.text.size()) throw std::runtime_error("Trailing JSON data");
    if (!seenSchema || schema != "sudoku-board-v1" || !seenIndexing || indexing != "square-major" || !seenValues || !seenCandidates)
        throw std::runtime_error("Unsupported or incomplete fixture schema");
    if (values.size() != 81 || candidates.size() != 81) throw std::runtime_error("Fixture requires 81 values and 81 candidate arrays");
    Fixture fixture;
    fixture.name = name;
    for (int i = 0; i < 81; ++i) {
        if (values[i] < 0 || values[i] > 9) throw std::runtime_error("Cell value out of range at " + std::to_string(i));
        fixture.board.cells[i].value = static_cast<std::uint8_t>(values[i]);
        Mask mask = 0;
        for (int digit : candidates[i]) {
            if (digit < 1 || digit > 9 || (mask & digitBit(digit))) throw std::runtime_error("Invalid/duplicate candidate at " + std::to_string(i));
            mask |= digitBit(digit);
        }
        if (values[i] && mask) throw std::runtime_error("Solved cell has candidates at " + std::to_string(i));
        fixture.board.cells[i].candidates = mask;
    }
    return fixture;
}
Fixture loadFixture(const std::string& filename) {
    std::ifstream in(filename);
    if (!in) throw std::runtime_error("Cannot open fixture: " + filename);
    return parseFixtureJson(std::string(std::istreambuf_iterator<char>(in), std::istreambuf_iterator<char>()));
}
} // namespace sudoku
