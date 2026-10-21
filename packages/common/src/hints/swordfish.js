import { Rows, Cols, Squares, cellRow, cellCol, cellSquare, sqRowCells, sqColCells, sqRows012, sqCols012, RCS } from '@sudoku/common/utilities/constants';
import { findTargets, findInternalTargets, includesAll, includesAny, cellHasCandidate } from './hints';
import { rCounts2, rCounts2p, rCounts23, rCounts3, cCounts2, cCounts2p, cCounts23, cCounts3 } from './hints';
import { cells, vRows, vCols, vSqs } from './hints';


//*****************************************************************************
// common functions

function findTriplesByRow(rows) {
	const triples = [];

	for (let r1 = 0; r1 < rows.length - 2; r1++) {
		const [row1, cols1] = Rows[r1];

		for (let r2 = r1 + 1; r2 < rows.length - 1; r2++) {
			const [row2, cols2] = Rows[r2];

			for (let r3 = r2 + 1; r3 < rows.length; r3++) {
				const [row3, cols3] = Rows[r3];

				// Generate one pair from row 1
				for (let a = 0; a < cols1.length - 1; a++) {
					for (let b = a + 1; b < cols1.length; b++) {
						const p1 = [cols1[a], cols1[b]];

						// Generate one pair from row 2
						for (let c = 0; c < cols2.length - 1; c++) {
							for (let d = c + 1; d < cols2.length; d++) {
								const p2 = [cols2[c], cols2[d]];

								if (!oneInCommon(p1, p2)) continue;

								// Generate one pair from row 3
								for (let e = 0; e < cols3.length - 1; e++) {
									for (let f = e + 1; f < cols3.length; f++) {
										const p3 = [cols3[e], cols3[f]];

										if (
											oneInCommon(p1, p3) &&
											oneInCommon(p2, p3) &&
											validTriple(p1, p2, p3)
										) {
											triples.push([
												[row1, p1],
												[row2, p2],
												[row3, p3]
											]);
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	return triples;
}

function findTriplesByColumn(cols) {
	const triples = [];

	for (let c1 = 0; c1 < cols.length - 2; c1++) {
		const [col1, rows1] = Cols[c1];

		for (let c2 = c1 + 1; c2 < cols.length - 1; c2++) {
			const [col2, rows2] = Cols[c2];

			for (let c3 = c2 + 1; c3 < cols.length; c3++) {
				const [col3, rows3] = Cols[c3];

				// Generate one pair from col 1
				for (let a = 0; a < rows1.length - 1; a++) {
					for (let b = a + 1; b < rows1.length; b++) {
						const p1 = [rows1[a], rows1[b]];

						// Generate one pair from row 2
						for (let c = 0; c < rows2.length - 1; c++) {
							for (let d = c + 1; d < rows2.length; d++) {
								const p2 = [rows2[c], rows2[d]];

								if (!oneInCommon(p1, p2)) continue;

								// Generate one pair from row 3
								for (let e = 0; e < rows3.length - 1; e++) {
									for (let f = e + 1; f < rows3.length; f++) {
										const p3 = [rows3[e], rows3[f]];

										if (
											oneInCommon(p1, p3) &&
											oneInCommon(p2, p3) &&
											validTriple(p1, p2, p3)
										) {
											triples.push([
												[col1, p1],
						[col2, p2],
						[col3, p3]
											]);
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	return triples;
}

function oneInCommon(a, b) {
	return (
		Number(b.includes(a[0])) +
		Number(b.includes(a[1]))
	) === 1;
}

function validTriple(p1, p2, p3) {
	return new Set([
		...p1,
		...p2,
		...p3
	]).size === 3;
}

// for each cell in row r that has the candidate value v check if it is in one of the columns in [c]
// return cir for those that are in the columns and cxx for those that are not
function columnsInRow(r, c, v) {
	var cir = [];
	var cxx = [];
	var row = Rows[r];
	for (var i=0; i<9; i++) {
		var cix = row[i];
		var col = cellCol[cix];
		var cel = cells[cix];
		if (cel.value === 0 && cel.activecandidates.includes(v)) {
			if (c.includes(col))
				cir.push(i)
				else
					cxx.push(i)
		}
	}
	if (cir.length < 2) return null;
	return [r,cir,cxx];
}

// for each cell in column c, if the cell includes value v, if the row is included in [r], push the row number into rix otherwise push into rxx
// if there are at least two rows, return them
function rowsInColumn(c, r, v) {
	var rir = [];
	var rxx = [];	// rows we do not want
	var col = Cols[c];
	for (var i=0; i<9; i++) {
		var cix = col[i];
		var row = cellRow[cix];
		var cel = cells[cix];
		if (cel.value === 0 && cel.activecandidates.includes(v)) {
			if (r.includes(row))
				rir.push(i);
			else
				rxx.push(i);
		}
	}
	if (rir.length < 2) return null;
	return [c,rir,rxx];
}

// check if the columns have all rows in common
function rowsInCommon(c1, c2, c3, v) {
	var ric = [];
	var c1r = Cols[c1];
	var c2r = Cols[c2];
	var c3r = Cols[c3];
	for (var i=0; i<9; i++) {
		var c1x = c1r[i];
		var c2x = c2r[i];
		var c3x = c3r[i];
		// for each row in the column, make sure they contain the candidate value
		var ccc1 = cellHasCandidate(c1x, v);
		var ccc2 = cellHasCandidate(c2x, v);
		var ccc3 = cellHasCandidate(c3x, v);
		// all or nothing
		if (!(ccc1 && ccc2 && ccc3)) continue;
		ric.push([c1x,c2x,c3x]);
	}

	//console.log("ric", v, ric);
	return ric;
}

// check if the rows have all columns in common
function columnsInCommon(r1, r2, r3, v) {
	var cic = [];
	var r1c = Rows[r1];
	var r2c = Rows[r2];
	var r3c = Rows[r3];
	for (var i=0; i<9; i++) {
		var r1x = r1c[i];
		var r2x = r2c[i];
		var r3x = r3c[i];
		// for each column in the row, make sure they all contain the candidate value
		var ccc1 = cellHasCandidate(r1x, v);
		var ccc2 = cellHasCandidate(r2x, v);
		var ccc3 = cellHasCandidate(r3x, v);
		// all or nothing
		if (!(ccc1 && ccc2 && ccc3)) continue;
		cic.push([r1x,r2x,r3x]);
	}
	if (cic.length < 3) return null;	// not enough cols in common

	//console.log("cic", v, cic);
	return cic;
}

function rowsInCommon23(c1, c2, c3, v) {
	var ric = [];
	var c1r = Cols[c1];
	var c2r = Cols[c2];
	var c3r = Cols[c3];
	//console.log("ric23", v, c1, c2, c3);
	var rowsix = new Set();
	for (var i=0; i<9; i++) {
		var c1x = c1r[i];
		var c2x = c2r[i];
		var c3x = c3r[i];
		// for each row in the column, make sure they contain the candidate value
		var rows = [];
		//console.log("ric23x", v, c1x, c2x, c3x);
		var ccc1 = cellHasCandidate(c1x, v);
		if (ccc1) {
			rows.push(c1x);
			rowsix.add(i);
		}
		var ccc2 = cellHasCandidate(c2x, v);
		if (ccc2) {
			rows.push(c2x);
			rowsix.add(i);
		}
		var ccc3 = cellHasCandidate(c3x, v);
		if (ccc3) {
			rows.push(c3x);
			rowsix.add(i);
		}
		// all or nothing
		if (rows.length > 1) ric.push(rows);
	}

	if (rowsix.size !== 3) return null;	// must be 3

	//console.log("ric", v, ric, empty);
	return [ric, Array.from(rowsix)];
}

// check if the each row has 2 or 3 cells containing the value for each column
function columnsInCommon23(r1, r2, r3, v) {
	var cic = [];
	var r1c = Rows[r1];
	var r2c = Rows[r2];
	var r3c = Rows[r3];

	//console.log("cic23", v, r1, r2, r3);
	// for each cell in the row (each column)
	var colsix = new Set();
	for (var i=0; i<9; i++) {
		var r1x = r1c[i];
		var r2x = r2c[i];
		var r3x = r3c[i];
		var cols = [];
		var ccc1 = cellHasCandidate(r1x, v);
		if (ccc1) {
			cols.push(r1x);
			colsix.add(i);
		}
		var ccc2 = cellHasCandidate(r2x, v);
		if (ccc2) {
			cols.push(r2x);
			colsix.add(i);
		}
		var ccc3 = cellHasCandidate(r3x, v);
		if (ccc3) {
			cols.push(r3x);
			colsix.add(i);
		}
		if (cols.length > 1) cic.push(cols);
	}

	if (colsix.size !== 3) return null;	// must be 3

	//console.log("cic", v, cic, colsix);
	return [cic, Array.from(colsix)];
}

// get the column number for the row containing the value v
function getRowColumnsWithValue(r, v) {
	var columns = [];
	var cls = [];
	var row = Rows[r];
	for (var i=0; i<9; i++) {	// for each column
		var cix = row[i];
		var hasValue = cellHasCandidate(cix, v);
		if (hasValue) {
			columns.push(i)
			cls.push(cix);
		}
	}
	return [columns,cls];
}

// get the row number for the row containing the value v
function getColumnRowsWithValue(c, v) {
	var colrows = [];
	var cls = [];
	var col = Cols[c];
	for (var i=0; i<9; i++) {	// for each column
		var cix = col[i];
		var hasValue = cellHasCandidate(cix, v);
		if (hasValue) {
			colrows.push(i)
			cls.push(cix);
		}
	}
	return [colrows,cls];
}

// check if the rows have columns in common
// r1 must have 3 columns, r2 and r3 can have two or three columns;
// r2 and r3 must have the same columns as r1
// returns col number and cells in common
function columnsInCommon3(r1, r2, r3, v) {
	var r1cols = getRowColumnsWithValue(r1, v);
	var r2cols = getRowColumnsWithValue(r2, v);
	var r3cols = getRowColumnsWithValue(r3, v);

	if (!includesAll(r1cols[0],r2cols[0])) return false;
	if (!includesAll(r1cols[0],r3cols[0])) return false;

	//console.log("cic3", v, r1, r2, r3, r1cols, r2cols, r3cols);
	return [r1cols, r2cols, r3cols];
}

// check if the colums have rows in common
// c1 must have 3 columns, c2 and c3 can have two or three columns;
// c2 and c3 must have the same columns as c1
// returns row number and cells in common
function rowsInCommon3(c1, c2, c3, v) {
	var c1rows = getColumnRowsWithValue(c1, v);
	var c2rows = getColumnRowsWithValue(c2, v);
	var c3rows = getColumnRowsWithValue(c3, v);

	if (!includesAll(c1rows[0],c2rows[0])) return false;
	if (!includesAll(c1rows[0],c3rows[0])) return false;

	//console.log("ric3", v, c1, c2, c3, c1rows, c2rows, c3rows);
	return [c1rows, c2rows, c3rows];
}

function tripleArrayContains(a,b) {
	var alen = a.length;
	for (var i=0; i<alen; i++) {
		var ti = a[i];
		//console.log("tt", ti, b);
		if (!b.includes(ti[0])) continue;
		if (!b.includes(ti[1])) continue;
		if (!b.includes(ti[2])) continue;
		return true;
	}
	return false;
}

function makeTriples(a1,a2) {
	var triples = [];
	var a1len = a1.length;
	var a2len = a2.length;
	if (a1len+a2len < 3) return triples;
	for (var i=0; i<a1len; i++) {
		var t0 = a1[i];
		for (var j=0; j<a2len; j++) {
			var t1 = a2[j];
			if (t0 === t1) continue;
			for (var k=j+1; k<a2len; k++) {
				var t2 = a2[k];
				if (t0 === t2 || t1 === t2) continue;
				var ts = [t0,t1,t2];
				if (!tripleArrayContains(triples,ts)) triples.push(ts);
			}
		}
	}
	return triples;
}

// for each row in [r] find cells with value v excluding cells in [ex]
function findRowTargets(r, v, ex) {
	var targets = [];
	r.forEach((rx) => {
		var row = Rows[rx];
		for (var i=0; i<9; i++) {
			var cix = row[i];
			var cel = cells[cix];
			if (!ex.includes(cix)) {
				if (cel.value === 0 && cel.activecandidates.includes(v)) {
					targets.push(cix);
				}
			}
		}
	})
	return targets;
}

function findColumnTargets(c, v, ex) {
	var targets = [];
	c.forEach((cx) => {
		var col = Cols[cx];
		for (var i=0; i<9; i++) {
			var cix = col[i];
			var cel = cells[cix];
			if (!ex.includes(cix)) {
				if (cel.value === 0 && cel.activecandidates.includes(v)) {
					targets.push(cix);
				}
			}
		}
	})
	return targets;
}

function findSquareTargets(c, v, ex) {
	var targets = [];
	c.forEach((cx) => {
		var sq = Squares[cx];
		for (var i=0; i<9; i++) {
			var cix = sq[i];
			var cel = cells[cix];
			if (!ex.includes(cix)) {
				if (cel.value === 0 && cel.activecandidates.includes(v)) {
					targets.push(cix);
				}
			}
		}
	})
	return targets;
}

function combinationsOfThree(arr) {
	var combinations = [];
	var arrlen = arr.length;
	if (arrlen < 3) return [];
	if (arrlen === 3) return arr;
	for (var i=0; i<arrlen; i++) {
		for (var j=i+1; j<arrlen; j++) {
			for (var k=j+1; k<arrlen; k++) {
				combinations.push([arr[i],arr[j],arr[k]]);
			}
		}
	}
	return combinations;
}

//*****************************************************************************
// Swordfish

export function swordfish() {

	var sfcandidates = [];

	// first we need to find any rows/colums with exacty 2 or 3 of the value (if any)
	// for each value in rCounts3 count the rows of three

	var cr = [];	// candidate row swordfish
	var cc = [];	// candidate col swordfish
	// first check rows/cols with three of the same value
	for (var v=1; v<10; v++) {
		//if (v !== 4) continue;	// TESTING
		if (rCounts23[v].length >= 3) {
			//console.log("row23", v, rCounts23[v]);
			var r23len = rCounts23[v].length
			for (var i=0; i<r23len; ++i) {
				for (var j=i+1; j<r23len; ++j) {
					for (var k=j+1; k<r23len; ++k) {
						var rc23i = rCounts23[v][i];
						var rc23j = rCounts23[v][j];
						var rc23k = rCounts23[v][k];
						var cicr = columnsInCommon23(rc23i,rc23j,rc23k, v);
						if (cicr) {
							//console.log("cicr", v, [rc23i, rc23j, rc23k], cicr[1], cicr[0]);
							cr.push([v, [rc23i, rc23j, rc23k], cicr[1], cicr[0]])
						}
					}
				}
			}
		}

		if (cCounts23[v].length >= 3) {
			//console.log("col23", v, cCounts23[v]);
			var c23len = cCounts23[v].length
			for (var i=0; i<c23len; ++i) {
				for (var j=i+1; j<c23len; ++j) {
					for (var k=j+1; k<c23len; ++k) {
						var cc23i = cCounts23[v][i];
						var cc23j = cCounts23[v][j];
						var cc23k = cCounts23[v][k];
						var cicc = rowsInCommon23(cc23i,cc23j,cc23k, v);
						if (cicc) {
							//console.log("cicc", v, [cc23i, cc23j, cc23k], cicc[1], cicc[0]);
							if (cicc[1].length > 3) {

							} else {
								cc.push([v, [cc23i, cc23j, cc23k], cicc[1], cicc[0]])
							}
						}
					}
				}
			}
		}
	}

	//console.log("sf?", cr, cc);

	// look for row targets
	for (const crx of cr) {
		//console.log("crx", crx);
		var val = crx[0];
		var rows = crx[1];	// row indices
		var cols = crx[2];	// column indices
		var ccls = crx[3];	// cells in columns
		// find targets in the three columns
		var tgts = [];
		for (var i=0; i<3; ++i) {
			var t = findTargets(Cols[cols[i]], [val], ccls[i]);
			if (t) tgts.push(...t);
		}
		//console.log("cicrT", tgts);
		if (tgts.length > 0) {
			sfcandidates.push([val, rows, cols, ccls, tgts ])
			break;
		}
	}

	// look for column targets
	if (sfcandidates.length === 0)
		for (const ccx of cc) {
			//console.log("ccx", ccx);
			var val = ccx[0];
			var cols = ccx[1];	// col indices
			var rows = ccx[2];	// row indices
			var rcls = ccx[3];	// cells in rows
			// find targets in the three rows
			var tgts = [];
			for (var i=0; i<3; ++i) {
				var t = findTargets(Rows[rows[i]], [val], rcls[i]);
				if (t) tgts.push(...t);
			}
			//console.log("ciccT", tgts);
			if (tgts.length > 0) {
				sfcandidates.push([val, rows, cols, rcls, tgts ])
				break;
			}
		}


	//console.log("sfcandidates",sfcandidates);
	var swordfish = [];

	sfcandidates.forEach((sfc) => {
		//console.log("sfc", sfc)
		//var dir = sfc[0];
		var val = sfc[0];
		var rows = sfc[1];
		var cols = sfc[2];
		var cls = sfc[3];
		var tgts = sfc[4]
		//console.log(dir,trc0,cls)

		var h = {
			type: 'swordfish',
			rows: rows,
			cols: cols,
			square: null,
			cells: cls,
			values: [val],
			targets: tgts,
			msg: `Swordfish: Cells: ${tgts}, Value: ${val}`
		}
		swordfish.push(h);
	})

	if (swordfish.length === 0) return null;
	console.log("swordfish", swordfish);
	return swordfish;
}

