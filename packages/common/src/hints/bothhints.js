import {  useHintStore } from "@sudoku/common/store/hintStore";
import { runHints } from '@sudoku/common/hints/hints';
import { getCppHint } from '@sudoku/common/hints/cpphints';


export function doHints() {
	const useCPP = useHintStore.getState().useCPP;

	if (useCPP) {
		let h = getCppHint();
		return h;
	} else {
		let h = runHints();
		return h;
	}

}
