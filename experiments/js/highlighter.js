/*
 * As the mouse pointer moves over a targetable element, highlight that element with a red border and a margin.
 * As the mouse pointer moves away from the element, reset the element's borders and margins.
 */

var previousTarget = null;

initHighlighter = function( ) {
    var body = document.getElementsByTagName( "body" )[ 0 ];
    body.addEventListener("mouseover", handleMouseover);
}

// TODO: Don't hightlight the document body element.
handleMouseover = function( event ) {
    var target = event.target;
    console.group( "handleMouseover" );
    console.dir( target );
    console.groupEnd( );
    if ( previousTarget !== null ) {
	// Restore the original style of the node the mouse pointer passed away from.
	unoutlineOneNode( previousTarget );
    }
    if ( previousTarget === null || previousTarget !== target ) {
	outlineOneNode( target, "aqua" );
	// Now the node is the "previous" node.
	previousTarget = target;
    }
}
