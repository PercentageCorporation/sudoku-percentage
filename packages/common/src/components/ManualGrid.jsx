import "@sudoku/common/styles/borders.css";
import { useEffect, useState } from "react";
import { useCellActions, useManCellsStore, useGameStateStore } from "@sudoku/common/store/store";
import { useHintStore } from "@sudoku/common/store/hintStore";
import { useScreenStore } from '@sudoku/common/store/screenStore';
import { LRUD, bstyles } from "@sudoku/common/utilities/constants";
import { deleteGame, getGame, saveGame, linearTextToGrid } from "@sudoku/common/utilities/games";
import { resetHintStats } from "@sudoku/common/hints/hints";
import { soluitons } from "@sudoku/common/utilities/solutions";
import LoadGameModal from "./LoadGameModal";
import SaveGameModal from "./SaveGameModal";
import ConfirmModal from "./ConfirmModal";
import SeedGameModal from "./SeedGameModal";

function ManualCandidates({ix}) {
	const { getManSelectedCell, getManCellCandidates } = useManCellsStore();
	let can = getManCellCandidates(ix);
	const sel = getManSelectedCell();
	const clist = [1, 2, 3, 4, 5, 6, 7, 8, 9];
	const bg = "";
	if (can === undefined) can = [];
	return (
		<div className={"grid grid-cols-3 h-full leading-none py-0.5" + bg}>
			{clist.map((c) => {
				var val = can.includes(c) ? c.toString() : "";
				var cn = " font-normal";
				if (c === sel) cn = " font-bold text-orange-600";

				return (
						<div key={c}
							className={"flex justify-center items-center w-full min-h-[12px] text-[12px] " + cn}
							>
							{val}
						</div>
					)
				})
			}
		</div>
	);
}

function ManualCell({ix}) {
	const { getManCell, getManSolutionCell, setManSelectedCell, getManSelectedCell, showCandidates, showNumberGrid, showSolution } = useManCellsStore();
	const cell = getManCell(ix);
	const solution = getManSolutionCell(ix);
	const val = (cell && cell > 0) ? cell : null;
	const sol = (solution && solution > 0) ? solution : null;
	const sel = getManSelectedCell();
	const cn = (ix === sel) ? " bg-green-300" : "";
	const bs = bstyles[ix];

	function selectCell(e, six) {
		e.preventDefault();
		setManSelectedCell(six);
		console.log("selectCell:", six, getManSelectedCell());
	}

	return (
		<div
			id={ix}
			className={"relative z-0 size-11 " + cn + bs}
			onClick={(e)=>selectCell(e, ix)}
			>
			{ showCandidates && val === null &&
				<ManualCandidates ix={ix} />
			}
			{
			<div>
				{ showNumberGrid && (val !== null || !showCandidates) &&
					<div className="flex pl-0.5 text-[10px]">
						{ix}
					</div>
				}
				{ showSolution && val !== null &&
				<div className="absolute right-0 bottom-0 pr-0.5 text-[10px]">
					{sol}
				</div>
				}
				{ showSolution && val === null &&
					<div className="flex justify-center items-center text-2xl font-semi absolute inset-0 bg-blue-50">
						{sol}
					</div>
				}
				{ val !== null &&
				<div className={"flex justify-center items-center text-3xl font-bold absolute inset-0" + `${sol !== null && sol !== val ? ' bg-red-100' : ''}`} >
					{val}
				</div>
				}
			</div>
			}
		</div>
	);
}

function ManualGrid9({y}) {
	//console.log("Grid9:", y);
	const index = [0, 1, 2, 3, 4, 5, 6, 7, 8];

	return (
		<>
		<div className="grid grid-cols-3 w-full border-black-300 ">
		{
			index.map((x, ix) => {
				const cellIx = (y*9) + x;
				return (<ManualCell key={ix} ix={cellIx} />)
			})
		}
		</div>
		</>
	);
}

