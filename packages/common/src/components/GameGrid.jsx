import "@sudoku/common/styles/borders.css";
import { cellStore, useCellActions, useGameStateStore } from "@sudoku/common/store/store";
import { useHintStore } from "@sudoku/common/store/hintStore";
import { Rows, Cols, RCS, bstyles } from "@sudoku/common/utilities/constants";
import { getRemainingValues } from "@sudoku/common/utilities/utilities";
import { cellInConjugatePair, cellInBivaluePair } from '@sudoku/common/hints/conjugates';
import CandidatesModal from "@sudoku/common/components/CandidatesModal";

function Candidates({ix}) {
	const { selectedCell, selectedValue, showConjugates, showBivalue } = useGameStateStore();
	const can = cellStore.getState().cells[ix].candidates;
	const ac = cellStore.getState().cells[ix].activecandidates;
	const noncan = cellStore.getState().cells[ix].noncandidates;

	let bg = (ac.includes(selectedValue)) ? " bg-green-100" : "";
	if (showConjugates)  {
		let cicp = cellInConjugatePair(ix,selectedValue);
		if (cicp > 0 ) bg = (cicp === 1) ? " bg-yellow-200" : " bg-yellow-400";
	} else if (showBivalue)  {
		let cibp = ac.length === 2;
		if (cibp) {
			if (selectedValue >= 0)
				bg = ac.includes(selectedValue) ? " bg-yellow-200" : "";
			else
				bg = " bg-yellow-200";
		}
	} else if (ix === selectedCell) {
		bg = " bg-green-300";
	}


	//console.log(ix, can, noncan);
	const clist = [1, 2, 3, 4, 5, 6, 7, 8, 9];

	return (
		<div className={"grid grid-cols-3 border-black h-full leading-none py-0.5" + bg}>
			{clist.map((c) => {
				var val = c.toString();
				var cn = " font-normal";
				if (c === selectedValue) cn = " font-bold text-orange-600"
				if (!can.includes(c))
					val = "";
				else if (noncan.includes(c))
					cn = " font-thin"

				return (
					<div key={c}
						className={"flex justify-center items-center w-full min-h-[12px] text-[12px] " + cn}
						>
						{val}
					</div>
				);
			})}
		</div>
	);
}

