import { RCS, Rows, Cols, Squares, cellRow, cellCol, cellSquare } from '@sudoku/common/utilities/constants';
import { formatTargetlist } from '@sudoku/common/utilities/utilities';
import { getConjugatePairs, getBivaluePairs, getBivalueList } from "./conjugates";
import { findTargetlist, separateTargetlist, addToTargetlist, packTargetlist } from './hints';
import { findTargets, includesAll, includesAny } from './hints';
import { hintcells, hintcandidates, findSeenTargets2, findTargetsSeenByAll } from './hints';
import { sameRow2, sameCol2, sameSq2, inSameSquare } from './hints';
import { canSeeEachOther, getValuesInCommon, getActiveCandidates, getAllValues } from './hints';


//*****************************************************************************
// common functions

function findXYPairs(ppiv, pivots) {
	let pairs = [];

	let ppix = ppiv[0];	// pivot cell id
	let prow = ppiv[1];
	let pcol = ppiv[2];
	let psq = ppiv[3];
	let pac = ppiv[4];

	// find pair cells containing XY
	for (let p=0; p<pivots.length; ++p) {
		let piv = pivots[p];
		// piv : [cix, row, col, sq, ac]

		let pix = piv[0];
		//console.log("piv", ppiv, piv);

		if (pix === ppix) continue;	// skip ourselves
		if (prow !== piv[1] && pcol !== piv[2] && psq !== piv[3]) continue;	// skip if not same row/col/square
		if (!pac.includes(pac[0]) && !pac.includes(pac[1])) continue;	// skip if x or y value not in cell

		let ac = piv[4];
		pairs.push([pix, cellRow[pix], cellCol[pix], cellSquare[pix], ac]);
	}
	return pairs;
}


function findAllTrivalueCells() {
	var bv = [];
	for (var cix=0; cix<81; ++cix) {
		if (hintcells[cix] > 0) continue;
		var ac = hintcandidates[cix];
		if (ac.length === 3) {
			bv.push([cix, cellRow[cix], cellCol[cix], cellSquare[cix],  ac]);
		}
	}
	return bv;
}

//*****************************************************************************
// X-Wing (Fish size 2)
// an x-wing is when you have two conjugate pairs of the same candidate in two rows or two columns
// in which the four values form a rectangle
// any same candidate in the same rows/cols of the rectangle can be eliminated

