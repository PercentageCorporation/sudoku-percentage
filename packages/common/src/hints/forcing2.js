import { cellStore } from "@sudoku/common/store/store";
import { Rows, Cols, Squares, cellRow, cellCol, cellSquare, LinearToGrid } from "@sudoku/common/utilities/constants";
import { getConjugatePairsBlockMajor } from "./conjugates";

const INVALID = -1;
const ALLINVALID = -2;
const UNKNOWN = 0;
const VALID = 1;
const SOLVED = 2;
const ELIMINATION = 4;

//******************************************************************************

let gamecandidates = null;
let explorechain = [];
let maxlevel = 0;
let numinvalid = 0;

let start = 0;
export function biforce() {
	let cells = cellStore.getState().cells;
	gamecandidates = Array.from(cells, c => c.value > 0 ? [] : c.activecandidates);
	let state  = Array.from(cells, c => c.value);

	//console.log("elim0");
	let determination = findElimination(state, gamecandidates);
	//console.log("elim1", determination);
	let result = determination[0];
	if (result === INVALID) {
		//console.log("INVALID HINT", determination);
		let hint = makeForcingHint(determination);
		return [hint]
	}

	if (result === SOLVED) {
		//console.log("SOLVED HINT", determination);
		let hint = makeForcingHintSolved(determination);
		return [hint];
	}

	return null;
}


function findElimination(state, candidates) {
	const cix = chooseStartingCell(candidates);
	if (cix < 0) return null;

	maxlevel = 0;
	numinvalid = 0;

	for (const value of candidates[cix]) {
		let level = 0;
		explorechain = [];
		const next = structuredClone(state);
		next[cix] = value;
		explorechain.push([level, cix, value]);
		//console.log("next **********", cix, value, candidates[cix]);
		const result = explore(next, level);

		let chainlen = explorechain.length;
		//console.log("chain", chainlen, maxlevel, numinvalid);
		if (result === INVALID) {
			return [INVALID, cix, value, chainlen, maxlevel, numinvalid];
		}
		if (result === SOLVED) {
			return [SOLVED, cix, value, chainlen, maxlevel, numinvalid];
		}
	}

	return [UNKNOWN, cix, 0, chainlen, maxlevel, numinvalid];
}

function explore(state, level) {
	++level;
	if (level > maxlevel) maxlevel = level;
	do {
		var statecandidates = recomputeCandidates(state);
	} while (applySingles(state, statecandidates));

	let result = hasContradiction(state, statecandidates);
	if (result !== VALID && result !== SOLVED) numinvalid++;
	if (result === INVALID) return INVALID;
	if (result === SOLVED) {
		//console.log("SOLVED ****", level);
		return SOLVED;
	}

	const cix = chooseStartingCell(statecandidates);
	if (cix < 0) return UNKNOWN;
	const cell = state[cix];
	const cellcandidates = statecandidates[cix];

	let hasUnknown = false;

	for (const value of cellcandidates) {
		const next = structuredClone(state);
		next[cix] = value;
		//console.log("explore", cix, value, cellcandidates, level);
		explorechain.push([level, cix, value]);
		const childResult = explore(next, level);
		//console.log("explorex", childResult);

		if (childResult === SOLVED) {
			//console.log("SOLVED ****", level, cix, cellcandidates, value);
			return SOLVED;
		}

		if (childResult === UNKNOWN) hasUnknown = true;
	}

	return hasUnknown ? UNKNOWN : INVALID;
}

function applySingles(state, can) {
	let applied = false;
	for( let i=0; i<81; ++i) {
		if (can[i] !== null && can[i].length === 1) {
			state[i] = can[i][0]
			applied = true;
		}
	}
	return applied;
}

function chooseStartingCell(can) {
	for( let i=0; i<81; ++i) {
		if (can[i] !== null && can[i].length === 2) return i;
	}

	//console.log("can", can);
	let cpairs = getConjugatePairsBlockMajor(can);
	//console.log("cp", cpairs);
	//if (cpairs.length > 0) return cpairs[1][1][1];
	let strongs = strongLinks(cpairs);
	//console.log("strongs", strongs);
	if (strongs.length > 0) return strongs[0][0];

	// no 2s, go for 3s
	for( let i=0; i<81; ++i) {
		if (can[i] !== null && can[i].length === 3) return i;
	}
	return -1;
}

