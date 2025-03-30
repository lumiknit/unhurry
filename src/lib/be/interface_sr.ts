export type SpeechRecogState = {
	recognizing: boolean;
	timestampMS: number;
	completedText: string;
	partialText: string;
	errors: string[];
};

export interface ISpeechRecognizer {
	/**
	 * Error callback.
	 */
	onError?: (error: string) => void;

	/**
	 * Callback for each transcription.
	 * It may be called for both of interim & final results.
	 *
	 * For each call, transcript will be accumulated and passed as lastTranscript for the next call.
	 * If the recognition detect whole sentence, it will mark isFinal as true.
	 * In that case, lastTranscript will be flush out.
	 *
	 * For example, 'Hello,', 'World!', <fin>, 'Good' is given,
	 *
	 * onTranscript("Hello,", false, "") // interim
	 * onTranscript("Hello, World!", false, "Hello,") // interim
	 * onTranscript("Hello, World!", true, "Hello, World!") // final
	 * onTranscript("Good", false, "") // interim
	 * ...
	 */
	onTranscript?: (
		transcript: string,
		isFinal: boolean,
		lastTranscript: string
	) => void;

	/**
	 * Callback when speech recognizer is stopped.
	 * This is called only when recognizer is stopped by itself.
	 * When stop() is called, this will not be called.
	 */
	onStopped?: () => void;

	/**
	 * Start speech recognition.
	 */
	start(): Promise<boolean>;

	/**
	 * Stop speech recognition.
	 */
	stop(): Promise<boolean>;
}

// Browser-based speech

type SpeechRecognitionEvent = Event & {
	type: 'result';
	resultIndex: number;
	results: SpeechRecognitionResult[];
};

export class BrowserSpeechRecognizer implements ISpeechRecognizer {
	recognizing: boolean = false;
	languages: string[] = [];
	recognition: any | null = null;

	accumulatedText: string = '';

	onError?: (error: string) => void;
	onTranscript?: (
		transcript: string,
		isFinal: boolean,
		lastTranscript: string
	) => void;
	onStopped?: () => void;

	constructor() {
		const w = window as {
			SpeechRecognition?: any;
			webkitSpeechRecognition?: any;
		};
		const cls = w.SpeechRecognition || w.webkitSpeechRecognition;
		if (!cls) {
			throw new Error(
				'Speech recognition not supported in this browser.'
			);
		}

		this.recognition = new cls();
		this.recognition.interimResults = true;
		this.recognition.continuous = true;
		this.recognition.maxAlternatives = 1;

		this.recognition.onresult = (event: SpeechRecognitionEvent) => {
			const resultIndex = event.resultIndex;
			const result = event.results[resultIndex];
			const isFinal = result.isFinal;
			const transcript = result[0].transcript;

			this.onTranscript?.(transcript, isFinal, this.accumulatedText);
			this.accumulatedText = isFinal ? '' : transcript;
		};

		this.recognition.onerror = (event: ErrorEvent) => {
			this.onError?.(event.error);
		};

		this.recognition.onend = () => {
			this.recognizing = false;
			this.onStopped?.();
		};
	}

	async start(): Promise<boolean> {
		if (this.recognizing) {
			return false;
		}

		this.recognizing = true;
		this.accumulatedText = '';
		this.recognition.start();
		return true;
	}

	async stop(): Promise<boolean> {
		if (!this.recognizing) {
			return false;
		}

		this.recognizing = false;
		this.recognition.stop();
		return true;
	}
}
