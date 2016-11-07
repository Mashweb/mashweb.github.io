/*
 * The idea of the code below is to allow the user to
 * move any block element contained by an element of CSS class "container-box"
 * from one position to another within the parent box's NodeList,
 * assuming all the elements in the NodeList are block elements.
 * We want to give it a direct-manipulation feel,
 * so we "grab" the DIV by temporarily converting its position value to
 * "relative".
 *
 * The critical position for any block box B is, for the sake of a good GUI effect,
 * halfway between the top and bottom of the box. If the bottom of the
 * box in motion is dropped farther down the web page than this position, the
 * box in motion will be moved somewhere *after* box B in the parent's NodeList.
 * If the bottom of the box in motion is up the page from the critical position
 * for any block box B, the box in motion will be moved somewhere *before* box B
 * unless the block in motion would be moved after itself, in which case the
 * operation is considered a null operation and ignored.
 *
 * Take an example.
 * If the following diagram represents the web page, box 0 is the box in motion,
 * and box 0 is dropped at vertical position Y=145, box 0 will not be moved
 * in the NodeList. For drop position Y=155, box 0 will be moved just after
 * box 1 in the NodeList. The only special case is when box 0 is the box in motion
 * and it gets dropped between postion Y=51 and position Y=150; in this case
 * the box in motion would move just after itself in the NodeList. This is a
 * null operation.
 *
 *      +-----+ 0
 *      |     |
 *      |  0  | <- critcal position for block 0
 *      |     |
 *      +-----+ 100
 *      |     |
 *      |  1  | <- critcal position for block 1
 *      |     |
 *      +-----+ 200
 *      |     |
 *      |     |
 *      |     |
 *      |  2  | <- critical position for bock 2
 *      |     |
 *      |     |
 *      |     |
 *      +-----+ 400
 *      |     |
 *      |  3  | <- critcal position for block 3
 *      |     |
 *      +-----+ 500
 *
 * FIXME: Certain page structures and widths of the web page make it difficult
 * to highlight horizontal lines (with the red border) by passing the mouse over
 * them, because the element's extra size when highlighted makes all the
 * containers' content shift around, affecting the computed position of elements.
 *
 * FIXME: Allow any static block to be moved to any position in the NodeList.
 *
 * FIXME: Allow any parent element to participate. The parent element is the
 * element whose children are the moving element or its siblings.
 * This code is for a prototype GUI, so it is assumed that the parent
 * element will be determined by a different method than the method used here.
 * An unbroken subcollection of block elements in a NodeList should be outlined
 * to show that any position in it is an easy target for dropping a block.
 * Subcollections of elements separated by inline or inline-block elements
 * will be handled differently; they will need to be handled like blocks
 * with separate parents.
 *
 * FIXME: Make the setting of the body's margin property to 0, which is being
 * done here in block.html, unnecessary.
 */

// DOM elements
var container, box, boxInMotion, targetBox, boxes = [];

// CSS stuff
var boxClass, boxTop, startY, deltaY; //FIXME: Get rid of variables boxBorder, containerBorder, startY, deltaY.

// Only after a mousedown event is the move process begun,
// but the mousemove handler can be called many times before then. Hence this.
var inDragProcess = false;

// Moves smaller than minGesture pixels don't move an element in the NodeList.
var minGesture = 10;

// Return value of the method getBoundingClientRect (part of the prototype of an element).
// This allows us to get the absolute positions of a block.
var boundingRect;

// bimIndex is the NodeList index of the box in motion before removal from the NodeList.
var bimIndex;

// targetBoxIndex gets set to the NodeList index of the block *after* which the moving box should be put.
var targetBoxIndex;

// Each "critical position" is the lowest absolute vertical position where, if the top of the box in motion
// is dropped there, the box in motion will be inserted into the DOM before the box underneath, in the NodeList.
// If the box in motion is dropped at a position lower than that, it will be inserted somewhere later
// in the NodeList.
var criticalPositions = [];

init = function( ) {
    var str, body;
    console.info( "block-mover.js" );
    container = document.getElementsByClassName( "container-box" )[0];
    calcCriticalPositions( "init: " );
    body = document.getElementsByTagName( "body" )[0];
    //body.addEventListener( "mouseclick", handleMouseclick );    
    body.addEventListener( "mousedown", handleMousedown );
    body.addEventListener( "mouseup", handleMouseup );
    container.addEventListener( "mousemove", handleMousemove );
    initHighlighter( container );
    targetBoxIndex = 0;
    saveBorders( );
}

findBoxIndex = function( box ) {
    // container.children is a NodeList, not an Array, but it is Array-like, so we can apply the indexOf() like this.
    return Array.prototype.indexOf.call( container.children, box );
}

calcCriticalPositions = function( str ) {
    boxes = Array.prototype.slice.call( container.children ); // Make a real Array from an HTMLCollection.
    str += "critical positions => ";
    for ( boxi = 0; boxi < boxes.length; boxi++ ) {
	boundingRect = boxes[boxi].getBoundingClientRect( );
	criticalPositions[boxi] =
	    Math.round((( boundingRect.bottom - boundingRect.top ) * 0.5 ) + boundingRect.top );
	str += criticalPositions[boxi] + ", ";
    }
    //console.debug( str );
}    

