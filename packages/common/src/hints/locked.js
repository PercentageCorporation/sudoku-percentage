import { Rows, Cols, Squares, cellSquare, RCS } from '@sudoku/common/utilities/constants';
import { formatTargetlist } from '@sudoku/common/utilities/utilities';
import { findTargets, findTargetlist, findTargetsSeenByAll, findTargetsInHouses, separateTargetlist, addToTargetlist, packTargetlist } from './hints';
import { hintcells, hintcandidates, vSqs, sameRow, sameCol } from './hints';
import { canSeeEachOther, canAllSeeEachOther, getActiveCandidates, getValuesInCommon, includesAny } from './hints';


//*****************************************************************************
// ALS

// const als = [
// 	[1, 2, 3, 4],
//	[1, 2, 3, 4],
// 	[1, 2, 3, 4]
// 	];

// ax: [ [ac0], [ac1], ... ]
// return a list of unique candidates from the ac lists
function getUnique(ax) {
	let s = new Set();
	ax.forEach(a => a.forEach(s.add, s));
	return Array.from(s);
}
// get all unsolved cells in a house that have candidates
// return an array of cells with their candidates
// and an array of all candidates in the house
function getHouseCells(house) {
	let hc = [];
	let hac = new Set();
	for (let i=0; i<9; ++i) {
		let cix = house[i];
		let ac = getActiveCandidates(cix);
		if (ac.length > 1) {
			hc.push([cix, ac]);
			ac.forEach(c => hac.add(c));
		}
	}
	return [hc, Array.from(hac)];
}

// get the house(s) that the cells lie in
function getCommonHouses(cls) {
	let h = [-1,-1,-1];
	let r = [];
	let c = [];
	let s = [];
	cls.forEach(cl => {
		r.push(RCS[cl][0]);
		c.push(RCS[cl][1]);
		s.push(RCS[cl][2]);
	})
	const allEqual = arr => arr.every( v => v === arr[0] );
	if (allEqual(r)) h[0] = r[0];
	if (allEqual(c)) h[1] = c[0];
	if (allEqual(s)) h[2] = s[0];
	return h;
}

// find cells containing the value
// cls: [ [cix0, [ac0] ], [ cix1, [ac1] ], ... ]

function candidateValueCells(val, cls0, cls1 ) {
	let cls = [];
	cls0.forEach((c0) => {
		if (c0[1].includes(val)) cls.push(c0[0]);
	})
	cls1.forEach((c1) => {
		if (c1[1].includes(val)) cls.push(c1[0]);
	})
	return cls;
}

// find all ALS combinations
function findALS(arr) {
	let als = [];
	let ghc = getHouseCells(arr);
	let hc = ghc[0];		// cells in the house
	let allac = ghc[1];		// all candidates in the thouse
	//console.log("als", hc, allac);
	let numc = hc.length;		// total cells in house
	let numac = allac.length;	// total candidates in house

	// house cells hc: [ cix, [ac] ]
	for (let i=0; i<numc; ++i) {
		let hci = hc[i];
		let cixi = hci[0];
		for (let j=i+1; j<numc; ++j) {
			let hcj = hc[j];
			let cixj = hcj[0];
			// for two cells how many candidates
			let tc = getUnique([hci[1], hcj[1]]);
			if (tc.length === 3) {
				//allIncluded([hci[1], hcj[1]]);
				//console.log("als2", i, j, cixi, cixj, tc);
				// two cells with three candidates
				als.push([tc, [cixi, cixj], [hci, hcj]])
			}
			for (let k=j+1; k<numc; ++k) {
				let hck = hc[k];
				let cixk = hck[0];
				// for three cells how many candidates
				let tc = getUnique([hci[1], hcj[1], hck[1]]);
				if (tc.length === 4) {
					//allIncluded([hci[1], hcj[1], hck[1]]);
					//console.log("als3", i, j, cixi, cixj, tc);
					// three cells with four candidates
					als.push([tc, [cixi, cixj, cixk], [hci, hcj, hck]]);
				}
				for (let l=k+1; l<numc; ++l) {
					let hcl = hc[l];
					let cixl = hcl[0];
					// for four cells how many candidates
					let tc = getUnique([hci[1], hcj[1], hck[1], hcl[1]]);
					if (tc.length === 5) {
						//allIncluded([hci[1], hcj[1], hck[1], hcl[1]]);
						//console.log("als3", i, j, cixi, cixj, tc);
						// four cells with five candidates
						als.push([tc, [cixi, cixj, cixk, cixl], [hci, hcj, hck, hcl]]);
					}
				}
			}
		}
	}
	return als;
}

