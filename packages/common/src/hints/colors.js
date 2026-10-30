import { canSeeEachOther, findTargetlist, findTargetlistSeenByBoth, separateTargetlist } from './hints';
import { findAllCellsWithValue, includesAll, includesAny,  findTargets } from './hints';
import { getConjugatePairs } from "./conjugates";
import { formatTargetlist } from '../utilities/utilities';


//*****************************************************************************
// common functions

var colorpairs;

// find the conjugates for the given cell and value
// cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
function findConjugates(val, cix) {
	var mates = [];
	colorpairs.forEach((cp) => {
		if (val === cp[0]) {
			var cix0 = cp[1][0];
			var cix1 = cp[2][0];
			//console.log("fc", val, cix, cix0, cix1);
			if (cix === cix0 ) {
				mates.push(cix1);
			} else if (cix === cix1) {
				mates.push(cix0);
			}
		}
	})
	return mates;
}

// get all (conjugate) pairs for a given value
function getValuePairs(value) {
	var vpairs = [];
	colorpairs.forEach((cp) => {
		if (value === cp[0]) {
			vpairs.push(cp);
		}
	})
	return vpairs;
}

// can any of the cells in the array see each other
function anyInSameHouse(arr) {
	var arrlen = arr.length;
	for (var i=0; i<arrlen; ++i) {
		for (var j=i+1; j<arrlen; ++j) {
			if (canSeeEachOther(arr[i], arr[j])) return true;
		}
	}
	return false;
}

// does either cell matche a cell in the cluster
function matchesCluster(cluster, cx) {
	if (cluster.length === 0) return true;	// alwasy matches empty cluster
	for (var i=0; i<cluster.length; ++i) {
		// for each pair in the cluster
		var cp = cluster[i];
		if (includesAny(cp, cx)) return true;
	}
	return false;
}

// is the cell in the cluster
function inCluster(cluster, cx) {
	if (cluster.length === 0) return false;	// cannot be in empty cluster
	for (var i=0; i<cluster.length; ++i) {
		// for each pair in the cluster
		var cp = cluster[i];
		if (includesAll(cp, cx)) return true;
	}
	return false;
}

// does the cell appear in any of the clusters
function inAnyCluster(clusters, cx) {
	if (clusters.length === 0) return false;	// cannot be in empty cluster
	for (var i=0; i<clusters.length; ++i) {
		// for each cluster in clusters
		var cl = clusters[i];
		if (inCluster(cl, cx)) return true;
	}
	return false;
}

// get the values that only occur once in the array
function getSinglueValues(arr) {
	var ep = [];
	var dup = false;
	arr.sort((a,b) => a-b);
	var alen = arr.length;
	var i = 1;
	while (i<alen) {
		if (arr[i-1] === arr[i]) {
			if (dup) {
			} else {
				dup = true;
			}
		} else {
			if (dup) {
				dup = false;
			} else {
				ep.push(arr[i-1]);
			}
		}
		++i;
	}
	if (!dup) ep.push(arr[alen-1]);
	return ep;
}

// get the endpoints of the cluster (cells not linked)
function getEndpoints(cluster) {
	var clen = cluster.length;
	if (clen === 1) return ([cluster[0][0], cluster[0][1]]);

	var cls = [];
	cluster.forEach((c) => cls.push(c[0], c[1]));

	var uv = getSinglueValues(cls);
	return uv;
}

function canSeeEachOtherPairs(p0, p1) {
	if (canSeeEachOther(p0[0],p1[0]) && canSeeEachOther(p0[1],p1[1])) return true;
	if (canSeeEachOther(p0[0],p1[1]) && canSeeEachOther(p0[1],p1[0])) return true;
	return false;
}

// make a list of cells with parity from the pairs
function makeBipartite(pairs) {
	if (!pairs.length) return [];

	const links = new Map();

	for (const [a, b] of pairs) {
		if (!links.has(a)) links.set(a, []);
		if (!links.has(b)) links.set(b, []);

		links.get(a).push(b);
		links.get(b).push(a);
	}

	const parity = new Map();
	const start = pairs[0][0];

	parity.set(start, 0);

	const queue = [start];

	while (queue.length) {
		const value = queue.shift();

		for (const linked of links.get(value)) {
			if (!parity.has(linked)) {
				parity.set(linked, 1 - parity.get(value));
				queue.push(linked);
			}
		}
	}

	return [...parity.entries()].sort((a, b) => a[0] - b[0]);
}

function findBridges(c0, c1) {
	var bridges = [];
	c0.forEach((p0) => {
		c1.forEach((p1) => {
			if (canSeeEachOther(p0[0], p1[0])) {
				bridges.push([p0, p1]);
			}
		})
	})
	return bridges;
}

function getBipartiteCellsWithOppositeParity(c, p) {
	var cls = [];
	c.forEach((cp) => {
		if (cp[1] !== p) cls.push(cp[0])
	})
	return cls;
}

