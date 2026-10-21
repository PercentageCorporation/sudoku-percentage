import { useEffect } from "react";

export default function SeedGameModal({ title, onConfirm, onCancel }) {

	useEffect(() => {

	}, [])

	function handleConfirm() {
		console.log('handleConfirm');
		var element = document.getElementById("game-cells");
		if (!element) return;
		var gamecells = element.value.trim();
		if (gamecells.length === 81) {
			if (onConfirm) onConfirm(gamecells, null);
			return;
		}
		let ix = gamecells.indexOf(":1:")
		if (gamecells.length === 165 && ix === 81) {
			let game = gamecells.substring(0, 81);
			let solution = gamecells.substring(84);
			console.log(game);
			console.log(solution);
			if (solution.length === 81) {
				if (onConfirm) onConfirm(game, solution);
				return;
			}
		}
		alert("Invalid Input");
	}

	function handleCancel() {
		console.log('handleCancel');
		if (onCancel) onCancel();
	}

	return (
		<div>
			<div id="save-game-modal" className="modal-overlay" >
				<div className="modal">
					<div className="flex flex-col w-full">
						<div className='text-lg font-bold'>{title}</div>
						<textarea id="game-cells"
							rows="4"
							cols="1"
							wrap="soft"
							type="text"
							className="w-full mt-2 px-2 text-lg border-1"
						/>
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
		</div>
	);
}
