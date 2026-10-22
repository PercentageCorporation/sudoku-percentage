import { apiGetGame } from "@sudoku/common//utilities/sudokuApi";
import { sampleGames } from "@sudoku/common/store/sampleGames";
import { linearTextToGrid } from "@sudoku/common/utilities/games";

const SUDOKUSOLUTIONS_API = "https://www.sudoku-solutions.com/";

export async function getSudokuSoluitons() {
	var game = [];
	var solution = [];
	var difficulty = "Unknown";

	const response = await apiGetGame(SUDOKUSOLUTIONS_API);
	const parser = new DOMParser();
	const page = parser.parseFromString(response, 'text/html');
	console.log(page);

	const puzzleId = page.getElementById("ACTIVE_PUZZLE_ID");
	console.log(puzzleId);

	const grid = page.getElementsByClassName("gridCellValue");
	console.log(grid);
	for (const e of grid) {
		console.log(e);
		const value = e.textContent;
		console.log(value);
	}

	return {game, solution, difficulty}

}

export function getSSGame() {
	const numGames = sampleGames.length;
	const ix = Math.floor(Math.random() * numGames);
	console.log("getSSGame:", ix);
	const g = sampleGames[ix];

	const gameid = g["number"];
	const description = g["description"];
	const v = g["game"];
	const s = g["solution"];
	const values = linearTextToGrid(v);
	const solution = linearTextToGrid(s);
	return {values, solution, difficulty, gameid};
}


