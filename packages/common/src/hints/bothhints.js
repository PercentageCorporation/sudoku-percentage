import { runHints, showHintStats  } from '@sudoku/common/hints/hints';
import { getCppHint } from '@sudoku/common/hints/cpphints';


export function doHints() {
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
