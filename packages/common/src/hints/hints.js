import { cellStore } from "@sudoku/common/store/store";
import { useHintStore } from "@sudoku/common/store/hintStore";
import {Rows, Cols, Squares, cellRow, cellCol, cellSquare, RCS} from '@sudoku/common/utilities/constants';
import { singletons, singleCounts } from "./singles";
import { uniqueRectangles, emptyRectangles } from './rectangles';
import { nakedPairs, hiddenPairs } from "./pairs";
import { nakedTriples, hiddenTriples } from './triples';
import { als, lockedCandidates1, lockedCandidates2 } from './locked';
import { XWing, XYWing, XYZWing, WWing } from './wings';
import { XChain, XYChain } from './chains';
import { swordfish } from './swordfish';
import { colors, colorWing } from './colors';
import { loops } from "./loops";
import { quads } from "./quads";
import { WXYZWing } from "./wings";
import { forcingChains } from "./forcing";
import { biforce } from "./forcing2";
import { suedecoq } from "./suedecoq";
//import { getConjugatePairs } from "./conjugates";

export var hintcells = [];
export var hintcandidates = [];

const hintStats = {
	functions: {},
	types: {}
};

export function hintlog(name, result, elapsed) {
	const stats = hintStats.functions[name] ??= {
		calls: 0,
		successes: 0,
		time: 0,
		successTime: 0,
		failureTime: 0,
		maxTime: 0
	};

	stats.calls++;
	stats.time += elapsed;
	stats.maxTime = Math.max(stats.maxTime, elapsed);

	if (result?.length) {
		stats.successes++;
		stats.successTime += elapsed;

		// Record the subtype actually used by the solver.
		const type = result[0].type ?? name;

		const typeStats = hintStats.types[type] ??= {
			count: 0,
			time: 0
		};

		typeStats.count++;
		typeStats.time += elapsed;
	} else {
		stats.failureTime += elapsed;
	}
}

export function tryHint(name, fn) {
	const start = performance.now();
	const result = fn();

	useHintStore.getState().logHint(
		name,
		result,
		performance.now() - start
	);

	return result?.[0] ?? null;
}

export function showHintStats() {
	const rows = Object.entries(hintStats.functions)
	.map(([name, s]) => ({
		function: name,
		calls: s.calls,
		successes: s.successes,
		successPct: +(100 * s.successes / s.calls).toFixed(1),
						 totalMs: +s.time.toFixed(2),
						 successMs: +s.successTime.toFixed(2),
						 failureMs: +s.failureTime.toFixed(2),
						 avgMs: +(s.time / s.calls).toFixed(3),
						 maxMs: +s.maxTime.toFixed(2)
	}))
	.sort((a, b) => b.totalMs - a.totalMs);

	const types = Object.entries(hintStats.types)
	.map(([type, s]) => ({
		type,
		count: s.count,
		totalMs: +s.time.toFixed(2)
	}))
	.sort((a, b) => b.count - a.count);

	console.table(rows);
	console.table(types);

	// Return a copy so it can be copied from DevTools.
	return {
		functions: rows,
		types
	};
}

export function resetHintStats() {
	console.log("resetHintStats");
	// hintStats.functions = {};
	// hintStats.types = {};
	useHintStore.getState().resetHintStats();

}

