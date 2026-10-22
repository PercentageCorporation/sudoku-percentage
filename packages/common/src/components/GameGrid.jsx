import "@sudoku/common/styles/borders.css";
import { cellStore, useCellActions, useGameStateStore } from "@sudoku/common/store/store";
import { useHintStore } from "@sudoku/common/store/hintStore";
import { RCS, bstyles } from "@sudoku/common/utilities/constants";
import { getRemainingValues } from "@sudoku/common/utilities/utilities";
import { cellInConjugatePair, cellInBivaluePair } from '@sudoku/common/hints/conjugates';
import CandidatesModal from "@sudoku/common/components/CandidatesModal";

function Candidates({ix}) {
	const { selectedValue, showConjugates, showBivalue } = useGameStateStore();
	const can = cellStore.getState().cells[ix].candidates;
	const ac = cellStore.getState().cells[ix].activecandidates;
	const noncan = cellStore.getState().cells[ix].noncandidates;

	let bg = (ac.includes(selectedValue)) ? " bg-green-100" : "";
	if (showConjugates)  {
		let cicp = cellInConjugatePair(ix,selectedValue);
		if (cicp > 0 ) bg = (cicp === 1) ? " bg-yellow-200" : " bg-yellow-400";
	}
	if (showBivalue)  {
		let cibp = cellInBivaluePair(ix,selectedValue);
		bg = cibp > 0 ? " bg-yellow-200" : "";
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
	} else if (cell.parity > 0) {
		switch (cell.parity) {
			case 0:
				break;
			case 1:
				selMode = 10;
				break;
			case 2:
				selMode = 11;
				break;
			case 3:
				selMode = 12;
				break;
			case 4:
				selMode = 13;
				break;
		}
	} else if (hint.type) {
		switch (hint.type) {
			case 'cell':
			case 'cellR':
			case 'cellC':
			case 'cellS':
			case 'forced2S':
				if (hint.targetcells[0] === ix) selMode = 3;
				break;

			case "colorWing":
			case "xChain":
			case 'aicI':
			case 'aicII':
			case 'aicIloop':
				if (hint.targets.includes(ix))
					selMode = 3;
				else if (hint.parity1.includes(ix))
					(hint.cells.includes(ix)) ? selMode = 14 : selMode = 10;
				else if (hint.parity2.includes(ix))
					(hint.cells.includes(ix)) ? selMode = 15 : selMode = 11;
				else if (hint.parity3 && hint.parity3.includes(ix))
					selMode = 12;
				else if (hint.parity4 && hint.parity4.includes(ix))
					selMode = 13;

				break;
			case "colorsI":
			case "colorsII":
			case "alsXZ1":
			case "alsXZ2":
			case "sdc":
				if (hint.cells0.includes(ix))
					selMode = 8;
				else if (hint.cells1.includes(ix))
					selMode = 9;
				else if (hint.targets.includes(ix))
						selMode = 3;
				break;

			case "wxyzWing":
				if (hint.cells0.includes(ix))
					selMode = 15;
				else if (hint.cells1.includes(ix))
					selMode = 11;
				else if (hint.cells2.includes(ix))
					selMode = 13;
				else if (hint.targets.includes(ix))
					selMode = 3;
				break;

			case "swordfish":
				if (hint.targets.includes(ix))
					selMode = 3;
				else if (hint.rows.includes(rcs[0]))
					selMode = 8;
				else if (hint.cols.includes(rcs[1]))
					selMode = 9;
				break;

			case "pointingPairXX":
				if (hint.cells.includes(ix))
					selMode = 3;
				else if (hint.row === rcs[0] || hint.col === rcs[1]) {
					if (cell.activecandidates.includes(hint.value)) selMode = 2;
				}
				break;

			case "locked":
			case "nakedPair":
			case "nakedTriple":
			case "pointingPair":
			case "pointingPairSquare":
			case "hiddenPair":
			case "hiddenTriple":
			case "quad":
			case 'wWing':
			case 'xWing':
			case 'xyWing':
			case 'xyTriple':
			case 'xyChain':
			case 'xyzWing':
			case 'urType1':
			case 'urType2':
			case 'urType3':
			case 'urType4':
			case 'urType5':
			case 'urType6':
			case 'urType7':
			case 'emptyRectangle':
				if (hint.cells.includes(ix))
					selMode = 2;
				if (hint.targets.includes(ix))
					selMode = 3;
			break;

			case 'forced':
			case 'forced2':
				if (hint.targets.includes(ix)) {
					selMode = 3;
				}
				break;

			case 'row':
				if (hint.row >= 0 && hint.row === rcs[0]) selMode = 3;
				break;

			case 'col':
				if (hint.col >= 0 && hint.col === rcs[1]) selMode = 3;
				break;

			default:
				if (hint.cells[0] === ix) {
					//console.log(hint);
					selMode = 6;
				}
				break;
		}

	} else {
		if (selectedCell === ix)
			selMode = 2;
		else if (showBivalue && cell.activecandidates.length === 2)
			selMode = 1;
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
	console.log("GameGrid");
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
