// Writes THIRD_PARTY_NOTICES.md: the open source code and fonts that ship with the app.
// Run after changing runtime dependencies or fonts:  yarn notices
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
// What the browser bundle and the server build contain. Build and test tools are not listed: they do not ship.
const ROOTS = [
	'svelte',
	'@sveltejs/kit',
	'@lucide/svelte',
	'@cantoo/pdf-lib',
	'@cantoo/fontkit',
	'html-to-image'
];

const packages = new Map();
function visit(name) {
	if (packages.has(name)) return;
	const dir = path.join(root, 'node_modules', name);
	const file = path.join(dir, 'package.json');
	if (!fs.existsSync(file)) return;
	const json = JSON.parse(fs.readFileSync(file, 'utf8'));
	let copyright = '';
	for (const entry of fs.readdirSync(dir)) {
		if (!/^(licen[cs]e|copying)/i.test(entry)) continue;
		const line = fs
			.readFileSync(path.join(dir, entry), 'utf8')
			.split('\n')
			.find((l) => /copyright/i.test(l) && /\d{4}/.test(l));
		if (line) {
			copyright = line
				.replace(/^[\s#*>-]+/, '')
				.replace(/\(c\)\s*/i, '')
				.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // keep the words of a markdown link
				.trim();
			break;
		}
	}
	packages.set(name, { version: json.version, license: json.license, copyright });
	for (const dep of Object.keys(json.dependencies ?? {})) visit(dep);
}
ROOTS.forEach(visit);

const rows = [...packages]
	.sort(([a], [b]) => a.localeCompare(b))
	.map(
		([name, p]) => `| ${name} | ${p.version} | ${p.license} | ${p.copyright || 'See the package'} |`
	)
	.join('\n');

const fonts = [
	['Inter', 'The Inter Project Authors', 'https://github.com/rsms/inter', 'OFL-1.1'],
	['Lato', 'Łukasz Dziedzic', 'https://fonts.google.com/specimen/Lato', 'OFL-1.1'],
	[
		'Merriweather',
		'The Merriweather Project Authors',
		'https://fonts.google.com/specimen/Merriweather',
		'OFL-1.1'
	],
	[
		'Montserrat',
		'The Montserrat Project Authors',
		'https://fonts.google.com/specimen/Montserrat',
		'OFL-1.1'
	],
	['Nunito', 'The Nunito Project Authors', 'https://fonts.google.com/specimen/Nunito', 'OFL-1.1'],
	[
		'Open Sans',
		'The Open Sans Project Authors',
		'https://fonts.google.com/specimen/Open+Sans',
		'OFL-1.1'
	],
	['Oswald', 'The Oswald Project Authors', 'https://fonts.google.com/specimen/Oswald', 'OFL-1.1'],
	[
		'Playfair Display',
		'The Playfair Project Authors',
		'https://fonts.google.com/specimen/Playfair+Display',
		'OFL-1.1'
	],
	['Poppins', 'Indian Type Foundry', 'https://fonts.google.com/specimen/Poppins', 'OFL-1.1'],
	[
		'Raleway',
		'The Raleway Project Authors',
		'https://fonts.google.com/specimen/Raleway',
		'OFL-1.1'
	],
	[
		'Roboto',
		'The Roboto Project Authors',
		'https://fonts.google.com/specimen/Roboto',
		'Apache-2.0 or OFL-1.1'
	],
	[
		'Roboto Condensed',
		'The Roboto Condensed Project Authors',
		'https://fonts.google.com/specimen/Roboto+Condensed',
		'Apache-2.0 or OFL-1.1'
	],
	[
		'Roboto Slab',
		'The Roboto Slab Project Authors',
		'https://fonts.google.com/specimen/Roboto+Slab',
		'Apache-2.0 or OFL-1.1'
	],
	['Source Code Pro', 'Adobe', 'https://github.com/adobe-fonts/source-code-pro', 'OFL-1.1']
]
	.map(([n, c, u, l]) => `| ${n} | ${c} | ${l} | <${u}> |`)
	.join('\n');

const MIT = `Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

const ISC = `Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.`;

const OFL = `PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide development of collaborative font projects, to support the font creation efforts of academic and linguistic communities, and to provide a free and open framework in which fonts may be shared and improved in partnership with others.

The OFL allows the licensed fonts to be used, studied, modified and redistributed freely as long as they are not sold by themselves. The fonts, including any derivative works, can be bundled, embedded, redistributed and/or sold with any software provided that any reserved names are not used by derivative works. The fonts and derivatives, however, cannot be released under any other type of license. The requirement for fonts to remain under this license does not apply to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright Holder(s) under this license and clearly marked as such. This may include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the copyright statement(s).

"Original Version" refers to the collection of Font Software components as distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting, or substituting -- in part or in whole -- any of the components of the Original Version, by changing formats or by porting the Font Software to a new environment.

"Author" refers to any designer, engineer, programmer, technical writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining a copy of the Font Software, to use, study, copy, merge, embed, modify, redistribute, and sell modified and unmodified copies of the Font Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components, in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled, redistributed and/or sold with any software, provided that each copy contains the above copyright notice and this license. These can be included either as stand-alone text files, human-readable headers or in the appropriate machine-readable metadata fields within text or binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font Name(s) unless explicit written permission is granted by the corresponding Copyright Holder. This restriction only applies to the primary font name as presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font Software shall not be used to promote, endorse or advertise any Modified Version, except to acknowledge the contribution(s) of the Copyright Holder(s) and the Author(s) or with their explicit written permission.

5) The Font Software, modified or unmodified, in part or in whole, must be distributed entirely under this license, and must not be distributed under any other license. The requirement for fonts to remain under this license does not apply to any document created using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM OTHER DEALINGS IN THE FONT SOFTWARE.`;

const quote = (text) =>
	text
		.split('\n')
		.map((l) => (l ? `> ${l}` : '>'))
		.join('\n');

const out = `# Third-party notices

Lienzo itself is licensed under the [GNU GPLv3](LICENSE). It includes the open source software and fonts below, each under its own license. This file is generated by \`yarn notices\`; do not edit it by hand.

## Software

These packages are part of the app that runs in your browser or on the server. Tools used only to build and test Lienzo are not included, because they are not distributed with it.

| Package | Version | License | Copyright |
| ------- | ------- | ------- | --------- |
${rows}

## Fonts

The fonts in \`src/lib/fonts\` and the static copies used for PDF export in \`static/pdf-fonts\` come from the projects below, as published on Google Fonts and by their authors. Roboto, Roboto Condensed and Roboto Slab have been published under both the Apache License 2.0 and the SIL Open Font License; the full text of the Apache License is at <https://www.apache.org/licenses/LICENSE-2.0.txt>.

| Font | Copyright holder | License | Source |
| ---- | ---------------- | ------- | ------ |
${fonts}

Fonts that were made from the originals (subset to Latin and Latin-extended, converted to WOFF2 and, for PDF export, to static instances) are modified versions as the OFL describes. None of them is sold on its own.

## Design

The look of the app follows the public design guidance of [Fluent 2](https://fluent2.microsoft.design/) from Microsoft. No Microsoft code or assets are included.

## License texts

### MIT License

Applies to the packages marked MIT. Each has its own copyright line, listed above.

${quote(MIT)}

### ISC License

Applies to \`@lucide/svelte\` (Lucide Contributors, and Cole Bemis for the parts derived from Feather).

${quote(ISC)}

### BSD Zero Clause License (0BSD)

Applies to \`tslib\`. It permits use, copying, modification and distribution without conditions.

### Apache License 2.0

Applies to \`aria-query\` and \`axobject-query\`. The full text is at <https://www.apache.org/licenses/LICENSE-2.0.txt>.

### SIL Open Font License 1.1

Applies to the fonts marked OFL-1.1. The text below is the license itself; each font's copyright holder is in the table above.

${quote(OFL)}
`;

fs.writeFileSync(path.join(root, 'THIRD_PARTY_NOTICES.md'), out);
process.stdout.write(`THIRD_PARTY_NOTICES.md: ${packages.size} packages, 14 font families\n`);
