import { Rows, Cols, Squares } from '@sudoku/common/utilities/constants';
import { hintcells, hintcandidates, findTargets, findInternalTargets, includesAll, includesAny } from './hints';


//*****************************************************************************


// for each house find the cells with 2 or 3 candidates
// return array of cell offsets and candidates
// : [ [offset, [ac]], [offset, [ac]], ...]
function rcsPairsTriples(arr) {
	var pt = [];
	for (var j=0; j<9; j++) {
		var cix = arr[j];
		if (hintcells[cix] > 0) continue;
		var ac = hintcandidates[cix];
		if (ac.length > 1 && ac.length < 4) pt.push([j,ac]);
	}
	return Array.from(pt).sort((a,b) => a-b);
}

// count the total values in the provided house cells
// house: [ [ cix, [values] ] ]
export function countTheHouse(house) {
	var vc = [0,0,0,0,0,0,0,0,0,0];
	// count the values in each cell
	var hlen = house.length;
	// count the candidate values
	for (var i=0; i<hlen; i++) {
		house[i][1].forEach((v) => {vc[v] += 1});
	}
	return vc;
}

// house[]: [row/col/sq, [candidates]]
function collectHouseValues(house) {
	var hv = new Set();
	house.forEach((h) => {
		h[1].forEach(hv.add, hv)
	})
	return Array.from(hv).sort((a,b) => a-b);
}

// house: [ [offset, [ac]], offset, [ac], ...]
export function packTheHouse(house) {
	var inHouse = structuredClone(house);
	//var inHouse = house;
	var updated = false;

	var hlen = inHouse.length;
	// count candidates in the house
	var vc = countTheHouse(inHouse);
	// eliminate any values with a count greater than 0 but not equal to 2 or 3
	//console.log("ctc vc", vc, inHouse);
	for (var value=1; value<10; ++value) {
		if (vc[value] === 1 || vc[value] > 3) {
			//console.log("value removed",value, vc[value])
			for (var i=0; i<hlen; i++) {
				inHouse[i][1] = inHouse[i][1].filter(v => v !== value);
			}
			updated = true;
		}
	}

	// remove any cells with one (or less) candidates
	var hx = [];
	for (var i=0; i<hlen; i++) {
		if (inHouse[i][1].length >= 2)
			hx.push([inHouse[i][0],inHouse[i][1]]);
		else
			updated = true;	// we skipped one
	}
	inHouse = hx;
	return {updated: updated, house:inHouse};
}

// count the occurances of the values in the cells
// if the number of values with counts of two or three is three,
//   and there are no other numbers, we have a possible triple
export function checkForTripleCounts(cnts) {
	var c2 = 0;
	var c3 = 0;
	var cx = 0;
	var vals = [];
	for (var value=1; value<10; ++value) {
		if (cnts[value] === 2) {
			++c2;
			vals.push(value);
		}
		else if (cnts[value] === 3) {
			++c3;
			vals.push(value);
		} else if (cnts[value] > 0) {
			++cx;
		}
	}

	if ((c2 + c3) !== 3) return null;
	if (cx !== 0) return null;
	return {
		twos: c2,
		threes: c3,
		values: vals
	};
}

