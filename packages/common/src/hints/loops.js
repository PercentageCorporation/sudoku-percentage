import { cellStore } from '@sudoku/common/store/store';
import { RCS, Rows } from '@sudoku/common/utilities/constants';
import { getCommonCandidates } from './hints';
import { canSeeEachOther, findTargetsSeenByAll, cellHasCandidate } from './hints';
import { getConjugatePairs, getBivaluePairs, findCommonConjugatePairs, findSeenConjugatePairs, findSeenBivaluePairs } from "./conjugates";

//*****************************************************************************
// common functions

let maxlevel = 0;
let chain = [];
let cpairs = [];
let bivals = [];

function findDuplicateLeaves(chain) {
	const seen = new Map();
	const duplicates = [];

	for (let i = 0; i < chain.length; ++i) {
		const link = chain[i];

		// Only examine leaves
		if (link[6].length !== 0) continue;

		// Identify the logical state of the leaf
		const key = JSON.stringify([
			link[0],  // cell
			link[2],  // candidate
			link[3],  // alternate candidate
			link[4]   // weak/strong
		]);

		if (seen.has(key)) {
			duplicates.push([seen.get(key), i]);
		} else {
			seen.set(key, i);
		}
	}

	return duplicates;
}

function alreadyLinked(clix, ep, value, type) {
	return chain[clix][6].some(ix => {
		const link = chain[ix];

		return link[0] === ep &&
		link[2] === value &&
		link[4] === type;
	});
}

// chain link: [ ep, ac, invalue, outvalue, 'sw', prev link, [next links]];
var prevj = 0;
function endpointsInPath(ep0, ep1, clix) {
	let j = clix;
	// check the forward links first
	let fw = chain[j][6];
	for (const f of fw) {
		if (chain[f][0] === ep0) return false;
		if (chain[f][0] === ep1) return false;
	}
	while (j >= 0) {
		prevj = j;
		let cp0 = chain[j][0];
		if (cp0 < 0 || cp0 > 80) console.log("********************", cp0);
		if (ep0 === cp0 || ep1 === cp0) return true;
		j = chain[j][5];
		if (j > prevj)  console.log("********************j", j);
	}
	return false;
}

function endpointInPath(ep, clix) {
	let j = clix;
	// check the forward links first
	let fw = chain[j][6];
	for (const f of fw) {
		if (chain[f][0] === ep) return false;
	}
	while (j >= 0) {
		prevj = j;
		let cp0 = chain[j][0];
		if (cp0 < 0 || cp0 > 80) console.log("********************", cp0);
		if (ep === cp0) return true;
		j = chain[j][5];
		if (j > prevj)  console.log("********************j", j);
	}
	return false;
}

function getCurrentPath(startix) {
	let path = [];
	let j = startix;
	// follow the path up
	while (j >= 0) {
		let linkj = chain[j];
		path.push(j);
		j = linkj[5];	// back up the chain
	}
	// long enough and odd number of links
	let plen = path.length;
	if (plen < 3 ) return [];

	path.reverse();
	let cpath = [];
	path.forEach((p) => {
		cpath.push([chain[p][0],chain[p][2],chain[p][3]]);
	})

	return cpath;
}

