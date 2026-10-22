import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useHintStore } from "@sudoku/common/store/hintStore";
import { findCandidates, validateBoard, validateManBoard, computeCandidates } from "@sudoku/common/utilities/utilities";
import { RCS, LinearToGrid } from "@sudoku/common/utilities/constants";

export const useManCells = () => useManCellsStore((state) => state.cells);
export const useManCellsStore = create (
	persist (
		(set, get) => ({
			cells: new Array(81).fill(0),
			solution: new Array(81).fill(0),
			candidates: Array.from({ length: 81 }, () => []),
			number: 0,
			description: "",
			manSelectedCell: -1,
			showNumberGrid: false,
			showCandidates: false,
			showSolution: false,
			manGameValid: true,
			initialized: false,

			initialize: () => {
				set({
					cells: new Array(81).fill(0),
					solution: new Array(81).fill(0),
					candidates: Array.from({ length: 81 }, () => []),
					number: null,
					description: "New Game",
					manSelectedCell: -1,
					manGameValid: true,
					initialized: true
				})
			},

			loadManCells: (num, descr, cls, solution) => {
				if (!solution) solution = new Array(81).fill(0);
				const candidates = computeCandidates(cls);
				set({
					cells: cls,
					solution: solution,
					candidates: candidates,
					number: num,
					description: descr,
					manSelectedCell: -1,
					manGameValid: validateManBoard(cls, candidates),
					initialized: true
				})
			},

			loadManSolution: (solution) => {
				set({
					solution: solution,
					manSelectedCell: -1,
					initialized: true
				})
			},

			validateManGame: () => {
				const cls = get().cells
				const candidates = get().candidates;
				const val = validateManBoard(cls, candidates);
				set({
					manGameValid: val
				})
				return val;
			},

			getManCellsLinear: () => {
				let linear = new Array(81).fill(0);
				let cells = get().cells;
				for (let i = 0; i < 81; i++) {
					linear[i] = cells[LinearToGrid[i]];
				}
				return linear;
			},

			getManCellsLinearText: () => {
				let linear = "";
				let cells = get().cells;
				for (let i = 0; i < 81; i++) {
					let val = cells[LinearToGrid[i]];
					linear += Number(val);
				}
				return linear;
			},

			getManJSON: () => {
				let cells = get().cells;
				let ix = 0;
				let grids = [];
				for (let i = 0; i < 9; i++) {
					let sq = [];
					for (let j = 0; j < 9; j++) {
						sq.push(cells[ix++]);
					}
					grids.push(sq);
				}
				let json = JSON.stringify(grids);
				return json;
			},

			getManLinearJSON: () => {
				let cells = get().cells;
				let grids = [];
				for (let i = 0; i < 9; i++) {
					let row = [];
					for (let j = 0; j < 9; j++) {
						row.push(cells[ix++]);
					}
					grids.push(row);
				}
				let json = JSON.stringify(grids);
				return json;
			},

			getManCells: () => {
				return get().cells
			},

			getManSolution: () => {
				return get().solution
			},

			getManCell: (ix) => {
				return get().cells[ix]
			},

			getManCellCandidates: (ix) => {
				return get().candidates[ix]
			},

			getManSolutionCell: (ix) => {
				let solution = get().solution;
				if (!solution) return null;
				return solution[ix]
			},

			setManCellValue: (ix, value) => {
				set((state) => {
					const cells = [...state.cells];
					cells[ix] = value;
					const candidates = computeCandidates(cells);
					return {
						cells,
						candidates,
						manGameValid: validateManBoard(cells, candidates),
					}
				})
			},

			setManSelectedCell: (ix) => {
				const sel = get().manSelectedCell;
				console.log("setManSelectedCell", sel, ix);
				set({ manSelectedCell: ix })
			},

			getManSelectedCell: () => {
				return get().manSelectedCell
			},

			setManId: (number, description) => {
				set({
					number: number,
					description: description
				})
			},

			toggleShowCandidates: () => {
				set({ showCandidates: !get().showCandidates })
			},

			toggleShowNumberGrid: () => {
				set({ showNumberGrid: !get().showNumberGrid })
			},

			toggleShowSolution: () => {
				set({ showSolution: !get().showSolution })
			},

			setManSelectedCell: (ix) => {
				const sel = get().manSelectedCell;
				console.log("setManSelectedCell", sel, ix);
				set({ manSelectedCell: ix })
			},

		}),
		{
			name: 'sudoku-man-game', // Unique name for the storage item
			storage: createJSONStorage(() => sessionStorage), // Use session storage
		}
	)
);