// check the rcs array to find the candidate triples
function findNakedTriples(arr) {
	const triples = [];

	for (var i=0; i<9; i++) {
		var cixi = arr[i];
		if (hintcells[cixi] > 0) continue;

		// a naked triple
		var aci = hintcandidates[cixi];
		if (aci.length === 2 || aci.length === 3) {
			for (var j=i+1; j<9; j++) {
				//if (i === j) continue;
				var cixj = arr[j];
				if (hintcells[cixj] > 0) continue;
				var acj = hintcandidates[cixj];
				// the triple cells must have only 2 or 3 candidates
				if (acj.length !== 2 && acj.length !== 3) continue

				// are any of the acj values included in aci
				if (!includesAny(aci, acj)) continue;
				// if both are of length 2, the cannot have identical candidates
				if (aci.length === 2 && acj.length === 2 && includesAll(aci, acj)) continue;
				// if both are of length 3, they must have identical candidates
				if (aci.length === 3 && acj.length === 3 && !includesAll(aci, acj)) continue;
				// if one is of length 2 and the other of length 3, they both must have the 2 candidates
				if (aci.length === 2 && acj.length === 3 && !includesAll(acj, aci)) continue;
				if (aci.length === 3 && acj.length === 2 && !includesAll(aci, acj)) continue;

				// found two candidates, look for a third
				for (var k=j+1; k<9; k++) {
					//if (i === k || j === k) continue;
					var cixk = arr[k];
					if (hintcells[cixk] > 0) continue;
					var ack = hintcandidates[cixk];
					if (ack.length !== 2 && ack.length !== 3) continue;

					// are any of the ack values included in aci or acj
					if (!includesAny(aci, ack)) continue;
					if (!includesAny(acj, ack)) continue;
					// if both are of length 2, the cannot have identical candidates
					if (aci.length === 2 && ack.length === 2 && includesAll(aci, ack)) continue;
					// if both are of length 3, they must have identical candidates
					if (aci.length === 3 && acj.length === 3 && !includesAll(aci, acj)) continue;
					if (aci.length === 3 && ack.length === 3 && !includesAll(aci, ack)) continue;
					if (acj.length === 3 && ack.length === 3 && !includesAll(acj, ack)) continue;
					// if one is of length 2 and the other of length 3, they both must have the 2 candidates
					if (aci.length === 2 && ack.length === 3 && !includesAll(ack, aci)) continue;
					if (aci.length === 3 && ack.length === 2 && !includesAll(aci, ack)) continue;
					if (acj.length === 2 && ack.length === 3 && !includesAll(ack, acj)) continue;
					if (acj.length === 3 && ack.length === 2 && !includesAll(acj, ack)) continue;

					//console.log("nt", [cixi,aci], [cixj,acj], [cixk,ack])
					// we might have a triple, but I do not yet know what to check for
					// if two of the candidates are pairs, they cannot be the same pair
					// since [aci] is of length three, we need to compare [acj] anc [ack]
					//if (acj.length === 2 && ack.length === 2 && includesAll(acj, ack)) continue;	// too bad

					var cls = [cixi, cixj, cixk];
					var vs = new Set();
					aci.forEach(vs.add, vs);
					acj.forEach(vs.add, vs);
					ack.forEach(vs.add, vs);
					if (vs.size > 3) continue;	// too many candidates

					var vals = Array.from(vs).sort((a,b) => a-b);
					var tgts = findTargets(arr, vals, cls);
					if (tgts) triples.push([cls, vals, tgts]);
				}
			}
		}
	}

	return triples;
}

