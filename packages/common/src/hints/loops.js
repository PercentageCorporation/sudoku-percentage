import { RCS, Rows } from '@sudoku/common/utilities/constants';
import { getCommonCandidates } from './hints';
import { canSeeEachOther, findTargetsSeenByAll, cellHasCandidate } from './hints';
import { getConjugatePairs, getBivaluePairs } from "./conjugates";
import { cellStore } from '@sudoku/common/store/store';

//*****************************************************************************
// common functions

let chain = [];
let chain1 = [];
let cpairs = [];
let bivals = [];

// find cpairs of same value with common endpoint
// bival: [ cix, [ac]] ]
//
function findCommonBivalueCell(ep, eprcs, value) {
	var bvp = [];
	// for each conjugate pair start the chains with their endpoints
	var bvplen = bivals.length;
	for (var bv=0; cv<bvplen; ++bv) {
		var bp = bivals[bv];
		var bep = bp[0];
		if (ep === bep) continue;	// skip ourselves
		if (!bp[1].includes(value)) continue;

		var valout = bp[1][0] === value ? bp[1][1] : bp[1][0];

	}
	return bvp;
}

// chain link: [ ep, ac, invalue, outvalue, 'sw', prev link, [next links]];

function endpointsInPath(ep0, ep1) {
	var j = chain1.length - 1;
	while (j >= 0) {
		var cp0 = chain1[j][0];
		if (ep0 === cp0 || ep1 === cp0) return true;
		j = chain1[j][5];
	}
	return false;
}

function endpointInPath(ep) {
	var j = chain1.length - 1;
	while (j >= 0) {
		var cp0 = chain1[j][0];
		if (ep === cp0) return true;
		j = chain1[j][5];
	}
	return false;
}

function inCommonHouse(rcs0, rcs1) {
	if (rcs0[0] > 0 && rcs1[0] > 0 && rcs0[0] === rcs1[0]) return true;
	if (rcs0[1] > 0 && rcs1[1] > 0 && rcs0[1] === rcs1[1]) return true;
	if (rcs0[2] > 0 && rcs1[2] > 0 && rcs0[2] === rcs1[2]) return true;
	return false;
}

// do the cells share a house
function getCommonHouse(c0, c1) {
	var rcs = [-1,-1,-1];
	var rcs0 = RCS[c0];
	var rcs1 = RCS[c1];
	if (rcs0[0] === rcs1[0]) rcs[0] = rcs0[0];
	if (rcs0[1] === rcs1[1]) rcs[1] = rcs0[1];
	if (rcs0[2] === rcs1[2]) rcs[2] = rcs0[2];
	if (rcs[0] === -1 && rcs[1] === -1 && rcs[2] === -1) return null;
	return rcs;
}

// find cpairs of same value with common endpoint
// cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
function findCommonConjugatePairs(ep, vals) {
	var ccp = [];
	// for each conjugate pair start the chains with their endpoints
	var cvplen = cpairs.length;
	for (var cv=0; cv<cvplen; ++cv) {
		var cp = cpairs[cv];
		var value = cp[0];
		if (!vals.includes(value)) continue;
		var cep0 = cp[1][0];
		var cep1 = cp[2][0];
		if (ep === cep0) {
			ccp.push([value, cep1, cp[1], cp[2]]);
		} else if (ep === cep1) {
			ccp.push([value, cep0, cp[2], cp[1]]);
		}
	}
	return ccp;
}

// find cpairs of a vaue contained in vals, with an endpoint that can be seen
// cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
function findSeenConjugatePairs(ep, vals) {
	var ccp = [];
	// for each conjugate pair start the chains with their endpoints
	var cvplen = cpairs.length;
	for (var cv=0; cv<cvplen; ++cv) {
		var cp = cpairs[cv];
		var value = cp[0];
		if (!vals.includes(value)) continue;
		//var numvals = vals.length;
		var cep0 = cp[1][0];
		var cep1 = cp[2][0];
		// no endpoints in common
		if (ep === cep0  || ep === cep1) continue;	// skip ourselves
		// try for a weak link to a strong link
		if (canSeeEachOther(ep, cep0)) {
			ccp.push([value, cep0, cp[1], cp[2]]);
		} else if (canSeeEachOther(ep, cep1)) {
			ccp.push([value, cep1, cp[2], cp[1]]);
		}
	}
	return ccp;
}

// find bv pairs of a vaule, that can be seen
// bivals: [ [cix0, [ac0]], ... ]
function findSeenBivaluePairs(ep, value) {
	var bvp = [];
	// for each bivalue pair
	var blen = bivals.length;
	for (var b=0; b<blen; ++b) {
		var bv = bivals[b];
		var bep = bv[0];
		var bac = bv[1];
		if (ep === bep) continue;	// skip ourselves
		if (!bac.includes(value)) continue;

		// try for a weak link to a strong link
		if (canSeeEachOther(ep, bep)) {
			bvp.push([value, bep, bac]);
		}
	}
	return bvp;
}

