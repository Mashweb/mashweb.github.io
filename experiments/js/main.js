/*
 * FIXME: Update the header comments to reflect the latest code.
 *
 * The idea of the code below is to allow the user to move any block or inline
 * element from one position to another within its parent box's NodeList.
 * We want to give it a direct-manipulation feel,
 * so we "grab" an element by temporarily converting its position value to
 * "relative" and tying its vertical position to the relative motion
 *  of the mouse.
 *
 * The critical position for any block box B is, for the sake of a good GUI effect,
 * halfway between the top and bottom of the box. If the top of the
 * box in motion is dropped farther down the web page than this position, the
 * box in motion will be moved somewhere *after* box B in the parent's NodeList.
 * If the bottom of the box in motion is up the page from the critical position
 * for box B, the box in motion will be moved somewhere *before* box B
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
 * FIXME: Allow any statically positioned block to be moved to any position
 * in the NodeList.
 *
 * FIXME: Make it possible to rearrange the NodeList positions of consequtive
 * inlines and inline-blocks by dragging them horizontally.
 *
 * FIXME: Make the mouse pointer always be over the upper lefthand corner of the
 * box-in-motion. There is some bug that prevents this from being so.
 */

// DOM elements
var container, box, boxInMotion, targetBox, boxes = [];

// CSS stuff
var boxClass, boxTop, boxLeft, boxDisplay;
var startingYDisplacement, currentYDisplacement, startingXDisplacement, currentXDisplacement;

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
// in the NodeList. The bounding rectangles are obtained for the necessary calculations.
var criticalYPositions = [], criticalXPositions = [], boundingRectangles = [];

// Perform all the page initialization.
init = function( ) {
    console.info( "Initializing block-mover.js" );
    highlighter = require( "./highlighter.js" )();
    logger = require( "./logger.js" )();
    outliner = require( "./outliner.js" )();
    // Add all the event listeners.
    var body = document.getElementsByTagName( "body" )[0];
    highlighter.initHighlighter( body ); // Initialize the mouseover event listener in the highlighter.js module.
    body.addEventListener( "mousedown", handleMousedown );
    body.addEventListener( "mouseup", handleMouseup );
    body.addEventListener( "mousemove", handleMousemove );
    container = body;
    console.debug( "" );
};

getCStyle = function( element ) {
    var computedStyle;
    try {
	computedStyle = window.getComputedStyle( element );
    }
    catch ( error ) {
	console.error( "window.getComputedStyle( element ) called with element " + element );
	alert( error );
    }
    return computedStyle;
};

findBoxIndex = function( box ) {
    //console.group( "findBoxIndex: container" ); console.dir( container ); console.groupEnd( );
    // container.children is a NodeList, not an Array, but it is Array-like, so we can apply the indexOf() like this.
    return Array.prototype.indexOf.call( container.children, box );
};

// For the current page structure, determine the regions where dropping a moving box will have different results.
// yPositions is a debug string to be constructed that represents all the critical Y-positions, prepended with a header.
calcCriticalPositions = function( header ) {
    var boxIndex, yPositions, xPositions, boxBounds, computedStyle;
    console.group( "calcCriticalPositions ["+header+"]: container" ); console.dir( container ); console.groupEnd( );
    yPositions = header + "critical Y positions => ";
    xPositions = header + "critical X positions => ";
    boxBounds = "box bounds (top, left) => ";
    for ( boxIndex = 0; boxIndex < boxes.length; boxIndex++ ) {
	boundingRect = boxes[boxIndex].getBoundingClientRect( );
	//console.debug( "id => " + boxes[boxIndex].id + ", top => " + boundingRect.top +
	//	       ", bottom => " + boundingRect.bottom );
	criticalYPositions[boxIndex] =
	    Math.round((( boundingRect.bottom - boundingRect.top ) * 0.5 ) + boundingRect.top );
	yPositions += criticalYPositions[boxIndex] + ", ";
    }
    console.group( "calcCriticalPositions: boxes" ); console.dir( boxes ); console.groupEnd( );
    for ( boxIndex = 0; boxIndex < boxes.length; boxIndex++ ) {
	computedStyle = window.getCStyle( boxes[boxIndex], null );
	boundingRect = boxes[boxIndex].getBoundingClientRect( );
	boundingRectangles[boxIndex] = boundingRect;
	if ( computedStyle.display == "inline" || computedStyle.display == "inline-block" ) {
	    //console.debug( "id => " + boxes[boxIndex].id + ", top => " + boundingRect.top +
	    //		   ", bottom => " + boundingRect.bottom );
	    criticalXPositions[boxIndex] =
		Math.round((( boundingRect.right - boundingRect.left ) * 0.5 ) + boundingRect.left );
	} else {
	    criticalXPositions[boxIndex] = -1; // Flag a block box, because it takes up the whole line.
	}
	xPositions += criticalXPositions[boxIndex] + ", ";
	boxBounds += boundingRect.top + ", " + boundingRect.left + "; ";
    }
    //console.debug( yPositions );
    //console.debug( xPositions );
    console.debug( boxBounds );
};