export function XWing() {

	var feathers = [];

	// for every value
	for (var value=1; value<10; ++value) {
		// look for rows that have only 2 of the value
		var rowPairs = [];
		for (var r=0; r<9; ++r) {
			var count = 0;
			var colCells = [];
			var row = Rows[r];
			// for each cell in the row check if it contains the value
			for (var i=0; i<9; ++i) {
				var cix = row[i];
				if (hintcells[cix] > 0) continue;
				// if the cell contains the value record the column cell
				if (hintcandidates[cix].includes(value)) {
					count++;
					colCells.push(cix);
				}
			}
			// if the row contains just two of the value, save the column cells
			if (count === 2) {
				rowPairs.push( [r, colCells]);
			}
		}
		//console.log("rowPairs", value, rowPairs);
		// look for columhs that have only 2 of the value
		var colPairs = [];
		for (var c=0; c<9; ++c) {
			var count = 0;
			var rowCells = [];
			var col = Cols[c];
			// for each cell in the row check if it contains the value
			for (var i=0; i<9; ++i) {
				var cix = col[i];
				if (hintcells[cix] > 0) continue;
				// if the cell contains the value record the column cell
				if (hintcandidates[cix].includes(value)) {
					count++;
					rowCells.push(cix);
				}
			}
			// if the row contains just two of the value, save the column cells
			if (count === 2) {
				colPairs.push( [c, rowCells]);
			}
		}
		//console.log("colPairs", value, colPairs);

		// we now have a list of rows that contain two cells of a candidate value
		// check to see if any combinatin of the rows have matching columns
		var rplen = rowPairs.length;
		for (var i=0; i<rplen; ++i) {
			var pi = rowPairs[i];
			for (var j=i+1; j<rplen; ++j) {
				var pj = rowPairs[j];
				// rowPair: [ row, [colCell, colCell] ]
				var r0c0 = pi[1][0];	//  r0c0 r0c1
				var r0c1 = pi[1][1];
				var r1c0 = pj[1][0];	//  r1c0 r1c1
				var r1c1 = pj[1][1];
				//console.log("xwr", value, pi, pj, r0c0, r0c1, r1c0, r1c1);

				if (sameCol2(r0c0,r1c0) < 0 || sameCol2(r0c1,r1c1) < 0) continue;
				//console.log("xwr", value, pi, pj, r0c0, r0c1, r1c0, r1c1);
				// we have an X-Wing in rows at this point

				// HOWEVER, they cannot share a square (if this is possible ???)
				if (sameSq2(r0c0, r1c0) >= 0) continue;

				// check the columns for possible targets
				//console.log(Cols[cellCol[r0c0]], Cols[cellCol[r0c1]]);
				var t0 = findTargetlist(Cols[cellCol[r0c0]], [value], [r0c0,r1c0]);
				var t1 = findTargetlist(Cols[cellCol[r0c1]], [value], [r0c1,r1c1]);
				//console.log("targets", value, r0c0, r0c1, r1c0, r1c1, t0, t1)
				var tgts = [];
				if (t0) tgts = tgts.concat(t0);
				if (t1) tgts = tgts.concat(t1);
				if (tgts.length > 0) {
					//console.log("xw", value, r0, r1, c0, c1);
					var cls = [r0c0, r0c1, r1c0, r1c1];
					feathers.push([value, cls, tgts]);
					break;
				}
			}
			if (feathers.length > 0) break;
		}
		// do the same for the column pairs
		if (feathers.length === 0) {
			var cplen = colPairs.length;
			for (var i=0; i<cplen; ++i) {
				var pi = colPairs[i];
				for (var j=i+1; j<cplen; ++j) {
					var pj = colPairs[j];
					//console.log(pi, pj);
					var c0r0 = pi[1][0];	//  r0c0 r0c1
					var c0r1 = pi[1][1];
					var c1r0 = pj[1][0];	//  r1c0 r1c1
					var c1r1 = pj[1][1];
					//console.log("xwc", value, pi, pj, c0r0, c0r1, c1r0, c1r1);
					if (sameRow2(c0r0,c1r0) < 0 || sameRow2(c0r1,c1r1) < 0) continue;
					//console.log("xwc1", value, pi, pj, c0r0, c0r1, c1r0, c1r1);
					// we have an X-Wing in columns at this point

					// HOWEVER, they cannot share a square (if this is possible ???)
					if (sameSq2(c0r0, c1r0) >= 0) continue;

					// check the rows for possible targets
					var t0 = findTargetlist(Rows[cellRow[c0r0]], [value], [c0r0,c1r0]);
					var t1 = findTargetlist(Rows[cellRow[c0r1]], [value], [c0r1,c1r1]);
					var tgts = [];
					if (t0) tgts = tgts.concat(t0);
					if (t1) tgts = tgts.concat(t1);
					if (tgts.length > 0) {
						//console.log("xw", value, r0, r1, c0, c1);
						var cls = [c0r0, c0r1, c1r0, c1r1];
						feathers.push([value, cls, tgts]);
						break;
					}
				}
				if (feathers.length > 0) break;
			}
		}
		if (feathers.length > 0) break;
	}

	//console.log("feathers", feathers);

	var xwings = [];

	feathers.forEach((f) => {
		var val = f[0];
		var cls = f[1];
		var tgts = f[2]
		//console.log("has", targets, r0, r1, c0, c1, xwcells);
		let targetlist = packTargetlist(tgts);
		let {targets, values} = separateTargetlist(targetlist);
		let msg = "X-Wing: " + formatTargetlist(targetlist);

		var xw = {
			type: 'xWing',
			rows: null,
			cols: null,
			square: null,
			cells: cls,
			values: values,
			targets: targets,
			msg: msg
		}
		xwings.push(xw);

	})

	if (xwings.length == 0) return null;
	return xwings;

}