// link: [ ep, ac, incoming candidate, outgoing candidate, weak/strong, previous link,  [next links]]
function nextLink(clix) {
	//if (clix > 20) return;
	let curlink = chain1[clix];	// current link in the chain
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
		ccp.forEach((cp) => {
			//console.log("strong ccp", ccp);
			// cp: value, cep1, cpa, cpb]
			let cep0 = cp[2][0];
			let cac0 = cp[2][1];
			let lnkval = cp[0];
			if (!endpointInPath(cep0)) {
				// only one link since the previous link has an endpoint in common
				let nl = chain1.length;
				let link = [cep0, cac0, lnkval, 0, 's', clix, []];
				chain1[clix][6].push(nl);
				chain1.push(link);
				//console.log("pl1", link);
				nextLink(nl);
			}
		})
	} else {
		// if the incoming link is strong, the next link can be either weak or strong
		// conjugate pairs or bivalue cells are valid next links for weak or strong

		// look for links to common conjugate pairs which can be treaded as weak
		let lac = epac.filter(ac => (ac !== epval && ac !== bvval));	// next link cannot include incoming value

		//console.log("lac", lac);
		let ccp = findCommonConjugatePairs(ep, lac);
		//console.log("weak ccp", ep, lac, ccp);
		// strong link to next endpoint
		ccp.forEach((cp) => {
			// cp: value, cep1, cpa, cpb]
			let cep = cp[1];	// next endpoint
			let cac = cp[2][1];
			let lnkval = cp[0];
			//console.log("ccp", ep, cep, lac, cp);
			if (!endpointInPath(cep)) {
				//console.log("ccp", ep, cep, lac, cp);
				// the first link is to the alternate candidate in the same cell
				let nl = chain1.length;
				chain1[clix][6].push(nl);
				let link = [ep, epac, lnkval, 0, 'w', clix, [nl+1]];
				chain1.push(link);

				// the next link is the other endpoint of the cp
				link = [cep, cac, lnkval, 0, 's', nl, []];
				chain1.push(link);

				//console.log("pl2", clix, nl, link);
				//console.log("pl2", chain1[clix]);
				nextLink(nl+1);
			}
		})

		// or we can look for a weak link to a strong link such as a cp or bv
		let scp = findSeenConjugatePairs(ep, [epval] );
		//console.log("weak scp", ep, epval, scp);
		//console.log("ccp", ccp);
		// weak link to strong link
		scp.forEach((cp) => {
			// cp: value, cep1, cpa, cpb]
			let cep0 = cp[2][0];
			let cac0 = cp[2][1];
			let cep1 = cp[3][0];
			let cac1 = cp[3][1];
			let lnkval = cp[0];
			if (!endpointsInPath(cep0, cep1)) {
				//console.log("scp", ep, cep0, cep1, lac, cp);
				// adding two links for the pair
				let nl = chain1.length;
				let link = [cep0, cac0, epval, 0, 'w', clix, [nl]];
				chain1[clix][6].push(nl);
				chain1.push(link);
				//console.log("pl3a", link);

				link = [cep1, cac1, lnkval, 0, 's', nl, []];
				chain1.push(link);
				//console.log("pl3b", link);
				nextLink(nl+1);
			}
		})

		// or we can look for a weak link to a bivalue pair
		let sbv = findSeenBivaluePairs(ep, epval);
		//console.log("sbv", ep, epval, sbv);
		sbv.forEach((bv) => {
			let bep = bv[1];
			//console.log("sbv1", ep, bep, epval, sbv);
			if (!endpointInPath(bep)) {
				let val = bv[0];
				let bac = bv[2];
				let lnkval = (bac[0] === val) ? bac[1] : bac[0];	// get other candidate
				// create an incoming weak link to a strong link
				let nl = chain1.length;
				let link = [bep, bac, val, epval, 'w', clix, [nl]];
				chain1[clix][6].push(nl);
				chain1.push(link);
				//console.log("pl3a", link);

				link = [bep, bac, lnkval, val, 's', nl, []];
				chain1.push(link);
				//console.log("pl3b", link);

				let c1 = structuredClone(chain1);
				//console.log("sbv", bep, bac, sbv, c1);

				nextLink(nl+1);

			}
		})
	}

	//console.log("NL RETURN");

}

function filterShortest(arrays) {
	const map = new Map();

	for (const arr of arrays) {
		const start = arr[0][0];
		const end = arr[arr.length - 1][0];

		const key = start < end
		? `${start},${end}`
		: `${end},${start}`;

		if (!map.has(key) || arr.length < map.get(key).length) {
			map.set(key, arr);
		}
	}

	return [...map.values()];
}

