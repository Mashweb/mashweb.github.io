import { dumpLog, log, clearLog } from '../js/logger.js';
import { initHighlighter, handleMousemoveX } from '../js/highlighter.js';
import { saveStyle, outlineOneElement, unoutlineOneElement,
     ensureEnoughMargin, outlineAllElements, walkDOM,
     walkElementTree } from '../js/outliner.js';
function init() {
    outlineAllElements( 'red' );
}
clearLog();
log('The Main Module of the Node Browser is loaded.');

export { initHighlighter as default } from "../js/highlighter.js";
export { init };
