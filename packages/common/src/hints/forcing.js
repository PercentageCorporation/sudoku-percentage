import { getBivaluePairs, getConjugatePairs } from './conjugates';
import { Rows, Cols, Squares, cellRow, cellCol, cellSquare } from "@sudoku/common/utilities/constants";
import { hintcells, hintcandidates } from './hints';

let fccells = null;
let fccandidates = null;

export function forcingChains() {
	let forced = [];

	let bvpairs = getBivaluePairs();
	// bvpairs: [ [cix, [ac]], [cix, [ac]], ...]
	//console.log("bvpairs",bvpairs)
	let cpairs = getConjugatePairs();
	//cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
	//console.log("cpairs", cpairs);

	// calculate the number of strong links attached to each cell
	//let stronglinks = Array.from({ length: 81 }, () => []),
	let stronglinks = Array(81).fill(0);
	let values = [0,0,0,0,0,0,0,0,0,0];

	let cplen = cpairs.length;
	for( let cx=0; cx<cplen; ++cx) {
		let cp = cpairs[cx];
		stronglinks[cp[1][0]]++;
		stronglinks[cp[2][0]]++;
	}

	let bvlen = bvpairs.length;
	for( let bx=0; bx<bvlen; ++bx) {
		let bp = bvpairs[bx];
		stronglinks[bp[0]]++;
	}

	//console.log("stronglinks",stronglinks);
	let strongs = [];
	for( let i=0; i<81; ++i) {
		if (stronglinks[i] > 0) strongs.push([i, stronglinks[i]]);
		hintcandidates[i].map(v => values[v]++);
	}
	strongs.sort((a, b) => b[1] - a[1])
	//console.log("values",values);
	//console.log("strongs",strongs);

	for (let st=0; st<strongs.length; ++st ) {
		// get a target cell/value
		// get the strongest cell
		let tix = strongs[st][0];
		forced = analyzeTarget(tix);
		if (forced.length > 0) return forced;
	}

	// if we get here there were no invalids found for strongest

	if (forced.length === 0) return null;
	console.log("forced",forced);
	return forced;
}

function analyzeTarget(tix) {
	let forced = [];
	let tac = hintcandidates[tix];

	for (let acx=0; acx<tac.length; ++acx ) {
		let targetvalue = tac[acx];
		//if (targetvalue !== 5) continue;	// TEST
		//console.log("targetvalue1", tix, targetvalue);

		let tgts = [[tix,targetvalue]];
		fccells  = structuredClone(hintcells);
		fccandidates  = structuredClone(hintcandidates);

		let conclusion = reachConclusion(tgts);
		let result = conclusion[0];
		//console.log("result", tix, targetvalue, conclusion);

		if (result < 0) {
			console.log("invalid", tix, targetvalue, conclusion);
			let hint = makeForcingHint(tix, targetvalue);
			forced.push(hint);
			break;
		} else if (result === 2){
			console.log("solved", tix, targetvalue, conclusion);
			return null;
		} else {
			// keep trying
			//console.log("conclusion", tix, targetvalue, conclusion);
		}
	}
	return forced;
}

// tgts: [ [cix, value], [cix,value], ... ]
function reachConclusion(tgts) {
	//console.log("rc", tgts);
	let count = 0;
	while (tgts !== null) {
		// set the target cells
		fccells = applyTargets(tgts);
		// update the candidates
		fccandidates = recomputeCandidates();
		// look for single value cells
		var valtgts = validateCandidates();

		var valid = valtgts[0];	// -1: invalid game / 0: no more targets / 1: found single value cells
		tgts = valtgts[1];
		//console.log("tgts", valid, tgts);
		if (valid < 0) {
			return [valid, tgts, count];
		}
		++count;
	}

	//console.log("final", valtgts, count);
	return [valid, valtgts, count];
}

// tgts: [ [cix, val], ...]
function applyTargets(tgts) {
	tgts.forEach(t => {
		fccells[t[0]] = t[1];
	})
	return fccells;
}

