import { Rows, Cols, Squares, cellRow, cellCol, cellSquare, sqRows012, sqCols012, RCS } from '@sudoku/common/utilities/constants';
import { formatTargetlist } from '@sudoku/common/utilities/utilities';
import { getConjugatePairs, getBivaluePairs } from "./conjugates";
import { findTargetlist, separateTargetlist, addToTargetlist, packTargetlist } from './hints';
import { sameRow2, sameCol2 } from './hints';
import { hintcells, hintcandidates, vSqs } from './hints';
import { includesAll } from './hints';
import { rcsContainsValue, findTargets, findSeenTargets2,  findSeenTargets3, findTargetsOnly } from './hints';
import { getActiveCandidates, getCandidateCells, findCandidatesWithValues, cellHasCandidate } from './hints';
import { countTheHouse, checkForTripleCounts } from './triples';

//*****************************************************************************
// common functions

// are the two cells in the same row
function commonRow(c0, c1) {
	return ((RCS[c0][0] === RCS[c1][0]));
}

// are the two cells in the same column
function commonColumn(c0, c1) {
	return ((RCS[c0][1] === RCS[c1][1]));
}

// are the two cells in the same square
function commonSquare(c0, c1) {
	return ((RCS[c0][2] === RCS[c1][2]));
}

// are the two cells in the same house
function commonHouse(c0, c1) {
	if (RCS[c0][0] === RCS[c1][0]) return true;
	if (RCS[c0][1] === RCS[c1][1]) return true;
	if (RCS[c0][2] === RCS[c1][2]) return true;
	return false;
}

// return an array [ row, colun square] containing the index of the common row/col/sq
// if not in common return -1
function getCommonHouses(c0, c1) {
	let common = [];
	let rcs0 = RCS[c0];
	let rcs1 = RCS[c1];
	common.push((rcs0[0] === rcs1[0]) ? rcs0[0] : -1);
	common.push((rcs0[1] === rcs1[1]) ? rcs0[1] : -1);
	common.push((rcs0[2] === rcs1[2]) ? rcs0[2] : -1);
	return common;
}

// get the active candidates for the cell
function getCellCandidates(cix) {
	if (hintcells[cix] > 0) return [];
	return hintcandidates[cix];
}

// find a cell not in the same row/col
// assuming the [cls] arrau os a square, this would be the diagonal cell
function findDiagonalCornerOfSquare(c0, cls) {
	for (let i = 0; i < cls.length; ++i) {
		let cx = cls[i];
		if (!commonRow(c0, cx) && !commonColumn(c0, cx)) return cx;
	}
	return null;
}

function findIntersection(grid) {
	for (let row = 0; row < 3; row++) {
		for (let col = 0; col < 3; col++) {
			let valid = true;

			for (let r = 0; r < 3 && valid; r++) {
				for (let c = 0; c < 3; c++) {
					if (grid[r][c] && r !== row && c !== col) {
						valid = false;
						break;
					}
				}
			}

			if (valid) {
				return [row, col];
			}
		}
	}

	return null;
}

// find conjugate pairs for the value with one end matching the row or column specified
// however the endpoints cannot be in the same square
// return the endpoints indicating which endpoint matched the rectangle
function findMatchingConjugatePairs(cpairs, v, r, c, s) {
	let pairs = [];
	let cplen = cpairs.length;
	for (let i=0; i<cplen; ++i) {
		let cp = cpairs[i];
		if (cp[0] !== v) continue;

		let ep0 = cp[1][0];
		let ep1 = cp[2][0];
		// the endpoints cannot be in the same square
		if (cellSquare[ep0] === cellSquare[ep1]) continue;
		// neither endpoint can be in the same square as the rectangle
		if (cellSquare[ep0] === s || cellSquare[ep1] === s) continue;

		let ep0r = cellRow[ep0];
		let ep0c = cellCol[ep0];
		let ep1r = cellRow[ep1];
		let ep1c = cellCol[ep1];

		if (ep0r === r) pairs.push(['r', ep1r, ep1c, ep0, ep1]);
		else if (ep0c === c) pairs.push(['c', ep1r, ep1c, ep0, ep1]);
		else if (ep1r === r) pairs.push(['r', ep0r, ep0c, ep1, ep0]);
		else if (ep1c === c) pairs.push(['c', ep0r, ep0c, ep1, ep0]);
	}
	return pairs;
}
//*****************************************************************************
// Empty Rectangles

