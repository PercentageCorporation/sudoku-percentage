import { useState, useEffect, useRef } from "react";
import { useCellActions, useGameStateStore } from "@sudoku/common/store/store";

export default function CandidatesModal({ onConfirm, onCancel }) {
	const { setNonCandidates, getCell } = useCellActions();
	const { editCandidates, setEditCandidates } = useGameStateStore();
	const [candidates, setCandidates] = useState([]);
	const [noncandidates, setNoncandidates] = useState([]);
	const clist = [1,2,3,4,5,6,7,8,9];

	const cellIx = useRef();

	useEffect(() => {
		const cix = editCandidates;
		if (cix >= 0) {
			cellIx.current = cix;
			const cell = getCell(cix);
			setCandidates(cell.candidates);
			setNoncandidates(cell.noncandidates);
			console.log(cell);
			console.log("MUE:", cix, cell);
		}
	},[editCandidates])

	//console.log('ConfirmModal', open);
	function handleCancel() {
		console.log('handleCancel');
		setEditCandidates(-1);
		if (onCancel) onCancel();
	}

	function handleConfirm() {
		console.log('handleConfirm', noncandidates);
		setNonCandidates(cellIx.current, noncandidates);
		if (onConfirm) onConfirm(candidates);
		setEditCandidates(-1);
	}

	function handleOnClose() {
		console.log('handleOnClose');
		if (onCancel) onCancel();
	}

	function handleClick(e, ix) {
		e.preventDefault();
		console.log("handleClick", ix, candidates, noncandidates);
		if (noncandidates.includes(ix)) {
			setNoncandidates(noncandidates.filter(c => c != ix));
		} else if (candidates.includes(ix)) {
			if (!noncandidates.includes(ix)) setNoncandidates(noncandidates.concat(ix));
		}
	}
	//console.log(editCandidates, candidates);
	return (
		<div>
		{candidates && editCandidates >= 0 &&
			<div id="confirm-modal" className="modal-overlay" >
				<div className="modal">
					<div className="flex flex-row justify-between w-full">
					{
						clist.map((c) => {
							var cn = " bg-slate-200";
							if (noncandidates.length > 0 && noncandidates.includes(c)) {
								cn = " bg-orange-200";
							} else if (candidates.includes(c)) {
								cn = " bg-slate-400";
							}


							return (
								<div
									key={c}
									className={"flex justify-center items-center rounded-md size-8 " + cn}
									onClick={(e)=>handleClick(e,c)}
									>
								{c}
								</div>
							)

						})
					}
					</div>
					<div className="modal-actions">
						<button id="confirm-ok"
							className="modal-btn modal-confirm"
							onClick={handleConfirm}
							>
							Confirm
						</button>

						<button id="confirm-cancel"
							onClick={handleCancel}
							className="modal-btn modal-cancel">
							Cancel
						</button>
					</div>
				</div>
			</div>
		}
		</div>
	);
}