// get the bridge cells of the same parity
// bipartite cells: [ [cix,parity], [cix,parity], [cix,parity], ... ]
function getClusterCellsByParity(bp) {
	var br0 = [];
	var br1 = [];

	bp.forEach((b) => {
		(b[1] === 0) ? br0.push(b[0]) : br1.push(b[0]);
	})

	return ([br0, br1]);
}

//          bridge0     bridge1         bridge0     bridge1
// br: [ [ [cix0, p0], [cix1, p1] ], [ [cix0, p0], [cix1, p1] ], ... ]
function bridgeCellsSameParity(br) {
	var same0 = br[0][0][1];
	var same1 = br[0][1][1];
	var brlen = br.length;
	for (var i=1; i<brlen; ++i) {
		if (same0 !== br[i][0][1]) {
			same0 = -1;
			break;
		}
	}
	for (var i=1; i<brlen; ++i) {
		if (same1 !== br[i][1][1]) {
			same1 = -1;
			break;
		}
	}
	return ([same0, same1]);
}

//*****************************************************************************
//

export function colorWing() {
	var candidates = [];
	colorpairs = getConjugatePairs();
	//cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
	//console.log("cpairs", colorpairs);

	for (var v=1; v<10; ++v) {
		//if (v !== 2) continue;	// TEST
		var vp = getValuePairs(v);
		var vplen = vp.length;
		if (vplen < 2) continue;

		//console.log("vp", vp);
		var clusters = [];
		for (var vpx=0; vpx<vplen; ++vpx) {
			var cx0 = vp[vpx][1][0];
			var cx1 = vp[vpx][2][0];
			var cx = [cx0, cx1];
			if (inAnyCluster(clusters, cx)) continue;

			var cluster = [cx];
			var added = true;
			while (added) {
				added = false;
				for (var i=0; i<vplen; ++i) {
					var cx0 = vp[i][1][0];
					var cx1 = vp[i][2][0];
					var cx = [cx0, cx1];
					//console.log("check", cluster, cx);
					if (!inCluster(cluster, cx) && matchesCluster(cluster, cx)) {
						cluster.push(cx)
						//console.log("add", cluster, cx);
						added = true;
					}
				}
			}

			//console.log("cluster", cluster);
			clusters.push(cluster);
		}
		//console.log("clusters", v, clusters);

		var clen = clusters.length;
		for (var i=0; i<clen; ++i) {
			var cli = clusters[i];
			var epi = getEndpoints(cli);
			for (var j=i+1; j<clen; ++j) {
				var clj = clusters[j];
				var epj = getEndpoints(clj);
				if (epi.length < 2 || epj.length < 2) continue;		// one of them is an x-wing or a weird circular cluster
				//console.log("ep", v, i, j, epi, epj);
				// check the cluster pair
				var bi = makeBipartite(cli);
				var bj = makeBipartite(clj);
				//console.log("bp", v, i, j, bi, bj);
				//bi.forEach((e) => cellStore.getState().actions.setCellParity(e[0], e[1]+1));
				//bj.forEach((e) => cellStore.getState().actions.setCellParity(e[0], e[1]+3));

				// this returns cell/parity pairs where the first pair is Pairs I and the second is Pairs J
				var br = findBridges(bi, bj);
				//console.log("bridges", v, i, j, br);
				var brlen = br.length;
				if (brlen === 0) continue;	// nothing to do

				var parity = getClusterCellsByParity(bi)
				var parity1 = parity[0];
				var parity2 = parity[1];
				var parity = getClusterCellsByParity(bj)
				var parity3 = parity[0];
				var parity4 = parity[1];
				var targets = [];

				if (brlen === 1) {
					// one bridge
					// get the cells of pairs I with the parity opposite the bridge cell parity
					var bcpi = br[0][0][1];		// pairity of bridge cell
					var bci = br[0][0][0];		// bridge cell
					var ccopi = getBipartiteCellsWithOppositeParity(bi, bcpi);

					var bcpj = br[0][1][1];		// pairity of bridge cell
					var bcj = br[0][1][0];		// bridge cell
					var ccopj = getBipartiteCellsWithOppositeParity(bj, bcpj);

					//console.log("ccop", bci, bcpi, ccopi, bcj, bcpj, ccopj);
					var targets = findTargetlistSeenByBoth(v, ccopi, ccopj);
					if (targets) {
						console.log("targets 1", targets);
						candidates.push([v, targets, parity1, parity2, parity3, parity4])
						break;
					}
					// colors.push(???)
				} else	{	// more than one bridge
					// check if all the bridge cells are of the same parity
					var bp = bridgeCellsSameParity(br);
					//console.log("parity", parity1, parity2, parity3, parity4);
					if (bp[0] !== -1 && bp[1] === -1) {
						// all cluster 0 bridge cells are the same parity
						// therefore all cluster cells of that parity are elimination targets
						var parity1 = getClusterCellsByParity(bi)[bp[0]]
						var parity2 = getClusterCellsByParity(bi)[bp[0] === 0 ? 1 : 0]
						targets = findTargetlist(parity1, [v], []);
						if (targets) {
							console.log("targets 2+", bp, targets);
							candidates.push([v, targets, parity1, parity2, parity3, parity4])
							break;
						}
					} else if (bp[1] !== -1 && bp[0] === -1) {
						targets = findTargetlist(parity2, [v], []);
					}

				}
			}
		}

	}
	var colors = [];

	candidates.forEach((c) => {
		var value = c[0];
		var targetlist = c[1];
		var p1 = c[2];
		var p2 = c[3];
		var p3 = c[4];
		var p4 = c[5];
		let {targets, values} = separateTargetlist(targetlist);
		let msg = "Color Wing: " + formatTargetlist(targetlist);

		var h = {
			type: 'colorWing',
			rows: null,
			cols: null,
			square: null,
			cells: [],
			cells0: null,
			cells1: null,
			parity1: p1,
			parity2: p2,
			parity3: p3,
			parity4: p4,
			values: values,
			targets: targets,
			msg: msg
		}
		colors.push(h);

	})

	if (colors.length === 0) return null;
	console.log("colors", colors);
	return colors;
}