// can any cell in one ALS see a cell in the other ALS
function canSeeOtherALS(als0, als1) {
	for (let i=0; i<als0.length; ++i) {
		for (let j=0; j<als1.length; ++j) {
			if (canSeeEachOther(als0[i], als1[j])) return true;
		}
	}
	return false;
}


function findRestrictedCommonCandidates(comvals, als0, als1) {
	let rcc = [];
	for (let cv=0; cv<comvals.length; ++cv) {
		// get the cells containing the value
		let val = comvals[cv];
		// get all the cells containing the candidate from both ALS
		let valcells = candidateValueCells(val, als0[2], als1[2] )
		// can all those cells see each other
		let canallsee = canAllSeeEachOther(valcells);
		if (!canallsee) continue;
		//console.log("canallsee2", canallsee, val, comvals, valcells, alsi[2], alsj[2]);
		// at this point val is a restricted common candidate
		rcc.push(val);
	}
	return rcc;
}


export function als() {

	let alshints = [];

	// for each house find all ALS
	let als = [];
	for (let i=0; i<9; ++i) {
		let alsr = findALS(Rows[i]);
		als.push(...alsr);
		//console.log("alsr", i, alsr);
		let alsc = findALS(Cols[i]);
		als.push(...alsc);
		//console.log("alsc", i, alsc);
		let alss = findALS(Squares[i]);
		als.push(...alss);
		//console.log("alss", i, alss);
	}

	//console.log("als", als);

	// als: [ [candidates], [cells], [ [cix0, [ac0]], [cix1, [ac1]], ...] ] ]
	// for each pair of ALS find a restricted common candidate (or two)
	let alslen = als.length;
	for (let i=0; i<alslen; ++i) {
		let alsi = als[i];
		//if (!includesAll(alsi[1],[10,15])) continue;
		//if (!includesAll(alsi[1],[39,40,41,44])) continue;
		//console.log("alsi", i, alsi);
		for (let j=i+1; j<alslen; ++j) {
			let alsj = als[j];
			if (includesAny(alsi[1],alsj[1])) continue;		// skip ALS with cells in common
			// can the ALSs see each other
			// can any of the cells in ALS0 see any of the cells in ALS1
			if (!canSeeOtherALS(alsi[1], alsj[1])) continue;
			//console.log("cansee", i, j, alsi[1], alsj[1]);

			// now look for a restricted candidate
			// a restricted candidate is a candidate in one ALS that must be in the other ALS
			// all the occurances of the candidate in either ALS must be able to see each other
			// first find common candidates
			let comvals = getValuesInCommon( alsi[0], alsj[0]);
			//console.log("comval", i, j, comvals, alsi, alsj);
			let rcc = findRestrictedCommonCandidates(comvals, alsi, alsj);
			if (rcc.length === 0) continue;

			//console.log("******************************");
			//console.log("rcc", rcc, alsi[1], alsj[1]);

			// get all the cells from both ALS
			let allcells = [];
			allcells.push(...alsi[1]);
			allcells.push(...alsj[1]);

			if (rcc.length === 1) {
				// only one restricted common candidate
				let X = rcc[0];
				// therefore all other common candidates can be used a the Z value
				let zvals = comvals.filter(e => e !== X);	// remove X from the common values
				//console.log("xvals", val, xvals, comvals);
				// I think there can be more than one Z val but I am not sure
				zvals.forEach((Z) => {
					// get the cells from both ALS containg the value X
					let Zcells = candidateValueCells(Z, alsi[2], alsj[2] );
					let tgts = findTargetsSeenByAll(Z, Zcells, allcells);
					if (tgts) {
						//console.log("als", X, Z, alsi, alsj);
						//console.log("Zcells", Zcells, allcells, tgts);
						//console.log("cansee", comvals, valcells, alsi[2], alsj[2]);
						let h = {
							type: 'alsXZ1',
							row: null,
							col: null,
							square: null,
							cells: allcells,
							cells0: alsi[1],
							cells1: alsj[1],
							values: [Z],
							targets: tgts,
							msg: `ALS XZ 1: Cells: ${tgts}, Value: ${Z}`
						}
						//console.log(h.msg);
						alshints.push(h);
					}
				})
			} else if (rcc.length === 2) {
				//console.log("******************************");
				//console.log("rcc2", rcc, comvals, alsi[1], alsj[1]);
				// I dont't think it matters which is X or Z
				let X = rcc[0];
				let Z = rcc[1];
				// we need values unique to each als
				let uvi = alsi[0].filter(c => c !== Z && c !== X);
				let uvj = alsj[0].filter(c => c !== Z && c !== X);

				//console.log("rcc2", rcc, comvals, alsi[0], uvi, alsj[1], uvj, alsi[1], alsj[1]);
				//getUnique(alsi[0], alsj[0])
				// get cells containing X from both ALS
				let Xcells = candidateValueCells(X, alsi[2], alsj[2] );
				// get cells containing Z from both ALS
				let Zcells = candidateValueCells(Z, alsi[2], alsj[2] );
				// find all the cells containing X that can see all the Xcells
				let tgtsX = findTargetsSeenByAll(X, Xcells, allcells);
				// find all the cells containing Z that can see all the Zcells
				let tgtsZ = findTargetsSeenByAll(Z, Zcells, allcells);
				// find all the cells containing [uvi]
				let hi = getCommonHouses(alsi[1]);
				let hj = getCommonHouses(alsj[1]);
				let tgtsi = findTargetsInHouses(uvi, hi, allcells);
				let tgtsj = findTargetsInHouses(uvj, hj, allcells);

				if (tgtsX || tgtsZ || tgtsi || tgtsj) {
					console.log("********************************************", rcc);
					console.log("rcc2tgtsXZ", X, tgtsX, Z, tgtsZ);
					console.log("rcc2tgtsI", hi, uvi, tgtsi);
					console.log("rcc2tgtsJ", hj, uvj, tgtsj);

					let tl = [];
					if (tgtsX) tgtsX.forEach(t => addToTargetlist(tl, t, X));
					if (tgtsZ) tgtsZ.forEach(t => addToTargetlist(tl, t, Z));
					if (tgtsi) tgtsi.forEach(t => uvi.forEach(u =>  addToTargetlist(tl, t, u)));
					if (tgtsj) tgtsj.forEach(t => uvj.forEach(u =>  addToTargetlist(tl, t, u)));

					let targetlist = packTargetlist(tl);
					let {targets, values} = separateTargetlist(targetlist);
					let msg = "ALS XZ 2: " + formatTargetlist(targetlist);

					let h = {
						type: 'alsXZ2',
						row: null,
						col: null,
						square: null,
						cells: allcells,
						cells0: alsi[1],
						cells1: alsj[1],
						values: values,
						targets: targets,
						targetlist: targetlist,
						msg: msg
					}
					//console.log(h.msg);
					alshints.push(h);
				}

			} else {	// three or more rcc ?????
				console.log("three or more rcc ********************************************", rcc);
				console.log("rcc3+", rcc, alsi[1], alsj[1]);
			}

			if (alshints.length > 0) break;
		}
		if (alshints.length > 0) break;
	}

	if (alshints.length === 0) return null;
	console.log("als", alshints);
	return alshints;
}