export function runHints() {
	const gameComplete = cellStore.getState().gameComplete;
	if (gameComplete) return null;
	//var result;

	let storecells = cellStore.getState().cells;
	hintcells = Array(81).fill(0);
	hintcandidates = Array.from({ length: 81 }, () => []);
	storecells.forEach((c, ix) => {c.value > 0 ? hintcells[ix] = c.value : hintcandidates[ix] = [...c.activecandidates]});

	initCounts();
	//console.log("hints.js", cells.length)

	let hint;
	if (hint = tryHint("forcingBV", biforce)) return hint;

	if (hint = tryHint("singletons", singletons)) return hint;
	if (hint = tryHint("singleCounts", singleCounts)) return hint;
	if (hint = tryHint("nakedPairs", nakedPairs)) return hint;
	if (hint = tryHint("nakedTriples", nakedTriples)) return hint;
	if (hint = tryHint("lockedCandidates1", lockedCandidates1)) return hint;
	if (hint = tryHint("lockedCandidates2", lockedCandidates2)) return hint;
	if (hint = tryHint("hiddenPairs", hiddenPairs)) return hint;
	if (hint = tryHint("hiddenTriples", hiddenTriples)) return hint;
	if (hint = tryHint("quads", quads)) return hint;
	if (hint = tryHint("uniqueRectangles", uniqueRectangles)) return hint;
	if (hint = tryHint("emptyRectangles", emptyRectangles)) return hint;
	if (hint = tryHint("suedecoq", suedecoq)) return hint;
	if (hint = tryHint("XWing", XWing)) return hint;
	if (hint = tryHint("XChain", XChain)) return hint;
	if (hint = tryHint("XYChain", XYChain)) return hint;
	if (hint = tryHint("XYWing", XYWing)) return hint;
	if (hint = tryHint("XYZWing", XYZWing)) return hint;
	if (hint = tryHint("WWing", WWing)) return hint;
	if (hint = tryHint("WXYZWing", WXYZWing)) return hint;
	if (hint = tryHint("swordfish", swordfish)) return hint;
	if (hint = tryHint("colors", colors)) return hint;
	if (hint = tryHint("colorWing", colorWing)) return hint;
	if (hint = tryHint("als", als)) return hint;
	//if (hint = tryHint("loops", loops)) return hint;
	if (hint = tryHint("forcing", forcingChains)) return hint;
	if (hint = tryHint("forcingBV", biforce)) return hint;

	return null;
}

// **********************************************************************

// count how many times a value occurs in a row/col/square
export var vRows = [];
export var vCols = [];
export var vSqs = [];

// count the instances of each value in each row/col/sq
// we need columns[rows] containing exactly 2, and rows[columns] of 2 or more
// we need columns[rows] containing exactly 3, and rows[columns] of 3 or more
export var rCounts2 = [[],[],[],[],[],[],[],[],[],[]];
export var cCounts2 = [[],[],[],[],[],[],[],[],[],[]];
export var sCounts2 = [[],[],[],[],[],[],[],[],[],[]];
export var rCounts3 = [[],[],[],[],[],[],[],[],[],[]];
export var cCounts3 = [[],[],[],[],[],[],[],[],[],[]];
export var rCounts23 = [[],[],[],[],[],[],[],[],[],[]];
export var cCounts23 = [[],[],[],[],[],[],[],[],[],[]];
export var sCounts23 = [[],[],[],[],[],[],[],[],[],[]];
export var rCounts2p = [[],[],[],[],[],[],[],[],[],[]];
export var cCounts2p = [[],[],[],[],[],[],[],[],[],[]];


// **********************************************************************