// construct the list of path cells from the links
// going from bottom up
// chain: [ [ ep, ac, inval, outval, linktype, prev link, [next links] ] ]
function getAICPaths(chain1) {
	// link: [ val, cix, prevlink, [nextlinks] ]
	let paths = [];
	let end = chain1.length - 1;
	if (end === 0) return paths;

	let startval = chain1[0][2]

	for (let i=end; i >= 0; --i) {
		// find the first link with the start value
		if (chain1[i][6].length > 0) continue;
		//if (chain1[i][2] !== startval) continue;	// the end must match the start
		//console.log("endchain", i, startval);
		let path = [];
		// follow the path up
		let j = i;
		while (j >= 0) {
			let linkj = chain1[j];
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
				cpath.push([chain1[p][0],chain1[p][2],chain1[p][3]]);
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
	//console.log("cpairs", cpairs);

	bivals = getBivaluePairs();
	//console.log("bivals", bivals);
	// we need to start with a strong link so we might as well use a cp
	// for each conjugate pair start the chains with their endpoints
	// bv: [ cix, [ac]]
	let  bvlen = bivals.length;
	for (let  bv=0; bv<bvlen; ++bv) {
		let  bp = bivals[bv];
		let  bvep = bp[0]
		let  bvac = bp[1];
		// make the first link
		console.log("bv0start", bp);
		chain1 = [];	// reset the chain
		let link = [bvep, bvac,  bvac[0], 0, 'x', -1, [1]];
		chain1.push(link);
		link = [bvep, bvac,  bvac[1], bvac[0], 's', 0, []];
		chain1.push(link);
		nextLink(1);

		//console.log("chain0", chain1);
		let pathsa = getAICPaths(chain1);
		//allpaths.push.apply(allpaths, pathsa);
		//console.log("pathsa", pathsa);
		console.log("bv0end", pathsa.length);
		loops = processPaths(pathsa);
		if (loops.length > 0) return loops;

		// make the alternate link
		console.log("bv1start", bp);
		chain1 = [];	// reset the chain
		link = [bvep, bvac,  bvac[1], 0, 'x', -1, [1]];
		chain1.push(link);
		link = [bvep, bvac,  bvac[0], bvac[1], 's', 0, []];
		chain1.push(link);
		nextLink(1);

		//console.log("chain1", chain1);
		let pathsb = getAICPaths(chain1);
		//allpaths.push.apply(allpaths, pathsb);
		//console.log("pathsb", pathsb);
		console.log("bv1end", pathsb.length);
		loops = processPaths(pathsb);
		if (loops.length > 0) return loops;
	}

	// we need to start with a strong link so we might as well use a cp
	// for each conjugate pair start the chains with their endpoints
	let cvplen = cpairs.length;
	for (let cv=0; cv<cvplen; ++cv) {
		//if (cv !== 24) continue;	// TEST
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
		console.log("cp0start", cp);
		chain1 = [];	// reset the chain
		let link = [sep0, sac0,  valstart, 0, 'x', -1, [1]];
		chain1.push(link);
		link = [sep1, sac1,  valstart, 0, 's', 0, []];
		chain1.push(link);
		nextLink(1);

		//console.log("chain1", cv, chain1);
		let pathsa = getAICPaths(chain1);
		//allpaths.push.apply(allpaths, pathsa);
		//console.log("pathsa", cv, pathsa);
		console.log("cp0end", pathsa.length);
		loops = processPaths(pathsa);
		if (loops.length > 0) return loops;

		// make the alternate link
		console.log("cp1start", cp);
		chain1 = [];	// reset the chain
		link = [sep1, sac1,  valstart, 0, 'x', -1, [1]];
		chain1.push(link);
		link = [sep0, sac0,  valstart, 0, 's', 0, []];
		chain1.push(link);
		nextLink(1);

		let pathsb = getAICPaths(chain1);
		//allpaths.push.apply(allpaths, pathsb);
		//console.log("pathsb", sep1, pathsb, chain1);
		console.log("cp1end", pathsb.length);
		loops = processPaths(pathsb);
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

function pathsMatch(p1, p2) {
	if (p1.length !== p2.length) return false;
	var plen = p1.length;
	var pend = plen - 1;
	var pr = p2;
	if (!(p1[0][0] === p2[0][0] && p1[pend][0] === p2[pend][0] )) {
		// not same start/end
		if (!(p1[0][0] === p2[pend][0] && p1[pend][0] === p2[0][0] )) {
			// not reversed either
			return false;
		}
		pr = Array.from(p2).reverse;
	}

	return p1.every(item => p2.includes(item));
}

function removeDuplicatePaths(paths) {
	const seen = new Set();

	return paths.filter(path => {
		const forward = path.join(',');
		const reverse = [...path].reverse().join(',');

		const key = forward < reverse ? forward : reverse;

		if (seen.has(key)) return false;

		seen.add(key);
		return true;
	});
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

	console.log("loophints", loophints);
	if (loophints.length > 0) return loophints;
	console.log("hints", hints);
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
