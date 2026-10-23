import { useMemo } from "react";
import { useHintStore } from "@sudoku/common/store/hintStore";
import { useScreenStore } from "@sudoku/common/store/screenStore";
import StatsTable from "@sudoku/common/components/StatsTable";

export default function Statistics() {
	console.log("Statistics");
    const hintStats = useHintStore(s => s.hintStats);
    const getHintStats = useHintStore(s => s.getHintStats);

    // Recalculate when hintStats changes
    const stats = useMemo(
        () => getHintStats(),
        [hintStats, getHintStats]
    );

	function exit(e) {
		e.preventDefault();
		useScreenStore.getState().setScreen('game');
	}

	return (
		<div className="flex flex-col h-full min-h-0 ml-4 bg-slate-300">
			<div className="flex flex-row ">
				<div className="h-7 w-full text-lg font-semibold bg-slate-200">
					Statistics
				</div>
				<button type="button"
					className="px-4 bg-blue-300 rounded hover:cursor-pointer"
					onClick={(e) => exit(e)}
					>
					Exit
				</button>
			</div>
			<div className="flex-1 min-h-0 overflow-y-auto">
				<div className="flex flex-col">
					<h2 className="bg-slate-400">Function Statistics</h2>
					<StatsTable data={stats.functions} />

					<h2 className="bg-slate-400">Hint Types</h2>
					<StatsTable data={stats.types} />
				</div>
			</div>
		</div>
	);
}
