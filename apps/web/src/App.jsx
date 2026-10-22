import { useScreenStore } from '@sudoku/common/store/screenStore';
import ManualGrid from '@sudoku/common/components/ManualGrid';
import Statistics from '@sudoku/common/components/Statistics';
import SudokuIcon from '@sudoku/common/assets/percentage-sudoku-192.png'
import WebGame from '/src/components/WebGame';

export default function App() {
	const screen = useScreenStore(s => s.screen);
	const refresh = useScreenStore(s => s.refresh);

	return (
		<div id="dashboard" className="mx-3 pb-4 flex flex-col h-dvh max-w-212 sudoku-container bg-slate-100">
			<div className="h-12 pl-2 flex flex-row items-center bg-slate-500">
				<img src={SudokuIcon} height="40" width="40" />
				<div className='ml-4 text-3xl font-bold text-white'>
					The Sudoku Percentage
				</div>
				<div className='ml-25 text-xl font-semibold text-white'>
					https://sudoku.percentage.net
				</div>
				</div>
			<div className="h-full min-h-0 bg-slate-100">
				{screen === 'game' &&
					<WebGame key={`game-${refresh}`} />
				}
				{screen === 'manual' &&
					<ManualGrid key={`manual-${refresh}`} />
				}
				{screen === 'statistics' &&
					<Statistics key={`manual-${refresh}`} />
				}
				</div>
		</div>

	)
}
