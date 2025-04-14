// A dictionary mapping extensions to MIME types and vice versa.
const extensionToMimeMap: Record<string, string> = {
	'7z': 'application/x-7z-compressed',
	aac: 'audio/aac',
	apng: 'image/apng',
	avi: 'video/avi',
	avif: 'image/avif',
	bmp: 'image/bmp',
	bz2: 'application/x-bzip2',
	c: 'text/x-c',
	clj: 'text/x-clojure',
	coffee: 'text/coffeescript',
	cpp: 'text/x-c++',
	crx: 'application/x-chrome-extension',
	cs: 'text/x-csharp',
	css: 'text/css',
	csv: 'text/csv',
	dart: 'application/dart',
	el: 'text/x-emacs-lisp',
	erl: 'text/x-erlang',
	f: 'text/x-fortran',
	f90: 'text/x-fortran',
	flac: 'audio/flac',
	flc: 'video/flc',
	gif: 'image/gif',
	go: 'text/x-go',
	gz: 'application/gzip',
	h: 'text/x-c',
	hs: 'text/x-haskell',
	htm: 'text/html',
	html: 'text/html',
	ico: 'image/vnd.microsoft.icon',
	iso: 'application/x-iso9660-image',
	java: 'text/x-java-source',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	js: 'text/javascript',
	json: 'application/json',
	jsx: 'text/jsx',
	kt: 'text/x-kotlin',
	lua: 'text/x-lua',
	lz: 'application/x-lzip',
	lzma: 'application/x-lzma',
	m4a: 'audio/x-m4a',
	m4v: 'video/mp4',
	md: 'text/markdown',
	mht: 'multipart/related',
	mhtml: 'multipart/related',
	mid: 'audio/midi',
	midi: 'audio/midi',
	mjs: 'text/javascript',
	ml: 'text/x-ocaml',
	mli: 'text/x-ocaml',
	mov: 'video/quicktime',
	mp3: 'audio/mpeg',
	mp4: 'video/mp4',
	oga: 'audio/ogg',
	ogg: 'audio/ogg',
	ogm: 'video/ogg',
	ogv: 'video/ogg',
	opus: 'audio/ogg',
	otf: 'font/otf',
	php: 'application/x-httpd-php',
	pl: 'text/x-perl',
	png: 'image/png',
	py: 'text/x-python',
	r: 'text/x-r',
	ra: 'audio/vnd.rn-realaudio',
	rar: 'application/vnd.rar',
	rb: 'text/x-ruby',
	rs: 'text/x-rust',
	scala: 'text/x-scala',
	sh: 'application/x-sh',
	shtm: 'text/html',
	shtml: 'text/html',
	sql: 'application/sql',
	svg: 'image/svg+xml',
	svgz: 'image/svg+xml',
	swift: 'text/x-swift',
	tar: 'application/x-tar',
	tex: 'application/x-tex',
	tiff: 'image/tiff',
	toml: 'application/toml',
	ts: 'text/typescript',
	tsx: 'text/tsx',
	ttf: 'font/ttf',
	vb: 'text/x-vb',
	wasm: 'application/wasm',
	wav: 'audio/wav',
	webm: 'video/webm',
	webp: 'image/webp',
	wma: 'audio/x-ms-wma',
	wmv: 'video/x-ms-wmv',
	woff: 'font/woff',
	woff2: 'font/woff2',
	xht: 'application/xhtml+xml',
	xhtm: 'application/xhtml+xml',
	xhtml: 'application/xhtml+xml',
	xml: 'text/xml',
	xz: 'application/x-xz',
	yaml: 'text/yaml',
	yml: 'text/yaml',
	zip: 'application/zip',
	zst: 'application/zstd',
};

const mimeToExtensionMap: Record<string, string> = Object.entries(
	extensionToMimeMap
).reduce(
	(acc, [ext, mime]) => {
		if (!acc[mime]) {
			acc[mime] = ext;
		}
		return acc;
	},
	{} as Record<string, string>
);

/**
 * Get the MIME type for a given file extension.
 * @param extension The file extension (e.g., "mp3").
 * @returns The corresponding MIME type, or undefined if not found.
 */
export function getMimeTypeFromExtension(extension: string): string {
	if (extension === '') {
		return 'application/octet-stream';
	}
	const mime = extensionToMimeMap[extension.toLowerCase()];
	if (mime) {
		return mime;
	}
	// Otherwise, just make as text/...
	return `text/${extension}`;
}

/**
 * Get the preferred file extension for a given MIME type.
 * @param mimeType The MIME type (e.g., "audio/mpeg").
 * @returns The corresponding file extension, or undefined if not found.
 */
export function getExtensionFromMimeType(mimeType: string): string {
	const ext = mimeToExtensionMap[mimeType.toLowerCase()];
	if (ext) {
		return ext;
	}
	// Otherwise, just put the second part of the MIME type as the extension
	const parts = mimeType.split('/', 2);
	if (parts.length === 2) {
		return parts[1];
	}
	// If all else fails, return the original MIME type
	return parts[0];
}

export const getMimeTypeFromFileName = (fileName: string): string => {
	const lastSliceIdx = Math.max(
		fileName.lastIndexOf('\\'),
		fileName.lastIndexOf('/')
	);
	const name =
		lastSliceIdx >= 0 ? fileName.slice(lastSliceIdx + 1) : fileName;
	const ext = name.split('.').pop() || '';
	return getMimeTypeFromExtension(ext);
};