//*****************************************************************************
// XY-Wing
// an xy-wing is three bivalue pairs where the pivot contains (x,y)
//   and the wing cells contain (x,z) and (y,z)
// 	 z can be eliminated from any cells that can see both wing cells

export function XYWing() {
	var pivots = [];
	var xywings = [];

	// find pivot cells
	for (var cix=0; cix<81; ++cix) {
		if (hintcells[cix] > 0) continue;
		var ac = hintcandidates[cix];
		if (ac.length === 2) {
			pivots.push([cix, cellRow[cix], cellCol[cix], cellSquare[cix],  ac]);
		}
	}
	//console.log("xy pivots", pivots);

	var xyPairs = [];
	for (var px=0; px<pivots.length; ++px) {
		// find candidate pairs
		// piv: [cix, row, col, ac]
		var piv = pivots[px];
		var pix = piv[0];	// pivot cell id
		var prow = piv[1];
		var pcol = piv[2];
		var psq = piv[3];
		var pac = piv[4];
		var x = pac[0];
		var y = pac[1];

		var xyPairs = findXYPairs(piv, pivots);
		if (xyPairs.length === 0) continue;

		// examine each wing combination
		for (var i=0; i<xyPairs.length; ++i) {
			for (var j=i+1; j<xyPairs.length; ++j) {
				// xyPair : [pix, row, col, sq, ac]
				var pi = xyPairs[i];
				var pj = xyPairs[j];
				if (pi[0] === pj[0]) continue;	// just in case ???

				// the wings must have a value in common that is not in the pivot
				var z = -1;
				if (pi[4][0]===pj[4][0])
					z = pi[4][0];
				else if (pi[4][0]===pj[4][1])
					z = pi[4][0];
				else if (pi[4][1]===pj[4][0])
					z = pi[4][1];
				else if (pi[4][1]===pj[4][1])
					z = pi[4][1];
				if (z < 0) continue;
				if (pac.includes(z)) continue;
				// the wings must have one value in common with the house
				if (!includesAny(pac,pi[4])) continue;
				if (!includesAny(pac,pj[4])) continue;
				// the wings cannot be in the same house
				if (pi[1] === pj[1] || pi[2] === pj[2] || pi[3] === pj[3]) continue;
				// the wing values cannot be the same as the house
				if (includesAll(pac, pi[4])) continue;
				if (includesAll(pac, pj[4])) continue;
				// the wing values cannot be the same
				if (includesAll(pi[4],pj[4])) continue;

				// I think we found one
				//console.log("xy wings", pix, z, prow, pcol, psq, pac, pi, pj)
				// get the intersecting cells
				var tgts = findSeenTargets2(z, pi[0], pj[0]);

				//console.log("xy tgts", z, cix0, cix1, killBill);
				if (tgts) {
					//console.log("found XY", wval, piv, rp, cp);
					var cls = [pix,pi[0],pj[0]];
					var h = {
						type: 'xyWing',
						rows: null,
						cols: null,
						square: null,
						cells: cls,
						values: [z],
						targets: tgts,
						msg: `XY-Wing: Cells: ${tgts}, Value: ${z}`
					}
					//console.log("hint", h);
					xywings.push(h);
					return xywings;
				}
			}
		}
	}

	if (xywings.length === 0) return null;
	//console.log("xyHints", xywings);
	return xywings;
}


//*****************************************************************************
// XYZ-Wing


