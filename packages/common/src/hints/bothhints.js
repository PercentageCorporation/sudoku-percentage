import {  useHintStore } from "@sudoku/common/store/hintStore";
import { runHints } from '@sudoku/common/hints/hints';
import { getCppHint } from '@sudoku/common/hints/cpphints';


export function doHints() {
	const useCPP = useHintStore.getState().useCPP;

	if (useCPP) {
		let h = getCppHint();
		return h;
	} else {
		let js = runHints();
		if (!js) return null;

		let h = {
			type: js.type,
			row: js.row,
			col: js.col,
			square: js.square,
			cells: js.cells,
			targetlist: js.targetlist,
			targetcells: js.targetcells,
			targets: js.targets,
			values: js.values,
			msg: js.msg
		}

		return h;
	}

}
