import { Rows, Cols, Squares, cellRow, cellCol, cellSquare, sqRowCells, sqColCells, sqRows012, sqCols012, RCS } from '@sudoku/common/utilities/constants';
import { findTargets, findInternalTargets, includesAll, includesAny } from './hints';
import { cells, vRows, vCols, vSqs } from './hints';


//*****************************************************************************
// common functions

// get the indices of the row/col/sq that have values with a count of two
// this uses the xCounts2 arrays
function pairIndices(arr) {
	var pairs = [];
	for (var i=1; i<10; i++) if (arr[i] === 2) pairs.push(i);
	if (pairs.length < 2) return null;
	return pairs;
}

function hasPairs(arr, vals) {
	var indices = [];
	for (var i=0; i<9; i++) {
		var cix = arr[i];
		var c = cells[cix];
		if (c.value > 0) continue;
		var ac = c.activecandidates;
		if (includesAll(ac, vals)) indices.push([i,cix]);
	}
	if (indices.length === 2) return indices;
	return null;
}

// determine all the possible pairs from the values in[pp]
function possiblePairs(pp) {
	var pplen = pp.length;
	if (pplen < 2) return [];
	if (pplen === 2) return [pp];
	var ppp = [];
	for (var i=0; i<pp.length; i++) {
		for (var j=i+1; j<pp.length; j++) {
			ppp.push([pp[i],pp[j]]);
		}
	}
	return ppp;
}

function includesPair(arr, v0, v1) {
	for (var i=0; i<arr.length; ++i) {
		if (arr[i] === v0 || arr[i] === v1) return true;
	}
	return false;
}

// find value that only occurs once in an array
function hasSingleOccurance(arr) {
	var single = null;
	var singleCount = 0;
	for (var i=0; i<arr.length; ++i) {
		if (arr[i] > 0 ) {
			if (single != null) return null;
			single = i;
			singleCount = arr[i];
		}
	}
	if (single != null && singleCount < 2) return null;
	return single;
}

function hasSingleValueRC(ar) {
	//console.log(ar);
	// check that row only has a single value
	var single = -1;
	for (var i=0; i<9; ++i) {
		if (ar[i] > 0) {
			if (single > -1) return -1
				single = i;
			//console.log("single:", i, ar[i], single);
		}
	}
	return single;
}

// get the cell numbers of all the cells in the square with the given value
function getSquareValueCells(value, sqix) {
	var svc = [];
	var sq = Squares[sqix]; // get the square cells
	for (var i=0; i<9; ++i) {
		var cix = sq[i];	// cell index in square
		var c = cells[cix];
		if (c.value === 0 && c.activecandidates.includes(value)) {
			svc.push(cix);
		}
	}
	return svc;
}

// find pairs in the row/col/sq array and record the index of where they were found;
function findPairs(arr) {
	var px = [];
	outer: for (var i=0; i<9; ++i) {
		var cii = arr[i];
		var ci = cells[cii];
		//console.log(i, cix,  arr, ci);
		var aci = ci.activecandidates;
		if (ci.value === 0 && aci.length === 2) {
			for (var j=i+1; j<9; ++j) {
				var cij = arr[j];
				var cj = cells[cij];
				var acj = cj.activecandidates;
				if (cj.value === 0 && acj.length === 2) {
					if ((aci[0] === acj[0] && aci[1] === acj[1]) || (aci[0] === acj[1] && aci[1] === acj[0])) {
						px.push([[i,j],[cii,cij],aci]);
						// by definition for a valid game there can be at most two matching pairs in a house
						continue outer;	// skip the rest of the row/col/sq
					}
				}
			}
		}
	}

	return px;
}

//*****************************************************************************
// nakedPairs

