import { includesAny } from './hints';
import { hintcells, hintcandidates, findSeenTargets2, findTargetsSeenByAll, findTargets } from './hints';
import { sameRow2, sameCol2, canSeeEachOther, sameHouse } from './hints';
import { Rows, Cols, Squares } from '@sudoku/common/utilities/constants';
import { getConjugatePairs, getConjugatePairsForValue, getBivaluePairs } from "./conjugates";

//*****************************************************************************
// common functions

// links: [ cix, prevlink, [nextlinks] ]
// check link chain to see if we already have this cell
function haveCellInLinks(links, cix) {
	var curlink = links.length -1;
	while (curlink >= 0) {
		if (links[curlink][1] === cix) return true;
		--curlink;
	}
	return false;
}

//*****************************************************************************
// X-Chain

// chain [ [cvpix, ep0, ep1, previous link, [next links]]]
var chain;

function pairInChain(ix) {
	var clen = chain.length;
	for (var i=0; i<clen; ++i) {
		if (ix === chain[i][0]) return true;
	}
	return false;
}

function endpointsInPath(cix, ep0, ep1) {
	var j = cix;
	while (j >= 0) {
		var cp0 = chain[j][1];
		var cp1 = chain[j][2];
		if (ep0 === cp0 || ep1 === cp1 || ep1 === cp0 || ep0 === cp1) return true;
		j = chain[j][3];
	}
	return false;
}

// find next link
// current link index is cix
// the next link is to cell in the same row/col/sq as ep1
// chain: [ [cvpix, ep0, ep1, previous link, [next links]]]
// cvp: [ value, [cix0, [ac0]], [cix1, [ac1]] ]

function findNextXLink(cvp, cix) {
	var curlink = chain[cix];	// current link in the chain
	var epx = curlink[2];		// next endpoint to link to
	var epz = curlink[1];		// other endpoint
	//console.log("nl", cix, epx, curlink);

	var clen = cvp.length;
	// we can start at 1 because the chain always starts with one entry
	for (var i=1; i<clen; ++i) {
		if (pairInChain(i)) continue;
		var cp = cvp[i];
		var ep0 = cp[1][0];
		var ep1 = cp[2][0];
		if (epx === ep0 || epx === ep1 || epz === ep0 || epz === ep1) continue;
		if (endpointsInPath(cix, ep0, ep1)) continue;
		var curix = i;
		if (sameRow2(epx, ep0) >= 0) chain.push([i, ep0, ep1, cix, []]);
		else if (sameRow2(epx, ep1) >= 0) chain.push([i, ep1, ep0, cix, []]);
		else if (sameCol2(epx, ep0) >= 0) chain.push([i, ep0, ep1, cix, []]);
		else if (sameCol2(epx, ep1) >= 0) chain.push([i, ep1, ep0, cix, []]);
		else { curix = -1; }

		if (curix >= 0) {
			var lcl = chain.length-1;
			curlink[4].push(lcl)
			findNextXLink(cvp, lcl);
		}
	}
}

// construct the list of path cells from the links
// going from bottom up
// chain: [ [cvpix, ep0, ep1, prev link, [next links]]]
function getXPaths() {
	// link: [ val, cix, prevlink, [nextlinks] ]
	var paths = [];
	var end = chain.length - 1;
	if (end === 0) return paths;

	for (var i=end; i >= 0; --i) {
		// find the first link with the start value
		var path = [];
		// follow the path up
		var j = i;
		while (j >= 0) {
			var linkj = chain[j];
			path.push(j);
			j = linkj[3];	// back up the chain
			//console.log("prev link", j, chain[j]);
		}
		// the long enough and odd number of links
		if (path.length >= 3 && (path.length % 2) === 1) {
			path.reverse();
			var cpath = [];
			path.forEach((p) => {
				cpath.push([chain[p][1],chain[p][2]]);
			})
			paths.push(cpath);
		}
	}
	return paths;
}


