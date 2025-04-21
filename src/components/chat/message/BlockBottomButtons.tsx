import { Component, Show } from 'solid-js';
import { toast } from 'solid-toast';

import { getExtensionFromMimeType } from '@/lib/artifact/mime';
import { getBEService } from '@/lib/be';
import { copyToClipboard } from '@/lib/clipboard';
import { uniqueID } from '@/lib/utils';

type BlockBottomButtonsProps = {
	getLang: () => string;
	getContent: () => string;

	onToggleFold?: () => void;
};

const BlockBottomButtons: Component<BlockBottomButtonsProps> = (props) => {
	return (
		<div class="msg-code-bottom-btns has-text-right is-size-7">
			<span>
				<button
					class="px-3 py-1"
					onClick={async (e) => {
						const be = await getBEService();
						const blob = new Blob([props.getContent()], {
							type: 'text/plain',
						});
						const ext =
							getExtensionFromMimeType(
								'text/' + props.getLang()
							) || props.getLang();
						const filename = `${uniqueID()}.${ext}`;
						await be.downloadFile(filename, blob);
						toast.success('Download started!');
						e.stopPropagation();
					}}
				>
					save
				</button>
				{'|'}
				<button
					class="px-3 py-1"
					onClick={(e) => {
						copyToClipboard(props.getContent());
						toast.success('Copied!');
						e.stopPropagation();
					}}
				>
					copy
				</button>
				<Show when={props.onToggleFold}>
					{'|'}
					<button class="px-3 py-1" onClick={props.onToggleFold}>
						fold
					</button>
				</Show>
			</span>
		</div>
	);
};

export default BlockBottomButtons;