export function initCounts() {
	// count how many times a value occurs in a row/col/square
	vRows = [];
	vCols = [];
	vSqs = [];

	// count the instances of each value in each row/col
	// we need columns[rows] containing exactly 2, and rows[columns]
	// we need columns[rows] containing exactly 3, and rows[columns]
	// we need rows/cols/sqs containing 2 or 3 of the value
	rCounts2 = [[],[],[],[],[],[],[],[],[],[]];
	cCounts2 = [[],[],[],[],[],[],[],[],[],[]];
	sCounts2 = [[],[],[],[],[],[],[],[],[],[]];
	rCounts3 = [[],[],[],[],[],[],[],[],[],[]];
	cCounts3 = [[],[],[],[],[],[],[],[],[],[]];
	rCounts23 = [[],[],[],[],[],[],[],[],[],[]];
	cCounts23 = [[],[],[],[],[],[],[],[],[],[]];
	sCounts23 = [[],[],[],[],[],[],[],[],[],[]];
	rCounts2p = [[],[],[],[],[],[],[],[],[],[]];
	cCounts2p = [[],[],[],[],[],[],[],[],[],[]];

	// get the value counts for all rows/columns/squares
	// how many of each value are in the row/col/sq
	for (var i=0; i<9; i++) {
		var rc = rcsCounts(Rows[i]);
		var cc = rcsCounts(Cols[i]);
		var sc = rcsCounts(Squares[i]);
		vRows.push(rc);
		vCols.push(cc);
		vSqs.push(sc);
	}
	//console.log(vRows, vCols, vSqs);

	// the Counts arrays contain the indices of the cells in a row/col/sq
	//   with the given count(s)
	// ex: rCounts2[x] = [0,3,5] means that offsets[rows] 0, 3, 5 contain 2 of value x
	for (var v=1; v<10; v++) {
		for (var i=0; i<9; i++) {
			var rc = vRows[i][v];
			var cc = vCols[i][v];
			var sc = vSqs[i][v];
			if (rc === 2) rCounts2[v].push(i);
			if (rc === 3) rCounts3[v].push(i);
			if (rc >= 2) rCounts2p[v].push(i);

			if (cc === 2) cCounts2[v].push(i);
			if (cc === 3) cCounts3[v].push(i);
			if (cc >= 2) cCounts2p[v].push(i);

			if (sc === 2) sCounts2[v].push(i);

			if (rc === 2 || rc === 3) rCounts23[v].push(i);
			if (cc === 2 || cc === 3) cCounts23[v].push(i);
			if (sc === 2 || sc === 3) sCounts23[v].push(i);
		}
	}
	//console.log(rCounts2,cCounts2);
	//console.log(rCounts3,cCounts3);
	//console.log(rCounts23,cCounts23);
	//console.log(rCounts2p,cCounts2p);

}

export function validateAllCandidates(arr) {
	for (var i=0; i<9; ++i) {
		if (!validHouseCandidates(Rows[i])) return false;
		if (!validHouseCandidates(Cols[i])) return false;
		if (!validHouseCandidates(Squares[i])) return false;
		}
	return true;
}

export function validHouseCandidates(arr) {
	let vals = new Set();
	for (var i=0; i<9; ++i) {
		const cix = arr[i];
		if (hintcells[cix] > 0) continue;
		const ac = hintcandidates[cix];
		if (ac.length === 0) return false;
		let val = ac[0];
		if (vals.has(val)) return false;
		vals.add(val);
	}
	return true;
}

// count the occurances of the active candidates in a row/col/sq
export function rcsCounts(arr) {
	var counts = [0,0,0,0,0,0,0,0,0,0];
	for (var i=0; i<9; ++i) {
		const cix = arr[i];
		if (hintcells[cix] > 0) continue;
		const candid = hintcandidates[cix];
		candid.forEach((c) => {counts[c] += 1;});
	}
	return counts;
}

export function findAllCellsWithValue(value) {
	var all = [];
	for (var cix=0; cix<81; ++cix) {
		if (hintcells[cix] > 0) continue;
		var ac = hintcandidates[cix];
		if (ac.includes(value)) {
			all.push(cix);
		}
	}
	return all;
}

// find cells in the array which contain any of vals, excluding cells in ex
export function findTargets(arr,vals,ex) {
	var targets = [];
	var alen = arr.length;
	for (var i=0; i<alen; ++i) {
		var cix = arr[i];
		if (hintcells[cix] > 0) continue;
		if (!ex.includes(cix)) {
			if (includesAny(hintcandidates[cix], vals)) {
				targets.push(cix);
			}
		}
	}
	if (targets.length === 0) return null;
	return targets;
}

// find cells in the array which contain all of the vals, excluding cells in ex
export function findTargetsAll(arr,vals,ex) {
	var targets = [];

	var alen = arr.length;
	for (var i=0; i<alen; ++i) {
		var cix = arr[i];
		if (hintcells[cix] > 0) continue;
		if (!ex.includes(cix)) {
			if (includesAll(hintcandidates[cix], vals)) {
				targets.push(cix);
			}
		}
	}
	if (targets.length === 0) return null;
	return targets;
}