export const useGameStateStore = create (
	persist(
		(set, get) => ({
			selectedCell: -1,
			selectedValue: -1,
			editCandidates: -1,
			showBivalue: false,
			showConjugates: false,
			showSolution: false,
			numbersUsed: [0,0,0,0,0,0,0,0,0,0],
			solutionLog: [],

			resetState: () => {
				set({
					selectedCell: -1,
					selectedValue: -1,
					editCandidates: -1,
					showBivalue: false,
					showConjugates: false,
					numbersUsed: [0,0,0,0,0,0,0,0,0,0],
				})
			},

			clearSolutionLog: () => {
				set({ solutionLog: []})
			},

			addSolutionLog: (item) => {
				let log = get().solutionLog;
				log.push(item);
				set({ solutionLog: log})
			},

			setSelectedValue: (sel) => {
				set({ selectedValue: sel})
			},

			clearSelectedValue: () => {
				set({ selectedValue: -1})
			},

			setSelectedCell: (sel) => {
				set({ selectedCell: sel})
			},

			clearSelectedCell: () => {
				set({ selectedCell: -1})
			},

			setEditCandidates: (cix) => {
				set({ editCandidates: cix})
			},

			setShowBivalue: (tf) => {
				set({ showBivalue: tf})
			},

			clearShowBivalue: () => {
				set({ showBivalue: false})
			},

			setShowConjugates: (tf) => {
				set({ showConjugates: tf})
			},

			clearShowConjugates: () => {
				set({ showConjugates: false})
			},

			toggleShowSolution: () => {
				set({ showSolution: !get().showSolution})
			},

			calcNumbersUsed: () => {
				//console.log("calcNumbersUsed");
				let complete = false;
				let nines = 0;
				let selVal = get().selectedValue;
				const used = [0,0,0,0,0,0,0,0,0,0];
				for (let i = 0; i < 81; ++i) {
					const num = cellStore.get().cells[i].value;
					if (num > 0) used[num] += 1;
					if (used[num] === 9) nines += 1;
				};
					used[0] = nines;
					if (nines == 9) {
						selVal = -1;
						complete = true;
					}
					set({
						numbersUsed: used,
						gameComplete: 0,
						selectedValue: selVal
					})
			},
		}),
		{
			name: 'sudoku-game-state', // Unique name for the storage item
			storage: createJSONStorage(() => sessionStorage), // Use session storage
		}
	),
);

export const Cell = {
	row: 0,
	col: 0,
	square: 0,
	pairity: 0,				// 0-none, 1-grp 1 odd, 2-grp 1 even, 3-grp 2 odd, 4-grp 2 even
	value: 0,
	originalValue: 0,
	solutionValue: 0,
	candidates: [],
	noncandidates: [],
	activecandidates: [],
};

export const useCells = () => cellStore((state) => state.cells);
export const useCellActions = () => cellStore((state) => state.actions);