export default function ManualGrid() {
	const { toggleShowNumberGrid, toggleShowCandidates, toggleShowSolution, showNumberGrid, showCandidates, showSolution } = useManCellsStore();
	const { initialized, manGameValid, manSelectedCell } = useManCellsStore();
	const { number: manNumber, description: manDescription } = useManCellsStore();
	const { setManCellValue, setManSelectedCell, getManSelectedCell, getManCells, getManCellsLinear, getManCellsLinearText, getManJSON } = useManCellsStore();
	const { getManSolution, setManId, loadManCells, loadManSolution,  initialize } = useManCellsStore();
	const { resetHint } = useHintStore();
	const { loadGame } = useCellActions();
	const { resetState, clearSolutionLog } = useGameStateStore();
	const { setScreen } = useScreenStore();

	const [ loadSavedGame, setLoadSavedGame ] = useState(false);
	const [ seedGame, setSeedGame ] = useState(false);
	const [ saveManGame, setSaveManGame ] = useState(false);
	const [ addSolution, setAddSolution ] = useState(false);
	const [ deleteId, setDeleteId ] = useState(null);
	const [ message, setMessage] = useState(manGameValid ? null : "Invalid Board");

	//console.log("ManGrid", manGameValid, manSelectedCell);
	//console.log("ManGrid1");

	const index = [0, 1, 2, 3, 4, 5, 6, 7, 8];
	const modalOpen = loadSavedGame || saveManGame || deleteId !== null;

	function handleKeyDown(e)  {
		const sel = getManSelectedCell();
		var char = null;
		var lrud = sel >= 0 ? LRUD[sel] : -1;
		var next = -1;
		const key = e.key;
		if (key.length === 1) char = key[0];

		//console.log("key:", key, sel);
		switch (e.key) {
			case " ":
				if (sel >= 0) setManCellValue(sel, 0);
				next = lrud[1];
			//console.log("right", sel, next);
			break;

			case "ArrowLeft":
				next = lrud[0];
				//console.log("left", sel, next);
				break;

			case "ArrowRight":
				next = lrud[1];
				//console.log("right", sel, next);
				break;

			case "ArrowUp":
				next = lrud[2];
				//console.log("up", sel, next);
				break;

			case "ArrowDown":
				next = lrud[3];
				//console.log("down", sel, next);
				break;

			case "Home":
				next = 0;
				break;

			case "End":
				next = 80;
				break;

			case "Tab":
				// ignore
				break;

			default:
				if (char && char >= '0' && char <= '9') {
					const val = Number(char);
					//console.log("KeyDown:", sel, val);
					if (sel >= 0) {
						setManCellValue(sel, val)
						next = lrud[1];
					}

				}
				break;
		}
		if (next >= 0) {
			console.log("next", next);
			setManSelectedCell(next);
		}
	};

	useEffect(() => {
		if (!modalOpen) {addEventListener("keydown", handleKeyDown)};
		if (!initialized) initialize();
		setMessage(manGameValid ? null : "Invalid Board");

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [modalOpen, manGameValid]);

	function returnToGame(e) {
		e.preventDefault();
		setScreen('game');
	}

	function handleSaveGame(e, description) {
		e.preventDefault();
		setSaveManGame(true);
	}

	function handleClear(e) {
		e.preventDefault();
		console.log("handleClear");
		setMessage(null);
		initialize();
	}

	function handlePlay(e) {
		e.preventDefault();
		console.log("handlePlay");
		resetState();
		clearSolutionLog();
		resetHintStats();
		const mc = getManCells();
		const sc = getManSolution();
		//console.log("handlePlay", mc);
		loadGame(mc, sc,  manDescription);	// load live game
		resetHint();
		setScreen('game');
	}

	function handleLoadGame(e) {
		e.preventDefault();
		setLoadSavedGame(true);
	}

	function handleSaveGame(e) {
		e.preventDefault();
		setSaveManGame(true);
	}

	function handleDeleteGame(e) {
		e.preventDefault();
		if (!manNumber) return;
		var content =	`${manNumber} : ${manDescription}`;
		setDeleteId({number: manNumber, title: "Delete Game", content: content})
	}

	function handleSeedGame(e) {
		e.preventDefault();
		setSeedGame(true)
	}

	function handleReadGame(e) {
		e.preventDefault();
		var input = document.createElement('input');
		input.type = 'file';
		input.onchange = e => {
			// getting a hold of the file reference
			var filename = e.target.value.split('\\').pop().split('/').pop().split('.')[0];
			console.log("filename:", filename);
			var file = e.target.files[0];
			// setting up the reader
			var reader = new FileReader();
			reader.readAsText(file,'UTF-8');
			// here we tell the reader what to do when it's done reading...
			reader.onload = readerEvent => {
				var gamecells = readerEvent.target.result; // this is the content!
				if (gamecells.length != 81) {
					alert("Import not correct length");
					return;
				}
				var grid = linearTextToGrid(gamecells);
				console.log(grid);
				loadManCells("", filename, grid, null);
				useManCellsStore.persist.rehydrate();
				//navigate("/manual");
			}
		}
		input.click();
	}

	function handleExportGames(e) {
		e.preventDefault();
		var filename = "sudoku.games";
		var lcgames = localStorage.getItem('sudoku-games');
		var file = new Blob([lcgames], {type: 'text/plain'});
		var a = document.createElement("a"),
			url = URL.createObjectURL(file);
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		setTimeout(function() {
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
		}, 0);
	}

	function handleAddSolution(e) {
		e.preventDefault();
		setAddSolution(true);
	}

	function handleSolutions(e) {
		e.preventDefault();
		let game = getManCellsLinear();
		let sol = soluitons(game);
		if (sol === 0) {
			setMessage("No solution");
		} else if (sol === 1) {
			setMessage("Unique solution");
		} else {
			setMessage("Multiple solutions");
		}
	}

	function handleNumberGrid(e) {
		e.preventDefault();
		toggleShowNumberGrid();
	}

	function handleClearCandidates(e) {
		e.preventDefault();
		toggleShowCandidates();
	}

	function handleShowSolution(e) {
		e.preventDefault();
		toggleShowSolution();
	}

	function handleShowLinear(e) {
		e.preventDefault();
		var linear = getManCellsLinearText();
		//alert(linear);
		console.log(linear);
		var linearspaces = linear.replaceAll('0', ' ');
		console.log(linearspaces);
		let json = getManJSON();
		console.log(json);
	}

	function addSolutionCancel() {
		setAddSolution(false);
	}

	function addSolutionConfirm(solution) {
		console.log("seedGame");
		console.log(solution);
		setAddSolution(false);
		var grid = linearTextToGrid(solution);
		console.log(grid);
		loadManSolution(grid);
		useManCellsStore.persist.rehydrate();
		//navigate("/manual");

		setAddSolution(false);
	}

	function loadConfirm(ix) {
		console.log("load game", ix);
		setLoadSavedGame(false);
		var game = getGame(ix);
		console.log("load game", ix, game.description);
		console.log(game.game);
		if (game) {
			console.log("load game", ix, game.description);
			loadManCells(game.number, game.description, game.game, game.solution);
			useManCellsStore.persist.rehydrate();
		}
		//navigate("/manual");
	}

	function loadCancel() {
		setLoadSavedGame(false);
	}

	function saveConfirm(description) {
		//lcSaveGame(description);
		setSaveManGame(false);
		var cls = getManCells();
		var solution = getManSolution();
		console.log("save game", description, cls, solution);

		var number = saveGame(description, cls, solution);
		setManId(number, description);
		useManCellsStore.persist.rehydrate();
	}

	function saveCancel() {
		setSaveManGame(false);

	}

	function deleteConfirm() {
		deleteGame(deleteId.number);
		initialize();
		setDeleteId(null);
	}

	function deleteCancel() {
		setDeleteId(null);
	}

	function seedConfirm(gamecells, solutioncells) {
		console.log("seedGame");
		console.log(gamecells);
		setSeedGame(false);
		let grid = linearTextToGrid(gamecells);
		loadManCells("", "Imported Game", grid, null);
		let solution = solutioncells ? linearTextToGrid(solutioncells) : null;
		console.log(gamecells);
		if (solution) loadManSolution(solution);
		//console.log(grid);
		useManCellsStore.persist.rehydrate();
		//navigate("/manual");
	}

	function seedCancel() {
		setSeedGame(false);
	}

	function select(e, ix) {
		e.preventDefault();
		console.log("ManSelect", ix);
		const sel = getManSelectedCell();
		if (sel >= 0) setManCellValue(sel, ix);
		setManSelectedCell(-1);
	}

	return (
		<div className="max-w-[412px] ">
			<div>
			{ seedGame && <SeedGameModal title="Paste Game" onConfirm={seedConfirm} onCancel={seedCancel}/> }
			{ addSolution && <SeedGameModal title="Paste Solution" onConfirm={addSolutionConfirm} onCancel={addSolutionCancel}/> }
			{ loadSavedGame && <LoadGameModal onConfirm={loadConfirm} onCancel={loadCancel}/> }
			{ saveManGame && <SaveGameModal description={manDescription} onConfirm={saveConfirm} onCancel={saveCancel}/> }
			{ deleteId && <ConfirmModal title={deleteId.title} content={deleteId.content} onConfirm={deleteConfirm} onCancel={deleteCancel}/> }
			</div>
			<div className="h-7 flex items-center text-lg font-semibold">
				{manNumber ? `${manNumber} : ${manDescription}` :  `${manDescription}`}
			</div>
			<div className="grid grid-cols-3 w-full border-black-300 bg-white">
			{
				index.map((y, ix) => { return (<ManualGrid9 key={ix} y={y} />) })
			}
			</div>
			<div className="mt-4 flex text-lg font-bold text-red-600">
				{message}
			</div>
			<div className="flex flex-row justify-between w-full mt-6" >
				{[1,2,3,4,5,6,7,8,9].map((s) => {
					var cn = " bg-green-300";
					if (manSelectedCell === s) cn = " bg-green-500";

					return (
						<div key={s} className={"flex justify-center size-8 text-xl font-bold rounded-md hover:cursor-pointer " + cn}
							onClick={(e) => select(e,s)} >
						{s}
						</div>
					)})
				}
				<div className="flex justify-center size-8 text-xl font-bold rounded-md hover:cursor-pointer bg-green-300"
					onClick={(e) => select(e,0)} >
					&nbsp;
				</div>
			</div>
			<div className="mt-4 text-xs font-normal">
				<div className="mx-2 flex flex-row justify-between mt-2">
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleClear(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						Clear Board
					</button>
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handlePlay(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						Play Game
					</button>
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => returnToGame(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						Return to Game
					</button>
				</div>
				<div className="mx-2 flex flex-row justify-between mt-2">
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleSeedGame(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						Seed Game
					</button>
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleAddSolution(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						Add Solution
					</button>
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleReadGame(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						Read Game
					</button>
				</div>
				<div className="mx-2 flex flex-row justify-between mt-2">
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleSaveGame(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						Save Game
					</button>
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleLoadGame(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						Load Saved Game
					</button>
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleDeleteGame(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						Delete Game
					</button>
				</div>
				<div className="mx-2 flex flex-row justify-between mt-2">
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleExportGames(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						Export Games
					</button>
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleImportGame(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						Import Games
					</button>
				</div>
				<div className="mx-2 flex flex-row justify-between mt-2">
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleNumberGrid(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						{`${showNumberGrid?  'Hide Grid' : 'Show Grid'}`}
						</button>
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleClearCandidates(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						{`${showCandidates ?  'Hide Candidates' : 'Show Candidates'}`}
					</button>
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleShowLinear(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						Show Linear
					</button>
				</div>
				<div className="mx-2 flex flex-row justify-between mt-2">
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleShowSolution(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						{`${showSolution ?  'Hide Solution' : 'Show Solution'}`}
					</button>
					<button
						type="button"
						tabIndex={-1}
						onClick={(e) => handleSolutions(e)}
						className="px-2 py-2 bg-blue-300 rounded hover:cursor-pointer"
						>
						Check Solution
					</button>
				</div>
			</div>
		</div>
	);
}