// find cells in the array which contain all of the vals and only the vals, excluding cells in ex
export function findTargetsOnly(arr,vals,ex) {
	var targets = [];

	var varlen = vals.length;	// number of values
	var alen = arr.length;
	for (var i=0; i<alen; ++i) {
		var cix = arr[i];
		if (hintcells[cix] > 0) continue;
		if (!ex.includes(cix)) {
			var ac = hintcandidates[cix];
			if (ac.length === varlen && includesAll(ac, vals)) {
				targets.push(cix);
			}
		}
	}
	if (targets.length === 0) return null;
	return targets;
}

// find all cells that can be seen by any combination of cls0 and cls1
export function findTargetsSeenByBoth(v, cls0, cls1) {
	var cls = new Set();
	for (var cix=0; cix<81; ++cix) {
		cls0.forEach((c0) => {
			if (canSeeEachOther(c0, cix)) {
				cls1.forEach((c1) => {
					if (canSeeEachOther(c1, cix)) {
						if (hintcells[cix] === 0 && hintcandidates[cix].includes(v)) cls.add(cix);
					}
				})
			}
		})
	}
	if (cls.size === 0) return null;
	return Array.from(cls);
}

// find any values in the cells that are not in the vals list
export function findInternalTargets(cls,vals) {
	var tgts = new Set();
	var tgtvals = new Set();
	for (const cix of cls) {
		if (hintcells[cix] > 0) continue;
		hintcandidates[cix].forEach((c) => {
			if (!vals.includes(c)) {
				tgts.add(cix);
				tgtvals.add(c);
			}
		})
	}

	if (tgts.size === 0) return null;
	return [Array.from(tgts).sort(),Array.from(tgtvals).sort()];
}

// get all cells with candidates from array excluding cells in ex
export function getCandidateCells(arr, ex) {
	var targets = [];
	var alen = arr.length;
	for (var i=0; i<alen; ++i) {
		var cix = arr[i];
		if (hintcells[cix] > 0) continue;
		if (!ex.includes(cix)) {
			var ac = hintcandidates[cix];
			targets.push([cix,ac]);
		}
	}
	if (targets.length === 0) return null;
	return targets;
}

export function findCandidatesWithValues(can, vals) {
	var candids = [];
	can.forEach((c)  => {
		if (includesAny(c[1], vals)) candids.push(c);
	})
	return candids;
}

export function canSeeEachOtherRC(c0, c1) {
	var rcs0 = RCS[c0];
	var rcs1 = RCS[c1];
	// they must be in the same house
	if (rcs0[0] === rcs1[0]) return true;
	if (rcs0[1] === rcs1[1]) return true;
	return false;
}

export function canSeeEachOther(c0, c1) {
	var rcs0 = RCS[c0];
	var rcs1 = RCS[c1];
	// they must be in the same house
	if (rcs0[0] === rcs1[0]) return true;
	if (rcs0[1] === rcs1[1]) return true;
	if (rcs0[2] === rcs1[2]) return true;
	return false;
}

export function canAllSeeEachOther(cls) {
	var clen = cls.length;
	for (var i=0; i<clen; ++i) {
		for (var j=i+1; j<clen; ++j) {
			if (!canSeeEachOther(cls[i], cls[j])) return false;
		}
	}
	return true;

}

