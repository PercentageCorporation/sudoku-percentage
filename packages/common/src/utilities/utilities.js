import { cellStore } from "@sudoku/common/store/store";
import { Rows, Cols, Squares, cellRow, cellCol, cellSquare } from './constants';

function getCellLocal(ix) {
	const getCell = cellStore.getState().actions.getCell;
	return getCell(ix);
}

// array of squares to linear - keep if needed later
export function getNewGame(dif) {
	var board;
	var solution;
	//let { board, solution } = sudoku_generate(dif, true);
	console.log(board);
	console.log(solution);

	var sudoix = 0;
	var sqix = 0;
	var supuzzle = [[], [], [], [], [], [], [], [], []];
	while (sqix < 9) {
		for (var row = 0; row < 9; row += 3) {
			for (var i3 = 0; i3 < 3; ++i3) {
				for (var x = 0; x < 3; ++x) {
					const off = sqix + i3;
					const val = board[sudoix++];
					supuzzle[off].push(val === "." ? 0 : Number(val));
				}
			}
		}
		sqix += 3;
	}
	//console.log(supuzzle);
	var puzzleGrid = [];
	for (let x = 0; x < 9; ++x)
		for (let y = 0; y < 9; ++y) puzzleGrid.push(supuzzle[x][y]);

	sudoix = 0;
	sqix = 0;
	var susolution = [[], [], [], [], [], [], [], [], []];
	while (sqix < 9) {
		for (row = 0; row < 9; row += 3) {
			for (i3 = 0; i3 < 3; ++i3) {
				for (x = 0; x < 3; ++x) {
					const off = sqix + i3;
					//console.log(sqix, row, i3, x, off);
					susolution[off].push(Number(solution[sudoix++]));
				}
			}
		}
		sqix += 3;
	}
	//console.log(susolution);
	var solutionGrid = [];
	for (let x = 0; x < 9; ++x)
		for (let y = 0; y < 9; ++y) solutionGrid.push(susolution[x][y]);

	return {puzzleGrid, solutionGrid};
}

export function computeCandidates(cells) {
	let candidates = Array.from({ length: 81 }, () => []);

	for (let ix=0; ix<81; ++ix) {
		if (cells[ix] !== 0)
			candidates[ix] = [];
		else
			candidates[ix] = updateCellCandidates(ix, cells);
	}

	return candidates;
}

export function updateCellCandidates(ix, cells) {

	let values = [1,2,3,4,5,6,7,8,9];
	const rowix = cellRow[ix];
	const colix = cellCol[ix];
	//console.log("valInRow:", value, ix, rowix, colix);
	//console.log(Rows[rowix], Cols[colix]);
	Rows[rowix].map(rix => {
		const rv = cells[rix];
		if (rv > 0) values = values.filter(v => v !== rv);
	})
	Cols[colix].map(cix => {
		const cv = cells[cix];
		if (cv > 0) values = values.filter(v => v !== cv);
	})
	const sqix = Math.floor(ix/9);
	//console.log(sqix, Squares[sqix]);
	Squares[sqix].map(six => {
		const sv = cells[six];
		if (sv > 0) values = values.filter(v => v !== sv);
	})

	return values;
}

export function findCandidates(cellIx, cells) {
	var values = [1,2,3,4,5,6,7,8,9];
	const rowix = cellRow[cellIx];
	const colix = cellCol[cellIx];
	//console.log("valInRow:", value, cellIx, rowix, colix);
	//console.log(Rows[rowix], Cols[colix]);
	Rows[rowix].map(rix => {
		const rv = cells[rix].value;
		if (rv > 0) values = values.filter(v => v !== rv);
	})
	Cols[colix].map(cix => {
		const cv = cells[cix].value;
		if (cv > 0) values = values.filter(v => v !== cv);
	})
	const sqix = Math.floor(cellIx/9);
	//console.log(sqix, Squares[sqix]);
	Squares[sqix].map(six => {
		const sv = cells[six].value;
		if (sv > 0) values = values.filter(v => v !== sv);
	})

	return values;
}


export function getRemainingValues(cellIx) {
	var values = [1,2,3,4,5,6,7,8,9];
	const rowix = cellRow[cellIx];
	const colix = cellCol[cellIx];
	//console.log("valInRow:", value, cellIx, rowix, colix);
	//console.log(Rows[rowix], Cols[colix]);
	Rows[rowix].map(rix => {
		const r = getCellLocal(rix);
		if (r.value > 0) values = values.filter(v => v !== r.value);
	})
	Cols[colix].map(cix => {
		const c = getCellLocal(cix);
		if (c.value > 0) values = values.filter(v => v !== c.value);
	})
	const sqix = Math.floor(cellIx/9);
	//console.log(sqix, Squares[sqix]);
	Squares[sqix].map(six => {
		const s = getCellLocal(six);
		if (s.value > 0) values = values.filter(v => v !== s.value);
	})

	return values;
}

