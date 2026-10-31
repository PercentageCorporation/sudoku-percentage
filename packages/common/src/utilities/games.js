import { LinearToGrid } from "../utilities/constants";
import { sampleGames } from "@sudoku/common/store/sampleGames";
import { computeCandidates } from "./utilities";
import { hintcandidates, hintcells, runGameHints } from "../hints/hints";


export function linearTextToGrid(values) {
	var grid = new Array(81).fill(0);
	for (let i = 0; i < 81; i++) {
		var tval = values[i];
		var val = isNaN(tval) ? 0 : Number(tval);
		grid[LinearToGrid[i]] = Number(val);
	}
	//console.log(values);
	//console.log(grid);
	return grid;
}

export function gridToLinearText(grid) {
	var linear = "";
	for (let i = 0; i < 81; i++) {
		var val = grid[LinearToGrid[i]].value;
		linear += (val === 0) ? " " : Number(val);
	}
	//console.log(values);
	console.log("/"+linear+"/");
	return linear;
}

export function getGameList() {
	var gameList = [];
	var lcgames = localStorage.getItem('sudoku-games');
	if (!lcgames) return [];
	var games = JSON.parse(lcgames);
	var ngames =  games.games.length;
	if (ngames === 0) return [];
	games.games.forEach((g) => {
		var num = g.number;
		var descr = g.description;
		gameList.push([num,descr]);
	})
	return gameList;
}

export function gameToJSON(game) {
	let grids = [];
	let ix = 0;
	for (let i = 0; i < 9; i++) {
		let sq = [];
		for (let j = 0; j < 9; j++) {
			sq.push(game[ix++]);
		}
		grids.push(sq);
	}
	let json = JSON.stringify(grids);
	return json;
}

export function getGame(ix) {
	var lcgames = localStorage.getItem('sudoku-games');
	if (!lcgames) return null;
	var games = JSON.parse(lcgames);
	var ngames =  games.games.length;
	if (ngames === 0) return null;
	var retGame = null;
	games.games.forEach((g) => {
		var gnum = g.number;
		//console.log("getGame", ix, g.description);
		if (gnum === ix) {
			retGame = g;
		}
	})
	return retGame;

}

export function saveGame(description, cells, solution) {

	var lcgames = localStorage.getItem('sudoku-games');
	if (!lcgames) {lcgames = `{"games": []}`;};
	var games = JSON.parse(lcgames);

	//console.log("saved games", ngames);
	var gnum = 1;
	games["games"].forEach((g) => {
		g.number = gnum++
	})
	var newgame = {
		number: gnum,
		description: description,
		game: cells,
		solution: solution
	}
	games["games"].push(newgame);
	//console.log(games);
	var sgames = JSON.stringify(games);
	//console.log(sgames);

	localStorage.setItem('sudoku-games', sgames);
	//console.log("game saved")
	return newgame.number;
}

export function deleteGame(ix) {
	//console.log("delete game", ix);
	var lcgames = localStorage.getItem('sudoku-games');
	if (!lcgames) return null;
	var games = JSON.parse(lcgames);
	//console.log("delete game", ix, games);
	var ngames =  games.length;
	if (ngames === 0) return null;
	games.games = games.games.filter((g) => g.number !== ix);
	var sgames = JSON.stringify(games);
	//console.log(sgames);

	localStorage.setItem('sudoku-games', sgames);
	//console.log("game deleted",games)

}

export function exportGames() {
	var lcgames = localStorage.getItem('sudoku-games');
	if (!lcgames) return null;


}

export function getSampleGame(ix) {
	const numGames = sampleGames.length;
	const r = Math.floor(Math.random() * numGames);
	console.log("getSampleGame:", r, numGames);
	const g = sampleGames[r];

	const gameid = g["number"];
	const description = g["description"];
	const values = g["game"];
	const solution = g["solution"];
	return {values, solution, description, gameid};
}

export function playAllGames() {
	let removedcandidates = Array.from({ length: 81 }, () => []);

	let gamelist = getGameList();
	for (const gl of gamelist) {
		let gamenumber = gl[0];
		let gamedescription = gl[1];
		console.log(gamenumber, gamedescription);

		let g = getGame(gamenumber);
		let gcells = g.game;
		let gcandidates = computeCandidates(gcells);
		let hint = runGameHints(gcells, gcandidates);
		while (hint) {
			console.log(hint);
			processHint(hint, gcells, removedcandidates);
			let remaining = gameSolved(hintcells);
			if (remaining === 0) {
				console.log("solved");
				break;
			}
			gcandidates = computeCandidates(gcells);
			for (let cix=0; cix<81; ++cix) {
				if (gcandidates[cix].length === 0 || removedcandidates[cix].length === 0) continue;
				let gcix = gcandidates[cix].filter(v => !removedcandidates[cix].includes(v))
				gcandidates[cix] = gcix;
			}
			hint = runGameHints(gcells, gcandidates);
		}
		console.log("end", gamenumber, gamedescription);
	}
}

function processHint(h, gc, rc) {
	let targetcells = h.targetcells;
	let targetlist = h.targetlist;
	let targets = h.targets;
	let values = h.values;
	if (targetcells) {
		let cix = targetcells[0];
		let v = values[0];
		gc[cix] = v;
	} else if (targetlist) {
		targetlist.forEach((t) => {
			let tcls = t[0];
			let vals = t[1];
			tcls.forEach((tc) => {
				vals.forEach((v) => {
					if (!rc[tc].includes(v)) rc[tc].push(v);
				})
			})
		})

	} else if (targets) {
		targets.forEach((cix) => {
			values.forEach((value) => {
				if (!rc[cix].includes(value)) rc[cix].push(value);
			})
		})
	}

}

function gameSolved(cells) {
	let count = 0;
	for (const c of cells) {
		if (c === 0) ++count;
	}
	return count;
}
