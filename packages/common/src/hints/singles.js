import { Rows, Cols, Squares, cellRow, cellCol, cellSquare } from '@sudoku/common/utilities/constants';
import { hintcells, hintcandidates, rcsCounts } from './hints';


//*****************************************************************************
// common functions

function firstSingleValue(arr) {
	for (var i=1; i<10; ++i)
		if (arr[i] == 1)
			return i;
	return 0;
}

function hasSingleValueHint(arr) {
	var counts = rcsCounts(arr);
	var sv = firstSingleValue(counts);	// sv only occurs once in the rcs
	if (sv > 0) {
		var pos = findValueInRCS(arr, sv);	// find the candidate in the rcs
		//console.log("rsc:", r, sv, pos, counts);
		var rs = {
			type: 'cell',
			row: null,
			col: null,
			square: null,
			targetcells: [pos.cell],
			values: [sv],
			msg: ""
		}
		return rs;
	}
	return null;
}

// find the first occurance of the value in the row/col/sq
function findValueInRCS(arr, val) {
	for (var i=0; i<9; ++i) {
		const cix = arr[i];
		//console.log("fvir", rix, val, cix, cell);
		if (hintcells[cix] > 0) continue;
		if (hintcandidates[cix].includes(val)) return {cell: cix, offset: i};
	}
	return null;
}

//*****************************************************************************
// Single Counts

export function singleCounts() {
	var singleCounts = [];
	for (var i=0; i<9; ++i) {
		var hassv = hasSingleValueHint(Rows[i])
		if (hassv) {
			hassv.type = 'cellR';
			hassv.row = i;
			hassv.msg = `Single: Row: ${i+1}, Target: ${hassv.targetcells} : ${hassv.values}`
			singleCounts.push(hassv)
			break;
		}
		var hassv = hasSingleValueHint(Cols[i])
		if (hassv) {
			hassv.type = 'cellC';
			hassv.col = i;
			hassv.msg = `Single: Column: ${i+1},  Target: ${hassv.targetcells} : ${hassv.values}`
			singleCounts.push(hassv)
			break;
		}
		var hassv = hasSingleValueHint(Squares[i])
		if (hassv) {
			hassv.type = 'cellS';
			hassv.square = i;
			hassv.msg = `Single: Square: ${i+1}, Target: ${hassv.targetcells} : ${hassv.values}`
			singleCounts.push(hassv)
			break;
		}
	}

	if (singleCounts.length === 0) return null;
	console.log("singleCounts",singleCounts);
	return singleCounts;
}

//*****************************************************************************
// singletons

// returns an array of cells which only have one candidate
export function singletons() {
	var singletons = [];
	for (var cix=0; cix<81; ++cix) {
		if (hintcells[cix] === 0 && hintcandidates[cix].length === 1) {
			let ac = hintcandidates[cix];
			//console.log("single:", ix, ac);
			var s = {
				type: 'cell',
				row: cellRow[cix],
				col: cellCol[cix],
				square: cellSquare[cix],
				targetcells: [cix],
				values: ac,
				msg: `Single:  Target: ${cix} : ${ac[0]}`
			}
			singletons.push(s);
			break;
		}
	};
	if (singletons.length == 0) return null;
	return singletons;
}

