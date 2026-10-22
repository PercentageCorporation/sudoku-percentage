import { createRoot } from 'react-dom/client'
import "@sudoku/common/styles/tailwind.css";
import App from '/src/App';

createRoot(document.getElementById('root')).render(
	<div className='sudoku-container'>
		<App />
	</div>
)