// NodeLists have an insertBefore method, but no insertAfter method, so we create this useful insertAfter function.
insertAfter = function( newElement, targetElement ) {
    if ( container.lastchild == targetElement ) {
	console.info( "targetElement is container's lastchild" );
	container.appendChild( newElement );
    } else {
	container.insertBefore( newElement, targetElement.nextSibling );
    }
};

// When the primary mouse button is clicked, we prevent the default mouse-down event from occuring, remember the click
// target and find its index in its parent's NodeList, remember the state of the box, temporarily change its position
// type to relative, and start the box-dragging process.
handleMousedown = function( event ) {
    var computedStyle;
    event.preventDefault( );
    //console.debug( "mousedown: event.clientY => " + event.clientY + ", event.clientX => " + event.clientX );
    boxInMotion = event.target;
    container = boxInMotion.parentElement;
    console.group( "mousedown: boxInMotion, container, container.children" );
    console.dir( boxInMotion ); console.dir( container ); console.dir (container.children );
    console.groupEnd( );
    //FIXME: Should boxes have to get set on every mousedown, other than for the first mousedown?
    boxes = Array.prototype.slice.call( container.children ); // Make a real Array from an HTMLCollection.
    //console.debug( "mousedown: calling findBoxIndex( boxInMotion )" );
    bimIndex = findBoxIndex( boxInMotion );
    if ( bimIndex == -1 ) {
	console.info( "The selected element cannot be handled in this prototype GUI." );
    } else {
	outliner.outlineOneElement( boxInMotion, "red" );
	calcCriticalPositions( "mousedown" );
	console.group( "mousedown: bimIndex, boundingRectangles" );
	console.debug( bimIndex ); console.dir( boundingRectangles );
	console.groupEnd( );
	startingYDisplacement = event.clientY - boundingRectangles[bimIndex].top;
	startingXDisplacement = event.clientX - boundingRectangles[bimIndex].left;
	//console.debug( "mousedown: startYDisplacement => " + startingYDisplacement +
	//	       ", startingXDisplacement => " + startingXDisplacement );
	boxClass = boxInMotion.className;
	boxTop = boxInMotion.style.top;
	boxLeft = boxInMotion.style.left;
	boxDisplay = boxInMotion.style.display;
	logger.log( "handleMousedown: outlining boxes" );
	//FIXME: The margins that the following line add to boxes spoils the boxInMotion position calculations.
	boxes.forEach(
	    function( element ) {
		if ( element != boxInMotion ) { outliner.outlineOneElement( element, "blue" ); } } );
	boxes.forEach(
	    function( element ) {
		if ( element != boxInMotion ) {
		    logger.log( [ "mousedown: element ",element,"preoutlineStyle.border "+
				  element.zen.preoutlineStyle.border ] );
		}
	    }
	);
	boxInMotion.style.position = "relative";
	//console.dir( boxInMotion );
	//console.debug( "mousedown: boxInMotion.style.display => " + boxInMotion.style.display );
	computedStyle = window.getCStyle( boxInMotion, null );
	if ( computedStyle.display == "inline" || computedStyle.display == "inline-block" ) {
	    console.debug( "mousedown: adding 'draggable-nsew-inline' class to boxInMotion" );
	    boxInMotion.className += " draggable-nsew-inline";
	    boxInMotion.style.left = startingXDisplacement;
	} else {
	    console.debug( "mousedown: adding 'draggable-block' class to boxInMotion" );
	    boxInMotion.className += " draggable-block";
	}
	//FIXME: Figure out why 10 needs to be subtracted from the X and Y positions to keep the cursor over the box.
	boxInMotion.style.top = startingYDisplacement - 10;
	boxInMotion.style.left = startingXDisplacement - 10;
	//console.debug( "mousedown: boxInMotion top => " + startingYDisplacement +
	//	       ", left => " + startingXDisplacement );
	logger.log( "handleMousedown: outlining container box in magenta" );
	outliner.outlineOneElement( container, "magenta" );
	inDragProcess = true;
    }
    console.debug( "" );
};