//*****************************************************************************
// colors

export function colors() {
	var colors = [];

	colorpairs = getConjugatePairs();
	// cpairs: [ value, [cix0, [ac0]], [cix1, [ac1]] ]
	//console.log("cpairs", colorpairs);
	//if (cpairs.length === 0) return null;

	// find all of a value that are part of a conjugate pair
	// valpairs[value]: [cp0, cp1, ... ]
	var redblue = [];
	for (var value=1; value<10; ++value) {
		//if (value !== 7) continue;	// TEST
		var vp = getValuePairs(value);
		var vplen = vp.length;
		if (vplen === 0) continue;
		//console.log("vp", vp);

		for (var vpx=0; vpx<vplen; ++vpx) {
			var firstcell = vp[vpx][1][0];
			//console.log("vpx", vpx, firstcell);
			var red = [];
			var blue = [];

			red.push(firstcell);
			var loop = true;
			while (loop) {
				var added = false;
				red.forEach((r) => {
					// possible next pair must come from the conjugate pair list
					var rc = findConjugates(value, r);
					//console.log("rcr", r, rc);
					rc.forEach((cix) => {
						if (!blue.includes(cix)) {
							blue.push(cix);
							added = true;
						}
					})
				})
				blue.forEach((b) => {
					// possible next pair must come from the conjugate pair list
					var rc = findConjugates(value, b);
					//console.log("rcc", b, rc);
					rc.forEach((cix) => {
						if (!red.includes(cix)) {
							red.push(cix);
							added = true;
						}
					})
				})
				//console.log(value, red, blue);
				// end of the chain
				if (!added) {
					//console.log(value, red, blue);
					redblue.push([value, red, blue]);
					break;
				}
				//console.log("vpend", value, vpx, red, blue);
			}

			if ((red.length + blue.length) < 3) continue;

			var redSame = anyInSameHouse(red);
			var blueSame =  anyInSameHouse(blue);

			if (redSame || blueSame) {
				//console.log("Type II", value, red, redSame, blue, blueSame);
				var cls = redSame ? red : blue;
				var tgts = redSame ? blue : red;
				let targetlist = [tgts,[value]];
				let {targets, values} = separateTargetlist(targetlist);
				let msg = "Colors II: " + formatTargetlist(targetlist);

				//console.log(cls, tgts);
				var h = {
					type: 'colorsII',
					rows: null,
					cols: null,
					square: null,
					cells: cls,
					cells0: red,
					cells1: blue,
					targetlist: targetlist,
					values: values,
					targets: targets,
					msg: msg
				}
				colors.push(h);
				break;
			}

			// are there any occurances of value in a cell not included in red and blue
			var allvals = findAllCellsWithValue(value);
			var outliers = allvals.filter(f => !red.includes(f) && !blue.includes(f));
			var tgts = [];
			outliers.forEach((o) => {
				var seered = false;
				red.forEach((r) => { if (canSeeEachOther(o,r)) seered = true;})
				var seeblue = false;
				blue.forEach((b) => { if (canSeeEachOther(o,b)) seeblue = true;})
				if (seered && seeblue) tgts.push(o);
			})
			//console.log(value, tgts, red, blue, outliers);
			if (tgts.length > 0) {
				//console.log(value, tgts, red, blue, outliers);
				let targetlist = [ [tgts, [value]] ];
				let {targets, values} = separateTargetlist(targetlist);
				let msg = "Colors I: " + formatTargetlist(targetlist);
				var cls = [...red,...blue];
				var h = {
					type: 'colorsI',
					rows: null,
					cols: null,
					square: null,
					cells: cls,
					cells0: red,
					cells1: blue,
					targetlist: targetlist,
					values: values,
					targets: targets,
					msg: msg
				}
				colors.push(h);
				break;
			}
		}
		if (colors.length > 0) break;
	}

	if (colors.length === 0) return null;
	console.log("colors", colors);
	return colors;

}

