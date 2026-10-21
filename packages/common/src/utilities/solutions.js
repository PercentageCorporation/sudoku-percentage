

export function soluitons(game) {
	const count = countSolutions(game);

	if (count === 0) {
		console.log("No solution");
		return 0;
	} else if (count === 1) {
		console.log("Unique solution");
		return 1;
	} else {
		console.log("Multiple solutions");
		return 2
	}
}

function countSolutions(game) {
	const cells = [...game];
	let solutions = 0;

	function solve() {
		if (solutions >= 2) return;

		let bestCell = -1;
		let bestCandidates = [];

		// Find the empty cell with the fewest candidates
		for (let ix = 0; ix < 81; ix++) {
			if (cells[ix] !== 0) continue;

			const row = Math.floor(ix / 9);
			const col = ix % 9;
			const candidates = [];

			for (let value = 1; value <= 9; value++) {
				let valid = true;

				for (let j = 0; j < 81; j++) {
					if (cells[j] !== value) continue;

					const r = Math.floor(j / 9);
					const c = j % 9;

					if (
						r === row ||
						c === col ||
						(
							Math.floor(r / 3) === Math.floor(row / 3) &&
							Math.floor(c / 3) === Math.floor(col / 3)
						)
					) {
						valid = false;
						break;
					}
				}

				if (valid) candidates.push(value);
			}

			if (candidates.length === 0) return;

			if (
				bestCell === -1 ||
				candidates.length < bestCandidates.length
			) {
				bestCell = ix;
				bestCandidates = candidates;
			}
		}

		// No empty cells: complete solution
		if (bestCell === -1) {
			solutions++;
			return;
		}

		for (const value of bestCandidates) {
			cells[bestCell] = value;
			solve();
			cells[bestCell] = 0;

			if (solutions >= 2) return;
		}
	}

	solve();
	return solutions;
}