// return an array of cells which contain naked pairs
export function nakedPairs() {
	var np = [];

	// for each row/col/sq find a pair and look for another
	for (var i=0; i<9; ++i) {
		var rp = findPairs(Rows[i])
		if (rp.length > 0) np.push(['r',i,rp[0][0],rp[0][1],rp[0][2]]);
		var cp = findPairs(Cols[i])
		if (cp.length > 0) np.push(['c',i,cp[0][0],cp[0][1],cp[0][2]]);
		var sp = findPairs(Squares[i])
		if (sp.length > 0) np.push(['s',i,sp[0][0],sp[0][1],sp[0][2]]);
	}

	//console.log("np:", np);

	// for each pair check if there are any elimination targets
	var npHints = [];
	// for each pair, count the number of occurances in the row
	// np: rcs, index, rcs, [cri], cells, vals
	for (var i=0; i<np.length; ++i) {
		var npi = np[i];
		var rcs = npi[0];
		var rcsix = npi[1];
		var cls = npi[3];
		var vals = npi[4];

		if (rcs === 'r') {
			var tgts = findTargets(Rows[rcsix], vals, cls);
			if (tgts) npHints.push(['row', rcsix, cls, vals, tgts]);
		} else if (rcs === 'c') {
			var tgts = findTargets(Cols[rcsix], vals, cls);
			//console.log("ct", rcsix, cls, vals, tgts);
			if (tgts) npHints.push(['col', rcsix, cls, vals, tgts]);
			break;
		} else if (rcs === 's') {
			var tgts = findTargets(Squares[rcsix], vals, cls);
			if (tgts) npHints.push(['square', rcsix, cls, vals, tgts]);
			break;
		}
	}

	//console.log("npHints", npHints);

	var nakedPairs = [];

	for (const nph of npHints) {
		//console.log("nph", nph);
		var dir = nph[0];
		var cls = nph[2];
		var vals = nph[3];
		var tgts = nph[4];
		var msg = `Naked Pair: Cells:  ${cls}, Values: ${vals}`;

		var h = {
			type: "nakedPair",
			direction: dir,
			row: null,
			col: null,
			square: null,
			cells: cls,
			values: vals,
			targets: tgts,
			msg: msg
		};

		nakedPairs.push(h);
		break;
	}

	console.log("nakedPairs", nakedPairs);
	if (nakedPairs.length === 0) return null;
	return nakedPairs;
}

//*****************************************************************************
// hiddenPairs

export function hiddenPairs() {

	// for each row/col/sq find those with at least two values of count two
	var rpc = [];	// two value candidates
	var cpc = [];	// two value candidates
	var spc = [];	// two value candidates
	for (var i=0; i<9; i++) {
		var rvc = pairIndices(vRows[i]);
		if (rvc) rpc.push([i,rvc])
			var cvc = pairIndices(vCols[i]);
		if (cvc) cpc.push([i,cvc])
			var svc = pairIndices(vSqs[i]);
		if (svc) spc.push([i,svc])
	}
	//console.log(rpc,cpc,spc);

	// for each pair candidate, see if the pairs line upin the row/col/square

	var hpc = [];
	rpc.forEach((rp) => {
		var r = rp[0];
		var rpp = possiblePairs(rp[1]);
		rpp.forEach((rpx) => {
			var hp = hasPairs(Rows[r], rpx);
			if (hp) {
				hpc.push(['r', r, rpx, hp]);
			}
		})
	})
	cpc.forEach((cp) => {
		var c = cp[0];
		var cpp = possiblePairs(cp[1]);
		cpp.forEach((cpx) => {
			var hp = hasPairs(Cols[c], cpx);
			if (hp) {
				hpc.push(['c', c, cpx, hp]);
			}
		})
	})
	spc.forEach((sp) => {
		var s = sp[0];
		var spp = possiblePairs(sp[1]);
		spp.forEach((spx) => {
			var hp = hasPairs(Squares[s], spx);
			if (hp) {
				hpc.push(['s', s, spx, hp]);
			}
		})
	})

	var hpTargets = [];
	for (const hp of hpc) {
		var rcs = hp[0];		// house type rcs
		var ix = hp[1];		// house rcs index
		var vals = hp[2];
		var cls = [hp[3][0][1],hp[3][1][1]];	// pair cells
		var tgts = findInternalTargets(cls,vals);
		if (tgts) {
			hpTargets.push([rcs,ix,cls,tgts[1],tgts[0]]);
			break;
		}
	}
	//console.log("hpc", hpc);

	var hiddenPairs = [];
	for (const hp of hpTargets) {
		var rcs = hp[0];
		var cls = hp[2];
		var vals = hp[3];
		var tgts = hp[4]
		//console.log(dir,trc0,cls)

		var h = {
			type: 'hiddenPair',
			rows: rcs === 'r' ? rcs : null,
			cols: rcs === 'c' ? rcs : null,
			square: rcs === 's' ? rcs : null,
			cells: cls,
			values: vals,
			targets: tgts,
			msg: `Hidden Pair: Cells: ${tgts}, Values: ${vals}`
		}
		hiddenPairs.push(h);
		break;
	}

	if (hiddenPairs.length === 0) return null;
	console.log("hiddenPairs",hiddenPairs)
	return hiddenPairs;
}