// link: [ ep, ac, incoming candidate, outgoing candidate, weak/strong, previous link,  [next links]]
function nextLink(clix, level) {
	let curlink = chain[clix];	// current link in the chain
	++level;
	if (level > maxlevel) maxlevel = level;

	if (level > 25 || chain.length > 5000) {
		console.log("Way too deep ********************", level, chain.length);
		console.log(chain[0]);
		console.log(curlink);
		//let sc = structuredClone(chain);
		//console.log(sc);
		return [];
	}

	//console.log("nextlink", clix, level, curlink[0]);

	let ep = curlink[0];	// incoming link endpoint
	let epac = curlink[1];	// candiates
	let epval = curlink[2];
	let wsin = curlink[4];	// weak/strong

	if (chain.length > 2) {
		if (curlink[4] === 's') {
			let startep = chain[0][0];
			let startval = chain[0][2];

			// check for ACI II
			if (startval !== epval) {
				// make sure the endpoints can see each other
				if (canSeeEachOther(ep, startep)) {
					let tgts = [];
					if (cellHasCandidate(ep, startval)) {
						tgts.push([ep,startval]);
					}
					if (cellHasCandidate(startep, epval)) {
						tgts.push([startep,epval]);
					}
					if (tgts.length > 0) {
						let path = getCurrentPath(clix);
						let aic2 = [startval, epval, startep, ep, tgts, path];
						let h = makeHint2(aic2);
						//console.log(aic2);
						//console.log(chain);
						return [h];
					}
				}
			}

			// check for AIC I
			if (startval === epval) {
				let ep0 = chain[0][0];
				// make sure the endpoints cannot see each other
				if (canSeeEachOther(ep0, ep)) {
					// check for AIC I Loop
					let com = getCommonCandidates(ep0, ep);
					if (com.length > 0) {
						let path = getCurrentPath(clix);
						let tgts = findLoopTargets(path);
						//console.log("aic1loop", sval, sep, epi, tgts, apath);
						if (tgts.length > 0) {
							let aic1l = [startval, epval, startep, ep, tgts, path];
							let h = makeLoopHint(aic1l);
							//console.log(aic1l);
							//console.log(chain);
							return [h];
						}
					}
				} else {	// cannot see each other
					// check for AIC I
					let val = chain[0][2];
					let tgts = findTargetsCorners(val, ep0, ep);
					if (tgts.length > 0) {
						let path = getCurrentPath(clix);
						let aic = [val, ep0, ep, tgts, path];
						let h = makeHint(aic);
						//console.log(aic);
						//console.log(chain);
						return [h];
					}
				}
			}
		}
	}

	let nextstrong = (wsin === 'w');	// if incoming link is weak, the next link must be strong
	// console.log("thislink", ep, clix, nextstrong, curlink)
	// if (ep === 8) {
	// 	console.log("************************************");
	// }

	if (nextstrong) {
		// if the next link must be strong it must be to a cp with a common endpoint and value
		let ccp = findCommonConjugatePairs(ep, epval);
		for (const cp of ccp) {
			//console.log("strong ccp", ccp);
			// cp: value, cep1, cpa, cpb]
			let cep = cp[1];
			let cac = cp[2][1];
			let lnkval = cp[0];
			if (!endpointInPath(cep, clix)) {
				// only one link since the previous link has an endpoint in common
				if (alreadyLinked(clix, cep, lnkval, 's')) continue;

				let nl = chain.length;
				let link = [cep, cac, lnkval, 0, 's', clix, [], 1, level];
				chain[clix][6].push(nl);
				chain.push(link);
				//console.log("pl1", link);
				let result = nextLink(nl, level);
				if (result.length > 0) return result;;
			}
		}

		// or if the current cell is bivalue it can be to the other bivalue candidate
		if (epac.length === 2) {
			let lnkval = (epval === epac[0]) ? epac[1] : epac[0];
			let nl = chain.length;
			if (!alreadyLinked(clix, ep, lnkval, 's')) {
				let link = [ep, epac, lnkval, epval, 's', clix, [], 2, level];
				chain[clix][6].push(nl);
				chain.push(link);
				//console.log("pl1", link);
				let result = nextLink(nl, level);
				if (result.length > 0) return result;;
			}
		}

	} else {
		// if the incoming link is strong, the next link can be either weak or strong
		// conjugate pairs or bivalue cells are valid next links for weak or strong

		let ccp = findCommonConjugatePairs(ep, epval);
		//console.log("weak ccp", ep, lac, ccp);
		// strong link to next endpoint
		for (const cp of ccp) {
			// cp: value, cep1, cpa, cpb]
			let cep0 = cp[2][0];
			let cac0 = cp[2][1];
			let cep1 = cp[3][0];
			let cac1 = cp[3][1];
			let lnkval = cp[0];
			//console.log("ccp", ep, cep, lac, cp);
			if (!endpointsInPath(cep0, cep1, clix)) {
				//console.log("ccp", ep, cep, lac, cp);
				// the next link is the other endpoint of the cp
				if (alreadyLinked(clix, cep0, lnkval, 's')) continue;

				let nl = chain.length;
				chain[clix][6].push(nl);
				let link = [cep0, cac0, epval, 0, 'w', clix, [], 3, level];
				chain.push(link);

				link = [cep1, cac1, lnkval, 0, 's', nl, [], 5];
				chain.push(link);

				let result = nextLink(nl+1, level);
				if (result.length > 0) return result;;
			}
		}

		// or we can look for a weak link to a strong link such as a cp or bv
		let scp = findSeenConjugatePairs(ep, [epval] );
		//console.log("weak scp", ep, epval, scp);
		//console.log("ccp", ccp);
		// weak link to strong link
		for (const cp of scp) {
			// cp: value, cep1, cpa, cpb]
			let cep0 = cp[2][0];
			let cac0 = cp[2][1];
			let cep1 = cp[3][0];
			let cac1 = cp[3][1];
			let lnkval = cp[0];
			if (!endpointsInPath(cep0, cep1, clix)) {
				//console.log("scp", ep, cep0, cep1, lac, cp);
				// adding two links for the pair
				if (alreadyLinked(clix, cep0, epval, 'w')) continue;

				let nl = chain.length;
				let link = [cep0, cac0, epval, 0, 'w', clix, [nl+1], 4, level];
				chain[clix][6].push(nl);
				chain.push(link);
				//console.log("pl3a", link);

				link = [cep1, cac1, lnkval, 0, 's', nl, [], 5, level];
				chain.push(link);
				//console.log("pl3b", link);
				let result = nextLink(nl+1, level);
				if (result.length > 0) return result;;
			}
		}

		// or we can look for a weak link to a bivalue pair
		let sbv = findSeenBivaluePairs(ep, epval);
		//console.log("sbv", ep, epval, sbv);
		for (const bv of sbv) {
			let bep = bv[1];
			//console.log("sbv1", ep, bep, epval, sbv);
			if (!endpointInPath(bep, clix)) {
				let val = bv[0];
				let bac = bv[2];
				let lnkval = (bac[0] === val) ? bac[1] : bac[0];	// get other candidate
				let altval = (bac[0] === epval) ? bac[1] : bac[0];
				if (alreadyLinked(clix, bep, val, 'w')) continue;

				// create an incoming weak link to a strong link
				let nl = chain.length;
				let link = [bep, bac, val, epval, 'w', clix, [nl+1], 6, level];
				chain[clix][6].push(nl);
				chain.push(link);
				//console.log("pl3a", link);

				link = [bep, bac, lnkval, altval, 's', nl, [], 7, level];
				chain.push(link);
				//console.log("pl3b", link);

				let result = nextLink(nl+1, level);
				if (result.length > 0) return result;;
			}
		}
	}

	return [];

}