//*****************************************************************************
// lockedCandidates

export function lockedCandidates1() {

	let lc = [];
	for (let s=0; s<9; ++s) {
		//if (s !== 2) continue;	// TEST
		let square = Squares[s];
		for (let v=1; v<10; ++v) {
			let vcnt = vSqs[s][v];	// number of occurances of the value in the square
			if (vcnt > 1 && vcnt < 4) {
				// svc: rcs, value, square, row/col, count, cells
				let cls = findTargets(square, [v], [])
				let srow = sameRow(cls);
				//console.log("vcnt", s, v, vcnt, cls, srow);
				if (srow >= 0) {
					let arr = Rows[srow];
					let tgts = findTargetlist(arr, [v], square);
					//console.log("tgts", tgts);
					if (tgts) {
						lc.push(['r', srow, v, cls, tgts, s])
						break;
					}
				} else {
					let scol = sameCol(cls);
					if (scol >= 0) {
						let arr = Cols[scol];
						let tgts = findTargetlist(arr, [v], square);
						if (tgts) {
							lc.push(['c', scol, v, cls, tgts, s])
							break;
						}
					}
				}
			}
			if (lc.length > 0) break;
		}
	}
	//console.log("lc", lc);

	let lchints = [];
	for (const lh of lc) {
		let rcs = lh[0];
		let rcsix = lh[1];
		let val = lh[2];
		let cls = lh[3];
		let tgtlist = lh[4];
		let sq = lh[5];
		let {targets, values} = separateTargetlist(tgtlist);
		let msg = "Locked 1: " + formatTargetlist(tgtlist);

		let h = {
			type: 'locked1',
			row: rcs === 'r' ? rcsix : null,
			col: rcs === 'c' ? rcsix : null,
			square: sq,
			cells: cls,
			targetlist: tgtlist,
			values: values,
			targets: targets,
			msg: msg
		}
		lchints.push(h);
		break;
	}

	if (lchints.length === 0) return null;
	console.log("lchints", lchints);

	return lchints;
}


