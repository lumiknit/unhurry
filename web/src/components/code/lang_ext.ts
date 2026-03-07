import { StreamLanguage, type LanguageSupport } from '@codemirror/language';
import type { Extension } from '@codemirror/state';

const langMap: {
	[key: string]: () => Promise<LanguageSupport | StreamLanguage<unknown>>;
} = {
	jsdown: () => import('./lang-jsdown').then((mod) => mod.jsdown()),

	// CM6 languages
	javascript: () =>
		import('@codemirror/lang-javascript').then((mod) => mod.javascript()),
	js: () => langMap['javascript'](),
	typescript: () =>
		import('@codemirror/lang-javascript').then((mod) =>
			mod.javascript({ typescript: true })
		),
	ts: () => langMap['typescript'](),
	jsx: () =>
		import('@codemirror/lang-javascript').then((mod) =>
			mod.javascript({ jsx: true })
		),
	tsx: () =>
		import('@codemirror/lang-javascript').then((mod) =>
			mod.javascript({ jsx: true, typescript: true })
		),
	python: () => import('@codemirror/lang-python').then((mod) => mod.python()),
	py: () => langMap['python'](),
	markdown: () =>
		import('@codemirror/lang-markdown').then((mod) => mod.markdown()),
	md: () => langMap['markdown'](),
	yaml: () => import('@codemirror/lang-yaml').then((mod) => mod.yaml()),
	yml: () => langMap['yaml'](),
	go: () => import('@codemirror/lang-go').then((mod) => mod.go()),
	wast: () => import('@codemirror/lang-wast').then((mod) => mod.wast()),
	rust: () => import('@codemirror/lang-rust').then((mod) => mod.rust()),
	rs: () => langMap['rust'](),
	json: () => import('@codemirror/lang-json').then((mod) => mod.json()),
	css: () => import('@codemirror/lang-css').then((mod) => mod.css()),
	sass: () => import('@codemirror/lang-sass').then((mod) => mod.sass()),
	scss: () => import('@codemirror/lang-sass').then((mod) => mod.sass()),
	xml: () => import('@codemirror/lang-xml').then((mod) => mod.xml()),
	cpp: () => import('@codemirror/lang-cpp').then((mod) => mod.cpp()),
	c: () => import('@codemirror/lang-cpp').then((mod) => mod.cpp()),
	java: () => import('@codemirror/lang-java').then((mod) => mod.java()),
	html: () => import('@codemirror/lang-html').then((mod) => mod.html()),
	sql: () => import('@codemirror/lang-sql').then((mod) => mod.sql()),

	// Legacy languages
	scala: () =>
		import('@codemirror/legacy-modes/mode/clike').then((mod) =>
			StreamLanguage.define(mod.scala)
		),
	kotlin: () =>
		import('@codemirror/legacy-modes/mode/clike').then((mod) =>
			StreamLanguage.define(mod.kotlin)
		),
	kt: () => langMap['kotlin'](),
	lua: () =>
		import('@codemirror/legacy-modes/mode/lua').then((mod) =>
			StreamLanguage.define(mod.lua)
		),
	powershell: () =>
		import('@codemirror/legacy-modes/mode/powershell').then((mod) =>
			StreamLanguage.define(mod.powerShell)
		),
	pwsh: () => langMap['powershell'](),
	ruby: () =>
		import('@codemirror/legacy-modes/mode/ruby').then((mod) =>
			StreamLanguage.define(mod.ruby)
		),
	shell: () =>
		import('@codemirror/legacy-modes/mode/shell').then((mod) =>
			StreamLanguage.define(mod.shell)
		),
	sh: () => langMap['shell'](),
	swift: () =>
		import('@codemirror/legacy-modes/mode/swift').then((mod) =>
			StreamLanguage.define(mod.swift)
		),
	toml: () =>
		import('@codemirror/legacy-modes/mode/toml').then((mod) =>
			StreamLanguage.define(mod.toml)
		),
};

const loadedLangs: {
	[key: string]: LanguageSupport | StreamLanguage<unknown>;
} = {};

export const cmLangExt = async (langName: string): Promise<Extension> => {
	// Check if the language is already loaded
	if (loadedLangs[langName]) {
		return loadedLangs[langName];
	}

	const lang = langMap[langName];
	if (!lang) {
		return [];
	}
	const l = await lang();
	loadedLangs[langName] = l;
	return l;
};

export const isSupportedLang = (langName: string): boolean => {
	return !!langMap[langName];
};