export function emptyRectangles() {
	let rectangles = [];
	let cpairs = getConjugatePairs();
	// cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
	//console.log("cpairs", cpairs);

	//console.log("vSqs", vSqs);
	// for each value, for each square find those that are only in one row and one col
	for (let s=0; s<9; ++s) {
		for (let value=1; value<10; ++value) {
			let sv = vSqs[s][value];
			if (sv < 2 || sv > 5) continue;

			// get the pattern of the value in the square
			let rowcol = [[0,0,0],[0,0,0],[0,0,0]];
			let sqcells = [];
			let sq = Squares[s];
			for (let i=0; i<9; ++i) {
				let cix = sq[i];
				if (!cellHasCandidate(cix, value)) continue;
				sqcells.push(cix);
				let r = Math.floor(i / 3);
				let c = i % 3;
				++rowcol[r][c];
			}

			let vrcs = [];
			if (sv === 2) {
				let c0 = sqcells[0];
				let c1 = sqcells[1];
				if (sameRow2(c0, c1) >= 0) continue;
				if (sameCol2(c0, c1) >= 0) continue;
				//console.log("er2", s, value, c0, c1, sv)
				// since there are only two cells not in the same row or col
				// we can use either row/col combination as possibilities
				let c0r = cellRow[c0];
				let c0c = cellCol[c0];
				let c1r = cellRow[c1];
				let c1c = cellCol[c1];

				vrcs.push([s, value, c0r, c1c]);
				vrcs.push([s, value, c1r, c0c]);
			} else {
				// only one row and one column can have more than one count
				// at least one row and one column must be greater than zero
				let is = findIntersection(rowcol);
				if (!is) continue;

				let rc = is[0];
				let cc = is[1];
				let row = sqRows012[s][rc];
				let col = sqCols012[s][cc];
				//console.log("er35", s, value, is, rc, cc, row, col, sv, rowcol);
				vrcs.push([s, value, row, col]);
			}

			if (!vrcs) continue;
			//console.log("cps", cps);
			for (let vx=0; vx<vrcs.length; ++vx) {
				let vr = vrcs[vx];
				let row = vr[2];
				let col = vr[3];
				//console.log("vr", s, value, row, col, rowcol);

				// find a conjugate pairs for value with one end in the same row or column (but not same square) as the empty rectangle
				let cps = findMatchingConjugatePairs(cpairs, value, row, col, s);
				for (const cp of cps) {
					//console.log("cp", cp);
					// see if there are any candidates at the intersecting cell
					let targetlist = [];
					if (cp[0] === 'c') {
						// get the intersecting cell at row rc, column cps[1][1]
						let ccol = cp[2];
						let ccix = Rows[row][ccol];
						//console.log("checking c", row, ccol, ccix);
						if (cellHasCandidate(ccix, value)) {
							addToTargetlist(targetlist, ccix,value);
						}
					} else if (cp[0] === 'r') {
						// get the intersecting cell at row cps[1][0] column cc
						let crow = cp[1];
						let rcix = Rows[crow][col];
						//console.log("checking r", crow, col, rcix);
						if (cellHasCandidate(rcix, value)) {
							addToTargetlist(targetlist, rcix,value);
						}
					}

					if (targetlist.length > 0) {
						//console.log("target", s, sqcells, value, cp[3], target)
						let wings = [cp[3],cp[4]];
						let cls = [...sqcells, ...wings];
						targetlist = packTargetlist(targetlist);
						let {targets, values} = separateTargetlist(targetlist);
						let msg = "Empty Rectangle: " + formatTargetlist(targetlist);
						//console.log("h", cls, target, value);
						let h = {
							type: 'emptyRectangle',
							rows: null,
							cols: null,
							square: null,
							base: sqcells,
							wings: wings,
							cells: cls,
							targetlist: targetlist,
							values: values,
							targets: targets,
							msg: msg
						}
						rectangles.push(h);
						break;
					}
				}
				if (rectangles.length > 0) break;
			}
			if (rectangles.length > 0) break;
		}
		if (rectangles.length > 0) break;
	}


	if (rectangles.length === 0) return null;
	console.log("rectangles", rectangles);
	return rectangles;
}


