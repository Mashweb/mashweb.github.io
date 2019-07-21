import { dumpLog, log, clearLog } from '../js/logger.js';
import { initHighlighter, handleMousemoveX } from '../js/highlighter.js';
import { saveStyle, outlineOneElement, unoutlineOneElement,
     ensureEnoughMargin, outlineAllElements, walkDOM,
     walkElementTree } from '../js/outliner.js';
function init() {
    initHighlighter(document.getElementsByClassName( 'container-box' )[0]);
}
clearLog();
log('The Main Module of the Element Outliner is loaded.');

export { initHighlighter as default } from "../js/highlighter.js";
export { init };
