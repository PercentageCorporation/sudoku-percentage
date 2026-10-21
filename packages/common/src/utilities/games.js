import { LinearToGrid } from "../utilities/constants";


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
	games.games = games.games.filter((g) => g.number != ix);
	var sgames = JSON.stringify(games);
	//console.log(sgames);

	localStorage.setItem('sudoku-games', sgames);
	//console.log("game deleted",games)

}

export function exportGames() {
	var lcgames = localStorage.getItem('sudoku-games');
	if (!lcgames) return null;


}

