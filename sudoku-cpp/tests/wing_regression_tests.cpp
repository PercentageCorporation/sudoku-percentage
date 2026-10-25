#include "sudoku/fixture.hpp"
#include "sudoku/techniques.hpp"
#include <algorithm>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

int main(int argc, char** argv) {
    if (argc != 5) {
        std::cerr << "Usage: wing_regression_tests FILE TECHNIQUE DIGIT TARGETS_CSV\n";
        return 2;
    }
    try {
        const auto fixture = sudoku::loadFixture(argv[1]);
        if (!fixture.board.valid()) throw std::runtime_error("Invalid board");
        const std::string technique = argv[2];
        std::optional<sudoku::Hint> hint;
        if (technique == "xyWing") hint = sudoku::techniques::xyWing(fixture.board);
        else if (technique == "xyzWing") hint = sudoku::techniques::xyzWing(fixture.board);
        else if (technique == "wWing") hint = sudoku::techniques::wWing(fixture.board);
        else if (technique == "wxyzWing") hint = sudoku::techniques::wxyzWing(fixture.board);
        else throw std::runtime_error("Unknown technique");
        if (!hint || hint->type != technique) throw std::runtime_error("Missing or wrong hint type");
        const int digit = std::stoi(argv[3]);
        std::vector<int> expected;
        std::string csv = argv[4];
        std::size_t pos = 0;
        while (pos < csv.size()) {
            auto comma = csv.find(',', pos);
            expected.push_back(std::stoi(csv.substr(pos, comma == std::string::npos ? comma : comma - pos)));
            if (comma == std::string::npos) break;
            pos = comma + 1;
        }
        std::vector<int> actual;
        for (const auto& d : hint->deductions) {
            if (d.operation != sudoku::Operation::RemoveCandidate || d.value != digit)
                throw std::runtime_error("Wrong deduction operation or digit");
            actual.push_back(d.cell);
        }
        std::sort(expected.begin(), expected.end());
        std::sort(actual.begin(), actual.end());
        if (actual != expected) {
            std::cerr << "Expected:"; for(int c:expected) std::cerr << ' ' << c;
            std::cerr << " | actual:"; for(int c:actual) std::cerr << ' ' << c;
            std::cerr << '\n';
            throw std::runtime_error("Wrong target cells");
        }
        std::cout << "PASS: " << technique << " removes " << digit << " from";
        for(int c:actual) std::cout << ' ' << c;
        std::cout << '\n';
    } catch (const std::exception& e) {
        std::cerr << "FAIL: " << e.what() << '\n';
        return 1;
    }
}