function strongLinks(cpairs) {
	// calculate the number of strong links attached to each cell
	//let stronglinks = Array.from({ length: 81 }, () => []),
	let stronglinks = Array(81).fill(0);

	let cplen = cpairs.length;
	for( let cx=0; cx<cplen; ++cx) {
		let cp = cpairs[cx];
		stronglinks[cp[1][0]]++;
		stronglinks[cp[1][1]]++;
	}

	// let bvlen = bvpairs.length;
	// for( let bx=0; bx<bvlen; ++bx) {
	// 	let bp = bvpairs[bx];
	// 	stronglinks[bp[0]]++;
	// }

	//console.log("stronglinks",stronglinks);
	let strongs = [];
	for( let i=0; i<81; ++i) {
		if (stronglinks[i] > 0) strongs.push([i, stronglinks[i]]);
	}
	strongs.sort((a, b) => b[1] - a[1])
	return strongs;
}

function hasContradiction(state, can) {
	let count = 0;
	if (!validateAllHouseCandidates(state, can)) return INVALID;	// invalid
	if (!validateAllHouseCells(state)) return INVALID;	// invalid
	for( let i=0; i<81; ++i) {
		if (state[i] === 0) ++count;	// count unsolved cells
	}
	if  (count === 0) return SOLVED;

	return VALID;
}

function validateAllHouseCandidates(state, can) {
	for (var i=0; i<9; ++i) {
		if (!validHouseCandidates(state, can, Rows[i])) return false;
		if (!validHouseCandidates(state, can, Cols[i])) return false;
		if (!validHouseCandidates(state, can, Squares[i])) return false;
	}
	return true;
}

function validHouseCandidates(state, can, arr) {
	let svals = new Set();
	for (var i=0; i<9; ++i) {
		const cix = arr[i];
		if (state[cix] > 0) continue;
		const ac = can[cix];
		if (ac.length === 0) return false;
		if (ac.length === 1) {
			let val = ac[0];
			if (svals.has(val)) return false;
			svals.add(val);
		}
	}
	return true;
}

function validateAllHouseCells(state) {
	for (var i=0; i<9; ++i) {
		if (!validHouseCells(state, Rows[i])) return false;
		if (!validHouseCells(state, Cols[i])) return false;
		if (!validHouseCells(state, Squares[i])) return false;
	}
	return true;
}

function validHouseCells(state, arr) {
	let svals = new Set();
	for (var i=0; i<9; ++i) {
		const cix = arr[i];
		let val = state[cix];
		if (val > 0 ) {
			if (svals.has(val)) return false;
			svals.add(val);
		}
	}
	return true;
}

function recomputeCandidates(cls) {
	let can = Array.from({ length: 81 }, () => []);

	for (let ix=0; ix<81; ++ix) {
		if (cls[ix] !== 0)
			can[ix] = null;
		else {
			let fc = findCandidates(cls, ix);
			// we cannot add candidates, only remove them
			//can[ix] = fc.filter(c => gamecandidates[ix].includes(c));
			can[ix] = fc;
		}
	}

	return can;
}

function findCandidates(cls, ix) {

	let values = [1,2,3,4,5,6,7,8,9];
	const rowix = cellRow[ix];
	const colix = cellCol[ix];
	const sqix = cellSquare[ix];

	Rows[rowix].map(rix => {
		const rv = cls[rix];
		if (rv > 0) values = values.filter(v => v !== rv);
	})
	Cols[colix].map(cix => {
		const cv = cls[cix];
		if (cv > 0) values = values.filter(v => v !== cv);
	})
	Squares[sqix].map(six => {
		const sv = cls[six];
		if (sv > 0) values = values.filter(v => v !== sv);
	})

	return values;
}

export function cellsToLinearText(cls) {
	var linear = "";
	for (let i = 0; i < 81; i++) {
		var val = cls[LinearToGrid[i]];
		linear += (val === 0) ? " " : Number(val);
	}
	//console.log(values);
	console.log("/"+linear+"/");
	return linear;
}

function makeForcingHint(determination) {
	let tgt = determination[1];
	let value = determination[2];
	let cl = determination[3];
	let lev = determination[4];
	let conts = determination[5];
	let h = {
		type: 'forced2',
		rows: null,
		cols: null,
		square: null,
		cells: null,
		parity1: null,
		parity2: null,
		levels: lev,
		depth: cl,
		contradictions: conts,
		values: [value],
		targets: [tgt],
		msg: `ForcedBV: Cell: ${tgt}, Value: ${value}`
	}

	return h;
}

function makeForcingHintSolved(determination) {
	let tgt = determination[1];
	let value = determination[2];
	let cl = determination[3];
	let lev = determination[4];
	let conts = determination[5];
	let h = {
		type: 'forced2S',
		rows: null,
		cols: null,
		square: null,
		targetcells: [tgt],
		parity1: null,
		parity2: null,
		levels: lev,
		depth: cl,
		contradictions: conts,
		values: [value],
		msg: `ForcedBVS: Cell: ${tgt}, Value: ${value}`
	}

	return h;
}