export const cellStore = create(
	persist(
		(set, get) => ({
			cells: [],
			saved: [],
			difficulty: "",
			gameId: "",
			gameValid: true,
			gameComplete: 0,
			gameLoaded: false,

			actions: {
				initGame: (values, solutionValues, difficulty, gameid) => {
					const initcells = [];
					//console.log("values:", values);
					for (let i = 0; i < 81; ++i) initcells.push(
						{
						row: RCS[i][0],
						col: RCS[i][1],
						square: RCS[i][2],
						parity: 0,
						value: values[i],
						originalValue: values[i],
						solutionValue: solutionValues ? solutionValues[i] : 0,
						candidates: [],
						noncandidates: [],
						activecandidates: [],
						});
					for (let i = 0; i < 81; ++i) {
						const c = findCandidates(i, initcells);
						initcells[i].candidates = c;
						initcells[i].activecandidates = c;
						};
					//console.log("initcells:", initcells);
					useGameStateStore.getState().resetState();
					set({
						cells: initcells,
						saved: [],
						difficulty: difficulty,
						gameId: gameid,
						gameValid: validateBoard(initcells),
						gameComplete: 0,
						gameLoaded: true
					});
					//console.log("cells:", get().cells);
				},

				loadGame: (values, solution, gameId) => {
					const initcells = [];
					//console.log("values:", values);
					for (let i = 0; i < 81; ++i) initcells.push(
					{
						row: RCS[i][0],
						col: RCS[i][1],
						square: RCS[i][2],
						parity: 0,
						value: values[i],
						originalValue: values[i],
						solutionValue: solution ? solution[i] : 0,
						candidates: [],
						noncandidates: [],
						activecandidates: [],
						selected: false
					});
					for (let i = 0; i < 81; ++i) {
						if (initcells[i].value === 0) {
							initcells[i].candidates = findCandidates(i, initcells);
							initcells[i].activecandidates = initcells[i].candidates;
						}
					};
					useGameStateStore.getState().resetState();
					useHintStore.getState().resetHint();
					set({
						cells: initcells,
						saved: [],
						difficulty: "",
						gameId: gameId,
						gameValid: validateBoard(initcells),
						gameComplete: 0,
						gameLoaded: true,
					}),
					useGameStateStore.getState().clearSelectedCell(),
					useGameStateStore.getState().clearSelectedValue(),
					get().actions.resetCandidates()
				},

				newGame: () => {
					useGameStateStore.getState().resetState();
					useHintStore.getState().resetHint();
					set({
						cells: [],
						saved: [],
						selectedCell: -1,
						selectedValue: -1,
						gameComplete: 0,
						gameLoaded: false
					})
				},

				resetGame: () => {
					const parity = 0;
					set((state) => {
						const cells = [...state.cells]
						for (let ix = 0; ix < 81; ++ix) {
							cells[ix] = {...cells[ix], value: cells[ix].originalValue, noncandidates: [], parity }
						}
						return {
							cells,
							gameValid: validateBoard(cells),
							gameComplete: 0,
							gameLoaded: true,
						}
					}),
					useHintStore.getState().resetHint();
					get().actions.resetCandidates()
					useGameStateStore.getState().resetState()
				},

				saveState: () => {
					set((state) => {
						const saved = [...state.cells]
						return { saved }
					})
				},

				restoreState: () => {
					set((state) => {
						if (state.saved != null) {
							console.log("restoreState")
							const cells = [...state.saved]
							return {
								cells,
								gameComplete: 0,
								gameLoaded: true,
							}
						}
					}),
					useGameStateStore.getState().resetState()
				},

				validateGame: () => {
					let cls = get().cells
					let val = validateBoard(cls);
					set ({
						gameValid: val
					})
					return val;
				},

				calcNumbersUsed: () => {
					//console.log("calcNumbersUsed");
					let complete = false;
					let nines = 0;
					let selVal = get().selectedValue;
					const used = [0,0,0,0,0,0,0,0,0,0];
					for (let i = 0; i < 81; ++i) {
						const num = get().cells[i].value;
						if (num > 0) used[num] += 1;
						if (used[num] === 9) nines += 1;
					};
					used[0] = nines;
					if (nines == 9) {
						selVal = -1;
						complete = true;
					}
					set({
						numbersUsed: used,
						gameComplete: 0,
						selectedValue: selVal
					})
				},

				clearCandidates: () => {
					set((state) => {
						const cells = [...state.cells]
						for (let ix = 0; ix < 81; ++ix) {
							const candidates = [];
							const noncandidates = [];
							const activecandidates = [];
							cells[ix] = { ...cells[ix], candidates, activecandidates, noncandidates }
						}
						return { cells }
					})
				},

				resetCandidates: () => {
					set((state) => {
						const cells = [...state.cells]
						for (let ix = 0; ix < 81; ++ix) {
							const candidates = findCandidates(ix, cells);
							// remove any noncandidates not in the actual candidates list
							//const noncandidates = cells[ix].noncandidates.filter(c => candidates.includes(c));
							//const activecandidates = candidates.filter(c => noncandidates.indexOf(c) < 0);
							const noncandidates = [];
							const activecandidates = [...candidates];
							cells[ix] = { ...cells[ix], candidates, activecandidates, noncandidates }
						}
						return { cells }
					})
				},

				updateCandidates: () => {
					set((state) => {
						const cells = [...state.cells]
						for (let ix = 0; ix < 81; ++ix) {
							const candidates = findCandidates(ix, cells);
							// remove from noncandidates any value not in the actual candidates list
							const noncandidates = cells[ix].noncandidates.filter(c => candidates.includes(c));
							const activecandidates = candidates.filter(c => noncandidates.indexOf(c) < 0);
							cells[ix] = { ...cells[ix], candidates, activecandidates, noncandidates }
						}
						return { cells }
					})
				},

				updateCellCandidates: (ix) => {
					set((state) => {
						const cells = [...state.cells]
						const candidates = findCandidates(ix, cells);
						// remove any noncandidates not in the actual candidates list
						const noncandidates = cells[ix].noncandidates.filter(c => candidates.includes(c));
						const activecandidates = candidates.filter(c => noncandidates.indexOf(c) < 0);
						cells[ix] = { ...cells[ix], candidates, activecandidates, noncandidates }
						return { cells }
					})
				},

				candidatesValid: (ix) => {
					// do the remaining active candidates match the solution (if any)
					const cell =  get().cells[ix];
					if (cell.value > 0) return true;
					if (cell.solutionValue === 0) return true;
					if (!cell.activecandidates.includes(cell.solutionValue)) return false;
					return true;
				},

				cellContainsCandidate: (ix, c) => {
					return get().cells[ix].activecandidates.includes(c);
				},

				getActiveCandidates: (ix) => {
					return get().cells[ix].activecandidates;
				},

				getNonCandidates: (ix) => {
					return get().cells[ix].noncandidates;
				},

				setNonCandidates: (ix, noncandidates) => {
					set((state) => {
						const cells = [...state.cells]
						const activecandidates = cells[ix].candidates.filter(c => noncandidates.indexOf(c) < 0);
						cells[ix] = { ...cells[ix], noncandidates, activecandidates }
						return { cells }
					})
				},

				addNonCandidate: (ix, value) => {
					let updated = false;

					set((state) => {
						const cell = state.cells[ix];
						if (cell.noncandidates.includes(value)) {
							return state;  // No change
						}

						const cells = [...state.cells];
						const noncandidates = [...cell.noncandidates, value];

						cells[ix] = {
							...cell,
							noncandidates,
							activecandidates: cell.candidates.filter(
								c => !noncandidates.includes(c)
							)
						};

						updated = true;
						return { cells };
					});

					return updated;
				},

				removeNonCandidate: (ix, value) => {
					set((state) => {
						const cell = state.cells[ix];
						if (!cell.noncandidates.includes(value)) {
							return state;  // No change
						}

						const cells = [...state.cells]
						const noncandidates = cells[ix].noncandidates.filter(v != value)
						const activecandidates = cells[ix].candidates.filter(c => noncandidates.indexOf(c) < 0);
						cells[ix] = {
							...cells[ix],
							noncandidates,
							activecandidates
						}
						return { cells }
					})
				},

				// -1: still in progress
				//  0: finished
				//  1: finished, alternate solution
				checkGameSolved: () => {
					//console.log("gameComplete");
					const cells = get().cells;
					let alt = false;
					let complete = true;
					for (let i=0; i<81; ++i) {
						const c = cells[i];
						if (c.value === 0) {
							complete = false;
							break;
						}
						if (c.solutionValue > 0 && c.value !== c.solutionValue) alt = true;
					}

					let solved = 0;
					if (complete) {
						solved = 1;
						if (alt) solved = 2;
					}

					set({
						gameComplete: complete
					})
					//console.log("gameComplete", solved, complete);
					return solved;
				},

				getLinearText: () => {
					let linear = "";
					let cells = get().cells;
					for (let i = 0; i < 81; i++) {
						let val = cells[LinearToGrid[i]].value;
						linear += Number(val);
					}
					return linear;
				},

				getJSON: () => {
					let cells = get().cells;
					let ix = 0;
					let grids = [];
					for (let i = 0; i < 9; i++) {
						let sq = [];
						for (let j = 0; j < 9; j++) {
							sq.push(cells[ix++].value);
						}
						grids.push(sq);
					}
					let json = JSON.stringify(grids);
					return json;
				},

				getLinearJSON: () => {
					let cells = get().cells;
					let grids = [];
					for (let i = 0; i < 9; i++) {
						let row = [];
						for (let j = 0; j < 9; j++) {
							var val = cells[LinearToGrid[ix]].value;
							row.push(cells[ix++].value);
						}
						grids.push(row);
					}
					let json = JSON.stringify(grids);
					return json;
				},

				getCells: () => {
					return get().cells
				},

				getCell: (ix) => {
					return get().cells[ix]
				},

				getCellSolution: (ix) => {
					return get().cells[ix].solutionValue
				},

				showCell: (ix) => {
					const c = get().cells[ix];
					console.log("showCell:", ix, c);
				},

				setGameSolved: (tf) => {
					set({ gameComplete: tf ? 1 : 0})
				},

				setCellCandidates: (ix, candidates) => {
					set((state) => {
						const cells = [...state.cells]
						cells[ix] = { ...cells[ix], candidates }
						return { cells }
					})
				},

				clearCellSelected: (ix) => {
					set((state) => {
						const cells = [...state.cells]
						cells[ix] = { ...cells[ix], selected: false }
						return { cells }
					})
				},

				setCellValue: (ix, value) => {
					set((state) => {
						const cells = [...state.cells]
						cells[ix] = { ...cells[ix], value }
						return { cells }
					}),
					get().actions.updateCandidates()
				},

				clearCellValue: (ix) => {
					set((state) => {
						const cells = [...state.cells]
						cells[ix] = { ...cells[ix], value: 0 }
						get().actions.updateCandidates()
						return { cells }
					})
				},

				setCellParity: (ix, parity) => {
					set((state) => {
						const cells = [...state.cells]
						cells[ix] = { ...cells[ix], parity }
						return { cells }
					})
				},

				clearCellParity: (ix) => {
					set((state) => {
						const cells = [...state.cells]
						cells[ix] = { ...cells[ix], parity: 0 }
						return { cells }
					})
				},

				clearParity: () => {
					set((state) => ({
						cells: state.cells.map((c) => ({
							...c,
							parity: 0
						})),
					}))
				},

				// cells[(y*9)+x].value = value;
				setCellValues: (values) => {
					set((state) => ({
						cells: state.cells.map((c,ix) => ({
							...c,
							value: values[ix]
						})),
						gameLoaded: true
					}))
				},

				setDifficulty: (d) => {
					set({ difficulty: d})
				},

				getDifficulty: () => {
					return get().difficulty
				},

				setGameId: (d) => {
					set({ gameId: d})
				},

				getGameId: () => {
					return get().gameId
				},

			}
		}),
		{
			name: "sudoku-pc", // Use a unique name for each person
			partialize: (state) => ({ 
				cells: state.cells,
				saved: state.saved,
				difficulty: state.difficulty,
				gameId: state.gameId,
				gameValid: state.gameValid,
				gameComplete: state.gameComplete,
				gameLoaded: state.gameLoaded
			}),
		}
	)
);

