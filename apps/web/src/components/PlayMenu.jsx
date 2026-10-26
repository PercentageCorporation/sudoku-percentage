import { useState, useEffect } from "react";
import { cellStore, useCellActions, useGameStateStore } from "@sudoku/common/store/store";
import { useHintStore } from "@sudoku/common/store/hintStore";
import { doHints } from "@sudoku/common/hints/bothhints";
import { validateMove, formatSolution } from "@sudoku/common/utilities/utilities";

export default function PlayMenu() {
	const { selectedValue, selectedCell, setSelectedValue, clearSelectedValue, clearSelectedCell, numbersUsed, setShowBivalue, setShowConjugates, resetState } = useGameStateStore();
	const { addSolutionLog, solutionLog } = useGameStateStore();
	const { setCellValue, clearCellValue, validateGame } = useCellActions();
	const { checkGameSolved, calcNumbersUsed } = useCellActions();
	const { updateCandidates, addNonCandidate } = useCellActions();
	const { gameComplete, gameValid,  gameId } = cellStore();

	const { hint, getHint, setHint, setHintMsg, resetHint } = useHintStore();
	const [message, setMessage] = useState(gameComplete ? "Game Complete" : null);

	const selection = [1,2,3,4,5,6,7,8,9];

	useEffect(() => {
		console.log("PlayMenu UE");
		calcNumbersUsed();
		const valid = validateGame()
		if (!valid) {
			setMessage("Invalid Board");
		} else {
			const solved = checkGameSolved();
			//console.log("gameComplete:", solved, gameComplete);
			if (solved === 1) {
				console.log("game solved");
				setMessage("Game Solved");
			} else if (solved == 2) {
				console.log("game solved, alternate solution");
				setMessage("Game Solved, Alternate Solution");
			} else
				setMessage(null);
		}
	},[gameComplete, gameValid])

	const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

	async function doAllHints(e) {
		e.preventDefault();
		console.log("doAllHints");
		setHintMsg("Starting");
		let h = doHints();
		//let h = runHints();
		while (h !== null && gameValid) {
			setHintMsg(h.msg);
			setHint(h);
			processHint(h);
			if (!validateGame()) break;
			await delay(200);
			//h = runHints();
			h = doHints();
		}
	}

	function doHint(e) {
		e.preventDefault();
		let h = getHint();
		if (!h) return;
		console.log("doHint", h);
		processHint(h);
	}

	function processHint(h) {
		let elims = [];
		let type = h.type;
		let targetcells = h.targetcells;
		let targetlist = h.targetlist;
		let targets = h.targets;
		let values = h.values;
		if (targetcells) {
			let cix = targetcells[0];
			let v = values[0];
			setCellValue(cix, v);
			elims.push(['v', cix, v, true]);
		} else if (targetlist) {
			targetlist.forEach((t) => {
				let tcls = t[0];
				let vals = t[1];
				tcls.forEach((tc) => {
					vals.forEach((v) => {
						let changed = addNonCandidate(tc, v);
						elims.push(['c', tc, v, changed]);
					})
				})
			})

		} else if (targets) {
			targets.forEach((cix) => {
				values.forEach((value) => {
					let changed = addNonCandidate(cix, value);
					elims.push(['c', cix, value, changed]);
				})
			})
		}
		clearSelectedValue();
		clearSelectedCell();

		//let log = (type.startsWith('forced2')) ? [type,  h.depth, h.levels, h.contradictions ] : [type];
		useHintStore.getState().addHintHistory(h, elims);
		//let log = [type, elims];
		//addSolutionLog(log);

		if (!validateGame()) {
			setMessage("Invalid Board");
			resetHint();
		} else {
			resetHint();
			let solved = checkGameSolved();
			if (solved === 0) {
				//let h = runHints();
				let h = doHints();
				if (h) {
					console.log("hint:", h, h.msg);
					setHintMsg(h.msg);
					setHint(h);
				}
			} else {
				// solved ?
				console.log("SOLVED");
				//console.log(solutionLog);
				//showHintStats();
				//const stats = useHintStore.getState().getHintStats();

				//console.table(stats.functions);
				//console.table(stats.types);
			}
		}
	}

	function showHint(e) {
		e.preventDefault();
		console.log("showHint", hint, gameComplete);
		if (!gameValid) {
			setHintMsg("Invalid Board");
			return;
		}
		if (gameComplete) {
			setHintMsg("Game Over");
			return;
		}
		resetState();
		//var h = runHints();
		let h = doHints();
		if (!h) {
			//resetHint();
			console.log("No Hints");
			setHintMsg("No Hints");
			return;
		}
		console.log("hint:", h, h.msg);
		setHintMsg(h.msg);
		setHint(h);
	}

	function select(e,s) {
		e.preventDefault();
		doSelect(s);
		calcNumbersUsed();
	}

	function bivalue(e) {
		e.preventDefault();
		console.log("bivalue", selectedValue);
		setShowConjugates(false);
		setShowBivalue(true);
	}

	function conjugates(e) {
		e.preventDefault();
		console.log("conjugates", selectedValue);
		setShowBivalue(false);
		setShowConjugates(true);
		//navigate('/');
	}

	function doSelect(s) {
		// s: -1 - clear selected value
		// s:  0 - if selectedCell
		console.log("PMselect:", s, selectedCell);
		//console.log("forEach:", sel, s)
		var msg = null;
		if (s < 0) {
			// clear all selctions
			clearSelectedCell();
			clearSelectedValue();
			resetState();
		}
		else if (s > 0) {
			if (selectedCell < 0) {
				// set cell value selection
				setSelectedValue(s);
			} else {
				// set cell value
				const val = validateMove(selectedCell, s);
				console.log("val:", val);
				if (val < 0) {
					msg = "Invalid Move";
				} else if (val > 0) {
					msg = "Bad Move";
					//console.log("Bad Move:", selectedCell);
					setCellValue(selectedCell, s);
					clearSelectedCell();
					updateCandidates();
				} else {
					//console.log("Set:", sel, selectedCell)
					setCellValue(selectedCell, s);
					clearSelectedCell();
					updateCandidates();
				}
			}
			if (validateGame()) msg = "Invalid Board";
		} else { // s === 0
			if (selectedCell < 0) {
				//
				clearSelectedValue();
				clearSelectedCell();
			} else {
				// clear selected cell value
				clearCellValue(selectedCell);
				updateCandidates(selectedCell);
				clearSelectedValue();
				clearSelectedCell();
			}
			resetState();
		}
	setMessage(msg);
	//updateCandidates();
	resetHint();
	checkGameSolved();
	}

	function handleSaveSolution(e) {
		e.preventDefault();
		let filename = gameId + "_solution.txt";
		let solution = formatSolution(gameId, solutionLog);
		let file = new Blob([solution], {type: 'text/plain'});
		let a = document.createElement("a"),
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

	function handleCopyStatistics(e) {
		e.preventDefault();
		//let hintStats = showHintStats();
		//navigator.clipboard.writeText(JSON.stringify(hintStats, null, 2));
	}
	//if (!used.current) return <Spinner />;
	//console.log("used:", numbersUsed)
	//console.log("hint:", hint);


	return (
		<div>
			<div className="flex flex-row justify-between w-full mt-6" >
			{selection.map((s) => {
				var cn = " bg-green-300";
				if (numbersUsed[s] == 9)
					cn = " bg-green-100 pointer-events-none";
				else if (selectedValue === s)
					cn = " bg-green-500";

				return (
					<div key={s} className={"flex justify-center size-8 text-xl font-bold rounded-md hover:cursor-pointer " + cn}
						onClick={(e) => select(e,s)} >
					{s}
					</div>
				)})
			}
				<div className="flex justify-center size-8 text-xl font-bold rounded-md hover:cursor-pointer bg-green-300"
					onClick={(e) => select(e,-1)} >
					&nbsp;
				</div>
			</div>
			<div className="flex flex-row mt-4">
				<div className="flex justify-center mr-4 size-8 text-xl font-bold rounded-md bg-green-400 hover:cursor-pointer "
					onClick={(e) => select(e,0)} >
				C
				</div>
				<div className="flex justify-center mr-4 size-8 text-xl font-bold rounded-md bg-green-400 hover:cursor-pointer "
					onClick={(e) => bivalue(e)} >
				BV
				</div>
				<div className="flex justify-center mr-4 size-8 text-xl font-bold rounded-md bg-green-400 hover:cursor-pointer "
					onClick={(e) => conjugates(e)} >
				CP
				</div>
				<div
					className="flex justify-center mr-4 size-8 text-xl font-bold rounded-md bg-green-400 hover:cursor-pointer "
					onClick={(e) => showHint(e)} >
					?
				</div>
				<div
					className="flex justify-center mr-4 size-8 text-xl font-bold rounded-md bg-green-400 hover:cursor-pointer "
					onClick={(e) => doAllHints(e)} >
					&gt;&gt;
				</div>
				</div>
			<div>
				<div className="flex flex-row h-8 mt-4">
					<div
						className="px-2 flex items-center bg-green-300 rounded-md text-normal font-semibold hover:cursor-pointer"
						onClick={(e)=>doHint(e)}
						>
						{`${hint.msg ? hint.msg : gameComplete ? 'Game Over' : 'No Hint'}`}
					</div>
				</div>
			</div>
			<div className="mt-2 flex flex-row items-center">
				<div className="flex text-lg font-bold text-red-600">
					{message}
				</div>
				<div>
				{gameComplete !== 0 && !gameValid &&
					<div>
						<button
							type="button"
							onClick={(e) => handleSaveSolution(e)}
							className="ml-4 px-4 h-6 bg-blue-300 rounded hover:cursor-pointer text-xs"
							>
							Save Solution
						</button>
						<button
							type="button"
							onClick={(e) => handleCopyStatistics(e)}
							className="ml-4 px-4 h-6 bg-blue-300 rounded hover:cursor-pointer text-xs"
							>
							Copy Statistics
						</button>
					</div>
				}
				</div>
			</div>
		</div>
	)

}
