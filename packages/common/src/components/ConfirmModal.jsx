

export default function ConfirmModal({ title, content, onConfirm, onCancel }) {
	//console.log('ConfirmModal', open);
	function handleCancel() {
		console.log('handleCancel');
		if (onCancel) onCancel();
	}

	function handleConfirm() {
		console.log('handleConfirm');
		if (onConfirm) onConfirm();
	}

	return (
		<div id="confirm-modal" className="modal-overlay" >
			<div className="modal">
				<h3 className='font-bold'>{title}</h3>
				<h4>{content}</h4>

				<p id="confirm-message"></p>

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
	);
}
