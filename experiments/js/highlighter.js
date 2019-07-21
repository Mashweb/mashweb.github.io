/*
 * highlighter.js
 *
 * As the mouse pointer moves over a targetable element, highlight that element with an aqua border and a margin.
 * As the mouse pointer moves away from the element, reset the element's borders and margins.
 */

import { log } from "../js/logger.js";
import { brdr, propIndex, saveStyle, outlineOneElement, unoutlineOneElement } from "../js/outliner.js";

var element = null, previousElement = null;

function initHighlighter( element ) {
    document.body.addEventListener( "mousemove", handleMousemoveX );
    // Save the original, statically set borders of the element the mouse is over.
    log( "initHighlighter: calling saveStyle" );
    saveStyle( element );
};

// TODO: Maybe don't hightlight the document body element.
function handleMousemoveX( event ) {
    element = event.target;
    //console.group( "handleMouseoverX" ); console.dir( element ); console.dir( previousElement ); console.groupEnd( );
    if ( previousElement !== element ) {
	//log(["previous element", element, "x"]);
	log("**outline current hover position");
	if ( previousElement !== null ) {
	    unoutlineOneElement( previousElement );
	}
	if ( element !== document.body ) {
	    //console.info( "highlighter: element is body; do not highlight it" );
	    outlineOneElement( element, "aqua" );
	}
	// Now the element is the "previous" element.
	previousElement = element;
    }
};

export { initHighlighter, handleMousemoveX };
