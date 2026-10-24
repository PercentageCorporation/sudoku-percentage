import { cellStore } from '@sudoku/common/store/store';
import { RCS, Rows } from '@sudoku/common/utilities/constants';
import { getCommonCandidates } from './hints';
import { canSeeEachOther, findTargetsSeenByAll, cellHasCandidate } from './hints';
import { getConjugatePairs, getBivaluePairs, findCommonConjugatePairs, findSeenConjugatePairsWithVals, findSeenBivaluePairs } from "./conjugates";

//*****************************************************************************
// common functions

let chain = [];
let cpairs = [];
let bivals = [];

// chain link: [ ep, ac, invalue, outvalue, 'sw', prev link, [next links]];
var prevj = 0;
function endpointsInPath(ep0, ep1, clix) {

	let j = clix;
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


// link: [ ep, ac, incoming candidate, outgoing candidate, weak/strong, previous link,  [next links]]
function nextLink(clix) {
	console.log("nextlink", clix)
	if (chain.length > 2) {
		let paths = getAICPaths(chain);
		let loops = processPaths(paths);
		if (loops.length > 0) {
			console.log("********************");
			console.log(loops);
			return loops;
		}
	}

	//if (clix > 20) return;
	let curlink = chain[clix];	// current link in the chain
	let ep = curlink[0];	// incoming link endpoint
	let epac = curlink[1];	// candiates
	let epval = curlink[2];
	let bvval = curlink[3];	// incoming bivalue alternate candidate
	let wsin = curlink[4];	// weak/strong
	let nextstrong = (wsin === 'w');	// if incoming link is weak, the next link must be strong
	// console.log("thislink", ep, clix, nextstrong, curlink)
	// if (ep === 8) {
	// 	console.log("************************************");
	// }

	if (nextstrong) {
		// if the next link must be strong it must be to a cp with a common endpoint and value (or to the other candidate of a bv)
		let ccp = findCommonConjugatePairs(ep, [epval]);
		for (const cp of ccp) {
			//console.log("strong ccp", ccp);
			// cp: value, cep1, cpa, cpb]
			let cep0 = cp[2][0];
			let cac0 = cp[2][1];
			let lnkval = cp[0];
			if (!endpointInPath(cep0, clix)) {
				// only one link since the previous link has an endpoint in common
				let nl = chain.length;
				let link = [cep0, cac0, lnkval, 0, 's', clix, []];
				chain[clix][6].push(nl);
				chain.push(link);
				//console.log("pl1", link);
				let result = nextLink(nl);
				if (result.length > 0) return result;;
			}
		}
	} else {
		// if the incoming link is strong, the next link can be either weak or strong
		// conjugate pairs or bivalue cells are valid next links for weak or strong

		// look for links to common conjugate pairs which can be treaded as weak
		let lac = epac.filter(ac => (ac !== epval && ac !== bvval));	// next link cannot include incoming value

		//console.log("lac", lac);
		let ccp = findCommonConjugatePairs(ep, lac);
		//console.log("weak ccp", ep, lac, ccp);
		// strong link to next endpoint
		for (const cp of ccp) {
			// cp: value, cep1, cpa, cpb]
			let cep = cp[1];	// next endpoint
			let cac = cp[2][1];
			let lnkval = cp[0];
			//console.log("ccp", ep, cep, lac, cp);
			if (!endpointInPath(cep, clix)) {
				//console.log("ccp", ep, cep, lac, cp);
				// the first link is to the alternate candidate in the same cell
				let nl = chain.length;
				chain[clix][6].push(nl);
				let link = [ep, epac, lnkval, 0, 'w', clix, [nl+1]];
				chain.push(link);

				// the next link is the other endpoint of the cp
				link = [cep, cac, lnkval, 0, 's', nl, []];
				chain.push(link);

				//console.log("pl2", clix, nl, link);
				//console.log("pl2", chain[clix]);
				let result = nextLink(nl);
				if (result.length > 0) return result;;
			}
		}

		// or we can look for a weak link to a strong link such as a cp or bv
		let scp = findSeenConjugatePairsWithVals(ep, [epval] );
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
				let nl = chain.length;
				let link = [cep0, cac0, epval, 0, 'w', clix, [nl+1]];
				chain[clix][6].push(nl);
				chain.push(link);
				//console.log("pl3a", link);

				link = [cep1, cac1, lnkval, 0, 's', nl, []];
				chain.push(link);
				//console.log("pl3b", link);
				let result = nextLink(nl);
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
				// create an incoming weak link to a strong link
				let nl = chain.length;
				let link = [bep, bac, val, epval, 'w', clix, [nl+1]];
				chain[clix][6].push(nl);
				chain.push(link);
				//console.log("pl3a", link);

				link = [bep, bac, lnkval, val, 's', nl, []];
				chain.push(link);
				//console.log("pl3b", link);

				let result = nextLink(nl);
				if (result.length > 0) return result;;
			}
		}
	}

	return [];

}