//*****************************************************************************
// loops AIC Type 1


// chain: [ ep, ac, incoming candidate, outgoing candidate, incoming link weak/strong, previous link,  [next links]]]
// cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
export function loops() {
	let  loops = [];
	cpairs = getConjugatePairs();
	//cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
	//console.log("cpairs", cpairs);

	bivals = getBivaluePairs();
	//console.log("bivals", bivals);
	// we need to start with a strong link so we might as well use a bivalue cell
	// for each bivalue cell start the chains with their candidates
	// bv: [ cix, [ac]]
	let  bvlen = bivals.length;
	for (let  bv=0; bv<bvlen; ++bv) {
		let  bp = bivals[bv];
		let  bvep = bp[0]
		let  bvac = bp[1];
		// make the first link
		//console.log("bv0start", bp);
		chain = [];	// reset the chain
		maxlevel = 0;
		let link = [bvep, bvac,  bvac[0], 0, 'x', -1, [1]];
		chain.push(link);
		link = [bvep, bvac,  bvac[1], bvac[0], 's', 0, []];
		chain.push(link);
		loops = nextLink(1, 0);
		if (loops.length > 0) {
			console.log("bchain0", chain.length, maxlevel);
			return loops;
		}

		// make the alternate link
		//console.log("bv1start", bp);
		chain = [];	// reset the chain
		maxlevel = 0;
		link = [bvep, bvac,  bvac[1], 0, 'x', -1, [1]];
		chain.push(link);
		link = [bvep, bvac,  bvac[0], bvac[1], 's', 0, []];
		chain.push(link);
		loops = nextLink(1, 0);
		if (loops.length > 0) {
			console.log("bchain1", chain.length, maxlevel);
			return loops;
		}
	}

	// we need to start with a strong link so we might as well use a cp
	// for each conjugate pair start the chains with their endpoints
	let cvplen = cpairs.length;
	for (let cv=0; cv<cvplen; ++cv) {
		let cp = cpairs[cv];
		//console.log("cp", cp);
		// pick a starting endpoint

		let valstart = cp[0];  // starting value for which there is only one in a conjugate pair
		let sep0 = cp[1][0];
		let sac0 = cp[1][1]
		let sep1 = cp[2][0];
		let sac1 = cp[2][1];

		// make the first link
		chain = [];	// reset the chain
		maxlevel = 0;
		let link = [sep0, sac0,  valstart, 0, 'x', -1, [1]];
		chain.push(link);
		link = [sep1, sac1,  valstart, 0, 's', 0, []];
		chain.push(link);
		loops = nextLink(1, 0);
		if (loops.length > 0) {
			console.log("chain0", cv, chain.length, maxlevel);
			return loops;
		}
		//console.log(chain);

		// make the alternate link
		//console.log("cp1start", cp);
		chain = [];	// reset the chain
		maxlevel = 0;
		link = [sep1, sac1,  valstart, 0, 'x', -1, [1]];
		chain.push(link);
		link = [sep0, sac0,  valstart, 0, 's', 0, []];
		chain.push(link);
		loops = nextLink(1, 0);
		if (loops.length > 0) {
			console.log("chain1", cv, chain.length, maxlevel);
			return loops;
		}
		//console.log(chain);
	}

	return null
}

