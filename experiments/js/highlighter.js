/*
 * highlighter.js
 *
 * As the mouse pointer moves over a targetable element, highlight that element with an aqua border and a margin.
 * As the mouse pointer moves away from the element, reset the element's borders and margins.
 */

module.exports = function( ) {

logger = require( "./logger.js" )();
outliner = require( "./outliner.js" )();

var element = null, previousElement = null;

initHighlighter = function( element ) {
    document.body.addEventListener( "mousemove", handleMousemoveX );
    // Save the original, statically set borders of the element the mouse is over.
    logger.log( "initHighlighter: calling saveStyle" );
    outliner.saveStyle( element );
};

// TODO: Maybe don't hightlight the document body element.
handleMousemoveX = function( event ) {
    element = event.target;
    //console.group( "handleMouseoverX" ); console.dir( element ); console.dir( previousElement ); console.groupEnd( );
    if ( previousElement !== element ) {
	//logger.log(["previous element", element, "x"]);
	logger.log("**outline current hover position");
	if ( previousElement !== null ) {
	    outliner.unoutlineOneElement( previousElement );
	}
	if ( element !== document.body ) {
	    //console.info( "highlighter: element is body; do not highlight it" );
	    outliner.outlineOneElement( element, "aqua" );
	}
	// Now the element is the "previous" element.
	previousElement = element;
    }
};

return { initHighlighter: initHighlighter };
};
