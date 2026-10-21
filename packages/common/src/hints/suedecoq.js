import { Rows, Cols, Squares, RCS } from '@sudoku/common/utilities/constants';
import { cells, findTargets, findTargetsInHouses, includesAll, includesAny, sameRow2, sameCol2, sameRow3, sameCol3 } from './hints';
import { getBivaluePairs } from "./conjugates";

//*****************************************************************************

export function suedecoq() {
	var result = suedecoqII();
	if (result) return result;

	var result = suedecoqI();
	if (result) return result;

	return null;
}

//*****************************************************************************

function suedecoqII() {
	// for each bivalue cell try to find three other non-diagonal cells containing a total of 4 candidates
	// which include the candidates from the bivalue cell
	let bivals = getBivaluePairs();

	for (const bp of bivals) {
		// get the bivalue characteristics
		let bpix = bp[0];
		let bpac = bp[1];
		let bpac0 = bpac[0];
		let bpac1 = bpac[1];
		let bprow = RCS[bpix][0];
		let bpcol = RCS[bpix][1];
		let bpsq = RCS[bpix][2];
		let sqarr = Squares[bpsq];
		// search for the intersection cells
		// three cells in the square in the same row or column with a total of five candidates
		for (let i=0; i<9; ++i) {
			let cixi = sqarr[i];
			if (cixi === bpix) continue;	// skip the other block cell
			if (cells[cixi].value > 0) continue;
			for (let j=i+1; j<9; ++j) {
				let cixj = sqarr[j];
				if (cixj === bpix) continue;	// skip the other block cell
				if (cells[cixj].value > 0) continue;
				for (let k=j+1; k<9; ++k) {
					let cixk = sqarr[k];
					if (cixk === bpix) continue;	// skip the other block cell
					if (cells[cixk].value > 0) continue;

					// get all of the candidates
					let aci = cells[cixi].activecandidates;
					let acj = cells[cixj].activecandidates;
					let ack = cells[cixk].activecandidates;
					let sqac = new Set();
					aci.forEach(c => sqac.add(c))
					acj.forEach(c => sqac.add(c))
					ack.forEach(c => sqac.add(c))
					if (sqac.size !== 5) continue;	// we are looking for four

					// are the bivalue candidates included in the collection
					if (!sqac.has(bpac0)) continue;
					if (!sqac.has(bpac1)) continue;

					// the intersection cells must be in the same row/col
					let row = sameRow3(cixi, cixj, cixk);
					let col = sameCol3(cixi, cixj, cixk);
					if (row < 0 && col < 0) continue;		// diagonal
					// cannot be in same row/col as bivalue cell
					if (row === bprow) continue;
					if (col === bpcol) continue;

					// found intersection cells
					console.log("sdcII", bpix, cixi, cixj, cixk, sqac);
					// look for the other bivalue we need

					// get the other candidates we are looking for
					let allac = Array.from(sqac);
					let bp3ac = allac.filter(x => !bpac.includes(x));	// there are three possible candidates
					console.log("next", bp3ac);

					// get the row/col we need to search
					if (row >= 0)
						var arr = Rows[row];
					else
						var arr = Cols[col];

					// search the row/col for a matching bivalue cell
					let cix = null;
					let acx = null;
					for (const ix of arr) {
						if (ix === cixi || ix === cixj) continue;	// skip the intersection cells
						if (bpsq === RCS[ix][2]) continue;			// cannot be in the intersection square
						if (cells[ix].value > 0) continue;
						acx = cells[ix].activecandidates;
						if (acx.length !== 2) continue;
						if (!includesAll(bp3ac, acx)) continue;
						cix = ix;
						break;
					}
					if (!cix) continue;	// no luck
					// we have an extra candidate, which is it
					let xc = bp3ac.filter(x => !acx.includes(x));	// there are three possible candidates
					let xc0 = [xc[0]]
					let xc1 = [xc[0]]
					bpac.forEach(c => xc0.push(c));	// combine extra candidate for target search
					acx.forEach(c => xc1.push(c));	// combine extra candidate for target search
					console.log("FOUND II", cixi, cixj, bpix, cix, xc, xc0, xc1, bp3ac, allac);

					// look for cells in the square containing any of the square bivalue candidates
					let tgtss = findTargetsInHouses(xc0, [-1,-1,bpsq], [cixi, cixj, cixk, bpix])
					// look for cells in the row/col containing any of the alternate bivalue candidates
					let house = row >= 0 ? [row,-1,-1] : [-1,col,-1];
					let tgtsrc = findTargetsInHouses(xc1, house, [cixi, cixj, cixk, cix])

					console.log("tgts", tgtss, xc0, tgtsrc, xc1);
					if (tgtss || tgtsrc) {
						let targets = tgtss ? [...tgtss] : [];
						if (tgtsrc) targets = [...targets, ...tgtsrc];
						let values = allac;
						let targetlist = [];
						if (tgtss) targetlist.push([tgtss, xc0]);
						if (tgtsrc) targetlist.push([tgtsrc, xc1]);

						let h = {
							type: 'sdc',
							rows: null,
							cols: null,
							square: null,
							cells0: [cixi, cixj, cixk],
							cells1: [bpix, cix],
							values: values,
							targets: targets,
							targetlist: targetlist,
							msg: `SuedeCoq II: Cells: ${targets}, Value: ${values}`
						}
						return [h];
					}
				}
			}
		}
	}

	return null;
}

