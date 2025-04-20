// A dictionary mapping extensions to MIME types and vice versa.
const extensionToMimeMap: Record<string, string> = {
	'7z': 'application/7z-compressed',
	aac: 'audio/aac',
	ada: 'text/ada',
	apng: 'image/apng',
	avi: 'video/avi',
	avif: 'image/avif',
	bash: 'application/sh',
	bat: 'application/bat',
	bf: 'text/bf',
	bmp: 'image/bmp',
	bz2: 'application/bzip2',
	c: 'text/c',
	clj: 'text/clojure',
	coffee: 'text/coffeescript',
	cpp: 'text/c++',
	crx: 'application/chrome-extension',
	cs: 'text/csharp',
	css: 'text/css',
	csv: 'text/csv',
	d: 'text/d',
	dart: 'application/dart',
	el: 'text/emacs-lisp',
	erl: 'text/erlang',
	f: 'text/fortran',
	f90: 'text/fortran',
	flac: 'audio/flac',
	flc: 'video/flc',
	frag: 'text/glsl',
	geo: 'text/glsl',
	gif: 'image/gif',
	go: 'text/go',
	gz: 'application/gzip',
	h: 'text/cpp',
	haml: 'text/haml',
	hs: 'text/haskell',
	hpp: 'text/cpp',
	htm: 'text/html',
	html: 'text/html',
	ico: 'image/vnd.microsoft.icon',
	iso: 'application/iso9660-image',
	java: 'text/java-source',
	jpeg: 'image/jpeg',
	jpg: 'image/jpeg',
	js: 'text/javascript',
	json: 'application/json',
	jsx: 'text/jsx',
	kt: 'text/kotlin',
	latex: 'application/latex',
	lisp: 'text/lisp',
	lua: 'text/lua',
	lz: 'application/lzip',
	lzma: 'application/lzma',
	m: 'text/matlab',
	m4a: 'audio/m4a',
	m4v: 'video/mp4',
	md: 'text/markdown',
	mht: 'multipart/related',
	mhtml: 'multipart/related',
	mid: 'audio/midi',
	midi: 'audio/midi',
	mjs: 'text/javascript',
	ml: 'text/ocaml',
	mli: 'text/ocaml',
	mov: 'video/quicktime',
	mp3: 'audio/mpeg',
	mp4: 'video/mp4',
	oga: 'audio/ogg',
	ogg: 'audio/ogg',
	ogm: 'video/ogg',
	ogv: 'video/ogg',
	opus: 'audio/ogg',
	otf: 'font/otf',
	php: 'application/httpd-php',
	pl: 'text/perl',
	png: 'image/png',
	py: 'text/python',
	r: 'text/r',
	ra: 'audio/vnd.rn-realaudio',
	rar: 'application/vnd.rar',
	rb: 'text/ruby',
	rs: 'text/rust',
	scala: 'text/scala',
	sh: 'application/sh',
	shtm: 'text/html',
	shtml: 'text/html',
	sql: 'application/sql',
	svg: 'image/svg+xml',
	svgz: 'image/svg+xml',
	swift: 'text/swift',
	tar: 'application/tar',
	tex: 'application/tex',
	tiff: 'image/tiff',
	toml: 'application/toml',
	ts: 'text/typescript',
	tsx: 'text/tsx',
	ttf: 'font/ttf',
	vb: 'text/vb',
	vert: 'text/glsl',
	wasm: 'application/wasm',
	wat: 'text/wasm-text',
	wast: 'text/wasm-text',
	wav: 'audio/wav',
	webm: 'video/webm',
	webp: 'image/webp',
	wma: 'audio/ms-wma',
	wmv: 'video/ms-wmv',
	woff: 'font/woff',
	woff2: 'font/woff2',
	xht: 'application/xhtml+xml',
	xhtm: 'application/xhtml+xml',
	xhtml: 'application/xhtml+xml',
	xml: 'text/xml',
	xz: 'application/xz',
	yaml: 'text/yaml',
	yml: 'text/yaml',
	zig: 'text/zig',
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
		if (parts[1].startsWith('x-')) {
			return parts[1].slice(2);
		}
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

export const getMarkdownLanguageFromExtension = (ext: string): string => {
	const mime = getMimeTypeFromExtension(ext);
	const [, subtype] = mime.split('/', 2);
	if (subtype.startsWith('x-')) {
		return subtype.slice(2);
	}
	return subtype;
};

export const getMarkdownLanguageFromFileName = (fileName: string): string => {
	const lastSliceIdx = Math.max(
		fileName.lastIndexOf('\\'),
		fileName.lastIndexOf('/')
	);
	const name =
		lastSliceIdx >= 0 ? fileName.slice(lastSliceIdx + 1) : fileName;
	const ext = name.split('.').pop() || '';
	return getMarkdownLanguageFromExtension(ext);
};