//*****************************************************************************
// lockedCandidates2

// find value that only occurs once in an array
function hasSingleOccurance(arr) {
	let single = null;
	let singleCount = 0;
	for (let i=0; i<arr.length; ++i) {
		if (arr[i] > 0 ) {
			if (single !== null) return null;
			single = i;
			singleCount = arr[i];
		}
	}
	if (single !== null && singleCount < 2) return null;
	return single;
}

// get the cell numbers of all the cells in the square with the given value
function getSquareValueCells(value, sqix) {
	let svc = [];
	let sq = Squares[sqix]; // get the square cells
	for (let i=0; i<9; ++i) {
		let cix = sq[i];	// cell index in square
		if (hintcells[cix] > 0) continue;
		if (hintcandidates[cix].includes(value)) {
			svc.push(cix);
		}
	}
	return svc;
}


export function lockedCandidates2() {
	// find values in squares
	const ppsHints = [];

	for (let value=1; value<10; ++value) {
		// for each row, count the number of times a value appears in a square
		for (let r=0; r<9; ++r) {
			let row = Rows[r];
			let sqCounts = [0,0,0,0,0,0,0,0,0];
			let sqCells = [[],[],[],[],[],[],[],[],[]];
			// for each cell in the row
			let valcount = 0;
			for (let c=0; c<9; ++c) {
				let cix = row[c];	// cell index in square
				if (hintcells[cix] > 0) continue;
				if (hintcandidates[cix].includes(value)) {
					let sq = cellSquare[cix];
					sqCounts[sq]++;
					sqCells[sq].push(cix);
					++valcount;
				}
			}
			if (valcount === 0) continue;

			let sqix = hasSingleOccurance(sqCounts);
			// sqix only occurs in one square, therefore it is a candidate for a locked candidate
			if (sqix !== null) {
				let vc = sqCounts[sqix];	// number of times value occurs in the square in the row
				//let targets = getSquareValueCells(value, sqix);	// get the cells that the value is in
				let targetlist = findTargetlist(Squares[sqix], [value], []);	// get the cells that the value is in
				let vscount = targetlist.length;
				//console.log("sqix",value, r, sqix, vc, pcells, sqCounts);
				if (vscount > vc) {
					//let cels = sqCells[sqix];
					//targets = targets.filter(c => !cels.includes(c));
					if (targetlist.length > 0) {
						let {targets, values} = separateTargetlist(targetlist);
						let msg = "Locked 2R: " + formatTargetlist(targetlist);
						let ppsh = {
							type: "locked2",
							direction: "row",
							row: r,
							col: null,
							square: sqix,
							cells: cels,
							targetlist: targetlist,
							values: values,
							targets: targets,
							msg: msg
						};
						ppsHints.push(ppsh);
						return ppsHints;
					}
				}
				continue;
			}
		}

		// do it for the columns
		for (let cx=0; cx<9; ++cx) {
			let col = Cols[cx];
			let sqCounts = [0,0,0,0,0,0,0,0,0];
			let sqCells = [[],[],[],[],[],[],[],[],[]];
			// for each cell in the row
			let valcount = 0;
			for (let c=0; c<9; ++c) {
				let cix = col[c];	// cell index in square
				if (hintcells[cix] > 0) continue;
				if (hintcandidates[cix].includes(value)) {
					let sq = cellSquare[cix];
					sqCounts[sq]++;
					sqCells[sq].push(cix);
					++valcount;
				}
			}
			if (valcount === 0) continue;

			let sqix = hasSingleOccurance(sqCounts);
			//console.log(sqix, sqCounts);
			if (sqix !== null) {
				let vc = sqCounts[sqix];
				//let targets = getSquareValueCells(value, sqix);	// get the cells that the value is in
				let targetlist = findTargetlist(Squares[sqix], [value], []);	// get the cells that the value is in
				let vscount = targetlist.length;
				if (vscount > vc) {
					//console.log("ppsc", value, cx, sqix, vc, vscount, targets, sqCounts);
					if (targetlist.length > 0) {
						let {targets, values} = separateTargetlist(targetlist);
						let msg = "Locked 2C: " + formatTargetlist(targetlist);
						let ppsh = {
							type: "locked2",
							direction: "col",
							row: null,
							col: cx,
							square: sqix,
							cells: cels,
							values: values,
							targets: targets,
							msg: msg
						};
						ppsHints.push(ppsh);
						return ppsHints;
					}
				}
				continue;
			}
		}
	}

	//console.log("ppsHints", ppsHints);

	if (ppsHints.length === 0) return null;
	return ppsHints;
}

