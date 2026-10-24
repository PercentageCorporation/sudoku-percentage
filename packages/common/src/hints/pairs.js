import { Rows, Cols, Squares } from '@sudoku/common/utilities/constants';
import { findTargets, findInternalTargets, includesAll } from './hints';
import { hintcells, hintcandidates, vRows, vCols, vSqs } from './hints';


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
		if (hintcells[cix] > 0) continue;
		var ac = hintcandidates[cix];
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

// find pairs in the row/col/sq array and record the index of where they were found;
function findPairs(arr) {
	var px = [];
	outer: for (var i=0; i<9; ++i) {
		var cii = arr[i];
		if (hintcells[cii] > 0) continue;
		//console.log(i, cix,  arr, ci);
		var aci = hintcandidates[cii];
		if (aci.length === 2) {
			for (var j=i+1; j<9; ++j) {
				var cij = arr[j];
				if (hintcells[cij] > 0) continue;
				var acj = hintcandidates[cij];
				if (acj.length === 2) {
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
	for (const npi of np) {
		const rcs = npi[0];
		const rcsix = npi[1];
		const cls = npi[3];
		const vals = npi[4];

		const house =
		rcs === 'r' ? Rows[rcsix] :
		rcs === 'c' ? Cols[rcsix] :
		Squares[rcsix];

		const tgts = findTargets(house, vals, cls);

		if (!tgts || tgts.length === 0) continue;

		const direction =
		rcs === 'r' ? 'row' :
		rcs === 'c' ? 'col' : 'square';

		npHints.push([direction, rcsix, cls, vals, tgts]);
		break;
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

	//console.log("nakedPairs", nakedPairs);
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
	//console.log("hiddenPairs",hiddenPairs)
	return hiddenPairs;
}