// If a block box's is constrained to move only vertically and not horizontally, it makes it obvious to the user
// that the block can only be moved vertically. However, we don't constrain it to move only vertically because
// if we did that, the mouse pointer could move horizontally away from the block while the block was still
// in motion.
handleMousemove = function( event ) {
    var boxIndex, computedStyle;
    //console.debug( "mousemove" );
    if ( inDragProcess ) {
	currentYDisplacement = event.clientY - boundingRectangles[bimIndex].top;
	currentXDisplacement = event.clientX - boundingRectangles[bimIndex].left;
	//FIXME: Figure out why 10 needs to be subtracted from the X and Y positions to keep the cursor over the box.
	boxInMotion.style.top = currentYDisplacement - 20;
	boxInMotion.style.left = currentXDisplacement - 20;
	//console.group( "boxInMotion" ); console.dir( boxInMotion ); console.groupEnd( );
	boundingRect = boxInMotion.getBoundingClientRect( );
	targetBoxIndex = boxes.length - 1;
	for ( boxIndex = boxes.length - 1; boxIndex >= 0; boxIndex-- ) {
	    if ( boundingRect.top > criticalYPositions[boxIndex] ) {
		break;
	    }
	    targetBoxIndex = boxIndex - 1;
	}
	if ( targetBoxIndex == -1 ) {
	    console.info( "The selected target element cannot be handled in this prototype GUI." );
	} else {
	targetBox = boxes[targetBoxIndex]; // This is the target box if there are no other boxes inline with it.
	//console.debug( "mousemove: boxInMotion bottom => " + boundingRect.bottom +
	//	       ", mousemove: boxInMotion right => " + boundingRect.right +
	//	       ", criticalYPositions[targetBoxIndex] => " + criticalYPositions[targetBoxIndex] );
	computedStyle = window.getCStyle( targetBox, null );
	if ( computedStyle.display == "inline-block" || computedStyle.display == "inline" ) {
	    console.debug( "mousemove: boxInMotion is passing over an " + computedStyle.display );
	    if ( typeof boxInMotion.zen.isTempBlock !== "undefined" ) {
		console.debug( "mousemove: restoring orignal class name and display type of boxInMotion" );
		delete boxInMotion.zen.isTempBlock;
		boxInMotion.className = boxClass;
		boxInMotion.display = boxDisplay;
	    }
	    if ( typeof boxInMotion.zen.isTempInline == "undefined" ) { // Prevent multiple additions of class name.
		boxInMotion.className = boxClass + " draggable-nsew-inline"; // Add class name.
		boxInMotion.zen.isTempInline = true;
	    }
	    boxInMotion.style.display = "inline-block";
	} else {
	    console.debug( "mousemove: boxInMotion is passing over a block" );
	    if ( typeof boxInMotion.zen.isTempInline !== "undefined" ) {
		console.debug( "mousemove: restoring orignal class name and display type of boxInMotion" );
		delete boxInMotion.zen.isTempInline;
		boxInMotion.className = boxClass;
		boxInMotion.display = boxDisplay;
	    }
	    if ( typeof boxInMotion.zen.isTempBlock == "undefined" ) { // Prevent multiple additions of class name.
		console.debug( "mousemove: adding 'draggable-block' class to boxInMotion" );
		boxInMotion.className = boxClass + " draggable-block"; // Add class name.
		boxInMotion.zen.isTempBlock = true;
	    }
	    boxInMotion.style.display = "block";
	}}
    }
};