// if any cell has zero candidates return null
function validateCandidates() {
	let singles = [];
	let count = 0;

	if (!validateAllHouseCandidates()) return [-1, null];	// invalid
	for( let i=0; i<81; ++i) {
		++count;	// count unsolved cells
	}
	if  (count === 0) return [2, null];	// solved

	// Naked singles
	for (let i = 0; i < 81; ++i) {
		if (fccells[i] !== 0) continue;
		const ac = fccandidates[i];
		if (ac.length === 0) return [-1, null];
		if (ac.length === 1) {
			singles.push([i, ac[0]]);
		}
	}

	// look for single value in row/col/sq
	for( let i=0; i<9; ++i) {
		let srcs = singlesInRCS(Rows[i]);
		singles = [...singles, ...srcs];
		srcs = singlesInRCS(Cols[i]);
		singles = [...singles, ...srcs];
		srcs = singlesInRCS(Squares[i]);
		singles = [...singles, ...srcs];
	}

	if (singles.length === 0) return [0, null];		// no more tries
	return [1, singles];
}

function singlesInRCS(arr){
	let singles = [];
	let values = [0,0,0,0,0,0,0,0,0,0];
	arr.forEach(cix => {
		if (fccells[cix] === 0) {
			let c = fccandidates[cix];
			if (c !== null && c.length > 0) {
				c.forEach(v => values[v]++);
			}
		}
	})

	// see if there are any single value counts
	for( let j=1; j<10; ++j) {
		if (values[j] === 1) {
			// find value in rcs
			arr.forEach(cix => {
				if (fccells[cix] === 0) {
					if (fccandidates[cix] !== null && fccandidates[cix].includes(j)) singles.push([cix, j]);
				}
			})
		}
	}
	return singles;
}

function validateAllHouseCandidates() {
	for (var i=0; i<9; ++i) {
		if (!validHouseCandidates(Rows[i])) return false;
		if (!validHouseCandidates(Cols[i])) return false;
		if (!validHouseCandidates(Squares[i])) return false;
	}
	return true;
}

function validHouseCandidates(arr) {
	let vvals = new Set();	// values in the rcs
	let cvals = new Set();	// all candidates in the rcs
	let svals = new Set();	// candidates in the rcs to check for doubles
	for (var i=0; i<9; ++i) {
		const cix = arr[i];
		if (fccells[cix] > 0) {
			vvals.add(fccells[cix]);
			continue;
		}
		const ac = fccandidates[cix];
		if (ac.length === 0) return false;
		ac.forEach(v => cvals.add(v));	// keep track of the candidates
		if (ac.length === 1) {
			let val = ac[0];
			// double single value in house candidates
			if (svals.has(val)) return false;
			svals.add(val);	// keep track of the value
		}
	}
	for (const v of [1,2,3,4,5,6,7,8,9]) {
		if (vvals.has(v)) continue;
		if (!cvals.has(v)) return false;
	}
	return true;
}

function recomputeCandidates() {
	for (let ix=0; ix<81; ++ix) {
		if (fccells[ix] !== 0)
			fccandidates[ix] = null;
		else {
			// we can only eliminate candidates, not add them
			let uc = updateCandidates(ix);
			fccandidates[ix] = fccandidates[ix].filter(c => uc.includes(c));
		}
	}

	return fccandidates;
}

function updateCandidates(ix) {

	let values = [1,2,3,4,5,6,7,8,9];
	const rowix = cellRow[ix];
	const colix = cellCol[ix];
	const sqix = cellSquare[ix];
	//console.log("valInRow:", value, ix, rowix, colix);
	//console.log(Rows[rowix], Cols[colix]);
	Rows[rowix].map(rix => {
		const rv = fccells[rix];
		if (rv > 0) values = values.filter(v => v !== rv);
	})
	Cols[colix].map(cix => {
		const cv = fccells[cix];
		if (cv > 0) values = values.filter(v => v !== cv);
	})
	Squares[sqix].map(six => {
		const sv = fccells[six];
		if (sv > 0) values = values.filter(v => v !== sv);
	})

	return values;
}

function makeForcingHint(tgt, value) {
	let h = {
		type: 'forced',
		rows: null,
		cols: null,
		square: null,
		cells: [tgt],
		parity1: null,
		parity2: null,
		values: [value],
		targets: [tgt],
		msg: `Forced: Cell: ${tgt}, Value: ${value}`
	}

	return h;
}

