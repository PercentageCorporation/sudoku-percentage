import { cellStore } from "@sudoku/common/store/store";
import createSudokuModule from '@sudoku/common/wasm/sudoku.js';

const sudoku = await createSudokuModule();

export function getCppHint() {
	let hintcells = Array(81).fill(0);
	let hintcandidates = Array.from({ length: 81 }, () => []);
	let storecells = cellStore.getState().cells;
	storecells.forEach((c, ix) => {c.value > 0 ? hintcells[ix] = c.value : hintcandidates[ix] = [...c.activecandidates]});

	let board = {
		"schema": "sudoku-board-v1",
		"name": "Test Run",
		"indexing": "square-major",
		"values": hintcells,
		"candidates": hintcandidates
		}

	let jboard = JSON.stringify(board);
	const jresult = sudoku.getSudokuHint(jboard, 'next');
	const result = JSON.parse(jresult);
	console.log("result", result);
	if (!result) return null;

	let targets = [];
	let values = [];
	let targetlist = [];
	let targetcells = [];

	for (const d of result.deductions) {
		switch (d.operation) {
			case 'remove':
				targetlist.push([[d.cell],[d.value]]);
				if (!targets.includes(d.cell)) targets.push(d.cell);
				if (!values.includes(d.value)) values.push(d.value);
				break;

			case 'place':
				targetcells.push(d.cell);
				targets.push(d.cell);
				values.push(d.value);
				break;

		}
	}

	values.sort();

	let h = {
		type: result.type,
		row: result.row,
		col: result.col,
		square: result.square,
		cells: result.supportCells,
		targetlist: targetlist.length > 0 ? targetlist : null,
		targetcells: targetcells.length > 0 ? targetcells : null,
		targets: targets,
		values: values,
		msg: result.message
	}

	return h;
}