handleMouseup = function( event ) {
    var deltaY;
    if ( inDragProcess ) {
	console.debug( "" );
	logger.log( "handleMouseup: unoutlining boxInMotion" );
	if ( findBoxIndex( boxInMotion ) !== -1 ) {
	    try {
		outliner.unoutlineOneElement( boxInMotion );
	    }
	    catch ( error ) {
		console.error( "mouseup: " + error );
	    }
	}
	deltaY = event.clientY - startingYDisplacement;
	deltaX = event.clientX - startingXDisplacement;
	//console.debug( "mouseup: deltaY => " + deltaY );
	//console.debug( "mouseup: boxInMotion bottom => " + boundingRect.bottom +
	//	       ", top => " + boundingRect.top +
	//	       ", targetBoxIndex => " + targetBoxIndex +
	//	       ", criticalYPositions[targetBoxIndex] => " + criticalYPositions[targetBoxIndex] +
	//	       ", criticalXPositions[targetBoxIndex] => " + criticalXPositions[targetBoxIndex]
	//	     );
	if ( Math.abs( deltaY ) > minGesture ) {
	    if ( bimIndex == targetBoxIndex ) {
		console.warn( "Box in motion is its own target; this is a null operation." );
	    } else {
		//console.debug( "targetBoxIndex => " + targetBoxIndex );
		// Check to see if the box in motion is already first in the container and is targetted to be moved
		// to be the first in the container (-1, the virtual target before all other boxes). If both of those
		// conditions are met, no box needs to be moved.
		if ( bimIndex !== 0 || targetBoxIndex !== -1 ) {
		    container.removeChild( boxInMotion );
		    boxes.splice( bimIndex, 1 ); // Remove the box in motion from the array of element references.
		    if ( targetBoxIndex == -1 ) { // -1 refers to a virtual target before all the boxes.
			container.insertBefore( boxInMotion, boxes[0] );
		    } else {
			try {
			    insertAfter( boxInMotion, targetBox );
			}
			catch ( error ) {
			    console.group( "insertAfter error: boxInMotion, targetBox" );
			    console.dir( boxInMotion ); console.dir( targetBox );
			    console.groupEnd( );
			}
		    }
		}
	    }
	} else {
	    console.warn( "Box not dragged more than minGesture pixels vertically, so not moved." );
	}
	logger.log( "handleMouseup: unoutlining boxes" );
	boxes.forEach( function( element ) {
	    if ( element != boxInMotion ) {
		try {
		    //logger.log( "handleMouseup: unoutlining element => " + element );
		    outliner.unoutlineOneElement( element );
		}
		catch ( error ) {
		    console.error( "mouseup forEach: " + error );
		    console.group( "element" ); console.dir( element ); console.groupEnd( );
		}
	    }
	} );
	boxInMotion.style.position = "static";
	//console.debug( "mouseup: removing 'draggable-block' class from boxInMotion" );
	console.debug( "mouseup: boxClass => " + boxClass + ", boxTop => " + boxTop +
		       ", boxDisplay => " + boxDisplay );
	boxInMotion.className = boxClass;
	boxInMotion.style.top = boxTop;
	boxInMotion.style.left = boxLeft;
	boxInMotion.style.display = boxDisplay;
	logger.log( "handleMouseup: unoutlining container box" );
	outliner.unoutlineOneElement( container );
	calcCriticalPositions( "mouseup: exit" );
	inDragProcess = false;
    }
}

document.addEventListener( "DOMContentLoaded", init );