function findLoopTargets(path) {
	let targets = [];
	let plen = path.length;
	for (let i=1; i<plen-1; i+=2) {
		let pi = path[i];
		let pj = path[i+1];
		let val = pj[1];
		let epi = pi[0];
		let epj = pj[0];
		let cls = [epi, epj];
		if (epi === epj) {
			// weak link within a cell, eliminate the alternate candidates
			let wvals = [pi[1],pj[1]];
			let eac = cellStore.getState().actions.getActiveCandidates(epi);
			let tac = eac.filter(ac => !wvals.includes(ac));
			//console.log("tc", epi, wvals, eac, tac)
			if (tac.length > 0) targets.push([[epi], tac]);
		} else {
			let tgts = findTargetsSeenByAll(val, cls, cls);
			//console.log("tp", epi, epj, val, tgts)
			if (tgts) targets.push([tgts,[val]]);
		}
	}
	// do the endpoints
	let eps =path[0][0];
	let epe = path[plen-1][0];
	let val = path[0][1];
	let cls = [eps, epe];
	let tgts = findTargetsSeenByAll(val, cls, cls);
	//console.log("tep", eps, epe, val, tgts)
	if (tgts) targets.push([tgts,[val]]);

	return targets;
}

function findTargetsCorners(val, c0, c1) {
	let tgts = [];
	let rcs0 = RCS[c0];
	let rcs1 = RCS[c1];
	let t0 = Rows[rcs0[0]][rcs1[1]];
	let t1 = Rows[rcs1[0]][rcs0[1]];
	if (t0 === c0 || t0 === c1 || t1 === c0 || t1 === c1) return [];

	if (cellHasCandidate(t0, val)) tgts.push(t0);
	if (cellHasCandidate(t1, val)) tgts.push(t1);
	return tgts;
}

