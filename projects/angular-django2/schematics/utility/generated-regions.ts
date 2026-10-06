/**
 * Generated regions: a schematic owns the text between a begin and an end marker and leaves
 * everything outside them alone, so a re-run applies a changed document without discarding hand
 * edits made around the generated output.
 * @internal
 */

export type CommentStyle = 'html' | 'css' | 'ts';

function comment(style: CommentStyle, text: string): string {
  switch (style) {
    case 'html':
      return `<!-- ${text} -->`;
    case 'css':
      return `/* ${text} */`;
    case 'ts':
      return `// ${text}`;
  }
}

export const beginMarker = (name: string, style: CommentStyle): string =>
  comment(style, `openui:begin ${name}`);

export const endMarker = (name: string, style: CommentStyle): string =>
  comment(style, `openui:end ${name}`);

/**
 * A region as it is written to a file. `body` is whole lines (empty, or ending with a newline);
 * `indent` is the indentation of the marker lines. The result has no trailing newline.
 */
export function renderRegion(name: string, style: CommentStyle, body: string, indent = ''): string {
  return `${beginMarker(name, style)}\n${body}${indent}${endMarker(name, style)}`;
}

/** Whether the content has the begin marker of the region. */
export function hasRegion(content: string, name: string, style: CommentStyle): boolean {
  return content.includes(beginMarker(name, style));
}

/**
 * Replaces the body of the region, keeping the indentation of its begin marker. Returns
 * `undefined` when the content has no complete region of that name.
 */
export function replaceRegion(
  content: string,
  name: string,
  style: CommentStyle,
  body: string,
): string | undefined {
  const begin = content.indexOf(beginMarker(name, style));
  if (begin === -1) {
    return undefined;
  }
  const end = content.indexOf(endMarker(name, style), begin);
  if (end === -1) {
    return undefined;
  }
  const lineStart = content.lastIndexOf('\n', begin - 1) + 1;
  const leading = content.slice(lineStart, begin);
  const indent = /^[ \t]*$/.test(leading) ? leading : '';
  return (
    content.slice(0, begin) +
    renderRegion(name, style, body, indent) +
    content.slice(end + endMarker(name, style).length)
  );
}