//*****************************************************************************
// Unique Rectangles

export function uniqueRectangles() {
	let bvpairs = getBivaluePairs();
	//console.log("bvpairs", bvpairs)
	// bv: [ cix, [ac] ]
	// pack the pairs
	let bvpp = [];
	let bvplen = bvpairs.length;
	// first, pack the list of pairs so there is only one entry per pair
	for (let i = 0; i < bvplen; ++i) {
		// bvpi: [ [ac], [[cix, rcs], ... ] ]
		let bvpi = bvpairs[i];
		let brcsi = [bvpi[1], [bvpi[0]]];
		for (let j = i + 1; j < bvplen; ++j) {
			let bvpj = bvpairs[j];
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
	//console.log("bvpp", bvpp)

	// starting with a bivalue cell find all additonal cells containing the pair
	let b4p = [];
	bvpp.forEach((p) => {
		let pac = p[0];
		for (let i = 0; i < 81; ++i) {
			if (hintcells[i] > 0) continue;
			let ac = hintcandidates[i];
			if (ac.length < 3) continue;	// already have the pairs
			if (!includesAll(ac, pac)) continue;
			p[1].push(i);
		}
		if (p[1].length >= 4) b4p.push(p);
	})
	//console.log("b4p", b4p)

	// find all pairs that form a rectangle
	let b4plen = b4p.length;
	let squares = [];

	// compute all possible 4 cell combinations (starting with a bivalue cell)
	for (let b = 0; b < b4plen; ++b) {
		let bi = b4p[b];	// array containing the arrau of cells with the same pair as the original bivalue pair
		let bac = bi[0];	// original bivalue candidates
		let bic = bi[1];	//
		let biclen = bic.length;
		let rcs;
		//console.log("bi", bi, biclen, bic);
		for (let i = 0; i < biclen; ++i) {
			let bi = bic[i];
			// bi: [ [ac] [cells containing pair]]
			if (getActiveCandidates(bi).length !== 2) continue;		// must start with a bivalue cell
			for (let j = i + 1; j < biclen; ++j) {
				let bj = bic[j];
				for (let k = j + 1; k < biclen; ++k) {
					let bk = bic[k];
					for (let l = k + 1; l < biclen; ++l) {
						let bl = bic[l];
						//console.log("sq", i, j, k, l, bi, bj, bk, bl, bic);
						// for every group of four cells there are only three possibilities
						// (i,j and k,l) or (i,k and j,l) or (i,l and j,k) must be in the same row
						let comsqr = false;	// common square row
						let comsqc = false;	// common square col
						if (commonRow(bi, bj) && commonRow(bk, bl)) {
							//console.log("rijkl", i, j, k, l, bi, bj, bk, bl);
							// if i,j and k,l have common rows, then either i,l and j,k or i,k and j,l must have common columns
							let rcs = commonSquare(bi, bj);	// if same row, if one is in common square the other has to be
							// they just cannot be in the same square
							if (rcs && RCS[bi][2] === RCS[bk][2]) continue;
							if (commonColumn(bi, bk) && commonColumn(bj, bl)) {
								//console.log("cikjl", i, j, k, l, bi, bj, bk, bl);
								// if the rows are in the same square, the columns cannot be
								// checking the ends of one common colum is sufficient
								let ccs = commonSquare(bi, bk);	// if same row, if one column is in square the other has to be
								if (rcs && ccs) continue;	// everyting is in the same square
								if (!rcs && !ccs) continue;	// one of them has to be in the same square
								if (ccs && RCS[bi][2] === RCS[bj][2]) continue; // if column ends in common squares they cannot be in the same square
								squares.push([bac, [bi, bj, bk, bl]]);
							} else if (commonColumn(bi, bl) && commonColumn(bj, bk)) {
								//console.log("ciljk", i, j, k, l, bi, bj, bk, bl);
								// if the rows are in the same square, the columns cannot be
								let ccs = commonSquare(bi, bl);	// if same row, if one is in common square the other has to be
								if (rcs && ccs) continue;	// everyting is in the same square
								if (!rcs && !ccs) continue;	// one of them has to be in the same square
								if (ccs && RCS[bi][2] === RCS[bj][2]) continue; // cannot be in the same square
								squares.push([bac, [bi, bj, bk, bl]]);
							}
						} else if (commonRow(bi, bk) && commonRow(bj, bl)) {
							//console.log("rikjl", i, j, k, l, bi, bj, bk, bl);
							let rsc = commonSquare(bi, bk);	// if same row, if one is in common square the other has to be
							// they just cannot be in the same square
							if (rsc && RCS[bi][2] === RCS[bj][0]) continue;
							// if i,k and j,l have common rows, then either (i,j and k,l) or (i,l and k,j) must have common columns
							if (commonColumn(bi, bj) && commonColumn(bk, bl)) {
								//console.log("cijkl", i, j, k, l, bi, bj, bk, bl);
								let ccs = commonSquare(bi, bj);	// if same row, if one is in common square the other has to be
								if (rcs && ccs) continue;	// everyting is in the same square
								if (!rcs && !ccs) continue;	// one of them has to be in the same square
								if (ccs && RCS[bi][2] === RCS[bk][2]) continue; // cannot be in the same square
								squares.push([bac, [bi, bj, bk, bl]]);
							} else if (commonColumn(bi, bl) && commonColumn(bk, bj)) {
								//console.log("cilkj", i, j, k, l, bi, bj, bk, bl, comsqr, comsqc);
								//console.log(i, j, k, l, bi, bj, bk, bl);
								let ccs = commonSquare(bi, bl);	// if same row, if one is in common square the other has to be
								if (rcs && ccs) continue;	// everyting is in the same square
								if (!rcs && !ccs) continue;	// one of them has to be in the same square
								if (ccs && RCS[bi][2] === RCS[bk][2]) continue; // cannot be in the same square
								squares.push([bac, [bi, bj, bk, bl]]);
							}
						} else if (commonRow(bi, bl) && commonRow(bj, bk)) {
							//console.log("riljk", i, j, k, l, bi, bj, bk, bl);
							let rsc = commonSquare(bi, bl);	// if same row, if one pair is in common square the other has to be
							// they just cannot be in the same square
							if (rsc && RCS[bi][2] === RCS[bj][0]) continue;
							// if i,l and j,k have common rows, then either (i,j and k,l) or (i,k and l,j) must have common columns
							if (commonColumn(bi, bj) && commonColumn(bk, bl)) {
								//console.log("ciljk",i, j, k, l, bi, bj, bk, bl);
								let ccs = commonSquare(bi, bj);	// if same row, if one is in common square the other has to be
								if (rcs && ccs) continue;	// everyting is in the same square
								if (!rcs && !ccs) continue;	// one of them has to be in the same square
								if (ccs && RCS[bi][2] === RCS[bj][2]) continue; // cannot be in the same square
								squares.push([bac, [bi, bj, bk, bk]]);
							} else if (commonColumn(bi, bk) && commonColumn(bj, bl)) {
								//console.log("cikjl",i, j, k, l, bi, bj, bk, bl);
								let ccs = commonSquare(bi, bk);	// if same row, if one is in common square the other has to be
								if (rcs && ccs) continue;	// everyting is in the same square
								if (!rcs && !ccs) continue;	// one of them has to be in the same square
								if (ccs && RCS[bi][2] === RCS[bj][2]) continue; // cannot be in the same square
								squares.push([bac, [bi, bj, bk, bl]]);
							}
						}
					}
				}
			}
		}
	}
	//console.log("squares", squares);

	let rectangles = [];
	//return null;	// TEST
	for (let si = 0; si < squares.length; ++si) {
		if (rectangles.length > 0) break;	// found one, no use finding them as things will change
		// square: [ [ac], [c0,c1,c2,c3] ]
		let square = squares[si]
		let sqac = square[0];		// original bivalue pair
		let sqcells = square[1];	// cells in square

		// classify the cells into the pure bivalue cells and cells with extra candidates
		let numextras = 0;			// count of cells with extra candidates
		let oneextra = 0;			// count of cells with just one extra candidate
		let oneextras = [];			// cells with one extra candidate
		let extras = [];			// cells with extra candidates
		let extraextras = [];		// list of extra candidates
		let nonextras = [];			// cells with no extra candidates (bivalue cells)
		let tgts;					// define

		sqcells.forEach((s) => {
			// for each cell in the square
			let cac = getCellCandidates(s);
			let eac = cac.filter(x => !sqac.includes(x));	// extra candidates
			//console.log(cac, eac);
			//console.log(sqac, cac, eac);
			if (cac.length > 2) {
				eac.forEach(ac => { if (!extraextras.includes(ac)) extraextras.push(ac) });
				extras.push(s);
				if (eac.length === 1) {
					// there is one extra candidate
					++oneextra;
					let oe = eac[0];
					if (!oneextras.includes(oe)) oneextras.push(eac[0]);	// only add it once;
				}
				++numextras;

			} else {
				nonextras.push(s);
			}
		})

		// define/init some common values
		let vac0 = sqac[0];
		let vac1 = sqac[1];
		let hasVal0 = false;
		let hasVal1 = false;

		// check if there if there are two bivalue cells and if they are diagonal
		let diagonal = false;
		if (numextras === 2) {
			let c0 = nonextras[0];
			let c1 = nonextras[1];
			diagonal = !commonRow(c0, c1) && !commonColumn(c0, c1);
		}

		//console.log("ac", sqac, oneextra, numextras, extraextras, extras, oneextras, sqcells);

		// UR Type 1
		// only one cell with one extra candidate
		if (oneextra === 1 && numextras === 1) {
			// Type 1 rectangle
			//console.log("Type1", oneextra, numextras, extraextras, extras, oneextras);
			tgts = [extras[0]];
			let vals = sqac;
			let targetlist = findTargetlist(tgts, vals, []);
			let {targets, values} = separateTargetlist(targetlist);
			let msg = "UR Type 1: " + formatTargetlist(targetlist);
			let h = {
				type: 'urType1',
				rows: null,
				cols: null,
				square: null,
				cells: sqcells,
				values: values,
				targets: targets,
				msg: msg
			}

			rectangles.push(h);
			return rectangles;
		}

		// Type 2 has two non-diagonal cells with one extra candidate that is the same in both cells
		// any other matching candidates that can see both those cells can be eliminated
		if (!diagonal && oneextra === 2 && numextras === 2 && oneextras.length === 1) {
			//console.log("Type2", oneextra, numextras, extraextras, extras, oneextras);
			// Type 2 and 5 rectangles
			let val = oneextras[0];
			let cx0 = extras[0];
			let cx1 = extras[1];
			tgts = findSeenTargets2(val, cx0, cx1);
			//console.log(val, cx0, cx1, tgts);
			if (tgts) {
				let h = {
					type: 'urType2',
					rows: null,
					cols: null,
					square: null,
					cells: sqcells,
					values: [val],
					targets: tgts,
					msg: `UR Type 2: Cells: ${tgts}, Value: ${val}`
				}
				rectangles.push(h);
				return rectangles;
			}
		}

		// Type 3 maybe
		if (!diagonal && numextras === 2) {
			let cx0 = extras[0];
			let cx1 = extras[1];

			// common row or col?
			if (commonRow(cx0, cx1))
				var arr = Rows[cellRow[cx0]];
			else // must be one or the other
				var arr = Cols[cellCol[cx0]];

			let virtcell = extraextras;
			//console.log("Type3", extras, nonextras, extraextras);

			if (virtcell.length === 2) {
				// look for naked pair
				let cls = findTargetsOnly(arr, extraextras, nonextras);
				if (cls && cls.length === 1) {
					//console.log("t3 pair", cls);
					// found a pair look for targets
					let skipcells = [...extras, ...cls];
					//console.log("t3 pair", cls, skipcells);
					tgts = findTargetlist(arr, virtcell, skipcells);
					//console.log("t3 pair", cls, skipcells, tgts);
					if (tgts) {
						let {targets, values} = separateTargetlist(tgts);
						let msg = "UR Type 3A: " + formatTargetlist(tgts);
						let h = {
							type: 'urType3',
							rows: null,
							cols: null,
							square: null,
							cells: sqcells,
							targetlist: tgts,
							values: values,
							targets: targets,
							msg: msg
						}
						rectangles.push(h);
						return rectangles;
					}
				}
			}
			if (virtcell.length === 2 ||  virtcell.length === 3) {
				// get cells to check for a triple
				let trips = [];
				let tcells = getCandidateCells(arr, extras);
				let tmaybe = findCandidatesWithValues(tcells, virtcell);
				let tml = tmaybe.length;
				for (let i=0; i<tml; ++i) {
					for (let j=i+1; j<tml; ++j) {
						let thouse = [];
						thouse.push([-1, virtcell]);
						thouse.push(tmaybe[i]);
						thouse.push(tmaybe[j]);
						let tc = countTheHouse(thouse);
						let tcc = checkForTripleCounts(tc);
						if (tcc) {
							//console.log("tcc", thouse, tc, tcc);
							trips.push(tcc.values, [tmaybe[i][0],tmaybe[j][0]]);
						}
					}

				}
				//console.log("tccells", tcells, tmaybe, trips);
				if (trips.length > 1) {
					let skipcells = [...extras, ...trips[1]];
					let vals = trips[0];
					tgts = findTargetlist(arr, vals, skipcells);
					//console.log("trips", trips, skipcells, vals, tgts);

					if (tgts) {
						let {targets, values} = separateTargetlist(tgts);
						let msg = "UR Type 3B: " + formatTargetlist(tgts);
						let h = {
							type: 'urType3',
							rows: null,
							cols: null,
							square: null,
							cells: sqcells,
							targetlist: tgts,
							values: values,
							targets: targets,
							msg: msg
						}
						rectangles.push(h);
						return rectangles;
					}
				}


			}
		}

		// Type 5 has two diagonal cells or three cells with one extra candidate that is the same
		// any other matching candidate that can see all those cells can be eliminated
		if (((diagonal && oneextra === 2 && numextras === 2) || (oneextra === 3 && numextras === 3)) && oneextras.length === 1) {
			// two or three cells with the same extra candidate
			//console.log("Type5", oneextra, numextras, extraextras, extras, oneextras);
			// Type 2 and 5 rectangles
			let val = oneextras[0];
			let cx0 = extras[0];
			let cx1 = extras[1];
			if (oneextra === 2)
				tgts = findSeenTargets2(val, cx0, cx1);
			else {
				let cx2 = extras[2];
				tgts = findSeenTargets3(val, cx0, cx1, cx2);
			}
			//console.log(val, cx0, cx1, tgts);
			if (tgts) {
				let h = {
					type: 'urType5',
					rows: null,
					cols: null,
					square: null,
					cells: sqcells,
					values: [val],
					targets: tgts,
					msg: `UR Type 5: Cells: ${tgts}, Value: ${val}`
				}
				rectangles.push(h);
				return rectangles;
			}
		}

		if (nonextras === 1) continue;	// ????

		// now we can try for a Type 6
		// we need two diagonal bivalue cells with the remaining cells having extra candidates
		if (numextras === 2 && diagonal) {
			let cn0 = nonextras[0];
			let cn1 = nonextras[1];
			// check both rows/cols for each value
			let row0 = Rows[cellRow[cn0]];
			let col0 = Cols[cellCol[cn0]];
			let row1 = Rows[cellRow[cn1]];
			let col1 = Cols[cellCol[cn1]];

			let hasVal0r0 = rcsContainsValue(row0, vac0, sqcells);
			let hasVal0r1 = rcsContainsValue(row1, vac0, sqcells);
			let hasVal0c0 = rcsContainsValue(col0, vac0, sqcells);
			let hasVal0c1 = rcsContainsValue(col1, vac0, sqcells);
			//console.log("6has0", vac0, sqcells, hasVal0r0, hasVal0r1, hasVal0c0, hasVal0c1);
			hasVal0 = hasVal0r0 || hasVal0r1 || hasVal0c0 || hasVal0c1;

			let hasVal1r0 = rcsContainsValue(row0, vac1, sqcells);
			let hasVal1r1 = rcsContainsValue(row1, vac1, sqcells);
			let hasVal1c0 = rcsContainsValue(col0, vac1, sqcells);
			let hasVal1c1 = rcsContainsValue(col1, vac1, sqcells);
			//console.log("6has1", vac1, sqcells, hasVal1r0, hasVal1r1, hasVal1c0, hasVal1c1);
			hasVal1 = hasVal1r0 || hasVal1r1 || hasVal1c0 || hasVal1c1;

			//console.log("Type6", cn0, cn1, sqac, hasVal0, hasVal1);
			if (!(hasVal0 === hasVal1)) {
				let val = hasVal0 ? vac1 : vac0;
				let targetlist = findTargetlist(extras, [val], [])
				let {targets, values} = separateTargetlist(targetlist);
				let msg = "UR Type 6: " + formatTargetlist(targetlist);

				let h = {
					type: 'urType6',
					rows: null,
					cols: null,
					square: null,
					cells: sqcells,
					values: values,
					targets: targets,
					msg: msg
				}
				rectangles.push(h);
				return rectangles;
			}
		}

		// Type 4 has two nondiagonal cells with extra candidates
		// for each house that the nondiagonal cells are in
		//   if only one of the bivalue candidates in that house can be seen by the cells with extra candidates,
		//   that candidate can be eliminated from the cells with extra candidates
		if (!diagonal && numextras === 2) {
			// Type 4 with common row/column
			let cx0 = extras[0];
			let cx1 = extras[1];
			let com = getCommonHouses(cx0, cx1);
			let hasVal0 = false;
			let hasVal1 = false;

			if (com[0] >= 0) {
				// common row
				hasVal0 = rcsContainsValue(Rows[com[0]], vac0, extras);
				hasVal1 = rcsContainsValue(Rows[com[0]], vac1, extras);
				//console.log("has0", hasVal0, hasVal1);
			}
			if ((hasVal0 === hasVal1) && com[1] >= 0) {
				// common col
				hasVal0 = rcsContainsValue(Cols[com[1]], vac0, extras);
				hasVal1 = rcsContainsValue(Cols[com[1]], vac1, extras);
				//console.log("has1", hasVal0, hasVal1);
			}
			if ((hasVal0 === hasVal1) && com[2] >= 0) {
				// common square
				hasVal0 = rcsContainsValue(Squares[com[2]], vac0, extras);
				hasVal1 = rcsContainsValue(Squares[com[2]], vac1, extras);
				//console.log("has2", hasVal0, hasVal1);
			}
			//console.log("Type4 com rc", square, cx0, cx1, com, extras, hasVal0, hasVal1);

			if (!(hasVal0 === hasVal1)) {
				//console.log("Type4", oneextra, numextras, extraextras, extras, val, tgts, square);
				let val = hasVal0 ? sqac[0] : sqac[1];
				let targetlist = findTargetlist(extras, [val], [] )
				let {targets, values} = separateTargetlist(targetlist);
				let msg = "UR Type 4: " + formatTargetlist(targetlist);

				let h = {
					type: 'urType4',
					rows: null,
					cols: null,
					square: null,
					cells: sqcells,
					values: values,
					targets: targets,
					msg: msg
				}
				rectangles.push(h);
				return rectangles;
			}
		}

		// Type 7 for these we are interested in a diagonal pair with at least one bivalue cell
		let corner0;
		let corner1;
		if ((diagonal && numextras === 2) || numextras === 3) {
			if (diagonal && numextras === 2) {
				// either diagonal bivalue pairs with two cells with additonal candidates
				// we should have a diagonal bivalue pair at this point
				// the corners are the cells without the extra values
				corner0 = nonextras[0];
				corner1 = nonextras[1];
			} else if (numextras === 3) {
				// or one bivalue cell with three cells with extra candidates
				// corner0 should be the cell diagonally opposite the bivalue cell
				corner0 = findDiagonalCornerOfSquare(nonextras[0], extras);
				corner1 = null;
			}

			//console.log("Type7", corner0, corner1, sqac);
			let row;
			let col;
			let hasVal0r;
			let hasVal0c;
			if (!corner1) {
				// we have three cells with extra candidates
				// so we use the cell diagonally opposite the bivalue cell
				row = Rows[cellRow[corner0]];
				col = Cols[cellCol[corner0]];
				hasVal0r = rcsContainsValue(row, vac0, sqcells);
				hasVal0c = rcsContainsValue(col, vac0, sqcells);
				hasVal0 = hasVal0r || hasVal0c;

				let hasVal1r = rcsContainsValue(row, vac1, sqcells);
				let hasVal1c = rcsContainsValue(col, vac1, sqcells);
				hasVal1 = hasVal1r || hasVal1c;

				//console.log("Type7a", corner0, hasVal0, hasVal1);

				if (!(hasVal0 === hasVal1)) {
					// this corner works
					let val = hasVal0 ? vac0 : vac1;
					let targetlist = [];
					targetlist = addToTargetlist(targetlist, corner0, val);
					let {targets, values} = separateTargetlist(targetlist);
					let msg = "UR Type 7A : " + formatTargetlist(targetlist);
					//console.log("Type7a", corner1, val, tgts, square);
					let h = {
						type: 'urType7',
						rows: null,
						cols: null,
						square: null,
						cells: sqcells,
						values: values,
						targets: targets,
						msg: msg
					}
					rectangles.push(h);
					return rectangles;
				}
			}

			if (corner0 && corner1) {	// if there are two usable corners
				// for each corner check the values in the houses
				let row = Rows[cellRow[corner0]];
				let col = Cols[cellCol[corner0]];
				hasVal0r = rcsContainsValue(row, vac0, sqcells);
				hasVal0c = rcsContainsValue(col, vac0, sqcells);
				let hasVal00 = hasVal0r || hasVal0c;
				let hasVal1r = rcsContainsValue(row, vac1, sqcells);
				let hasVal1c = rcsContainsValue(col, vac1, sqcells);
				let hasVal01 = hasVal1r || hasVal1c;
				let corner0usable = hasVal00 !== hasVal01;

				row = Rows[cellRow[corner1]];
				col = Cols[cellCol[corner1]];
				hasVal0r = rcsContainsValue(row, vac0, sqcells);
				hasVal0c = rcsContainsValue(col, vac0, sqcells);
				let hasVal10 = hasVal0r || hasVal0c;
				hasVal1r = rcsContainsValue(row, vac1, sqcells);
				hasVal1c = rcsContainsValue(col, vac1, sqcells);
				let hasVal11 = hasVal1r || hasVal1c;
				let corner1usable = hasVal10 !== hasVal11;

				//console.log("Type7b", corner0, corner1, corner0usable, corner1usable);

				if (corner0usable || corner1usable) {
					// something works
					let targetlist = [];
					if (corner0usable) {
						let val = hasVal00 ? vac0 : vac1;
						targetlist = addToTargetlist(targetlist, corner0, val);
					} else {
						let val = hasVal10 ? vac0 : vac1;
						targetlist = addToTargetlist(targetlist, corner1, val);
					}
					let {targets, values} = separateTargetlist(targetlist);
					let msg = "UR Type 7B: " + formatTargetlist(targetlist);

					//console.log("Type7b", corner1, val, tgts, square);
					let h = {
						type: 'urType7',
						rows: null,
						cols: null,
						square: null,
						cells: sqcells,
						targetlist: targetlist,
						values: values,
						targets: targets,
						msg: msg
					}
					rectangles.push(h);
					return rectangles;
				}
			}
		}
	}

	if (rectangles.length === 0) return null;
	console.log("rectangles", rectangles);
	return rectangles;

}

