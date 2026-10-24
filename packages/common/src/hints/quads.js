import { Rows, Cols, Squares } from '@sudoku/common/utilities/constants';
import { findTargets, getActiveCandidates } from './hints';

//*****************************************************************************


//*****************************************************************************
// Naked Quads

//const valpairs = Array.from({ length: 10 }, () => []);

function getUnique(ax) {
	var s = new Set();
	ax.forEach(a => s.add(a));
	return Array.from(s);
}

function findQuads(arr) {
	let quads = [];
	// get the cells in the house with candidates
	let hcells = [];
	let count = 0;
	for (let i=0; i<9; ++i) {
		let cix = arr[i];
		let ac = getActiveCandidates(cix);
		if (ac.length > 1) {
			hcells.push([i, cix, ac])
			++count;
		}
	}
	if (count < 5) return [];	// not enough cells for a quad with eliminations
	// get the values with counts of four or less

	//console.log("hcells", hcells);

	// for each combination of four cells count the candidates
	let hclen = hcells.length;
	for (let i=0; i<hclen; ++i) {
		let hci = hcells[i];
		for (let j=i+1; j<hclen; ++j) {
			let hcj = hcells[j];
			for (let k=j+1; k<hclen; ++k) {
				let hck = hcells[k];
				for (let l=k+1; l<hclen; ++l) {
					let hcl = hcells[l];

					let qvall = [...hci[2],...hcj[2],...hck[2],...hcl[2]];
					let qvals = getUnique(qvall);
					let qcells = [hci[1],hcj[1],hck[1],hcl[1]];

					if (qvals.length === 4) {
						let tgts = findTargets(arr, qvals, qcells);
						if (tgts) {
							//console.log(tgts);
							quads.push([qvals,qcells,tgts]);
						}
					}
				}
			}
		}
	}
	//console.log("quads", quads);
	return quads;
}

export function quads() {
	let quads = [];

	let q = [];
	for (var i=0; i<9; i++) {
		//console.log("Row ", i);
		let rq = findQuads(Rows[i]);
		if (rq.length > 0) {
			let h = quadHint(rq[0]);
			quads.push(h);
			break;
		}
		//console.log("Col ", i);
		let cq = findQuads(Cols[i]);
		if (cq.length > 0) {
			let h = quadHint(cq[0]);
			quads.push(h);
			break;
		}
		//console.log("Sq ", i);
		let sq = findQuads(Squares[i]);
		if (sq.length > 0) {
			let h = quadHint(sq[0]);
			quads.push(h);
			break;
		}
	}

	//console.log("quads", q);

	if (quads.length === 0) return null;
	console.log("quads",quads);
	return quads;
}

function quadHint(q) {
	let vals = q[0];
	let cls = q[1];
	let tgts = q[2];

	var h = {
		type: 'quad',
		row: null,
		col: null,
		square: null,
		cells: cls,
		values: vals,
		targets: tgts,
		msg: `Quad: Cells: ${tgts}, Value: ${vals}`
	}
	return h;
}


//*****************************************************************************
// Hidden Quads

export function hiddenQuads() {
	let quads = [];




	if (quads.length === 0) return null;
	console.log("quads",quads);
	return quads;
}