function makeHint(aic) {
	// aic: sval, sep, epi, tgts, apath
	let val = aic[0];
	let ep0 = aic[1];
	let ep1 = aic[2];
	let tgts = aic[3];

	let fullpath = [];
	let parity1 = [];
	let parity2 = [];
	// collect the alternating link cells and the full path
	let tf = false;
	aic[4].forEach((px) => {
		fullpath.push(px[0]);
		if (tf)
			parity2.push(px[0]);
		else
			parity1.push(px[0]);
		tf = !tf;
	})

	// if targets are in the chain I think something is wrong
	//if (val === 2) continue; // TEST
	//console.log("aic", fullpath);;
	//console.log("path", p);

	let h = {
		type: 'aicI',
		rows: null,
		cols: null,
		square: null,
		cells: [ep0, ep1],
		parity1: parity1,
		parity2: parity2,
		values: [val],
		targets: tgts,
		targetlist: null,
		targetcells: null,
		msg: `AIC I: Cells: ${tgts}, Value: ${val}`
	}

	return h;
}

function makeHint2(aic2) {
	// aic2: startval, epval, startep, ep, tgts, path
	//console.log("aic2", aic2);
	let ep0 = aic2[2];
	let ep1 = aic2[3];
	let targets = aic2[4];
	let path = aic2[5];

	// collect the alternating link cells and the full path
	let fullset = new Set();
	path.forEach(p => fullset.add(p[0]));
	let fullpath = Array.from(fullset);;
	let parity1 = [];
	let parity2 = [];

	let tf = false;
	fullpath.forEach((p) => {
		if (tf)
			parity2.push(p);
		else
			parity1.push(p);
		tf = !tf;
	})

	// get a list of the target cells
	let tgtslist = [];
	let tgts = [];
	let values = [];
	targets.forEach(t => {
		tgtslist.push([[t[0]],[t[1]]]);
		tgts.push(t[0]);
		values.push(t[1]);
	})

	let h = {
		type: 'aicII',
		rows: null,
		cols: null,
		square: null,
		cells: [ep0, ep1],
		parity1: parity1,
		parity2: parity2,
		values: values,
		targets: tgts,
		targetlist: tgtslist,
		targetcells: null,
		msg: `AIC II: Cells: ${tgts}, Value: ${values}`
	}

	return h;
}

function makeLoopHint(aic) {
	// aic: startval, epval, startep, ep, tgts, path];
	//console.log("aic1l", aic);
	let ep0 = aic[2];
	let ep1 = aic[3];
	let tgtslist = aic[4];
	let path = aic[5];

	// collect the alternating link cells and the full path
	let fullset = new Set();
	path.forEach(p => fullset.add(p[0]));
	let fullpath = Array.from(fullset);;
	let parity1 = [];
	let parity2 = [];

	let tf = false;
	fullpath.forEach((p) => {
		if (tf)
			parity2.push(p);
		else
			parity1.push(p);
		tf = !tf;
	})

	// get a list of the target cells
	let tgts = [];
	tgtslist.forEach(t => tgts.push(...t[0]));
	tgts.sort();

	let valset = new Set();
	tgtslist.forEach(t => t[1].forEach(valset.add, valset));
	let values = Array.from(valset);
	values.sort();

	let h = {
		type: 'aicIloop',
		rows: null,
		cols: null,
		square: null,
		cells: [ep0, ep1],
		parity1: parity1,
		parity2: parity2,
		targetlist: tgtslist,
		targetcells: null,
		targets: tgts,
		values: values,
		msg: `AIC I Loop: Cells: ${tgts}, Value: ${values}`
	}

	//console.log("loophint", h);

	return h;
}
