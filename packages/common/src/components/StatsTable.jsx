
import { useMemo, useState } from "react";

export default function StatsTable({ data = [] }) {
	const [sort, setSort] = useState(null);

	const columns = data.length ? Object.keys(data[0]) : [];

	const sortedData = useMemo(() => {
		if (!sort) return data;

		return [...data].sort((a, b) => {
			const x = a[sort.column];
			const y = b[sort.column];

			const comparison =
				typeof x === "number" && typeof y === "number"
					? x - y
					: String(x ?? "").localeCompare(String(y ?? ""));

			return sort.direction === "asc"
				? comparison
				: -comparison;
		});
	}, [data, sort]);

	function sortColumn(column) {
		setSort(current => ({
			column,
			direction:
				current?.column === column &&
					current.direction === "asc"
					? "desc"
					: "asc"
		}));
	}

	if (!data.length) {
		return <div className="text-gray-500">No statistics available.</div>;
	}

	return (
		<div className="">
			<table className="w-full border-collapse text-sm">
				<thead>
					<tr className="bg-gray-200">
						{columns.map(column => (
							<th
								key={column}
								onClick={() => sortColumn(column)}
								className="border border-gray-400 px-2 py-1
									text-left whitespace-nowrap
									cursor-pointer select-none"
									>
								{column}
								{sort?.column === column &&
									(sort.direction === "asc" ? " ▲" : " ▼")}
							</th>
						))}
					</tr>
				</thead>

				<tbody>
					{sortedData.map((row, ix) => (
						<tr key={ix} className="even:bg-gray-100">
							{columns.map(column => (
								<td
									key={column}
									className={
										"border border-gray-300 px-2 py-1 " +
										(typeof row[column] === "number"
											? "text-right tabular-nums"
											: "text-left")
									}
								>
									{row[column] ?? ""}
								</td>
							))}
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

