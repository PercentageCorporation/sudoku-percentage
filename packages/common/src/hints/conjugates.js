import { Rows, Cols, Squares } from '@sudoku/common/utilities/constants';
import { includesAll, canSeeEachOther, includesAny } from './hints';
import { initHintCells, hintcells, hintcandidates } from './hints';

let localcells = [];
let conjugateCells = null;
let conjugatePairs = [];
let conjugatesByCell = null;
let conjugatesByValue = null;	// conjugate pairs sorted by value
let bivalueCells = null;
let bivaluePairs = [];
let bivaluesByValue = null;

// *****************************************************************************
// functions called from anywhere

export function getConjugatePairs() {
	initHintCells();
	localcells = hintcells;
	if (localcells !== conjugateCells) {
		conjugatePairs = calculateConjugatePairs();
		conjugateCells = localcells;
		//console.log("conjugate pairs updated", conjugatePairs.length);
	}

	return conjugatePairs;
}

export function getBivaluePairs() {
	initHintCells();
	localcells = hintcells;
	if (localcells !== bivalueCells) {
		bivaluePairs = findAllBivalueCells();;
		bivalueCells = localcells;
	}
	return bivaluePairs;
}

// find all cells with just 2 candidates
// return array sorted by candidate pairs
// bv: [ cix, [ac] ]
export function findAllBivalueCells() {
	bivaluesByValue = Array.from({ length: 10 }, () => []);

	var bv = [];
	for (var cix=0; cix<81; ++cix) {
		if (hintcells[cix] > 0) continue;
		var ac = hintcandidates[cix];
		if (ac.length === 2) bv.push([cix,  ac]);
	}

	if (bv.length === 0) return bv;

	bv.sort((a, b) => a[1][1] - b[1][1] || a[1][0] - b[1][0]);
	bivaluesByValue = Array.from({ length: 10 }, () => []);

	bv.forEach((bp, ix) => {
		bivaluesByValue[bp[1][0]].push(ix);
		bivaluesByValue[bp[1][1]].push(ix);
	});

	return bv;
}

// find cpairs of same value with common endpoint
// cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
export function findCommonConjugatePairs(ep, value) {
	getConjugatePairs();
	var ccp = [];
	// for each conjugate pair start the chains with their endpoints
	for (const cpix of conjugatesByCell[ep]) {
		var cp = conjugatePairs[cpix];
		if (cp[0] !== value) continue;
		var cep0 = cp[1][0];
		var cep1 = cp[2][0];
		if (ep === cep0) {
			ccp.push([value, cep1, cp[1], cp[2]]);
		} else if (ep === cep1) {
			ccp.push([value, cep0, cp[2], cp[1]]);
		}
	}
	return ccp;
}

// find cpairs of a vaue contained in vals, with an endpoint that can be seen
// cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
export function findSeenConjugatePairs(ep, vals) {
	getConjugatePairs();
	var ccp = [];
	for (const value of vals) {
		// for each cp of value
		for (const vix of conjugatesByValue[value]) {
			var cp = conjugatePairs[vix];

			var cep0 = cp[1][0];
			var cep1 = cp[2][0];
			// no endpoints in common
			if (ep === cep0  || ep === cep1) continue;	// skip ourselves
			// try for a weak link to a strong link
			if (canSeeEachOther(ep, cep0)) {
				ccp.push([value, cep0, cp[1], cp[2]]);
			} else if (canSeeEachOther(ep, cep1)) {
				ccp.push([value, cep1, cp[2], cp[1]]);
			}
		}
	}
	return ccp;
}

// find cpairs with value in the enpoint contained in vals, with an endpoint that can be seen
// cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
export function findSeenConjugatePairsWithVals(ep, vals) {
	getConjugatePairs();
	var ccp = [];
	for (const value of vals) {
		// for each cp of value
		for (const cp of conjugatePairs) {
			var cep0 = cp[1][0];
			var cac0 = cp[1][1];
			var cep1 = cp[2][0];
			var cac1 = cp[2][1];
			// no endpoints in common
			if (ep === cep0  || ep === cep1) continue;	// skip ourselves
			// try for a weak link to a strong link
			if (canSeeEachOther(ep, cep0)) {
				if (includesAny(cac0, vals)) ccp.push([value, cep0, cp[1], cp[2]]);
			} else if (canSeeEachOther(ep, cep1)) {
				if (includesAny(cac1, vals)) ccp.push([value, cep1, cp[2], cp[1]]);
			}
		}
	}
	return ccp;
}

// get the conjugate pairs for the given value
export function getConjugatePairsForValue(cpairs, v) {
	getConjugatePairs();
	var vp = [];
	cpairs.forEach((cp) => {
		if (cp[0] === v) vp.push(cp);
	})
	return vp;
}