// determine if cell 0 can be seen by both cell1 and cell2
export function canBeSeen(c0, c1, c2) {
	var rcs0 = RCS[c0];
	var rcs1 = RCS[c1];
	var rcs2 = RCS[c2];
	//if (c0 === 73 ) console.log(c0,c1,c2,rcs0,rcs1,rcs2);
	// in the same row as 1 and same col as 2 or vice versa
	if (rcs0[0] === rcs1[0] && rcs0[1] === rcs2[1])	return true;
	if (rcs0[1] === rcs2[1] && rcs0[0] === rcs1[0])	return true;
	// does row/col intersect a square
	// same row as 1 same square as 2 or vice versa
	if (rcs0[0] === rcs1[0] && rcs0[2] === rcs2[2])	return true;
	if (rcs0[0] === rcs2[0] && rcs0[2] === rcs1[2])	return true;
	// same col as 1 same square as 2 or vice versa
	if (rcs0[1] === rcs1[1] && rcs0[2] === rcs2[2])	return true;
	if (rcs0[1] === rcs2[1] && rcs0[2] === rcs1[2])	return true;
	// all in same row or col or sq
	if (rcs1[0] === rcs2[0] && rcs0[0] === rcs1[0])	return true;
	if (rcs1[1] === rcs2[1] && rcs0[1] === rcs1[1])	return true;
	if (rcs1[2] === rcs2[2] && rcs0[2] === rcs1[2])	return true;
	return false;
}

// find seen targets
// targets have to be seen by all the cells in the list
export function findTargetsSeenByAll(val, cls, ex) {
	var targets = [];
	var clslen = cls.length;
	for (var i=0; i<81; ++i) {
		if (ex.includes(i)) continue;	// skip excluded cells
		if (!cellHasCandidate(i, val)) continue;
		var seenbyall = true;
		for (var j=0; j<clslen; ++j) {
			var cixj = cls[j];
			if (!canSeeEachOther(i, cixj)) {
				seenbyall = false;
				break;
			}
		}
		if (seenbyall) targets.push(i);
	}
	if (targets.length === 0) return null;
	return targets;
}

// find targets in the specified houses containing any of the vals excluding cells in ex
export function findTargetsInHouses(vals, houses, ex) {
	var targets = [];
	for (let i=0; i<81; ++i) {
		if (ex.includes(i)) continue;	// skip excluded cells
		let rcs = RCS[i];
		if (houses[0] === rcs[0] || houses[1] === rcs[1] || houses[2] === rcs[2]) {
			if (!cellHasCandidates(i, vals)) continue;
			targets.push(i);
		}
	}
	if (targets.length === 0) return null;
	return targets;
}


// targets have to be in the same row/col or row/sq or col/sq
export function findSeenTargets2(val, c1, c2) {
	var targets = [];
	for (var i=0; i<81; ++i) {
		if (!cellHasCandidate(i, val)) continue;
		if (i === c1 || i === c2) continue;
		if (!canSeeEachOther( i, c1)) continue;
		if (!canSeeEachOther( i, c2)) continue;
		targets.push(i);
	}
	if (targets.length === 0) return null;
	return targets;
}

// targets have to be in the same row/col or row/sq or col/sq
export function findSeenTargets3(val, c1, c2, c3) {
	var targets = [];
	for (var i=0; i<81; ++i) {
		if (!cellHasCandidate(i, val)) continue;
		if (i === c1 || i === c2 || i === c3) continue;
		if (!canSeeEachOther( i, c1)) continue;
		if (!canSeeEachOther( i, c2)) continue;
		if (!canSeeEachOther( i, c3)) continue;
		targets.push(i);
	}
	if (targets.length === 0) return null;
	return targets;
}

// find cells in the array which contain any of vals, excluding cells in ex
export function rcsContainsValue(arr,val,ex) {
	for (var i=0; i<9; ++i) {
		var cix = arr[i];
		if (!ex.includes(cix)) {
			if (cellHasCandidate(cix, val)) return true;
		}
	}
	return false;
}

// are all values in [b] included in [a]
export function includesAll(a,b) {
	return b.every(v => a.includes(v));
}

// are any of the values in [b] included in [a]
export function includesAny(a,b) {
	// if a includes any of b
	return b.some(r => a.includes(r))
}

