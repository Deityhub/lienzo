const MAX_LENGTH = 100;

/**
 * A file name that every system accepts: no path or reserved characters, no ".pdf" typed by the user (it is
 * added on download), no trailing dots or spaces. Empty when nothing usable is left.
 */
export function safeFileName(name: string): string {
	return (
		name
			// eslint-disable-next-line no-control-regex
			.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
			.replace(/\.pdf$/i, '')
			.slice(0, MAX_LENGTH)
			.replace(/[. ]+$/, '')
	);
}
