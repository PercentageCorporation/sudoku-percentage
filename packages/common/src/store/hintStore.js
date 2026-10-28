import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const Hint = {
	type: null,
	cell: -1,
	row: -1,
	col: -1,
	sq: -1,
	msg: ""
};

export const useHint = () => useHintStore((state) => state.hint);

export const useHintStore = create(
	persist(
		(set, get) => ({
			hint: { ...Hint },

			hintStats: {
				functions: {},
				types: {}
			},

			hintHistory: [],
			useCPP: true,
			hintsRunning: false,

			getHint: () => get().hint,

			setHint: (h) => set({ hint: h }),

			setHintMsg: (msg) => {
				console.log("msg", msg);
				let h = get().hint;
				h.msg = msg;
				set({ hint: h });
			},

			resetHint: () => {
				set({
					hint: { ...Hint },
					hintsRunning: false
				});
			},

			setUseCPP: () => {
				set({ useCPP: true})
			},

			setUseJS: () => {
				set({ useCPP: false})
			},

			setHintsRunning: (tf) => {
				set({ hintsRunning: tf})
			},

			getHintsRunning: () => get().hintsRunning,

			toggleUseCPP: () => {
				let cpp = get().useCPP;
				set({ useCPP: !cpp})
			},

			addHintHistory: (hint, elims) => {
				set((state) => ({
					hintHistory: [
						...state.hintHistory,
						{
							step: state.hintHistory.length + 1,
							hint: structuredClone(hint),
							elims: elims.map(e => [...e])
						}
					]
				}));
			},

			clearHintHistory: () => {
				set({
					hintHistory: [],
					hintsRunning: false
				});
			},

			getHintHistory: () => get().hintHistory,

			// Record execution statistics
			logHint: (name, result, elapsed) => {
				set((state) => {
					const functions = { ...state.hintStats.functions };
					const types = { ...state.hintStats.types };

					const s = {
						calls: 0,
						successes: 0,
						time: 0,
						successTime: 0,
						failureTime: 0,
						maxTime: 0,
						...functions[name]
					};

					s.calls++;
					s.time += elapsed;
					s.maxTime = Math.max(s.maxTime, elapsed);

					if (result?.length) {
						s.successes++;
						s.successTime += elapsed;

						const type = result[0].type ?? name;
						const t = {
							count: 0,
							time: 0,
							...types[type]
						};

						t.count++;
						t.time += elapsed;
						types[type] = t;
					} else {
						s.failureTime += elapsed;
					}

					functions[name] = s;
					return {
						hintStats: { functions, types }
					};
				});
			},

			setHintStats: (functions, types) => {
				set({
					hintStats: {
						functions: functions,
						types: types
					}
				});
			},

			resetHintStats: () => {
				set({
					hintStats: {
						functions: {},
						types: {}
					},
					hintHistory: [],
					hintsRunning: false
				});
			},

			getHintStats: () => {
				const { functions, types } = get().hintStats;

				const functionRows = Object.entries(functions).map(([name, s]) => ({
					function: name,
					calls: s.calls,
					successes: s.successes,
					successPct: +(100 * s.successes / s.calls).toFixed(1),
					totalMs: +s.time.toFixed(2),
					successMs: +s.successTime.toFixed(2),
					failureMs: +s.failureTime.toFixed(2),
					avgMs: +(s.time / s.calls).toFixed(3),
					maxMs: +s.maxTime.toFixed(2)
				})).sort((a, b) => b.totalMs - a.totalMs);

				const typeRows = Object.entries(types).map(([type, s]) => ({
					type,
					count: s.count,
					totalMs: +s.time.toFixed(2)
				})).sort((a, b) => b.count - a.count);

				return {
					functions: functionRows,
					types: typeRows
				};
			}
		}),
		{
			name: 'sudoku-hints', // Unique name for the storage item
			storage: createJSONStorage(() => sessionStorage), // Use session storage
		}
	)
);
