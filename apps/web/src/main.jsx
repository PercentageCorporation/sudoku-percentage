import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { createRoot } from 'react-dom/client'
import "@sudoku/common/styles/tailwind.css";
import App from './App.jsx'
import ManualGrid from '@sudoku/common/components/ManualGrid';

createRoot(document.getElementById('root')).render(
	<Router>
		<div id="dashboard" className="flex flex-col h-dvh max-w-103 sudoku-container">
			<div className="h-full bg-slate-100">
				<Routes>
					<Route path="/" element={<App />} />
					<Route path="/manual" element={<ManualGrid />} />

					<Route path="*"	element={<p>There's nothing here: 404!</p>}	/>
				</Routes>
			</div>
		</div>
	</Router>
)
