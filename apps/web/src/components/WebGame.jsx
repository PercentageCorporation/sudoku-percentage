import Game from "@sudoku/common/components/Game";
import HintHistory from "@sudoku/common/components/HintHistory";

export default function WebGame() {
	return (
		<div className="max-w-[900px] select-none">
			<div className="flex flex-row">
				<Game />
				<HintHistory />
			</div>
		</div>
	);
}