// construct the list of path cells from the links
// going from bottom up
// chain: [ [ ep, ac, inval, outval, linktype, prev link, [next links] ] ]
function getAICPaths(chain) {
	// link: [ val, cix, prevlink, [nextlinks] ]
	let paths = [];
	let end = chain.length - 1;
	if (end === 0) return paths;

	let startval = chain[0][2]

	for (let i=end; i >= 0; --i) {
		// find the first link with the start value
		if (chain[i][6].length > 0) continue;
		//if (chain[i][2] !== startval) continue;	// the end must match the start
		//console.log("endchain", i, startval);
		let path = [];
		// follow the path up
		let j = i;
		while (j >= 0) {
			let linkj = chain[j];
			path.push(j);
			j = linkj[5];	// back up the chain
			//console.log("prev link", j);
		}
		// long enough and odd number of links
		let plen = path.length;
		if (plen >= 3) {
			// check if the endpoint values match
			path.reverse();
			let cpath = [];
			path.forEach((p) => {
				cpath.push([chain[p][0],chain[p][2],chain[p][3]]);
			})
			paths.push(cpath);
		}
	}

	return paths;
}

//*****************************************************************************
// loops AIC Type 1


// chain: [ ep, ac, incoming candidate, outgoing candidate, incoming link weak/strong, previous link,  [next links]]]
// cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
export function loops() {
	let  loops = [];
	cpairs = getConjugatePairs();
	//cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
	console.log("cpairs", cpairs);

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
		let link = [bvep, bvac,  bvac[0], 0, 'x', -1, [1]];
		chain.push(link);
		link = [bvep, bvac,  bvac[1], bvac[0], 's', 0, []];
		chain.push(link);
		//loops = nextLink(1);
		console.log("bchain0", chain.length);

		//let pathsa = getAICPaths(chain);
		//allpaths.push.apply(allpaths, pathsa);
		//console.log("pathsa", bvep, bvac[0], pathsa.length);
		//console.log("bv0end", pathsa.length);
		//loops = processPaths(pathsa);
		if (loops.length > 0) return loops;

		// make the alternate link
		//console.log("bv1start", bp);
		chain = [];	// reset the chain
		link = [bvep, bvac,  bvac[1], 0, 'x', -1, [1]];
		chain.push(link);
		link = [bvep, bvac,  bvac[0], bvac[1], 's', 0, []];
		chain.push(link);
		//loops = nextLink(1);
		console.log("bchain1", chain.length);

		//let pathsb = getAICPaths(chain);
		//allpaths.push.apply(allpaths, pathsb);
		//console.log("pathsb", bvep, bvac[1], pathsb.length);
		//console.log("bv1end", pathsb.length);

		//loops = processPaths(pathsb);
		if (loops.length > 0) return loops;
	}

	// we need to start with a strong link so we might as well use a cp
	// for each conjugate pair start the chains with their endpoints
	let cvplen = cpairs.length;
	for (let cv=0; cv<cvplen; ++cv) {
		if (cv !== 29) continue;	// TEST
		let cp = cpairs[cv];
		//console.log("cp", cp);
		// pick a starting endpoint

		let valstart = cp[0];  // starting value for which there is only one in a conjugate pair
		//if (valstart !== 5) continue;	// TEST
		let sep0 = cp[1][0];
		let sac0 = cp[1][1]
		let sep1 = cp[2][0];
		let sac1 = cp[2][1];

		//if (sep0 !== 75 && sep1 !== 75) continue;	// TEST
		//if (sep1 !== 75) continue;	// TEST
		// make the first link
		//console.log("cp0start", cp);
		chain = [];	// reset the chain
		let link = [sep0, sac0,  valstart, 0, 'x', -1, [1]];
		chain.push(link);
		link = [sep1, sac1,  valstart, 0, 's', 0, []];
		chain.push(link);
		loops = nextLink(1);
		console.log("chain0", cv, chain.length);

		//let pathsa = getAICPaths(chain);
		//allpaths.push.apply(allpaths, pathsa);
		//console.log("pathsa", sep0, pathsa.length);
		//console.log("cp0end", pathsa.length);
		//loops = processPaths(pathsa);
		if (loops.length > 0) return loops;

		// make the alternate link
		//console.log("cp1start", cp);
		chain = [];	// reset the chain
		link = [sep1, sac1,  valstart, 0, 'x', -1, [1]];
		chain.push(link);
		link = [sep0, sac0,  valstart, 0, 's', 0, []];
		chain.push(link);
		loops = nextLink(1);
		console.log("chain1", cv, chain.length);

		//let pathsb = getAICPaths(chain);
		//allpaths.push.apply(allpaths, pathsb);
		//console.log("pathsb", sep1, pathsb.length);
		//console.log("cp1end", pathsb.length);
		//loops = processPaths(pathsb);
		if (loops.length > 0) return loops;
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
	if (cellHasCandidate(t0, val)) tgts.push(t0);
	if (cellHasCandidate(t1, val)) tgts.push(t1);
	return tgts;
}