export function XYZWing() {
	var xyzHints = [];

	// find pivot cells
	var pivots = findAllTrivalueCells();
	//console.log("xyz pivots", pivots);

	// find pincer cells
	for (var px=0; px<pivots.length; ++px) {
		var piv = pivots[px];
		var pix = piv[0];	// pivot cell index
		var pac = piv[4];	// pivot activecandidates
		var prow = cellRow[pix];
		var pcol = cellCol[pix];
		var psq = cellSquare[pix];

		// find two pairs whose values are included in the pincer but are not the same as each other
		// find candidate pairs

		// one of the pairs must be in the same square as the pincer
		// for each square find pairs that can be wings
		var sq = cellSquare[pix];
		var sqcells = Squares[sq];
		// for each cell in the square look for the first wing
		for (var i=0; i<9; ++i) {
			var cix1 = sqcells[i];
			if (hintcells[cix1] > 0) continue;
			//console.log(pix, sq, i,cix1)
			var w1ac = hintcandidates[cix1];
			if ( w1ac.length !== 2) continue;
			if (!includesAll(pac, w1ac)) continue;	// values not same as pivot

			// found one, look for another
			// the second wing must be in the same row or col of the pivot but cannot be in the same square
			// it also cannot be in the same row or column as the other wing

			for (var cix2=0; cix2<81; ++cix2) {
				if (hintcells[cix2] > 0) continue;
				var w2ac = hintcandidates[cix2];
				if ( w2ac.length !== 2) continue;
				if (!includesAll(pac, w2ac)) continue;	// must have the pivot values
				if (includesAll(w1ac, w2ac)) continue;	// cannot be the same values
				// it must be in the same row/col as the pivot
				var w2r = cellRow[cix2];	// w2 row
				var w2c = cellCol[cix2];	// w2 col
				var w2s = cellSquare[cix2];	// w2 square
				if (prow !== w2r && pcol !== w2c ) continue;	// not in same row or col
				if (psq === w2s) continue;	// cannot be in same square

				//console.log("pivot", pix, prow, pcol, pac);
				//console.log("wing1", cix1, w1r, w1c, w1ac);
				//console.log("wing2", cix2, w2r, w2c, w2ac);

				var cls = [pix, cix1, cix2];
				var vals = getValuesInCommon(w1ac, w2ac);
				var val = vals[0];
				// the targets are the cells in the pivot square with the same row/col as wing2
				var targetlist = [];
				for (var i=0; i<9; ++i) {
					var tix = sqcells[i];
					if (tix == pix) continue;	// skip the pivot cell
					if (tix == cix1) continue;	// skip the wing1 cell
					var tr = cellRow[tix];
					var tc = cellCol[tix];
					if (w2r !== tr && w2c !== tc) continue;	// not same row/col
					//console.log("tgt?", val, tix, w2r, w2c, tr, tc);
					if (hintcells[tix] > 0) continue;
					var tac = hintcandidates[tix];
					if (tac.includes(val)) {
						//console.log("found target", tix, tac);
						targetlist = addToTargetlist(targetlist, tix, val);
						break;
					}
				}

				if (targetlist.length > 0) {
					targetlist = packTargetlist(targetlist);
					let {targets, values} = separateTargetlist(targetlist);
					let msg = "XYZ-Wing: " + formatTargetlist(targetlist);

					var h = {
						type: 'xyzWing',
						row: null,
						col: null,
						square: null,
						cells: cls,
						values: values,
						targets: targets,
						msg: msg
					}
					xyzHints.push(h);
					return xyzHints;
				}
			}
		}
	}

	if (xyzHints.length === 0) return null;
	//console.log("xyzHints", xyzHints);
	return xyzHints;
}


//*****************************************************************************
// W-Wing

