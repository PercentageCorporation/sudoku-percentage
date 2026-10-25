cmake_minimum_required(VERSION 3.16)
project(sudoku_engine LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
add_library(sudoku_engine STATIC src/engine.cpp src/solver.cpp src/fixture.cpp
    src/techniques/singles.cpp src/techniques/locked.cpp src/techniques/fish.cpp src/techniques/pairs.cpp src/techniques/triples.cpp src/techniques/rectangles.cpp src/techniques/loops.cpp src/techniques/wings.cpp src/techniques/chains.cpp src/techniques/colors.cpp src/techniques/swordfish.cpp src/techniques/suedecoq.cpp src/techniques/forcing.cpp)
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

# Direct-technique wing regression tests from JavaScript board exports.
add_executable(sudoku_wing_regression_tests tests/wing_regression_tests.cpp)
target_link_libraries(sudoku_wing_regression_tests PRIVATE sudoku_engine)
add_test(NAME regression_xy_wing COMMAND sudoku_wing_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/xy_wing.json xyWing 2 "10,25")
add_test(NAME regression_xyz_wing COMMAND sudoku_wing_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/xyz_wing.json xyzWing 4 "11")
add_test(NAME regression_w_wing COMMAND sudoku_wing_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/w_wing.json wWing 5 "63")
add_test(NAME regression_wxyz_wing COMMAND sudoku_wing_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/wxyz_wing.json wxyzWing 5 "44,64,70")

# Direct chain technique regressions from exported JavaScript board states.
add_executable(sudoku_chain_regression_tests tests/chain_regression_tests.cpp)
target_link_libraries(sudoku_chain_regression_tests PRIVATE sudoku_engine)
add_test(NAME regression_x_chain COMMAND sudoku_chain_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/x_chain_1.json xChain 9 "26")
add_test(NAME regression_xy_chain COMMAND sudoku_chain_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/xy_chain.json xyChain 3 "76")

add_executable(sudoku_color_regression_tests tests/color_regression_tests.cpp)
target_link_libraries(sudoku_color_regression_tests PRIVATE sudoku_engine)
add_test(NAME regression_colors_I COMMAND sudoku_color_regression_tests ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/colors_I.json colorsI 9 "30")
add_test(NAME regression_colors_II COMMAND sudoku_color_regression_tests ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/colors_II.json colorsII 6 "13,19,50,61,72")
add_test(NAME regression_color_wing COMMAND sudoku_color_regression_tests ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/color_wing.json colorWing 6 "8,30,45")

# Direct Swordfish / Sue de Coq regressions; assert exact cell-candidate eliminations.
add_executable(sudoku_swordfish_sdc_regression_tests tests/swordfish_sdc_regression_tests.cpp)
target_link_libraries(sudoku_swordfish_sdc_regression_tests PRIVATE sudoku_engine)
add_test(NAME regression_swordfish COMMAND sudoku_swordfish_sdc_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/swordfish.json swordfish "17:4")
add_test(NAME regression_sdc_I COMMAND sudoku_swordfish_sdc_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/sdcI.json sdcI "17:1,17:6")
add_test(NAME regression_sdc_II COMMAND sudoku_swordfish_sdc_regression_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/sdcII.json sdcII "38:8,31:7,32:7,48:6,49:6,49:7")

# Forcing smoke tests; fixture-specific deductions will be added after JS exports.
add_executable(sudoku_forcing_tests tests/forcing_tests.cpp)
target_link_libraries(sudoku_forcing_tests PRIVATE sudoku_engine)
add_test(NAME sudoku_forcing_tests COMMAND sudoku_forcing_tests)

# Verbose diagnostic for a single forcing assumption.
add_executable(sudoku_forcing_diagnostic tests/forcing_diagnostic.cpp)
target_link_libraries(sudoku_forcing_diagnostic PRIVATE sudoku_engine)
add_test(NAME diagnostic_forced_13_2 COMMAND sudoku_forcing_diagnostic
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/forced.json 13 2)

add_executable(sudoku_biforce_regression tests/biforce_regression.cpp)
target_link_libraries(sudoku_biforce_regression PRIVATE sudoku_engine)
add_test(NAME diagnostic_biforce_forced2 COMMAND sudoku_biforce_regression
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/forced2.json)

# Build with: emcmake cmake -S . -B build-wasm -DSUDOKU_BUILD_WASM=ON
option(SUDOKU_BUILD_WASM "Build browser WebAssembly bridge" OFF)
if(SUDOKU_BUILD_WASM)
    if(NOT EMSCRIPTEN)
        message(FATAL_ERROR "SUDOKU_BUILD_WASM requires the Emscripten toolchain (emcmake)")
    endif()
    add_executable(sudoku_wasm src/wasm/bindings.cpp)
    target_link_libraries(sudoku_wasm PRIVATE sudoku_engine)
    target_link_options(sudoku_wasm PRIVATE
        "--bind" "-sMODULARIZE=1" "-sEXPORT_ES6=1"
        "-sENVIRONMENT=web,worker,node" "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0")
    set_target_properties(sudoku_wasm PROPERTIES SUFFIX ".js" OUTPUT_NAME "sudoku")
endif()

add_executable(sudoku_json_interface_tests tests/json_interface_tests.cpp)
target_link_libraries(sudoku_json_interface_tests PRIVATE sudoku_engine)
add_test(NAME sudoku_json_interface_tests COMMAND sudoku_json_interface_tests
    ${CMAKE_CURRENT_SOURCE_DIR}/tests/fixtures/forced2.json)