// aic chain with value matching endpoints that cannot see each other
function findAIC_I(path) {
	let aic1 = [];

	let sep = path[0][0];
	let sval = path[0][1];
	let end = path.length - 1;
	// back up from the end looking for the start value
	for (let i=end; i>3; i-=2) {
		if (path[i][1] === sval) {
			let epi = path[i][0];
			// make sure the endpoints cannot see each other
			if (!canSeeEachOther(sep, epi)) {
				let tgts = findTargetsCorners(sval, sep, epi);
				let apath = path.slice(0, i+1);
				//console.log("aic1", sval, sep, epi, tgts, apath);
				if (tgts.length > 0) {
					aic1.push([sval, sep, epi, tgts, apath]);
				}
			}
		}
	}
	if (aic1.length === 0) return null;
	return aic1;
}

// aic chain with different value endpoints that can see each other
function findAIC_II(path) {
	let aic2 = [];

	let sep = path[0][0];
	let sval = path[0][1];
	let end = path.length - 1;
	// back up from the end looking for the start value
	for (let i=end; i>3; i-=2) {
		// start/end values cannot match
		if (path[i][1] !== sval) {
			let epi = path[i][0];
			// make sure the endpoints can see each other
			if (canSeeEachOther(sep, epi)) {
				let endval = path[i][1];
				let tgts = [];
				if (cellHasCandidate(sep, endval)) {
					tgts.push([[sep],[endval]]);
				}
				if (cellHasCandidate(epi, sval)) {
					tgts.push([[epi],[sval]]);
				}
				let apath = path.slice(0, i+1);
				//console.log("aic2", sval, sep, epi, tgts, apath);
				if (tgts.length > 0) {
					aic2.push([sval, sep, epi, tgts, apath]);
				}
			}
		}
	}
	if (aic2.length === 0) return null;
	return aic2;
}

// aic chain with value matching endpoints that can see each other and share a candidate
function findAIC_I_Loop(path) {
	let aic1l = [];

	let sep = path[0][0];
	let sval = path[0][1];
	let end = path.length - 1;
	// back up from the end looking for the start value
	for (let i=end; i>3; i-=2) {
		if (path[i][1] === sval) {
			let epi = path[i][0];
			// if the endpoints can see each other and have a common candidate
			if (canSeeEachOther(sep, epi)) {
				let com = getCommonCandidates(sep, epi);
				if (com.length > 0) {
					let apath = path.slice(0, i+1);
					let tgts = findLoopTargets(apath);
					//console.log("aic1loop", sval, sep, epi, tgts, apath);
					if (tgts.length > 0) {
						aic1l.push([sval, sep, epi, tgts, apath]);
					}
				}
			}
		}
	}
	if (aic1l.length === 0) return null;
	return aic1l;
}

function processPaths(paths) {
	let loophints = [];
	let hints = [];
	for (let ap=0; ap<paths.length; ++ap) {
		let p = paths[ap]
		//console.log("patha", p);

		let aic1loop = findAIC_I_Loop(p);
		if (aic1loop) {
			//console.log("ppaic1Loop", ap, aic1loop);
			loophints.push(makeLoopHint(aic1loop[0]));
			return loophints;
		}

		let aic2 = findAIC_II(p);
		if (aic2) {
			//console.log("ppaic2", ap, aic2);
			hints.push(makeHint2(aic2[0]));
			return hints;
		}
	}

	// we don't need long paths any more so save the shortest
	//let spaths = filterShortest(paths);
	let spaths = paths;
	//console.log(paths.length, spaths.length, spaths);

	for (let ap=0; ap<spaths.length; ++ap) {
		let p = spaths[ap]
		//console.log("pathb", p);
		let aic1 = findAIC_I(p);
		if (aic1) {
			//console.log("ppaic1", ap, aic1);
			hints.push(makeHint(aic1[0]));
			return hints;
		}

	}

	//console.log("loophints", loophints);
	if (loophints.length > 0) return loophints;
	//console.log("hints", hints);
	return hints;

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
		msg: `AIC I: Cells: ${tgts}, Value: ${val}`
	}

	return h;
}

function makeHint2(aic) {
	// aic: sval, sep, epi, tgts, apath
	console.log("aic2", aic);
	let ep0 = aic[1];
	let ep1 = aic[2];
	let tgtslist = aic[3];

	// collect the alternating link cells and the full path
	let fullset = new Set();
	aic[4].forEach(p => fullset.add(p[0]));
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
		msg: `AIC II: Cells: ${tgts}, Value: ${values}`
	}

	return h;
}

function makeLoopHint(aic) {
	// aic: sval, sep, epi, tgts, apath
	let ep0 = aic[1];
	let ep1 = aic[2];
	let tgtslist = aic[3];

	// collect the alternating link cells and the full path
	let fullset = new Set();
	aic[4].forEach(p => fullset.add(p[0]));
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
		values: values,
		targets: tgts,
		targetlist: tgtslist,
		msg: `AIC I Loop: Cells: ${tgts}, Value: ${values}`
	}

	//console.log("loophint", h);

	return h;
}
