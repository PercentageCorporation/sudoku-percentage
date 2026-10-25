import { useEffect, useState } from "react";
import { cellStore, useCellActions, useGameStateStore } from "@sudoku/common/store/store";
import { useHintStore } from "@sudoku/common/store/hintStore";
import { useScreenStore } from '@sudoku/common/store/screenStore';
import { getSampleGame } from "@sudoku/common/utilities/games";
import { getGame } from "@sudoku/common/utilities/games";
import { resetHintStats } from "@sudoku/common/hints/hints";
import { downloadSudokuFixture, importSudokuFixture } from "@sudoku/common/utilities/exportBoard.js";
import LoadGameModal from "@sudoku/common/components/LoadGameModal";
import GameGrid from "@sudoku/common/components/GameGrid";
import PlayMenu from "/src/components/PlayMenu";
import Spinner from "/src/components/Spinner";

export default function Game() {
	const { gameLoaded, difficulty, gameId, saved } = cellStore();
	const { newGame, resetGame, initGame, loadGame, clearCandidates, resetCandidates, saveState, restoreState, getLinearText, getJSON } = useCellActions();
	const { resetState, showSolution, toggleShowSolution, clearSolutionLog } = useGameStateStore();
	const [ loadSavedGame, setLoadSavedGame ] = useState(false);
	const { resetHint } = useHintStore();
	const { setScreen } = useScreenStore();

	console.log("App", gameLoaded, difficulty, gameId);
	//console.log("saved", saved.length);

	useEffect(() => {
		console.log("App UE");
		async function load_game() {
			//const { game, solution, difficulty } = await getSudokuSoluitons();
			const g = getSampleGame();
			//const { game, solution, difficulty } = await getGameDosuku();
			//console.log("game:", g.gameid, g.difficulty)
			console.log(g.values, g.solution, g.description, g.gameid);
			initGame(g.values, g.solution, g.description, g.gameid);
		}

		if (!gameLoaded) load_game();
	}, [gameLoaded]);

	function handleNewGame(e) {
		e.preventDefault();
		newGame();
		resetState();
		clearSolutionLog();
		resetHintStats();
		//navigate("/", { replace: true });
	}

	function handleRestartGame(e) {
		e.preventDefault();
		resetHint();
		resetGame();
		resetState();
		clearSolutionLog();
		resetHintStats();
		//navigate("/", { replace: true });
	}

	function handleSaveGame(e) {
		e.preventDefault();
		saveState();
		//navigate("/", { replace: true });
	}

	function handleRestoreGame(e) {
		e.preventDefault();
		restoreState();
		resetHint();
		//navigate("/", { replace: true });
	}

	function handleRefreshCandidates(e) {
		e.preventDefault();
		//updateCandidates();
		resetCandidates();
		resetState();
		resetHint();
		//navigate("/", { replace: true });
	}

	function handleClearCandidates(e) {
		e.preventDefault();
		clearCandidates();
		resetState();
		resetHint();
		//navigate("/", { replace: true });
	}

	function handleManualGame(e) {
		e.preventDefault();
		resetGame();
		setScreen('manual');
	}

	function handleLoadGame(e) {
		e.preventDefault();
		setLoadSavedGame(true);
	}

	function handleExportJSON(e) {
		e.preventDefault();
		downloadSudokuFixture(gameId);
	}

	function handleLoadJSON(e) {
		e.preventDefault();
		importSudokuFixture(gameId);
	}

	function loadConfirm(ix) {
		//console.log("load game", ix);
		setLoadSavedGame(false);
		var game = getGame(ix);
		//console.log("load game", ix, game.description);
		//console.log(game.game);
		if (game) {
			//console.log("load game", ix, game.description);
			loadGame(game.game, game.solution, game.description);
			resetState();
			clearSolutionLog();
			resetHintStats();
			//navigate("/", { replace: true });
		}
	}

	function loadCancel() {
		setLoadSavedGame(false);
	}

	function handleShowLinear(e) {
		e.preventDefault();
		var linear = getLinearText();
		//alert(linear);
		console.log(linear);
		var linearspaces = linear.replaceAll('0', ' ');
		console.log(linearspaces);
		let json = getJSON();
		console.log(json);
	}

	function handleShowSolution(e) {
		e.preventDefault();
		toggleShowSolution();
	}

	function handleShowStatistics(e) {
		e.preventDefault();
		setScreen('statistics');
	}

	if (!gameLoaded) return <Spinner />;

	return (
		<div className="w-103 select-none">
			{ loadSavedGame && <LoadGameModal onConfirm={loadConfirm} onCancel={loadCancel}/> }
			<div className="h-7 text-lg font-semibold">
				{difficulty === "" ? `${gameId}` : `${gameId} / ${difficulty}`}
			</div>
			<div>
				<GameGrid />
			</div>
			<div>
				<PlayMenu />
			</div>
			<div className="flex flex-col justify-between mt-4 text-sm">
				<div className="flex flex-row justify-between">
					<button
						type="button"
						onClick={(e) => handleNewGame(e)}
						className="px-4 py-2 bg-orange-300 rounded hover:cursor-pointer"
					>
						New Game
					</button>
					<button
						type="button"
						onClick={(e) => handleLoadGame(e)}
						className="px-4 py-2 bg-orange-300 rounded hover:cursor-pointer"
					>
						Load Game
					</button>
					<button
						type="button"
						onClick={(e) => handleRestartGame(e)}
						className="px-4 py-2 bg-red-300 rounded hover:cursor-pointer"
					>
						Restart Game
					</button>
				</div>
				<div className="flex flex-row justify-between mt-2">
					<button
						type="button"
						onClick={(e) => handleSaveGame(e)}
						className="px-2 py-2 bg-orange-300 rounded hover:cursor-pointer"
					>
						Save Game State
					</button>
					<button
						type="button"
						disabled={saved.length === 0}
						onClick={(e) => handleRestoreGame(e)}
						className="px-2 py-2 bg-red-300 disabled:bg-red-100 rounded enabled:hover:cursor-pointer"
					>
						Restore Game State
					</button>
				</div>
				<div className="flex flex-row justify-between mt-2">
					<button
						type="button"
						onClick={(e) => handleManualGame(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
					>
						Manual Game
					</button>
					<button
						type="button"
						onClick={(e) => handleRefreshCandidates(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
					>
						Reset Candidates
					</button>
					<button
						type="button"
						onClick={(e) => handleClearCandidates(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
					>
						Clear Candidates
					</button>
				</div>
				<div className="flex flex-row justify-between mt-2">
					<button
						type="button"
						onClick={(e) => handleShowLinear(e)}
						className="px-4 py-2 bg-blue-300 rounded hover:cursor-pointer"
					>
						Show Linear
					</button>
					<button
						type="button"
						onClick={(e) => handleShowSolution(e)}
						className="px-4 py-2 bg-blue-300 rounded hover:cursor-pointer"
					>
						{`${showSolution ? 'Hide Solution' : 'Show Solution'}`}
					</button>
					<button
						type="button"
						onClick={(e) => handleShowStatistics(e)}
						className="px-4 py-2 bg-blue-300 rounded hover:cursor-pointer"
					>
						Show Statistics
					</button>
				</div>
				<div className="flex flex-row justify-between mt-2">
					<button
						type="button"
						onClick={(e) => handleLoadJSON(e)}
						className="px-2 py-2 bg-orange-300 rounded hover:cursor-pointer"
					>
						Load JSON
					</button>
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleExportJSON(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						Export JSON
					</button>
				</div>
			</div>
		</div>
	);
}