//*****************************************************************************

function suedecoqI() {

	// look for base cells
	// two cells in the same square and same row/col with a total of four candidates
	//for (const sqarr of Squares) {
	for (let sqix=0; sqix<9; ++sqix) {
		let sqarr = Squares[sqix];
		// for each cell in the square
		for (let i=0; i<9; ++i) {
			let cixi = sqarr[i];
			if (cells[cixi].value > 0) continue;
			let aci = cells[cixi].activecandidates;
			if (aci.length > 4) continue;
			for (let j=i+1; j<9; ++j) {
				let cixj = sqarr[j];
				if (cells[cixj].value > 0) continue;
				let acj = cells[cixj].activecandidates;
				if (acj.length > 4) continue;
				let allcs = new Set();
				aci.forEach(c => allcs.add(c));
				acj.forEach(c => allcs.add(c));
				if (allcs.size > 4) continue;
				let allc = Array.from(allcs);
				let row = sameRow2(cixi, cixj);
				let col = sameCol2(cixi, cixj);
				if (row < 0 && col < 0) continue;

				//console.log("INTERSECTION", cixi, cixj, allc);
				// at this point we have an intersection
				// look for a bivalue cell in the square with at least one common candidate
				for (let k=0; k<9; ++k) {
					let cixk = sqarr[k];
					if (cells[cixk].value > 0) continue;
					let ack = cells[cixk].activecandidates;
					if (ack.length !== 2) continue;
					if (cixk === cixi || cixk === cixj) continue;
					if (row === RCS[cixk][0]) continue;
					if (col === RCS[cixk][1]) continue;

					let found = false;
					if ( includesAll(allc,ack)) {
						console.log("GOT1", cixi, cixj, cixk, ack, allc);
						var stvals = [...ack];	// the values of the square wing cell
						var wvals = allc.filter(c => !stvals.includes(c))
						//var rcvals = allc.filter(x => !ack.includes(x));
						var sqcells = [cixi, cixj, cixk];
						var wcells = [cixk];
						found = true;
					} else if (includesAny(allc, ack)) {
						// got a bivalue cell with one common candidate, which one is missing?
						var common = ack.filter(c => !allc.includes(c))
						console.log("MAYBE1", cixi, cixj, cixk, ack, allc, common);
						// look for a trivalue cell that contains the bivalue candidates
						for (let l=0; l<9; ++l) {
							let cixl = sqarr[l];
							if (cells[cixl].value > 0) continue;
							let acl = cells[cixl].activecandidates;
							if (acl.length !== 3) continue;
							if (!includesAll(acl, ack)) continue;
							if (cixl === cixi || cixl === cixj || cixl === cixk) continue;
							if (row === RCS[cixl][0]) continue;
							if (col === RCS[cixl][1]) continue;
							// get the odd candidate
							let ao = acl.filter(c => !ack.includes(c));
							var other = ao[0];
							if (!allc.includes(other)) continue;

							found = true;
							var stvals = [...ack, ...ao];	// all values of the square wing cells
							var wvals = allc.filter(c => !stvals.includes(c))
							//var rcvals = allc.filter(x => !ack.includes(x));
							var sqcells = [cixi, cixj, cixk, cixl];
							var wcells = [cixk, cixl];
							console.log("ALMOST1", cixi, cixj, cixk, cixl, ack, acl, allc, other, common);
						}
					}

					if (!found) continue;

					// at this point we have a valid intersection base
					// we need to see if there is a valid cell in the row/col
					console.log("SEARCH1", row, col, sqix, stvals, wvals)
					// get the row/col we need to search
					if (row >= 0)
						var rcarr = Rows[row];
					else
						var rcarr = Cols[col];

					// search the row/col for a matching bivalue cell
					let cix = null;
					let acx = null;
					for (const ix of rcarr) {
						if (ix === cixi || ix === cixj) continue;	// skip the intersection cells
						if (sqix === RCS[ix][2]) continue;			// cannot be in the intersection square
						if (cells[ix].value > 0) continue;
						acx = cells[ix].activecandidates;
						if (acx.length !== 2) continue;
						if (!includesAll(wvals, acx)) continue;
						cix = ix;
						break;
					}
					if (!cix) continue;	// no luck
					wcells.push(cix);
					console.log("CLOSER1", cixi, cixj, cixk, cix, sqcells, stvals, acx);

					// look for cells in the square containing any of the square  candidates
					let tgtss = findTargets(sqarr, stvals, sqcells)
					// look for cells in the row/col containing any of the rc candidates
					sqcells.push(cix);
					let tgtsrc = findTargets(rcarr, acx, sqcells)

					console.log("TARGETS1", tgtss, stvals, tgtsrc, acx, wcells);
					if (!tgtss && !tgtsrc) continue;

					let targets = tgtss ? [...tgtss] : [];
					if (tgtsrc) targets = [...targets, ...tgtsrc];
					let values = allc;
					let targetlist = [];
					if (tgtss) targetlist.push([tgtss, stvals]);
					if (tgtsrc) targetlist.push([tgtsrc, acx]);

					let h = {
						type: 'sdc',
						rows: null,
						cols: null,
						square: null,
						cells0: [cixi, cixj],
						cells1: wcells,
						values: values,
						targets: targets,
						targetlist: targetlist,
						msg: `SuedeCoq I: Cells: ${targets}, Value: ${values}`
					}
					return [h];

				}
			}
		}
	}

	return null;
}
