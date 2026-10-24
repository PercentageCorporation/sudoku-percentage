cmake_minimum_required(VERSION 3.16)
project(sudoku_engine LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
add_library(sudoku_engine STATIC src/engine.cpp src/solver.cpp src/fixture.cpp
    src/techniques/singles.cpp src/techniques/locked.cpp src/techniques/fish.cpp src/techniques/pairs.cpp src/techniques/triples.cpp src/techniques/rectangles.cpp src/techniques/loops.cpp src/techniques/wings.cpp)
target_include_directories(sudoku_engine PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)
target_compile_options(sudoku_engine PRIVATE -Wall -Wextra -Wpedantic)
add_executable(sudoku_tests tests/tests.cpp)
target_link_libraries(sudoku_tests PRIVATE sudoku_engine)
enable_testing()
add_test(NAME sudoku_tests COMMAND sudoku_tests)

add_executable(sudoku_fixture_tests tests/fixture_tests.cpp)
target_link_libraries(sudoku_fixture_tests PRIVATE sudoku_engine)
add_test(NAME sudoku_fixture_tests COMMAND sudoku_fixture_tests ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/one_missing.json)

# Regression tests from exported JavaScript board states.
add_executable(sudoku_regression_tests tests/regression_tests.cpp)
target_link_libraries(sudoku_regression_tests PRIVATE sudoku_engine)
add_test(NAME regression_single COMMAND sudoku_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/single.json cell 4 2)
add_test(NAME regression_single_row COMMAND sudoku_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/single_row.json cellR 21 3)

add_test(NAME regression_locked COMMAND sudoku_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/locked_xwing.json locked 12 4 remove)

add_executable(sudoku_fish_tests tests/fish_tests.cpp)
target_link_libraries(sudoku_fish_tests PRIVATE sudoku_engine)
add_test(NAME sudoku_fish_tests COMMAND sudoku_fish_tests)

# Real exported column-oriented X-Wing fixture; assert corners and exact eliminations.
add_executable(sudoku_xwing_regression_tests tests/xwing_regression_tests.cpp)
target_link_libraries(sudoku_xwing_regression_tests PRIVATE sudoku_engine)
add_test(NAME regression_xwing_column COMMAND sudoku_xwing_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/XWing-Column.json)

add_executable(sudoku_subset_tests tests/subset_tests.cpp)
target_link_libraries(sudoku_subset_tests PRIVATE sudoku_engine)
add_test(NAME sudoku_subset_tests COMMAND sudoku_subset_tests)

add_executable(sudoku_locked2_regression_tests tests/locked2_regression_tests.cpp)
target_link_libraries(sudoku_locked2_regression_tests PRIVATE sudoku_engine)
add_test(NAME regression_locked2_row COMMAND sudoku_locked2_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/locked2_row.json row)
add_test(NAME regression_locked2_column COMMAND sudoku_locked2_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/locked2_column.json column)

add_executable(sudoku_rectangle_regression_tests tests/rectangle_regression_tests.cpp)
target_link_libraries(sudoku_rectangle_regression_tests PRIVATE sudoku_engine)
add_test(NAME regression_ur_type3 COMMAND sudoku_rectangle_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/ur_type_3.json urType3 "23:2")
add_test(NAME regression_ur_type4 COMMAND sudoku_rectangle_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/ur_type_4.json urType4 "74:9,77:9")
add_test(NAME regression_empty_rectangle COMMAND sudoku_rectangle_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/empty_rectangle.json emptyRectangle "12:9")

add_test(NAME regression_ur_type5_two_corners COMMAND sudoku_rectangle_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/ur_type_5_2.json urType5 "63:9")
add_test(NAME regression_ur_type5_three_corners COMMAND sudoku_rectangle_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/ur_type_5_3.json urType5 "63:9")

add_test(NAME regression_ur_type7 COMMAND sudoku_rectangle_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/ur_type_7.json urType7 "9:1")

add_test(NAME regression_ur_type6 COMMAND sudoku_rectangle_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/ur_type_6.json urType6 "28:8,50:8")