export function WWing() {

	let cpairs = getConjugatePairs();
	//console.log("cpairs", cpairs);
	if (cpairs.length === 0) return null;

	// get a list of bivalues and their cells
	let bvl = getBivalueList();
	//console.log("bvlist", bvl);
	// bvl: [ [pair] [cells] ]

	// we have all the bivalue pairs
	// we need to regroup them into pairs of pairs that cannot see each other

	let endpoints = [];
	bvl.forEach((bvp) => {
		// bvp: [ [pair] [[cix, cix, ] ]
		let bvp1 = bvp[1];
		let b1len = bvp1.length;
		if (b1len === 2) {
			//console.log("push1", bvp1[0], bvp1[1]);
			if (!canSeeEachOther(bvp1[0], bvp1[1])) {
				endpoints.push(bvp);
				//console.log("push1", bvp);
			}
		} else {
			// for each cell with the pair
			for (let i=0; i<b1len; ++i) {
				let bvp1i = bvp1[i];	//
				for (let j=i+1; j<b1len; ++j) {
					let bvp1j = bvp1[j];
					if (!canSeeEachOther(bvp1i, bvp1j)) {
						let bp = [bvp[0],[bvp1i,bvp1j]];
						endpoints.push(bp);
						//console.log("push2", i, j, bp);
					}
				}
			}
		}
	});
	//console.log("endpoints", endpoints);
	if (endpoints.length === 0) return null;

	// now we need to connect enpoints with conjugate pairs
	// cp: [ value, [cel0, [ac0]], [cel1, [ac1]] ]
	// ep: [ [ac], [cel0, cel1] ]
	let ww = [];
	for (const ep of endpoints) {
		let epv0 = ep[0][0];
		let epv1 = ep[0][1];
		let epvals = [epv0,epv1];
		let ep0 = ep[1][0];	// endpoint cell 0
		let ep1 = ep[1][1];	// endpoint cell 1
		//console.log("ep", epvals, epv0, epv1, ep0, ep1);
		// find conjugate pair of the same value with ends that can be seen by the endpoints
		for (const cp of cpairs) {
			let cpv = cp[0];	// conjugate pair value
			if (!epvals.includes(cpv)) continue;	// no matching endpoint value
			// for each cell in the pair
			let cpc0 = cp[1][0];
			let cpc1 = cp[2][0];
			// the endpoint cells can actually match the conjugate pair cells NOT
			if (ep0 === cpc0 || ep0 === cpc1 || ep1 === cpc0 || ep1 === cpc1) continue;
			let wcells = [ep0,ep1,cpc0,cpc1];
			// can the CP and ENDPOINT be in the same HOUSE ?????

			let eptv = (cpv === epvals[0]) ? epvals[1] : epvals[0];

			// can each of the ends of the pair be seen by one of the endpoints
			// two way comparison 0-0 1-1 or 0-1 1-0
			//console.log("epc", cpv, ep0, ep1, cpc0, cpc1);
			if (canSeeEachOther(ep0, cpc0) && canSeeEachOther(ep1, cpc1)) {
				// check for targets
				let tgts = findTargetsSeenByAll(eptv, [ep0, ep1], wcells)
				//console.log("ep match0", epv1, ep, cp, ep0, cpc0, cpc1, ep1, tgts);
				if (tgts) {
					ww.push([eptv,[ep0, cpc0, cpc1, ep1], tgts ]);
					break;
				}

			} else if (canSeeEachOther(ep0, cpc1) && canSeeEachOther(ep1, cpc0)) {
				let tgts = findTargetsSeenByAll(eptv, [ep0, ep1], wcells)
				//console.log("ep match1", epv1, ep, cp, ep0, cpc1, cpc0, ep1, tgts);
				if (tgts) {
					ww.push([eptv, [ep0, cpc1, cpc0, ep1], tgts ]);
					break;
				}
			}
		}
		if (ww.length > 0) break;
	}

	let wwings = [];
	ww.forEach((w) => {
		let val = w[0];
		let cls = w[1];
		let targets = w[2];

		let h = {
			type: 'wWing',
			row: null,
			col: null,
			square: null,
			cells: cls,
			values: [val],
			targets: targets,
			msg: `W-Wing: Cells: ${targets}, Value: ${val}`
		}
		wwings.push(h);
	})

	if (wwings.length === 0) return null;
	//console.log("wwings", wwings);
	return wwings;
}

//*****************************************************************************
// WXYZ-Wing