// for the cells in a row/col/square find any triples
// ptIn: [[offset, [candidates]], [offset, [candidates]], ...]
export function findHiddenTriple(ptIn) {
	var ptInlen = ptIn.length;
	var pt = structuredClone(ptIn);
	//console.log("ptIn", ptIn);
	// pt[]: [row/col/sq, [candidates]]
	// var vc = [0,0,0,0,0,0,0,0,0,0];
	// count the values in each cell and collect the indices
	// var ptlen = pt.length;
	// var ptIx = [];
	// for (var i=0; i<ptlen; i++) {
	// 	//console.log("map", pt[i][1]);
	// 	pt[i][1].forEach((v) => {vc[v] += 1});
	// 	ptIx.push(pt[i]);
	// }

	//console.log("vc", vc);
	// run the value elimination process
	var updated = false;
	var hx;
	do {
		var pack = packTheHouse(pt);
		//console.log("pack", pack, pt);
		updated = pack.updated;
		hx = pack.house;
		//console.log(updated, pt, hx);
		pt = hx;
		//console.log("pack", count, updated, pack);
	} while (updated === true);

	var ptlen = pt.length;
	if (ptlen < 3) return null;	// not enough cells
	//console.log("pt", ptlen, pt);
	// we have a candidate house

	var triples = [];

	if (ptlen === 3) {
		// possible valid triple
		var hv = collectHouseValues(pt);			// the collection of all values in the house cells
		var hc = countTheHouse(pt);					// counts of the values in the candidate cells
		var hi = [pt[0][0], pt[1][0], pt[2][0]];	// indices of the candidate cells
		var tcc = checkForTripleCounts(hc);
		if (tcc) {
			//console.log("hicv", hi, hc, hv, pt);
			//console.log("tcc3", 0, 1, 2, pt[0][0], pt[1][0], pt[2][0], tcc, pt);
			// we have a possible triple
			// check if any of the triple values occur outside of the triple
			// the triple candidate values are [hc]
			// the triple candidate indices are
			var valid = true;
			for (var i=0; i<ptInlen; i++) {
				// only check the candidtate cells
				if (!hi.includes(ptIn[i])) continue;
				if (includesAny(ptIn[i], hv)) valid = false;
			}
			if (valid) {
				//console.log("valid3");
				//console.log("hv", hc, hv, pt);
				//console.log("tcc3", 0, 1, 2, pt[0][0], pt[1][0], pt[2][0], tcc, pt);
				triples.push([pt[0][0], pt[1][0], pt[2][0]],tcc.values);
				//console.log("3", pt);
			}
		}

	} else { // ptlen > 3
		// count the values for each group of three
		//console.log("pt", ptlen, pt);
		for (var i=0; i<ptlen; i++) {
			for (var j=i+1; j<ptlen; j++) {
				for (var k=j+1; k<ptlen; k++) {
					// count the values in each cell
					var tc = [0,0,0,0,0,0,0,0,0,0];
					pt[i][1].forEach((v) => {tc[v] += 1});
					pt[j][1].forEach((v) => {tc[v] += 1});
					pt[k][1].forEach((v) => {tc[v] += 1});
					//console.log("tc", i, j, k, tc);
					var tcc = checkForTripleCounts(tc);
					if (tcc) {
						//console.log("tcc", i, j, k, pt[i][0], pt[j][0], pt[k][0], tcc, pt);
						// now if any of the tcc.values are in cells outside of [i,j,k] then this is not a valid triple
						var hi = [i,j,k];		// indices of the candidate cells
						var hv = tcc.values;	// values in the candidate cells
						var valid = true;
						for (var l=0; l<ptInlen; l++) {
							// skip the candidate cells
							if (hi.includes(ptIn[l])) continue;
							if (includesAny(ptIn[l], hv)) valid = false;
						}

						if (valid) {
							//console.log("valid3p");
							//console.log("tcc", i, j, k, pt[i][0], pt[j][0], pt[k][0], tcc, pt);
							//triples.push([[pt[i], pt[j], pt[k]],tcc.values]);
							triples.push([pt[i][0], pt[j][0], pt[k][0]],tcc.values);
							//console.log("gt3", pt);
						}
					}
				}
			}
		}
	}


	if (triples.length === 0) return null;
	//console.log("triples", triples);
	return triples;
}

//*****************************************************************************
// Naked Triples

export function nakedTriples() {

	var triples = [];

	for (var i=0; i<9; i++) {
		var rt = findNakedTriples(Rows[i])
		if (rt.length > 0) rt.forEach((t) => triples.push(['r', i].concat(t)));
		var ct = findNakedTriples(Cols[i])
		if (ct.length > 0) ct.forEach((t) => triples.push(['c', i].concat(t)));
		var st = findNakedTriples(Squares[i])
		if (st.length > 0) st.forEach((t) => triples.push(['s', i].concat(t)));
	}

	//console.log("np triples",triples)
	var nakedTriples = [];
	triples.forEach((npt) => {
		var rcs = npt[0];
		var rcsix = npt[1];
		var cls = npt[2];
		var vals = npt[3];
		var tgts = npt[4]
		//console.log(dir,trc0,cls)

		var h = {
			type: 'nakedTriple',
			row: rcs === 'r' ? rcsix : null,
			col: rcs === 'c' ? rcsix : null,
			square: rcs === 's' ? rcsix : null,
			cells: cls,
			values: vals,
			targets: tgts,
			msg: `Naked Triple: Cells: ${tgts}, Values: ${vals}`
		}
		nakedTriples.push(h);
	})


	if (nakedTriples.length === 0) return null;
	console.log("nakedTriples",nakedTriples)
	return nakedTriples;
}

//*****************************************************************************
// Hidden Triples