// is the cell in a conjugate pair
// return 1 for endpoint1 and 2 for endpoint2
export function cellInConjugatePair(cix, value) {
	getConjugatePairs();
	if (conjugatePairs.length === 0) return 0;
	if (conjugatesByCell[cix].length === 0) return 0;
	let cps = conjugatesByCell[cix];	// get list of conjugates
	let cp = null;
	if (value < 0) {
		let cpix = cps[0];	// just get the first one
		cp = conjugatePairs[cpix]
	} else {
		for (const cpx of cps) {
			let cpn = conjugatePairs[cpx];
			if (cpn[0] !== value) continue;
			cp = cpn;
			break;
		}
	}
	if (cp === null) return 0;
	if (cix === cp[1][0]) return 1;
	if (cix === cp[2][0]) return 2;
	// which end is which
	return 3;
}

// Find exactly two cells containing a candidate in a house.
// Return null if there are fewer or more than two.
function findConjugateInHouse(house, value) {
	let first = -1;
	let second = -1;

	for (const cix of house) {
		if (hintcells[cix] > 0) continue;
		if (!hintcandidates[cix].includes(value)) continue;
		if (first === -1) {
			first = cix;
		} else if (second === -1) {
			second = cix;
		} else {
			return null; // Third occurrence: not conjugate
		}
	}
	if (second === -1) return null;

	return [
		[first, hintcandidates[first]],
		[second, hintcandidates[second]]
	];
}

// Calculate all conjugate pairs and build lookup indexes.
function calculateConjugatePairs() {
	const cpairs = [];

	conjugatesByCell = Array.from({ length: 81 }, () => []);
	conjugatesByValue = Array.from({ length: 10 }, () => []);

	function addPair(value, pair, deduplicate = false) {
		const [a, b] = pair;
		const c0 = a[0];
		const c1 = b[0];

		if (deduplicate) {
			for (const ix of conjugatesByValue[value]) {
				const existing = cpairs[ix];
				const e0 = existing[1][0];
				const e1 = existing[2][0];

				if ((e0 === c0 && e1 === c1) ||
					(e0 === c1 && e1 === c0)) {
					return;
					}
			}
		}

		const ix = cpairs.length;
		cpairs.push([value, a, b]);

		conjugatesByCell[c0].push(ix);
		conjugatesByCell[c1].push(ix);
		conjugatesByValue[value].push(ix);
	}

	// Preserve the original order: digit, rows, columns, squares.
	for (let value = 1; value <= 9; ++value) {
		for (const house of Rows) {
			const pair = findConjugateInHouse(house, value);
			if (pair) addPair(value, pair);
		}

		for (const house of Cols) {
			const pair = findConjugateInHouse(house, value);
			if (pair) addPair(value, pair);
		}

		for (const house of Squares) {
			const pair = findConjugateInHouse(house, value);
			if (pair) addPair(value, pair, true);
		}
	}

	return cpairs;
}

// is the cell in a bivalue pair
export function cellInBivaluePair(cix, value) {
	getBivaluePairs();
	if (bivaluePairs.length === 0) return 0;

	if (value > 0) {
		return bivaluesByValue[value].some(ix => bivaluePairs[ix][0] === cix) ? 1 : 0;
	}
	return bivaluePairs.some(bp => bp[0] === cix) ? 1 : 0;
}

// find bv pairs of a vaule, that can be seen
// bivals: [ [cix0, [ac0]], ... ]
export function findSeenBivaluePairs(ep, value) {
	getBivaluePairs();
	var bvp = [];
	// for each bivalue pair with value
	for (const bpix of bivaluesByValue[value]) {
		var bv = bivaluePairs[bpix];
		var bep = bv[0];
		var bac = bv[1];
		if (ep === bep) continue;	// skip ourselves
		// try for a weak link to a strong link
		if (canSeeEachOther(ep, bep)) {
			bvp.push([value, bep, bac]);
		}
	}
	return bvp;
}

// list all bivalue cells by pair where there are two or more cells
// bvp: [ [ac], [[cix0, rcs0], [cix1, rcs1], ... ] ]

export function getBivalueList() {

	var bvpairs = getBivaluePairs();
	var bvplen = bvpairs.length;
	if (bvplen === 0 ) return [];
	//console.log("bvpairs", bvpairs)
	// bv: [ cix, [ac] ]
	// pack the pairs
	var bvpp = [];
	var brcsi = [];
	// first, pack the list of pairs so there is only one entry per pair
	for (var i = 0; i < bvplen; ++i) {
		// bvpi: [ [ac], [[cix, rcs], ... ] ]
		var bvpi = bvpairs[i];
		var brcsi = [bvpi[1], [bvpi[0]]];
		for (var j = i + 1; j < bvplen; ++j) {
			var bvpj = bvpairs[j];
			if (includesAll(bvpi[1], bvpj[1])) {
				brcsi[1].push(bvpj[0]);	// add cell ix to array
			} else {
				bvpp.push(brcsi);
				brcsi = null;
				//continue bvi;
				i = j - 1;
				break;
			}
		}
		if (brcsi) bvpp.push(brcsi);
	}
	var bvpl = [];
	// get all the entries with two or more cells
	bvpp.forEach((b) => {
		if (b[1].length >= 2) bvpl.push(b);
	})
	//console.log("bvpp", bvpp)
	return bvpl;
}