export function valueInRowColSq(cellIx, value) {
	var included = false;
	const rowix = cellRow[cellIx];
	const colix = cellCol[cellIx];
	//console.log("valInRow:", value, cellIx, rowix, colix);
	//console.log(Rows[rowix], Cols[colix]);
	Rows[rowix].map(rix => {
		const r = getCellLocal(rix);
		//console.log(rix, r);
		if (r.value === value) included=true;
	})
	Cols[colix].map(cix => {
		const c = getCellLocal(cix);
		//console.log(cix, c);
		if (c.value === value) included=true;
	})
	const sqix = cellSquare[cellIx];
	Squares[sqix].map(six => {
		const s = getCellLocal(six);
		//console.log(cix, c);
		if (s.value === value) included=true;
	})

	return included;
}

export function validateBoard(cells) {
	//const cells = cellStore.getState().cells;
	// check for empty candidates
	for (var i=0; i<81; ++i) {
		const c = cells[i];
		if (c.value === 0) {
			let ac = c.activecandidates;
			if (ac.length === 0) return false;
		}
	}

	// check each row for duplicates
	for (var i=0; i<9; ++i) {
		const row = Rows[i];
		var vals = [];
		for (var j=0; j<9; ++j) {
			const cix = row[j];
			const val = cells[cix].value;
			if (val > 0) {
				if (vals.includes(val)) return false;
				vals.push(val);
			}
		}
	}
	// check each col for duplicates
	for (var i=0; i<9; ++i) {
		const col = Cols[i];
		var vals = [];
		for (var j=0; j<9; ++j) {
			const cix = col[j];
			const val = cells[cix].value;
			if (val > 0) {
				if (vals.includes(val)) return false;
				vals.push(val);
			}
		}
	}
	// check each square for duplicates
	for (var i=0; i<9; ++i) {
		const sq = Squares[i];
		var vals = [];
		for (var j=0; j<9; ++j) {
			const cix = sq[j];
			const val = cells[cix].value;
			if (val > 0) {
				if (vals.includes(val)) return false;
				vals.push(val);
			}
		}
	}

	return true;
}

export function validateManBoard(cells, candidates) {
	//const cells = cellStore.getState().cells;
	// check for empty candidates
	for (var i=0; i<81; ++i) {
		const c = cells[i];
		if (c.value !== 0) continue;
		const ac = candidates[i];
		if (ac.length === 0) return false;	// no candidates for unsolved cell
	}

	// check each row for duplicates
	for (var i=0; i<9; ++i) {
		const row = Rows[i];
		var vals = [];
		for (var j=0; j<9; ++j) {
			const cix = row[j];
			const val = cells[cix];
			if (val > 0) {
				if (vals.includes(val)) return false;
				vals.push(val);
			}
		}
	}
	// check each col for duplicates
	for (var i=0; i<9; ++i) {
		const col = Cols[i];
		var vals = [];
		for (var j=0; j<9; ++j) {
			const cix = col[j];
			const val = cells[cix];
			if (val > 0) {
				if (vals.includes(val)) return false;
				vals.push(val);
			}
		}
	}
	// check each square for duplicates
	for (var i=0; i<9; ++i) {
		const sq = Squares[i];
		var vals = [];
		for (var j=0; j<9; ++j) {
			const cix = sq[j];
			const val = cells[cix];
			if (val > 0) {
				if (vals.includes(val)) return false;
				vals.push(val);
			}
		}
	}

	return true;
}

// -1: value already in row col
// 	0: valid move
// >0: value does not match solution
export function validateMove(cellIx, value) {
	const rcs = valueInRowColSq(cellIx, value);
	if (rcs) return (-1);

	const cell = cellStore.getState().cells[cellIx];
	const rc = cell.candidates.filter(function (x) {return cell.noncandidates.indexOf(x) < 0;});
	if (!rc.includes(value)) return (-1);
	if (value !== cell.originalValue) {
		return cell.originalValue;
	}
	return 0;
}

export function formatSolution(gameId, solutionLog) {
	let solutionText = "Solution for: " + gameId + "\r\n\r\n";
	for (const item of solutionLog) {
		solutionText += item[0]
		solutionText += " : ";
		for (const elim of item[1]) {
			let cix = elim[0];
			let val = elim[1];
			let changed = elim[2] ? "" : "NC";

			solutionText += `${cix}:${val} ${changed}/ `;
		}
		solutionText += "\r\n";
	}
	return solutionText;
}

export function formatTargetlist(targetlist) {
	let fmt = "";
	for (const t of targetlist) {
		fmt += `  [${t[0]}]:[${t[1]}]`
	}
	return fmt;
}