export function hiddenTriples() {

	var vRowPT = [];
	var vColPT = [];
	var vSqPT = [];

	// for each row/col/square calculate the possible triples/pairs for each cell;
	// collect the cells with two or three candidates
	// for each r/c/s we have a list of cells with two or three candidates
	// for each r/c/s:  [ rcs-offset, [ [offset, [ac]], [offset, [ac], ...] ]
	for (var i=0; i<9; i++) {
		var rc = rcsPairsTriples(Rows[i]);
		var cc = rcsPairsTriples(Cols[i]);
		var sc = rcsPairsTriples(Squares[i]);
		vRowPT.push([i, rc]);
		vColPT.push([i, cc]);
		vSqPT.push([i, sc]);
	}
	//var cc = rcsPairsTriples(Cols[4]);
	//vColPT.push([4, cc]);
	// these are all the cells and their candidates for each row/col/sq cell that have two or more candidates
	// [ row/col/sq, [ [offset, [candidates]], [offset, [candidates], ...] ] ]
	//console.log("PT", vRowPT, vColPT, vSqPT);


	// for each row/col/square find the triples
	var rowC = [];
	var colC = [];
	var sqC = [];
	var ht;
	// for every row/col/sq with three or more cells with candidates
	for (var i=0; i<9; i++) {
		if (vRowPT.length > i && vRowPT[i][1].length > 2) {
			//console.log("row",i);
			ht = findHiddenTriple(vRowPT[i][1]);
			//console.log("htrow", i, ht);
			if (ht) rowC.push([vRowPT[i][0],ht[0],ht[1]]);
		}
		if (vColPT.length > i && vColPT[i][1].length > 2) {
			//console.log("col",i);
			ht = findHiddenTriple(vColPT[i][1]);
			//console.log("htcol", i, ht);
			if (ht) colC.push([vColPT[i][0],ht[0],ht[1]]);
		}
		if (vSqPT.length > i && vSqPT[i][1].length > 2) {
			//console.log("sq",i);
			ht = findHiddenTriple(vSqPT[i][1]);
			//console.log("htsq", i, ht);
			if (ht) sqC.push([vSqPT[i][0],ht[0],ht[1]]);
		}
	}

	//console.log(rowC, colC, sqC);

	var targets = [];
	for (const rc of rowC) {
		var r = rc[0];
		var row = Rows[r];
		var cls = [ row[rc[1][0]],row[rc[1][1]],row[rc[1][2]] ];
		var vals = rc[2];
		// if there are any external targets this is not a valid triple
		var et = findTargets(row, vals, cls);
		if (!et) {
			var tgtvals = findInternalTargets(cls, vals);
			if (tgtvals) {
				// have targets
				//console.log("r",r,cls,tgtvals[1],tgtvals[0]);
				targets.push(["r",r,cls,tgtvals[1],tgtvals[0]]);
				break;
			}
		}
	}

	if (targets.length === 0)
		for (const cc of colC) {
			var c = cc[0];
			var col = Cols[c];
			var cls = [ col[cc[1][0]],col[cc[1][1]],col[cc[1][2]] ];
			var vals = cc[2];
			//console.log("cc", c, col, cls, vals);
			var et = findTargets(col, vals, cls);
			if (!et) {
				var tgtvals = findInternalTargets(cls, vals);
				if (tgtvals) {
					// have targets
					//console.log("c",c,cls,tgtvals[1],tgtvals[0]);
					targets.push(["c",c,cls,tgtvals[1],tgtvals[0]]);
					break;
				}
			}
		}

	if (targets.length === 0)
		for (const sc of sqC) {
			var s = sc[0];
			var sq = Squares[s];
			var cls = [ sq[sc[1][0]],sq[sc[1][1]],sq[sc[1][2]] ];
			var vals = sc[2];
			var et = findTargets(sq, vals, cls);
			if (!et) {
				var tgtvals = findInternalTargets(cls, vals);
				if (tgtvals) {
					// have targets
					//console.log("s",s,cls,tgtvals[1],tgtvals[0]);
					targets.push(["s",s,cls,tgtvals[1],tgtvals[0]]);
					break;
				}
			}
		}

	console.log("targets",targets);

	var triples = [];
	for (const tgt of targets) {
		var dir = tgt[0];
		var rcs = tgt[1];
		var cls = tgt[2];
		var vals = tgt[3];
		var tgts = tgt[4]
		//console.log(dir,trc0,cls)

		var h = {
			type: 'hiddenTriple',
			rows: rcs === 'r' ? rcs : null,
			cols: rcs === 'c' ? rcs : null,
			square: rcs === 's' ? rcs : null,
			cells: cls,
			values: vals,
			targets: tgts,
			msg: `Hidden Triple: Cells: ${tgts}, Values: ${vals}`
		}
		triples.push(h);
		break;
	}

	// convert targets to hints

	if (triples.length === 0) return null;
	console.log("triples",triples);
	return triples;
}