export function getValuesInCommon(ac1, ac2) {
	// find the common value
	return ac1.filter(item => ac2.includes(item));
}

export function getAllValues(ac0, ac1) {
	var s = new Set();
	ac0.forEach(s.add, s);
	ac1.forEach(s.add, s);
	return Array.from(s);
}


export function cellHasCandidate(cix, z) {
	if (hintcells[cix] > 0) return false;
	if (hintcandidates[cix].includes(z)) return true;
	return false;
}

export function cellHasCandidates(cix, ac) {
	if (hintcells[cix] > 0) return false;
	if (includesAny(hintcandidates[cix], ac)) return true;
	return false;
}

export function getActiveCandidates(cix) {
	if (hintcells[cix] > 0) return [];
	return hintcandidates[cix];
}

export function getCommonCandidates(c0, c1) {
	if (hintcells[c0] > 0) return [];
	if (hintcells[c1] > 0) return [];
	let common = hintcandidates[c0].filter(value => hintcandidates[c1].includes(value))
	return common;
}

export function inSameHouse(c0, c1) {
	if (RCS[c0][0] === RCS[c1][0]) return true;
	if (RCS[c0][1] === RCS[c1][1]) return true;
	if (RCS[c0][2] === RCS[c1][2]) return true;
	return false;
}

export function inSameSquare(c0, c1) {
	if (RCS[c0][2] === RCS[c1][2]) return true;
	return false;
}

export function sameHouse(c0,c1) {
	var rcs = [-1, -1, -1];
	if (cellRow[c0] === cellRow[c1]) rcs[0] = cellRow[c0];
	if (cellCol[c0] === cellCol[c1]) rcs[1] = cellCol[c0];
	if (cellSquare[c0] === cellSquare[c1]) rcs[2] = cellSquare[c0];
	if (rcs[0] === -1 && rcs[1] === -1 && rcs[2] === -1) return null;
	return rcs;
}

// if the cells are in the same row, return the row number
export function sameRow(cls) {
	var clen = cls.length;
	for (var i=0; i<clen; ++i) {
		for (var j=i+1; j<clen; ++j) {
			if (RCS[cls[i]][0] !== RCS[cls[j]][0]) return -1;
		}
	}
	return RCS[cls[0]][0];
}

export function sameCol(cls) {
	var clen = cls.length;
	for (var i=0; i<clen; ++i) {
		for (var j=i+1; j<clen; ++j) {
			if (RCS[cls[i]][1] !== RCS[cls[j]][1]) return -1;
		}
	}
	return RCS[cls[0]][1];
}

export function sameSq(cls) {
	var clen = cls.length;
	for (var i=0; i<clen; ++i) {
		for (var j=i+1; j<clen; ++j) {
			if (RCS[cls[i]][2] !== RCS[cls[j]][2]) return null;
		}
	}
	return RCS[cls[0]][2];
}

export function sameRow2(c0, c1) {
	if (RCS[c0][0] === RCS[c1][0]) return RCS[c0][0];
	return -1;
}

export function sameCol2(c0, c1) {
	if (RCS[c0][1] === RCS[c1][1]) return RCS[c0][1];
	return -1;
}

export function sameSq2(c0, c1) {
	if (RCS[c0][2] === RCS[c1][2]) return RCS[c0][2];
	return -1;
}

export function sameRow3(c0, c1, c2) {
	if (RCS[c0][0] !== RCS[c1][0]) return -1;
	if (RCS[c0][0] !== RCS[c2][0]) return -1;
	return RCS[c0][0];
}

export function sameCol3(c0, c1, c2) {
	if (RCS[c0][1] !== RCS[c1][1]) return -1;
	if (RCS[c0][1] !== RCS[c2][1]) return -1;
	return RCS[c0][1];
}

export function sameSq3(c0, c1, c2) {
	if (RCS[c0][2] !== RCS[c1][2]) return -1;
	if (RCS[c0][2] !== RCS[c2][2]) return -1;
	return RCS[c0][2];
}

