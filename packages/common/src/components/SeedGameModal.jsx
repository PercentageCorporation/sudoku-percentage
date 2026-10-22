import { useEffect } from "react";

export default function SeedGameModal({ titleg, titles, onConfirm, onCancel }) {

	useEffect(() => {

	}, [])

	function handleConfirm() {
		console.log('handleConfirm');
		var game = "";
		var solution = "";
		var element = document.getElementById("game-cells");
		if (element) {
			var gamecells = element.value.trim();
			let ix = gamecells.indexOf(":1:")
			if (gamecells.length === 81) {
				game = gamecells;
			} else if (gamecells.length === 165 && ix === 81) {
				game = gamecells.substring(0, 81);
				var solution = gamecells.substring(84);
			} else {
				alert("Invalid Game Input");
				return;
			}
		}
		var element = document.getElementById("solution-cells");
		if (element) {
			var solution = element.value.trim();
		}

		if (solution.length !== 81 && solution.length !== 0) {
			alert("Invalid Solution Input");
			return;
		}

		if (onConfirm) onConfirm(game, solution);
	}

	function handleCancel() {
		console.log('handleCancel');
		if (onCancel) onCancel();
	}

	return (
		<div>
			<div id="save-game-modal" className="modal-overlay" >
				<div className="modal">
					{ titleg &&
					<div className="flex flex-col w-full">
						<div className='text-lg font-bold'>{titleg}</div>
						<textarea id="game-cells"
							rows="4"
							cols="1"
							wrap="soft"
							type="text"
							className="w-full mt-2 px-2 text-lg border-1"
						/>
					</div>
					}
					{ titles &&
					<div className="mt-2 flex flex-col w-full">
						<div className='text-lg font-bold'>{titles}</div>
						<textarea id="solution-cells"
							rows="4"
							cols="1"
							wrap="soft"
							type="text"
							className="w-full mt-2 px-2 text-lg border-1"
						/>
					</div>
					}
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
