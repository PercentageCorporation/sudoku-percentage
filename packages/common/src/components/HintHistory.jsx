import { useEffect, useRef } from "react";
import { useHintStore } from "@sudoku/common/store/hintStore";

export default function HintHistory() {
	const history = useHintStore(s => s.hintHistory);
	const { useCPP }= useHintStore();

	const scrollRef = useRef(null);

	// Scroll to the newest entry whenever history grows.
	useEffect(() => {
		const container = scrollRef.current;
		if (container) {
			container.scrollTop = container.scrollHeight;
		}
	}, [history.length]);

	return (
		<div className="ml-4 flex flex-col w-103 h-200 min-h-0">
			<div className="h-7 w-full text-lg font-semibold bg-slate-200">
				{`Hint History ${useCPP ? 'for C++' : 'for JavaScript'}`}
			</div>

			<div className="flex-1 min-h-0">
				<div
					ref={scrollRef}
					className="h-full min-h-0 overflow-y-auto"
					>
					<table className="w-full border-separate border-spacing-0 text-xs">
						<thead className="sticky top-0 z-10 bg-gray-200">
							<tr>
								<th className="border p-1 text-left">
									Step
								</th>
								<th className="border p-1 text-left">
									Technique
								</th>
								<th className="border p-1 text-left">
									Description
								</th>
								<th className="border p-1 text-right">
									Chgs
								</th>
							</tr>
						</thead>

						<tbody>
							{history.map((entry) => (
								<tr key={entry.step}>
									<td className="border p-1 text-center">
										{entry.step}
									</td>
									<td className="border p-1">
										{entry.hint.type}
									</td>
									<td className="border p-1">
										{entry.hint.msg}
									</td>
									<td className="border p-1 text-right">
										{entry.elims.filter(e => e[3]).length}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}