//*****************************************************************************
// pointingPairsSquare

// find pointing pairs in square
export function pointingPairsSquare() {
	// find pairs in squares
	const ppsHints = [];

	for (var value=1; value<10; ++value) {
		// for each row, count the number of times a value appears in a square
		for (var r=0; r<9; ++r) {
			var row = Rows[r];
			var sqCounts = [0,0,0,0,0,0,0,0,0];
			var sqCells = [[],[],[],[],[],[],[],[],[]];
			// for each cell in the row
			for (var c=0; c<9; ++c) {
				var cix = row[c];	// cell index in square
				var cel = cells[cix];
				if (cel.value === 0 && cel.activecandidates.includes(value)) {
					var sq = cellSquare[cix];
					sqCounts[sq]++;
					sqCells[sq].push(cix);
				}
			}
			var sqix = hasSingleOccurance(sqCounts);
			// sqix only occurs in one square, therefore it is a candidate for a pointing pair
			if (sqix != null) {
				var vc = sqCounts[sqix];	// number of times value occurs in the row
				var targets = getSquareValueCells(value, sqix);	// number of times the value occurs in the square
				//console.log("sqix",value, r, sqix, vc, targets, sqCounts);

				var vscount = targets.length;
				if (vscount > vc) {
					// we have a candidate value because there are occurances that could be eliminated
					var cels = sqCells[sqix];
					targets = targets.filter((v) => !cels.includes(v));

					//console.log("ppsr", value, r, sqix, vc, vscount, targets, sqCounts);
					var msg = `Pointing Pair: Cells: ${targets}, Value: ${value}`;
					var ppsh = {
						type: "pointingPairSquare",
						direction: "row",
						row: r,
						col: null,
						square: sqix,
						cells: cels,
						values: [value],
						targets: targets,
						msg: msg
					};
					ppsHints.push(ppsh);
				}
			}
		}
		for (var cx=0; cx<9; ++cx) {
			var col = Cols[cx];
			var sqCounts = [0,0,0,0,0,0,0,0,0];
			var sqCells = [[],[],[],[],[],[],[],[],[]];
			// for each cell in the row
			for (var c=0; c<9; ++c) {
				var cix = col[c];	// cell index in square
				var cel = cells[cix];
				if (cel.value === 0 && cel.activecandidates.includes(value)) {
					var sq = cellSquare[cix];
					sqCounts[sq]++;
					sqCells[sq].push(cix);
				}
			}
			var sqix = hasSingleOccurance(sqCounts);
			//console.log(sqix, sqCounts);
			if (sqix != null) {
				var vc = sqCounts[sqix];
				var targets = getSquareValueCells(value, sqix);
				var vscount = targets.length;
				if (vscount > vc) {
					// we have a candidate square
					var cels = sqCells[sqix];
					targets = targets.filter((v) => !cels.includes(v));

					//console.log("ppsc", value, cx, sqix, vc, vscount, targets, sqCounts);
					var msg = `Pointing Pairs: Cells: ${targets}, Value: ${value}`;
					var ppsh = {
						type: "pointingPairSquare",
						direction: "col",
						row: null,
						col: cx,
						square: sqix,
						cells: cels,
						values: [value],
						targets: targets,
						msg: msg
					};
					ppsHints.push(ppsh);
					break;
				}
			}
		}
		if (ppsHints.length > 0) break;
	}

	//console.log("ppsHints", ppsHints);

	if (ppsHints.length === 0) return null;
	return ppsHints;
}


//*****************************************************************************
// pointingPairsRowCol

