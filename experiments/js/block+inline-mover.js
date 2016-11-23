/*
 * FIXME: Update the header comments to reflect the latest code.
 *
 * The idea of the code below is to allow the user to
 * move any block element contained by an element of CSS class "container-box"
 * from one position to another within the parent box's NodeList,
 * assuming all the elements in the NodeList are block elements.
 * We want to give it a direct-manipulation feel,
 * so we "grab" the DIV by temporarily converting its position value to
 * "relative" and tying its vertical position to the relative vertical motion
 *  of the mouse.
 *
 * The critical position for any block box B is, for the sake of a good GUI effect,
 * halfway between the top and bottom of the box. If the bottom of the
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
 * FIXME: Allow any parent element to participate. The parent element is the
 * element whose children are the moving element or its siblings.
 * The code in this file is for a prototype GUI, so it is assumed that the parent
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
    // Add all the event listeners.
    var body = document.getElementsByTagName( "body" )[0];
    body.addEventListener( "mousedown", handleMousedown );
    body.addEventListener( "mouseup", handleMouseup );
    container = document.getElementsByClassName( "container-box" )[0]; // The element we will work on.
    container.addEventListener( "mousemove", handleMousemove );
    initHighlighter( container ); // Initialize the mouseover event listener in the highlighter.js module.
    console.info( "Initializing block-mover.js" );
    // For the current page structure, determine the regions where dropping a moving box will have different results.
    calcCriticalPositions( "init: " );
    // Save the original, statically set borders of the elements we will highlight during page edits.
    saveBorders( );
}

getCStyle = function( node ) {
    var computedStyle;
    try {
	computedStyle = window.getComputedStyle( node );
    }
    catch ( error ) {
	console.error( "window.getComputedStyle( node ) called with node " + node );
	alert( error );
    }
    return computedStyle;
}

findBoxIndex = function( box ) {
    // container.children is a NodeList, not an Array, but it is Array-like, so we can apply the indexOf() like this.
    return Array.prototype.indexOf.call( container.children, box );
}

// yPositions is a debug string to be constructed that represents all the critical Y-positions, prepended with a header.
calcCriticalPositions = function( header ) {
    var boxIndex, yPositions, xPositions, boxBounds, computedStyle;
    boxes = Array.prototype.slice.call( container.children ); // Make a real Array from an HTMLCollection.
    yPositions = header + "critical Y positions => ";
    xPositions = header + "critical X positions => ";
    boxBounds = header + "box bounds (top, left) => ";
    for ( boxIndex = 0; boxIndex < boxes.length; boxIndex++ ) {
	boundingRect = boxes[boxIndex].getBoundingClientRect( );
	//console.debug( "id => " + boxes[boxIndex].id + ", top => " + boundingRect.top +
	//	       ", bottom => " + boundingRect.bottom );
	criticalYPositions[boxIndex] =
	    Math.round((( boundingRect.bottom - boundingRect.top ) * 0.75 ) + boundingRect.top );
	yPositions += criticalYPositions[boxIndex] + ", ";
    }
    for ( boxIndex = 0; boxIndex < boxes.length; boxIndex++ ) {
	computedStyle = window.getCStyle( boxes[boxIndex], null );
	//console.debug( "mousedown: Is computedStyle necessary? boxes[boxIndex].style.display => " +
	//	       boxes[boxIndex].display ); // Yes, necessary: the debug statement prints 'undefined'.
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
    var computedStyle;
    event.preventDefault( ); // I forget why this was necessary, but it was only necessary for 
    console.debug( "mousedown: event.clientY => " + event.clientY + ", event.clientX => " + event.clientX );
    boxInMotion = event.target;
    bimIndex = findBoxIndex( boxInMotion );
    if ( bimIndex == -1 ) {
	console.info( "The selected element cannot be handled in this prototype GUI." );
    } else {
	outlineOneNode( boxInMotion, "red" );
	startingYDisplacement = event.clientY - boundingRectangles[bimIndex].top;
	startingXDisplacement = event.clientX - boundingRectangles[bimIndex].left;
	console.debug( "mousedown: startYDisplacement => " + startingYDisplacement +
		       ", startingXDisplacement => " + startingXDisplacement );
	boxClass = boxInMotion.className;
	boxTop = boxInMotion.style.top;
	boxLeft = boxInMotion.style.left;
	boxDisplay = boxInMotion.style.display;
	log( "handleMousedown: outlining boxes" );
	//FIXME: The margins that the following line add to boxes spoils the boxInMotion position calculations.
	//boxes.forEach( function( node ) { if ( node != boxInMotion ) { outlineOneNode( node, "blue" ); } } );
	boxInMotion.style.position = "relative";
	//console.dir( boxInMotion );
	//console.debug( "mousedown: boxInMotion.style.display => " + boxInMotion.style.display );
	computedStyle = window.getCStyle( boxInMotion, null );
	//console.debug( "mousedown: Is computedStyle necessary? boxInMotion.style.display => " + boxInMotion.display );
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
	console.debug( "mousedown: boxInMotion top => " + startingYDisplacement +
		       ", left => " + startingXDisplacement );
	log( "handleMousedown: outlining container box in magenta" );
	outlineOneNode( container, "magenta" );
	inDragProcess = true;
    }
    //console.debug( "mousedown: exit" );
}

// If a block box's is constrained to move only vertically and not horizontally, it makes it obvious to the user
// that the block can only be moved vertically. However, we don't constrain it to move only vertically because
// if we did that, the mouse pointer could move horizontally away from the block while the block was still
// in motion.
handleMousemove = function( event ) {
    var boxIndex, computedStyle;
    if ( inDragProcess ) {
	currentYDisplacement = event.clientY - boundingRectangles[bimIndex].top;
	currentXDisplacement = event.clientX - boundingRectangles[bimIndex].left;
	//FIXME: Figure out why 10 needs to be subtracted from the X and Y positions to keep the cursor over the box.
	boxInMotion.style.top = currentYDisplacement - 20;
	boxInMotion.style.left = currentXDisplacement - 20;
	boundingRect = boxInMotion.getBoundingClientRect( );
	targetBoxIndex = boxes.length - 1;			
	for ( boxIndex = boxes.length - 1; boxIndex >= 0; boxIndex-- ) {
	    if ( boundingRect.bottom > criticalYPositions[boxIndex] ) {
		break;
	    }
	    targetBoxIndex = boxIndex - 1;			
	}
	targetBox = boxes[targetBoxIndex]; // This is the target box if there are no other boxes inline with it.
	//console.debug( "mousemove: boxInMotion bottom => " + boundingRect.bottom +
	//	       ", mousemove: boxInMotion right => " + boundingRect.right +
	//	       ", criticalYPositions[targetBoxIndex] => " + criticalYPositions[targetBoxIndex] );
	computedStyle = window.getCStyle( targetBox, null );
	//console.debug( "mousedown: Is computedStyle necessary? targetBox.style.display => " + targetBox.display );
	if ( computedStyle.display == "inline-block" ) { //FIXME: Add "inline" to the test?
	    console.debug( "mousemove: boxInMotion is passing over an inline-block" );
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
	}
    }
}

handleMouseup = function( event ) {
    var deltaY;
    if ( inDragProcess ) {
	console.debug( "" );
	if ( findBoxIndex( boxInMotion ) !== -1 ) {
	    unoutlineOneNode( boxInMotion );
	}
	deltaY = event.clientY - startingYDisplacement;
	deltaX = event.clientX - startingXDisplacement;
	console.debug( "mouseup: deltaY => " + deltaY );
	console.debug( "mouseup: boxInMotion bottom => " + boundingRect.bottom +
		       ", top => " + boundingRect.top +
		       ", targetBoxIndex => " + targetBoxIndex +
		       ", criticalYPositions[targetBoxIndex] => " + criticalYPositions[targetBoxIndex] +
		       ", criticalXPositions[targetBoxIndex] => " + criticalXPositions[targetBoxIndex]
		     );
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
			insertAfter( boxInMotion, targetBox );
		    }
		    boxes = Array.prototype.slice.call( container.children ); // Make real Array from HTMLCollection.
		}
	    }
	} else {
	    console.warn( "Box not dragged more than minGesture pixels vertically, so not moved." );
	}
	log( "handleMouseup: unoutlining boxes" );
	boxes.forEach( function( node ) { if ( node != boxInMotion ) { unoutlineOneNode( node ); } } );
	boxInMotion.style.position = "static";
	//console.debug( "mouseup: removing 'draggable-block' class from boxInMotion" );
	console.debug( "mouseup: boxClass => " + boxClass + ", boxTop => " + boxTop +
		       ", boxDisplay => " + boxDisplay );
	boxInMotion.className = boxClass;
	boxInMotion.style.top = boxTop;
	boxInMotion.style.left = boxLeft;
	boxInMotion.style.display = boxDisplay;
	log( "handleMouseup: unoutlining container box" );
	unoutlineOneNode( container );
	calcCriticalPositions( "mouseup: exit: " );
	inDragProcess = false;
    }
}