// four cells containing four candidates
// One pivot cell, one wing (wing1) with one bivalue cell and another wing (wing2) with two cells
// the wing2 cells must be in the same house and must be able to see the pivot (same thing)
// wing1 must be able to see the pivot
// the wing1 and wing2 cells cannot be in the same house or see each other (same thing).
// either the wing1 cell or wing2 cells must be in the same house as the pivot
// wing1 and the pivot must share a (restricted) candidate W that wing2 does not contain
// one or both wing2 cells must share a (restricted) candidate X that wing1 does not contain
// the other or both wing2 cells must share a (restricted) candidate Y that wing1 does not contain
// wing1 and wing2 must share a (unrestricted) candidate Z which may or may not be in the pivot
// Z does not have to be in both wing2 cells

function findWXYZPivots(bp, arr) {
	// bv: [ cix, [ac]]
	let bix = bp[0];
	let bac = bp[1];
	let brcs = RCS[bix];
	let pivots = [];
	for (let i=0; i<9; i++) {
		let cix = arr[i];
		if (cix === bix) continue;
		let crcs = RCS[cix];
		let count = 0;
		if (brcs[0] === crcs[0]) ++count;
		if (brcs[1] === crcs[1]) ++count;
		if (brcs[2] === crcs[2]) ++count;
		if (count !== 1) continue;
		let ac = getActiveCandidates(cix);
		if (ac.length < 2 || ac.length > 4) continue;
		let all = getAllValues(bac, ac);
		if (all.length > 4) continue;	// too many candidates
		let common = bac.filter(c => ac.includes(c))
		if (common.length === 0) continue;		// can only be 0, 1, 2
		let uncommon = ac.filter(c => !common.includes(c));
		// only one common candidate
		//console.log("push", common[0], bix, cix, ac);
		pivots.push([bix, bac, cix, ac, common, uncommon]);
	}
	//console.log("bvp", bix, bac, pivots);

	return pivots;
}

// get all the cells in the house excluding ex
function getHouseCells(arr, ex) {
	let hc = [];
	for (let i=0; i<9; i++) {
		let cix = arr[i];
		if (cix === ex) continue;
		let ac = getActiveCandidates(cix);
		if (ac.length < 2) continue;
		hc.push([cix, ac]);
	}
	return hc;
}

// look for wing2 cells in row or column of pivot
// pivot: [wix, wac, pix, pac, common, uncommon]
function findWing2RC(pivot) {
	let wing2 = [];

	let pix = pivot[2];
	let pac = pivot[3];
	let prcs = RCS[pix];
	let prow = prcs[0];
	let pcol = prcs[1];
	let psq = prcs[3];

	let w1ix = pivot[0];
	let w1ac = pivot[1];
	let common = pivot[4];
	let uncommon = pivot[5];
	let W = 0;
	let X = 0;
	let Y = 0;
	let Z = 0;

	// find two cells with the desired candidates outside the pivot square
	// first try the row
	let hcellsr = getHouseCells(Rows[prow], pix);
	let hcellsc = getHouseCells(Cols[pcol], pix);
	let hcellsrc = [hcellsr, hcellsc];
	//console.log("hcells", hcellsr, hcellsc);

	hcellsrc.forEach(hcells => {
		//console.log("hcellsrc", pix, prow, pcol, hcells);
		let hlen = hcells.length;
		if (hlen < 2) return [];
		// for each pair of cells
		for (let i=0; i<hlen; i++) {
			let cixi = hcells[i][0];
			let aci = hcells[i][1];
			if (aci.length > 3) continue;
			for (let j=i+1; j<hlen; j++) {
				let cixj = hcells[j][0];
				let acj = hcells[j][1];
				if (acj.length > 3) continue;

				let com = getValuesInCommon(aci, acj);	// get shared candidates
				if (com.length === 0) continue;			// there must be at least one common value

				let allw2 = getAllValues(aci, acj);
				let allpw2 = getAllValues(allw2, pac);
				let all = getAllValues(allpw2, w1ac);
				//console.log("all", cixi, cixj,  allw2, allpw2, all);
				if (all.length > 4) continue;	// too many candidates

				if (common.length === 1) {
					//console.log("common1", common, uncommon);
					W = common[0];
					Z = (W === w1ac[0]) ? w1ac[1] : w1ac[0];	//  if we know W, the other bivalue is Z
				} else {
					//console.log("common2", allw2, common, uncommon);
					if (includesAll(allw2, common)) continue;	// both cannot be in wing2
					W = (allw2.includes(common[0])) ? common[1] : common[0];	// W is the one not in wing2
					Z = (W === w1ac[0]) ? w1ac[1] : w1ac[0];	//  if we know W, the other bivalue is Z
				}
				//console.log("w2", cixi, aci, cixj, acj, com, allpw2, W, X, Y, Z);

				if (!allw2.includes(Z)) continue;
				if (aci.includes(W) && !inSameSquare(cixi, pix)) continue;
				if (acj.includes(W) && !inSameSquare(cixj, pix)) continue;
				if (!includesAny(pac, allw2)) continue;	// must have something in commong with the pivot

				let wxz = [W,X,Z];
				let y = allpw2.filter(a => !wxz.includes(a));
				Y = y[0];
				//console.log("w2", cixi, aci, cixj, acj, com, allpw2, W, X, Y, Z);


				// eliminate any Z in a cell that can be seen by all other cells containing Z
				let Zcells = [w1ix];	// we know that has a Z
				if (pac.includes(Z)) Zcells.push(pix);
				if (aci.includes(Z)) Zcells.push(cixi);
				if (acj.includes(Z)) Zcells.push(cixj);
				let allcells = [pix, w1ix, cixi, cixj];

				let tgts = findTargetsSeenByAll(Z, Zcells, allcells);
				if (tgts) {
					wing2.push([pix, w1ix, cixi, cixj, Z, tgts])
					//console.log("*****************");
					//console.log(pix, w1ix, cixi, cixj, W, X, Y, Z, tgts);
				}
			}
		}
	})
	return wing2;
}