export function XChain() {

	var cpairs = getConjugatePairs();
	//cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
	//console.log("cpairs", cpairs);

	for (var value=1; value<10; ++value) {
		//if (value !== 2) continue;	// TEST

		var xc = [];
		var cvp = getConjugatePairsForValue(cpairs, value);
		var cvplen = cvp.length;
		if (cvplen === 0) continue;
		//console.log("cvp", value, cvp);

		// for each conjugate pair start the chains with their endpoints
		for (var cv=0; cv<cvplen; ++cv) {
		// pick a starting endpoint

			var sep0 = cvp[cv][1][0];
			var sep1 = cvp[cv][2][0];

			// find two conjugate pairs with an endpoint in the same row/col/sq
			chain = [];
			chain.push([0, sep0, sep1, -1, []]);
			//console.log("chain start 0", value, chain);
			findNextXLink(cvp, 0);
			//console.log("chain end 0", value, chain);
			var x0paths = getXPaths();

			// now start with the other endpoint
			chain = [];
			chain.push([0, sep1, sep0, -1, []]);
			//console.log("chain start 1", value, chain);
			findNextXLink(cvp, 0);
			//console.log("chain end 1", value, chain);

			var x1paths = getXPaths();
			var zpaths = [...x0paths, ...x1paths] ;
			//console.log("xpaths", x0paths, x1paths, zpaths);

			for (var zp=0; zp<zpaths.length; ++zp) {
				var p = zpaths[zp]
				// see if there are targets for the endpointsInPath
				var ep0 = p[0][0];
				var ep1 = p[p.length-1][1];
				var targets = findTargetsSeenByAll(value, [ep0,ep1], [ep0, ep1]);
				//console.log("eps", value, cv. ep0, ep1, targets, p);

				// collect the alternating link cells and the full path
				var fullpath = [];
				var parity1 = [];
				var parity2 = [];
				p.forEach((px) => {
					fullpath.push(px[0], px[1]);
					parity2.push(px[0]);
					parity1.push(px[1]);
				})

				//console.log("eps", value, ep0, ep1, targets, fullpath, parity1, parity2, p);

				if (targets !== null) {
					// if targets are in the chain I think something is wrong
					if (includesAny(fullpath, targets)) continue;
				}

				// if no targets are in the chain we have a vailid chain.
				// are the endpoints in the same house?
				var rcs = sameHouse(ep0, ep1);
				var tgtset = new Set(targets);
				//console.log("xc targets", targets, tgtset, rcs);
				if (rcs) {
					// if the endpoints are in the same house, this is actually an X-Cycle
					//console.log("ep same house", value, ep0, ep1, rcs, p);
					// because the endpoints are in the samehouse
					// eliminations can take place in all the houses of the links between the pairs
					// the links between the pairs are from ep0 -> ep1
					for (var lp=1; lp<p.length; ++lp) {
						var lp0 = p[lp-1][1];
						var lp1 = p[lp][0];
						var rcs = sameHouse(lp0, lp1);
						var rcstgts = [];
						if (rcs) {
							// I don't think they can be in more than one house
							if (rcs[0] >= 0)
								rcstgts = findTargets(Rows[rcs[0]], [value], fullpath);
							else if (rcs[1] >= 0)
								rcstgts = findTargets(Cols[rcs[1]], [value], fullpath);
							else if (rcs[1] >= 0)
								rcstgts = findTargets(Squares[rcs[2]], [value], fullpath);

							if (rcstgts) rcstgts.forEach(tgtset.add, tgtset);
							//console.log("rcstgts", rcstgts, tgtset);
						}
					}

					//console.log("targets", targets, tgtset.size);
					if (tgtset.size > 0) {
						var tgts = Array.from(tgtset);
						//console.log("found", value, fullpath, parity1, parity2, tgts);
						xc.push([value, [ep0, ep1], parity1, parity2, tgts]);
						break;	// one is enough for now
					}
				}
			}
		}
	}

	var xchain = [];
	xc.forEach((x) => {
		var val = x[0];
		var cls = x[1];
		var parity1 = x[2];
		var parity2 = x[3];
		var tgts =x[4];

		var h = {
			type: 'xChain',
			rows: null,
			cols: null,
			square: null,
			cells: cls,
			parity1: parity1,
			parity2: parity2,
			values: [val],
			targets: tgts,
			msg: `X-Chain: Cells: ${tgts}, Value: ${val}`
		}
		xchain.push(h);
	})

	if (xchain.length === 0) return null;
	console.log("xchain", xchain);
	return xchain;
}

//*****************************************************************************
// XY-Chain
// an xy chain is a chain of bivalue cells linked by a common candidate in the same house
// the end of the chain are the unlinked values and must match

