import type { Tree } from '@angular-devkit/schematics';

import { indexHtmlFromAst } from '../application/ast';
import { readOpenUiDocument } from './openui';

/**
 * Fixed texts the schematics generate. Labels, titles and button texts come from
 * the OpenUI document; these are the few texts no document attribute reaches.
 *
 * Messages use `{label}` and `{n}` placeholders; the generators turn them into a
 * template literal (`${label}`) or substitute them directly.
 */
export interface GeneratedMessages {
  readonly home: string;
  readonly back: string;
  readonly next: string;
  readonly finish: string;
  readonly required: string;
  readonly email: string;
  readonly minLength: string;
  readonly maxLength: string;
  readonly min: string;
  readonly max: string;
  readonly pattern: string;
  readonly invalid: string;
}

const EN: GeneratedMessages = {
  home: 'Home',
  back: 'Back',
  next: 'Next',
  finish: 'Finish',
  required: '{label} is required.',
  email: '{label} must be a valid email address.',
  minLength: '{label} must be at least {n} characters.',
  maxLength: '{label} must be at most {n} characters.',
  min: '{label} must be {n} or more.',
  max: '{label} must be {n} or less.',
  pattern: '{label} has an invalid format.',
  invalid: '{label} is invalid.',
};

const HE: GeneratedMessages = {
  home: 'בית',
  back: 'הקודם',
  next: 'הבא',
  finish: 'סיום',
  required: '{label} הוא שדה חובה.',
  email: '{label} חייב להיות כתובת דוא״ל תקינה.',
  minLength: '{label} חייב להכיל לפחות {n} תווים.',
  maxLength: '{label} חייב להכיל לכל היותר {n} תווים.',
  min: '{label} חייב להיות {n} או יותר.',
  max: '{label} חייב להיות {n} או פחות.',
  pattern: '{label} בפורמט לא תקין.',
  invalid: '{label} אינו תקין.',
};

/** One entry per primary language subtag; adding a language is adding an entry. */
const MESSAGES: Readonly<Record<string, GeneratedMessages>> = { en: EN, he: HE };

/**
 * The generated texts for a document language tag (`he`, `he-IL`, ...); English
 * when the language is absent or has no table.
 */
export function messagesFor(lang: string | undefined): GeneratedMessages {
  const primary = lang?.trim().toLowerCase().split('-')[0] ?? '';
  return MESSAGES[primary] ?? EN;
}

/**
 * The `uses.lang` of the OpenUI document's `html` node, or `undefined` when the
 * document has none. Read at rule time so nested compilers need only the path.
 */
export function documentLanguage(tree: Tree, documentPath: string): string | undefined {
  return indexHtmlFromAst(readOpenUiDocument(tree, documentPath), documentPath)?.lang;
}

/**
 * A message as the source of a TypeScript template literal body: `{label}` becomes
 * `${label}` and `{n}` becomes the given expression.
 */
export function messageTemplateLiteral(message: string, nExpression?: string): string {
  const escaped = message.replace(/[`\\]|\$\{/g, (match) => `\\${match}`);
  const withLabel = escaped.replaceAll('{label}', '${label}');
  return nExpression === undefined ? withLabel : withLabel.replaceAll('{n}', `\${${nExpression}}`);
}