export function WXYZWing() {
	let wxyzHints = [];
	let bivals = [];

	// probably easiest to start with bivalue cells
	bivals = getBivaluePairs();
	//console.log("bivals", bivals);

	// we need to start with a strong link so we might as well use a cp
	// for each conjugate pair start the chains with their endpoints
	// bv: [ cix, [ac]]
	let pivots;
	let wing2;
	let  bvlen = bivals.length;
	for (let  bv=0; bv<bvlen; ++bv) {
		let bc = bivals[bv];
		let bix = bc[0];
		let brcs = RCS[bix];
		//if (bix !== 4) continue;	// TEST
		// look for a possible pivot cell with one shared house and one shared cadidate
		//console.log("bv", bv, bix, brcs);
		//pivots = findWXYZPivots(bc, Rows[brcs[0]]);
		//pivots = findWXYZPivots(bc, Cols[brcs[1]]);
		pivots = findWXYZPivots(bc, Squares[brcs[2]]);
		//console.log("pivots", bix, pivots);

		let plen = pivots.length;
		for (let i=0; i<plen; i++) {
			let p = pivots[i];
			wing2 = findWing2RC(p);
			if (wing2.length == 0) continue;
			let h = wingHint(wing2[0]);
			wxyzHints.push(h);
			break;
		}
	}

	if (wxyzHints.length === 0) return null;
	//console.log("wxyzHints", wxyzHints);
	return wxyzHints;
}

function wingHint(wing) {
	let cells0 = [wing[0]];
	let cells1 = [wing[1]];
	let cells2 = [wing[2], wing[3]];
	let cls = [...cells0, ...cells1, ...cells2];
	let value = wing[4];
	let tgts = wing[5];

	let h = {
		type: 'wxyzWing',
		rows: null,
		cols: null,
		square: null,
		cells: cls,
		cells0: cells0,
		cells1: cells1,
		cells2: cells2,
		values: [value],
		targets: tgts,
		msg: `WXYZ-Wing: Cells: ${tgts}, Value: ${value}`
	}

	return h;
}

//*****************************************************************************
// Finned X-Wing

