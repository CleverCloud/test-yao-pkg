import { styleText } from 'node:util';

/**
 * Creates a clickable terminal link using ANSI escape sequences.
 * The link will be styled in blue and clickable in supported terminals.
 * @param {string} url - The URL to link to
 * @param {string} [text=url] - The display text for the link, defaults to the URL
 * @returns {string}
 */
export function createTerminalLink (url, text = url) {
  return styleText('blue', `\u001b]8;;${url}\u001b\\${text}\u001b]8;;\u001b\\`);
}

/**
 * Template literal tag function that highlights interpolated values in yellow.
 * Used for creating highlighted console output with template literals.
 * @param {string[]} strings - The string parts of the template literal
 * @param {...any} values - The interpolated values to highlight
 * @returns {string}
 */
export function highlight (strings, ...values) {
  let result = '';
  for (let i = 0; i < strings.length; i++) {
    result += strings[i];
    if (i < values.length) {
      result += styleText('yellow', String(values[i]));
    }
  }
  return result;
}