// NodeLists have an insertBefore method, but no insertAfter method, so we create this useful insertAfter function.
insertAfter = function( newElement, targetElement ) {
    if ( container.lastchild == targetElement ) {
	console.debug( "targetElement is container's lastchild" );
	container.appendChild( newElement );
    } else {
	container.insertBefore( newElement, targetElement.nextSibling );
    }
}

// When the primary mouse button is clicked, we prevent the default mouse-down event from occuring, remember the click
// target and find its index in its parent's NodeList, remember the state of the box, temporarily change its position
// type to relative, and start the box-dragging process.
handleMousedown = function( event ) {
    event.preventDefault( );
    //console.debug( "mousedown: clientY=" + event.clientY );
    boxInMotion = event.target;
    startY = event.clientY;
    bimIndex = findBoxIndex( boxInMotion );
    //console.debug( "mousedown: index of boxInMotion in its parent's NodeList => " + bimIndex );
    if ( findBoxIndex( boxInMotion ) == -1 ) {
	console.info( "Selected element cannot be handled in this prototype GUI" );
    } else {
	boxClass = boxInMotion.className;
	boxTop = boxInMotion.style.top;
	log( "handleMousedown: outlining boxes" );
	boxes.forEach( function( node ) { if ( node != boxInMotion ) { outlineOneNode( node, "blue" ); } } );
	boxInMotion.style.position = "relative";
	console.log("mousedown: adding 'draggable-block' class to boxInMotion");
	boxInMotion.className += " draggable-block";
	log( "handleMousedown: outlining container box in red" );
	outlineOneNode( container, "red" );
	inDragProcess = true;
    }
    console.debug( "mousedown: exit" );
}

handleMouseclick = function( event ) {
    event.preventDefault( );
    console.debug( "mouseclick: clientY=" + event.clientY );
    boxInMotion = event.target;
    bimIndex = findBoxIndex( boxInMotion );
    //console.debug( "mousedown: index of boxInMotion in its parent's NodeList => " + bimIndex );
    if ( findBoxIndex( boxInMotion ) == -1 ) {
	console.info( "Selected element cannot be handled in this prototype GUI" );
    } else {
	boxInMotion.className += " draggable-block";
    }
    console.debug( "mouseclick: exit" );
}

handleMouseup = function( event ) {
    if ( inDragProcess ) {
	console.debug( "" );
	deltaY = event.clientY - startY;
	//console.debug( "mouseup: deltaY => " + deltaY );
	//console.debug( "boxInMotion bottom => " + boundingRect.bottom + ", targetBoxIndex => " + targetBoxIndex +
	//	       ", criticalPositions[targetBoxIndex] => " + criticalPositions[targetBoxIndex] );
	if ( Math.abs( deltaY ) > minGesture ) {
	    if ( bimIndex == targetBoxIndex ) {
		console.warn( "Box in motion is its own target; this is a null operation." );
	    } else {
		//console.debug( "targetBoxIndex => " + targetBoxIndex );
		container.removeChild( boxInMotion );
		boxes.splice( boxi, 1 ); // Remove the box in motion from the array of element references.
		if ( targetBoxIndex == -1 ) { // -1 refers to a virtual target before all the boxes.
		    container.insertBefore( boxInMotion, boxes[0] );
		} else {
		    insertAfter( boxInMotion, targetBox );
		}
		boxes = Array.prototype.slice.call( container.children ); // Make a real Array from an HTMLCollection.
	    }
	} else {
	    console.warn( "Box not dragged more than minGesture pixels downward, so not moved." );
	}
	log( "handleMouseup: unoutlining boxes" );
	boxes.forEach( function( node ) { if ( node != boxInMotion ) { unoutlineOneNode( node ); } } );
	boxInMotion.style.position = "static";
	console.log("mousedown: removing 'draggable-block' class from boxInMotion");
	boxInMotion.className = boxClass;
	boxInMotion.style.top = boxTop;
	log( "handleMouseup: unoutlining container box" );
	unoutlineOneNode( container );
	calcCriticalPositions( "mouseup: exit: " );
	inDragProcess = false;
    }
}

handleMousemove = function( event ) {
    if ( inDragProcess ) {
	deltaY = event.clientY - startY;
	boxInMotion.style.top = deltaY;
	boundingRect = boxInMotion.getBoundingClientRect( );
	targetBoxIndex = boxes.length - 1;			
	for ( boxi = boxes.length - 1; boxi >= 0; boxi-- ) {
	    if ( boundingRect.bottom > criticalPositions[boxi] ) {
		break;
	    }
	    targetBoxIndex = boxi - 1;			
	}
	targetBox = boxes[targetBoxIndex];
	//console.debug( "mousemove: boxInMotion bottom => " + boundingRect.bottom +
	//	       ", criticalPositions[targetBoxIndex] => " + criticalPositions[targetBoxIndex] );
    }
}