function Cell({ix}) {
	const { getCell, setCellValue } = useCellActions();
	const { updateCandidates, calcNumbersUsed, candidatesValid } = useCellActions();
	const { selectedValue, selectedCell, showSolution, showBivalue, setSelectedValue, clearSelectedValue, setSelectedCell, clearSelectedCell, setEditCandidates } = useGameStateStore();

	const { hint, resetHint } = useHintStore();
	const cell = cellStore.getState().cells[ix];
	//console.log("Cell:", ix, typeof(ix), cells);

	function selectCell(e, ix) {
		e.preventDefault();
		const cs = getCell(ix);
		console.log("selectCell:", ix, cs);
		setSelectedCell(ix);
		if (cs.value > 0) {
			setSelectedValue(cs.value);
		} else {
			clearSelectedValue();
		}
		calcNumbersUsed();
	}

	function doubleClick(e, ix) {
		e.preventDefault();
		// auto fill if possible
		const rv = getRemainingValues(ix);
		//console.log("autofill:", ix, rv);
		if (rv.length !== 1) {
			console.log("setEditCandidates:", ix);
			setEditCandidates(ix);
			return;
		}
		const val = rv[0];
		setCellValue(ix, val);
		updateCandidates();
		setSelectedValue(val);
		clearSelectedCell();
		calcNumbersUsed();
		resetHint();
	}

	// set highlighting
	var rcs = RCS[ix];
	var selMode = 0;

	if (cell.value > 0 ) {
		if (selectedCell === ix)
			selMode = 2;
		else if (cell.value === selectedValue)
			selMode = 1;

		// check for invalid value
		if (cell.value > 0 && cell.solutionValue > 0 && cell.value !== cell.solutionValue) selMode = 4;
	} else if (!candidatesValid(ix)) {
		selMode = 99;
	} else if (showBivalue ) {
		if (cell.activecandidates.length === 2) {
			if (selectedValue >= 0)
			{
				if (cell.activecandidates.includes(selectedValue)) selMode = 1;
			}
			else
				selMode = 1;
		}
	} else if (hint !== null) {
		if (hint.targets && hint.targets.includes(ix))
			selMode = 3;
		else if (hint.cells && hint.cells.includes(ix))
			selMode = 12;
		else if (hint.targets && hint.targets.includes(ix))
			selMode = 3;
		else if (hint.cells1 || hint.cells2) {
			if (hint.cells1 && hint.cells1.includes(ix)) selMode = 9;
			if (hint.cells2 && hint.cells2.includes(ix)) selMode = 10;
		}
		else if (hint.cells2 && hint.cells2.includes(ix))
			selMode = 10;
// 		else if (hint.rows || hint.cols) {
// 			for (const r of hint.rows) {
// 				if (Rows[r].includes(ix)) selMode = 9;
// 			}
// 			for (const c of hint.cols) {
// 				if (Cols[c].includes(ix)) selMode = 10;
// 			}
// 		}

	}

	var cn = "bg-white";
	switch (selMode) {
		case 1:
			cn = "bg-green-200";
			break;
		case 2:
			cn = "bg-green-300";
			break;
		case 3:
			cn = "bg-green-400";
			break;
		case 4:
			cn = "bg-red-200";
			break;
		case 5:
			cn = "bg-orange-100";
			//console.log(ix, rcs, hint);
			break;
		case 6:
			cn = "bg-orange-200";
			break;
		case 7:
			cn = "bg-slate-200";
			break;
		case 8:
			cn = "bg-red-200";
			break;
		case 9:
			cn = "bg-blue-200";
			break;
		case 10:
			cn = "bg-yellow-200";
			break;
		case 11:
			cn = "bg-yellow-400";
			break;
		case 12:
			cn = "bg-blue-200";
			break;
		case 13:
			cn = "bg-blue-400";
			break;
		case 14:
			cn = "bg-pink-200";
			break;
		case 15:
			cn = "bg-pink-400";
			break;
		case 99:
			cn = "bg-red-500";
			break;
	}
	const bs = bstyles[ix];

	//console.log("Cell:", ix, selectedCell, cn);
	return (
		<div
			className={"size-11 " + cn + bs}
			onDoubleClick={(e)=>doubleClick(e,ix)}
			onClick={(e)=>selectCell(e, ix)}
			>
			{!showSolution && cell.value === 0 &&
					<Candidates ix={ix} />
			}
			{cell.value !== 0 &&
				<div className="flex justify-center items-center w-full h-full text-3xl font-bold">
					{cell.value}
				</div>
			}
			{showSolution && cell.value === 0 &&
				<div className="flex justify-center items-center w-full h-full text-xl font-semibold">
						{`${(showSolution && cell.value === 0) ? cell.solutionValue: cell.value}`}
				</div>
			}
		</div>
	);
}

function Grid9({y}) {
	//console.log("Grid9:", y);
	const index = [0, 1, 2, 3, 4, 5, 6, 7, 8];

	return (
		<>
			<div className="grid grid-cols-3 w-full">
			{
			index.map((x, ix) => {
				const cellIx = (y*9) + x;
				return (<Cell key={ix} ix={cellIx} />)
			})
			}
			</div>
		</>
	);
}

export default function GameGrid() {
	const { clearSelectedCell } = useGameStateStore();
	//console.log("GameGrid");
	const index = [0, 1, 2, 3, 4, 5, 6, 7, 8];

	function modalConfirm() {
		console.log("modalConfirm");
		clearSelectedCell();
	}

	return (
		<div className="">
			<CandidatesModal onConfirm={modalConfirm} />
			<div className="grid grid-cols-3 w-full h-100">
				{
					index.map((y, ix) => { return (<Grid9 key={ix} y={y} />) })
				}
			</div>
		</div>
	);
}
