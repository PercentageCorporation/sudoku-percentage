import { Rows, Cols } from '@sudoku/common/utilities/constants';
import { findTargets, cellHasCandidate } from './hints';
import { rCounts23, cCounts23 } from './hints';


//*****************************************************************************
// common functions

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
							if (cicr[0].length !== 3) continue;
							if (cicr[1].length > 3) continue;
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
							if (cicc[0].length !== 3) continue;
							if (cicc[1].length > 3) continue;
							cc.push([v, [cc23i, cc23j, cc23k], cicc[1], cicc[0]])
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