// recursive function to find the next link in a chain
// the current cell ix curlinkix
// the next value we are looking for is nextval
// the starting (end) of the chain is endval
var bvpairs;
var links = [];
function findLink(curlinkix, nextval, endval ) {
	// link: [ val, cix, prevlink, [nextlink-indices] ]
	var curlink = links[curlinkix];
	var curcix = curlink[1];	// current link cell index
	//	console.log("link", curlinkix, curcix, nextval, endval, curlink);
	//	console.log("links", links);

	var outval = 0;

	// look for a cell containing the nextval value
	// the cell we are looking for must be in the same house
	for (var i=0; i<bvpairs.length; ++i) {
		var bvx = bvpairs[i];
		var bvix = bvx[0];
		if (curcix === bvix) continue;	// skip ourselves if same cell
		// see if this cell has the candidate value
		if (hintcells[bvix] > 0) continue;
		var bvac = hintcandidates[bvix];
		if (!bvac.includes(nextval)) continue;	// not what we are looking for
		if (!canSeeEachOther(curcix, bvix)) continue;	// not in the same house
		// check to see if we already have this cell in the links
		if (haveCellInLinks(links,bvix)) {
			// we already have this cell in the chain so if we add it we will create a loop
			// so this is the end of this chain
			return;
		}

		// which value is the candidate
		if ( bvac[0] === nextval) {
			// [0] is the candidate so look for [1] next
			outval = bvac[1];
		} else {
			outval = bvac[0];
		}
		//console.log("bv", bvix, bvac, nextval, outval);

		// create a new link
		var nextlink = links.length;
		//console.log("curlink before", structuredClone(curlink), nextlink);
		(links[curlinkix][3]).push(nextlink);
		//console.log("curlink after", structuredClone(curlink));
		var newlink = [outval, bvix, curlinkix, [] ];
		links.push(newlink);
		// if the next value is the one we are looking for we are done
		//if (outval === endval) return;		// end of chain ??
		findLink(links.length-1, outval, endval);
	}

}

// construct the list of path cells from the links
// going from bottom up
function linkPaths() {
	// link: [ val, cix, prevlink, [nextlinks] ]
	// get the start value from the first link
	var end = links.length - 1;
	if (end === 0) return paths;
	var startval = links[0][0];
	var paths = [];

	for (var i=end; i >= 0; --i) {
		// find the first link with the start value
		var linki = links[i];
		//console.log("link", i, startval, linki);
		if (linki[0] !== startval) continue;	// not a valid chain

		//console.log("start link", i, linki);

		var path = [];
		// follow the path up
		var endval = linki[0];
		var val = -1;
		var j = i;
		while (j >= 0) {
			var linkj = links[j];
			val = linkj[0];
			path.push(linkj[1]);
			j = linkj[2];	// back up the chain
			//console.log("prev link", j, links[j]);
		}
		// the start and end values must match
		if (val === endval && path.length >= 3) {
			path.reverse();
			paths.push([val, path]);
		}
	}
	return paths;
}

export function XYChain() {
	bvpairs = getBivaluePairs();
	//console.log("bvpairs",bvpairs)
	var paths = [];

	//bvpairs.forEach((cp) => {
	for (var b=0; b<bvpairs.length; ++b) {
		var cp = bvpairs[b];
		// bvp: [ cix, [ac]]
		//console.log("cp", cp);
		var cix = cp[0];
		//if (cix !== 49) continue;	// TEST
		var val0 = cp[1][0];
		var val1 = cp[1][1];

		// find the links starting and ending with val1
		links = [];
		var link0 = [val1, cix, -1, []];
		links.push(link0);
		//links.push(structuredClone(link0));

		findLink(0, val0, val1);
		//console.log("links1", links)
		if (links.length > 2) {
			//console.log("linksout0", val0, structuredClone(links));
			var paths0 = linkPaths(links);
			//console.log("paths0", paths0)
			paths0.forEach(p => paths.push(p));
		}

		// find the links starting and ending with val0
		links = [];
		var link1 = [val0, cix, -1, []];
		links.push(link1);
		//links.push(structuredClone(link1));

		findLink(0, val1, val0);
		//console.log("links2", links)
		if (links.length > 2) {
			//console.log("linksout1", val1, structuredClone(links));
			var paths1 = linkPaths(links);
			//console.log("paths1", paths1)
			paths1.forEach(p => paths.push(p));
		}
	}

	paths = paths.sort((a,b) => a[0] - b[0]);
	//console.log("paths", structuredClone(paths));

	var xytargets = [];
	paths.forEach((p) => {
		var val = p[0];
		var es = p[1][0];
		var end = p[1].length - 1;
		var ee = p[1][end];
		var tgts = findSeenTargets2(val, es, ee);
		//console.log(val, es, ee, tgts);
		if (tgts) xytargets.push([val, p[1], tgts])
	})
	xytargets = xytargets.sort((a,b) => b[2].length - a[2].length);
	//console.log("xytargets", xytargets);

	var xychain = [];
	xytargets.forEach((t) => {
		var val = t[0];
		var cls = t[1];
		var tgts = t[2];

		var h = {
			type: 'xyChain',
			rows: null,
			cols: null,
			square: null,
			cells: cls,
			values: [val],
			targets: tgts,
			msg: `XY-Chain: Cells: ${tgts}, Value: ${val}`
		}
		xychain.push(h);

	})

	if (xychain.length === 0) return null;
	console.log("xychain", xychain);
	return xychain;

}