// if a value only appears in the same row or column of a square
// then that value can be eliminated from the remaining row or column cells outside the square
export function pointingPairsRowCol() {
	var ppCandidates = [];
	// for each square
	for (var sq=0; sq<9; ++sq) {
		var candids = [];

		// for each value
		for (var value=1; value<10; ++value) {
			var vCellsR = [[],[],[],[],[],[],[],[],[],[]];	// row cells that the value appears in
			var vCellsC = [[],[],[],[],[],[],[],[],[],[]];	// col cells that the value appears in
			// for each cell with the candidate value get the row and col
			// for each cell in the square
			// count the occurances in each row/col
			var sqCells = Squares[sq];
			for (var c=0; c<9; ++c) {
				var cix = sqCells[c];
				var sc = cells[cix];
				if (sc.value > 0) continue;
				var crow = cellRow[cix];
				var ccol = cellCol[cix];
				if (sc.activecandidates.includes(value)) {
					vCellsR[crow].push(cix);
					vCellsC[ccol].push(cix);
				}
			}

			var hasTargets = false;
			var targets = [];
			var singleRow = hasSingleValueRC(vRows);
			var singleCol = hasSingleValueRC(vCols);
			// if there is a single row, see if there is anyting to eliminate outside the square
			if (singleRow > -1) {
				var row = Rows[singleRow];
				for (var r=0; r<9; ++r) {
					var cix = row[r];
					var rsq = cellSquare[cix];
					if (sq === rsq ) continue;	// skip cells in our square
					var cel = cells[cix];
					if (cel.value === 0 && cel.activecandidates.includes(value)) {
						hasTargets = true;
						targets.push(cix);
					}
				}
			} else if (singleCol > -1) {
				var col = Cols[singleCol];
				for (var c=0; c<9; ++c) {
					var cix = col[c];
					var csq = cellSquare[cix];
					if (sq === csq ) continue;	// skip cells in our square
					var cel = cells[cix];
					if (cel.value === 0 && cel.activecandidates.includes(value)) {
						hasTargets = true;
						targets.push(cix);
					}
				}
			}

			// skip singletons (should not happen)
			if (hasTargets) {
				var sc = [ value, singleRow, singleCol, sq, vRows[singleRow], vCellsR[singleRow], vCols[singleCol], vCellsC[singleCol], targets ];
				console.log("sc",sc)
				candids.push(sc);
			}
		}

		//console.log("pp candids", candids);

		var prevRow = -1;
		var prevCol = -1;
		var prevSq = -1;
		var prevSrc = null;
		var src = null;
		var val;
		candids.forEach((can) => {
			console.log("can", can);
			val = can[0];
			var csr = can[1];
			var csc = can[2];
			var csq = can[3];
			//console.log(csr, prevRow, csc, prevCol, csq, prevSq, val);
			if (prevRow !== csr || prevCol !== csc || prevSq !== csq) {
				//console.log("notElse", prevSrc)
				if (prevSrc != null) ppCandidates.push(prevSrc);

				var vrsr =  can[4];		// vRows[singleRow];
				var vcrsr = can[5];		// vCellsR[singleRow];
				var vcsc =  can[6];		// vCols[singleCol];
				var vccsc = can[7];		// vCellsC[singleCol];
				var targets = can[8];
				// skip singletons (should not happen)
				var sc = [val, csq, csr, csc, val]
				//console.log("sc",sc)
				if (csr) {
					//console.log("sr", value, singleRow, vRows);
					src = {
						square: csq,
						row: csr,
						col: null,
						count: vrsr,
						cells: vcrsr,
						values: [val],
						targets: targets
					}
					//console.log("ppsr", sq, value, singleRow, vRows, vCellsR[singleRow]);
				}
				if (csc) {
					//console.log("sc", value, singleCol, vCols);
					src = {
						square: csq,
						row: null,
						col: csc,
						count: vcsc,
						cells: vccsc,
						values: [val],
						targets: targets
					}
					//console.log("ppsc", sq, value, singleCol, vCols, vCellsC[singleCol] );
				}

				prevRow = csr;
				prevCol = csc;
				prevSq = csq;
				prevSrc = src;
			} else {
				//console.log("else", prevSrc)
				if (prevSrc) {
					prevSrc.values.push(val);
					prevSrc.targets = Array.from(new Set(prevSrc.targets) || new Set(targets));
				}
			}
		})
		//console.log("end",prevSrc)
		if (prevSrc) {
			ppCandidates.push(src);
			break;
		}
	}

	//console.log("ppCandidates", ppCandidates)
	var ppHints = [];
	for (const pp of ppCandidates) {
		var msg = "Pointing ";
		msg += pp.cells.length === 3 ? "Triple: " : "Pair: ";
		msg += pp.row ? `Row: ${pp.row+1}` : "";
		msg += pp.col ? `Column: ${pp.col+1}` : "";
		msg += `, Value: ${pp.values}`;

		var h = {
			type: 'pointingPair',
			row: pp.row,
			col: pp.col,
			square: pp.square,
			cells: pp.cells,
			values: pp.values,
			targets: pp.targets,
			msg: msg
		}
		ppHints.push(h);
		break;
	}

	if (ppHints.length === 0) return null;
	return ppHints;
}

