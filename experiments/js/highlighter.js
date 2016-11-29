module.exports = function( ) {

logger = require( "./logger.js" )();
outliner = require( "./outliner.js" )();

/*
 * As the mouse pointer moves over a targetable element, highlight that element with an aqua border and a margin.
 * As the mouse pointer moves away from the element, reset the element's borders and margins.
 */

var target = null, previousTarget = null;

initHighlighter = function( element ) {
    document.body.addEventListener( "mousemove", handleMousemoveX );
    // Save the original, statically set borders of the element the mouse is over.
    logger.log( "initHighlighter: calling saveStyle" );
    outliner.saveStyle( element );
};

// TODO: Maybe don't hightlight the document body element.
handleMousemoveX = function( event ) {
    target = event.target;
    //console.group( "handleMouseover" ); console.dir( target ); console.dir( previousTarget ); console.groupEnd( );
    /*
    if ( previousTarget !== null ) {
	// Restore the original style of the element the mouse pointer passed away from.
	logger.log("unoutline previous hover position");
	outliner.unoutlineOneElement( previousTarget );
    }
    */
    if ( previousTarget !== target ) {
	//logger.log(["previous target", target, "x"]);
	logger.log("**outline current hover position");
	if ( previousTarget !== null ) {
	    outliner.unoutlineOneElement( previousTarget );
	}
	outliner.outlineOneElement( target, "aqua" );
	// Now the target is the "previous" target.
	previousTarget = target;
    }
};

//return { initHighlighter: initHighlighter, target: target };
return { initHighlighter: initHighlighter };
};
