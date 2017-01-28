(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*
 * _main.js
 *
 * The idea of this code is to allow the user to move any block or inline
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
 * and the top of box 0 is dropped at vertical position Y=4, box 0 will not be moved
 * in the NodeList. For drop position Y=105, box 0 will be moved just after
 * box 1 in the NodeList. The only special case is when box 0 is the box in motion
 * and its top gets dropped between postion Y=1 and position Y=104; in this case
 * the box in motion would move just after itself in the NodeList. This is a
 * null operation.
 *
 *      +-----+ 0
 *      |  0  | <- critcal position for block 0
 *      |     |
 *      |     |
 *      +-----+ 100
 *      |  1  | <- critcal position for block 1
 *      |     |
 *      |     |
 *      +-----+ 200
 *      |  2  | <- critical position for bock 2
 *      |     |
 *      |     |
 *      |     |
 *      |     |
 *      |     |
 *      |     |
 *      +-----+ 400
 *      |  3  | <- critcal position for block 3
 *      |     |
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
 *
 * FIXME: Use assertions to help improve program correctness.
 */

// DOM elements
var container, box, boxInMotion, targetBox, previousTargetBox = null, boxes = [];

// CSS stuff
var boxClass, boxTop, boxLeft, boxDisplay, boxBackgroundColor;
var startingYDisplacement, currentYDisplacement, startingXDisplacement, currentXDisplacement;

// Only after a mousedown event is the move process begun,
// but the mousemove handler can be called many times before then. Hence this.
var inDragProcess = false;

// Do not highlight a potential target box more than once when the box-in-motion passes over it.
var targetBoxIsHighlighted = false;

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
var dropRegionsYCoords = [], dropRegionsXCoords = [], boundingRectangles = [];

// Perform all the page initialization.
init = function( ) {
    console.info( "Initializing" );
    highlighter = require( "./highlighter.js" )();
    logger = require( "./logger.js" )();
    outliner = require( "./outliner.js" )();
    // Add all the event listeners.
    var body = document.getElementsByTagName( "body" )[0];
    highlighter.initHighlighter( body ); // Initialize the mouseover event listener in the highlighter.js module.
    body.addEventListener( "mousedown", handleMousedown );
    body.addEventListener( "mouseup", handleMouseup );
    body.addEventListener( "mousemove", handleMousemove );
    container = document.getElementsByClassName( "container-box" )[0] || document.body;
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
// dropRegionsYCoordsString is a debug string to be constructed that represents all the critical Y-positions,
// prepended with a header.
calcCriticalPositions = function( header ) {
    var boxIndex, dropRegionsYCoordsString, xPositions, boxBounds, computedStyle;
    console.group( "calcCriticalPositions ["+header+"]: container" ); console.dir( container ); console.groupEnd( );
    dropRegionsYCoordsString = header + "critical Y positions => ";
    xPositions = header + "critical X positions => ";
    boxBounds = "box bounds (top, left) => ";
    for ( boxIndex = 0; boxIndex < boxes.length; boxIndex++ ) {
	boundingRect = boxes[boxIndex].getBoundingClientRect( );
	//console.debug( "id => " + boxes[boxIndex].id + ", top => " + boundingRect.top +
	//	       ", bottom => " + boundingRect.bottom );
	dropRegionsYCoords[boxIndex] =
	    Math.round((( boundingRect.bottom - boundingRect.top ) * 0.05 ) + boundingRect.top );
	dropRegionsYCoordsString += dropRegionsYCoords[boxIndex] + ", ";
    }
    console.group( "calcCriticalPositions: boxes" ); console.dir( boxes ); console.groupEnd( );
    for ( boxIndex = 0; boxIndex < boxes.length; boxIndex++ ) {
	computedStyle = window.getCStyle( boxes[boxIndex], null );
	boundingRect = boxes[boxIndex].getBoundingClientRect( );
	boundingRectangles[boxIndex] = boundingRect;
	if ( computedStyle.display == "inline" || computedStyle.display == "inline-block" ) {
	    //console.debug( "id => " + boxes[boxIndex].id + ", top => " + boundingRect.top +
	    //		   ", bottom => " + boundingRect.bottom );
	    dropRegionsXCoords[boxIndex] =
		Math.round((( boundingRect.right - boundingRect.left ) * 0.05 ) + boundingRect.left );
	} else {
	    dropRegionsXCoords[boxIndex] = -1; // Flag a block box, because it takes up the whole line.
	}
	xPositions += dropRegionsXCoords[boxIndex] + ", ";
	boxBounds += boundingRect.top + ", " + boundingRect.left + "; ";
    }
    //console.debug( dropRegionsYCoordsString );
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
    console.debug( "mousedown: calling findBoxIndex( boxInMotion )" );
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
	boxInMotion.style.top = startingYDisplacement - 35;
	boxInMotion.style.left = startingXDisplacement - 15;
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
	boxInMotion.style.top = currentYDisplacement - 35;
	boxInMotion.style.left = currentXDisplacement - 15;
	//console.group( "boxInMotion" ); console.dir( boxInMotion ); console.groupEnd( );
	boundingRect = boxInMotion.getBoundingClientRect( );
	targetBoxIndex = boxes.length - 1;
	for ( boxIndex = boxes.length - 1; boxIndex >= 0; boxIndex-- ) {
	    if ( boundingRect.top > dropRegionsYCoords[boxIndex] ) {
		break;
	    }
	    targetBoxIndex = boxIndex - 1;
	}
	if ( targetBoxIndex == -1 ) {
	    console.info( "The selected target element cannot be handled in this prototype GUI." );
	} else {
	    
	    targetBox = boxes[targetBoxIndex]; // This is the target box if there are no other boxes inline with it.
	    if ( previousTargetBox !== targetBox && targetBox !== boxInMotion ) {
		console.debug( "mousemove: change of potential target, new potential => " + targetBoxIndex );
		if ( previousTargetBox !== null ) {
		    previousTargetBox.style.backgroundColor = boxBackgroundColor;
		}
		boxBackgroundColor = targetBox.style.backgroundColor;
		targetBox.style.backgroundColor = "gold";
		previousTargetBox = targetBox;
	    }
	    
	    //console.debug( "mousemove: boxInMotion bottom => " + boundingRect.bottom +
	    //	       ", mousemove: boxInMotion right => " + boundingRect.right +
	    //	       ", dropRegionsYCoords[targetBoxIndex] => " + dropRegionsYCoords[targetBoxIndex] );
	    computedStyle = window.getCStyle( targetBox, null );
	    console.debug( "mousemove: boxInMotion is passing over a(n) " + computedStyle.display );
	    if ( computedStyle.display == "inline-block" || computedStyle.display == "inline" ) {
		if ( typeof boxInMotion.zen.isTempBlock !== "undefined" ) {
		    console.debug( "mousemove: restoring orignal class name and display type of boxInMotion" );
		    delete boxInMotion.zen.isTempBlock;
		    boxInMotion.className = boxClass;
		    boxInMotion.display = boxDisplay;
		}
		if ( typeof boxInMotion.zen.isTempInline == "undefined" ) { // Prevent multiple additions of class name.
		    console.debug( "mousemove: adding 'draggable-nsew-inline' class to boxInMotion" );
		    boxInMotion.className = boxClass + " draggable-nsew-inline"; // Add class name.
		    boxInMotion.zen.isTempInline = true;
		}
		boxInMotion.style.display = "inline-block";
	    } else {
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
};

handleMouseup = function( event ) {
    var deltaY;
    if ( inDragProcess ) {
	console.debug( "" );
	targetBox.style.backgroundColor = boxBackgroundColor;
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
	//	       ", dropRegionsYCoords[targetBoxIndex] => " + dropRegionsYCoords[targetBoxIndex] +
	//	       ", dropRegionsXCoords[targetBoxIndex] => " + dropRegionsXCoords[targetBoxIndex]
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

},{"./highlighter.js":2,"./logger.js":3,"./outliner.js":4}],2:[function(require,module,exports){
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

},{"./logger.js":3,"./outliner.js":4}],3:[function(require,module,exports){
// Save history and dump some of it when called.

module.exports = function( ) {

function dumpLog( index = -5 ) {
    for ( ix = log.history.count + index; ix <= log.history.count; ix++ ) {
	console.debug(log.history[ix]);
    }
    return "Done.";
}

function log( obj ) {
    log.history = log.history || [];
    log.history.push(obj);
    log.history.count = log.history.count + 1 || 0;
}

function clearLog( ) {
    log.history = [];
    log.history.count = 0;
}

return { log: log, dumpLog: dumpLog, clearLog: clearLog };
};

},{}],4:[function(require,module,exports){
/*
 * outliner.js
 */

module.exports = function( ) {

logger = require( "./logger.js" )();

var computedProps = [];

function saveStyle( container ) {
    //console.debug("saveStyle");
    var elements = Array.prototype.slice.call( container.children ); // Make real Array from HTMLCollection.
    logger.log( "saveStyle: enter" );
    elements.forEach( function( element ) {
	if ( typeof element.zen == "undefined" || typeof element.zen.preoutlineStyle == "undefined" ) {
	    element.zen = {};
	    element.zen.preoutlineStyle = {};
	}
	element.zen.preoutlineStyle.border = element.style.border;
	element.zen.preoutlineStyle.margin = element.style.margin;
    } );
    if ( typeof container.zen == "undefined" || typeof container.zen.preoutlineStyle == "undefined" ) {
	container.zen = { };
	container.zen.preoutlineStyle = { };
    }
    container.zen.preoutlineStyle.border = container.style.border;
    container.zen.preoutlineStyle.margin = container.style.margin;
}

function outlineOneElement( element, color ) {
    var computedStyle;
    var propTab         = [ "marginTop",     "marginRight",     "marginBottom",     "marginLeft"     ];
    var computedPropTab = [ "margin-top",    "margin-right",    "margin-bottom",    "margin-left"    ];
    var id;

    //console.debug("outlineOneElement");
    if (typeof boxInMotion == "undefined") { id = "boxInMotion not found"; } else { id = boxInMotion.id; }
    if (typeof element.zen == "undefined") {
	brdr = "border not saved";
    } else {
	brdr = element.zen.preoutlineStyle.border;
    }
    logger.log( [ "outlineOneElement("+element.id+","+color+"):","now "+element.style.border,"prev "+brdr,"bim "+id ] );
    /*
    if (element == document.body) { // Don't outline the document body element.
	logger.log("outlineOneElement: enter: called for body with color => " + color);
	return;
    }
    */
    if ( typeof element.zen == "undefined" || typeof element.zen.preoutlineStyle == "undefined" ) {
	logger.log( "outlineOneElement" );
	element.zen = {};
	element.zen.preoutlineStyle = {};
	element.zen.preoutlineStyle.border = element.style.border;
	element.zen.preoutlineStyle.margin = element.style.margin;
    }
    if ( typeof element.style == "undefined" ) {
	console.error("outlineOneElement: element.style is undefined");
    } else {
	// FIXME: This isn't optimal. It should do something like what the ensureMargin function does, but for borders.
	element.style.border = "3px solid " + color;
	// getComputedStyle is necessary here to accomodate any margin-related property in the user-agent stylesheet
	// such as -webkit-margin-before in Chrome. If such extra margin applied to <h1> elements were not
	// accomodated, passing the mouse pointer over an <h1> element would cause the margin to shrink suddenly
	// to just one pixel--a drastic and possibly disconcerting change of appearance.
	computedStyle = window.getComputedStyle(element, null);
	for ( propIndex = 0; propIndex < 4; propIndex++ ) {
	    computedProps[propIndex] = computedStyle.getPropertyValue( computedPropTab[propIndex] );
	    ensureEnoughMargin( element, propTab[propIndex], computedProps[propIndex] );
	}
    }
    //if (typeof boxInMotion == "undefined") { id = "boxInMotion not found"; } else { id = boxInMotion.id; }
}

function unoutlineOneElement ( element ) {
    //console.debug("unoutlineOneElement");
    try {
	if (typeof element.zen == "undefined") {
	    brdr = "border not saved";
	} else {
	    brdr = element.zen.preoutlineStyle.border;
	}
	boxInMotion = element;
	if (typeof boxInMotion == "undefined") { id = "boxInMotion not found"; } else { id = boxInMotion.id; }
	id = boxInMotion.id;
	if (typeof boxInMotion.id == "undefined") {
	    console.group("unoutlineOneElement: id"); console.dir(element); console.groupEnd();
	    debugger;
	}
	logger.log( [ "unoutlineOneElement("+element+"):","now "+element.style.border,"prev "+brdr,"bim "+id ] );
    }
    catch ( error ) {
	console.error( error + "unoutlineOneElement: element => " + element );
	logger.log( [ "unoutlineOneElement("+element+"):","now "+element.style.border,"prev "+brdr ] );
    }
    if (element !== document.body) {
	element.style.border = element.zen.preoutlineStyle.border;
	element.style.margin = element.zen.preoutlineStyle.margin;
    }
    //if (typeof boxInMotion == "undefined") { id = "boxInMotion not found"; } else { id = boxInMotion.id; }
}

// This function sets the top, right, bottom, or left margin of a element to 2 pixels
// unless the computed margin style is 2 or more pixels.
// The prop argument should be the property string for just one margin,
// i.e. of the format "3px", not "0px 3px" or the like.
// The computedProp argument should be the computed style for just one margin.
function ensureEnoughMargin( element, prop, computedProp ) {
    //console.debug("ensureMargin: prop => " + prop + ", computedProp => " + computedProp);
    if ( computedProp.slice( 0, computedProp.length - 2 ) < 2 ) {
	//console.debug( "Setting margin" );
	element.style[prop] = "2px";
    }
}

// Unused.
// This will fail if it encounters a text element and the like, because text elements have no style property.
// For that reason, use the outlineAllElements function instead.
function outlineAllElements( color ) {
    walkDOM( document.body,
	     function( element ) {
		 console.debug( "outlineAllElements: element => " + element );
		 outlineOneElement( element, color );
	     });
}

function outlineAllElements( color ) {
    walkElementTree( document.body,
		  function( element ) {
		      console.dir( element );
		      outlineOneElement( element, color );
		  });
}

// Unused.
function walkDOM( element, func ) {
    func( element );
    element = element.firstChild;
    while( element ) {
        walkDOM( element, func );
        element = element.nextSibling;
    }
}

function walkElementTree( element, func ) {
    func( element );
    element = element.firstElementChild;
    while( element ) {
        walkElementTree( element, func );
        element = element.nextElementSibling;
    }
}

return { saveStyle: saveStyle, outlineOneElement: outlineOneElement, unoutlineOneElement: unoutlineOneElement };
};

},{"./logger.js":3}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIl9tYWluLmpzIiwiaGlnaGxpZ2h0ZXIuanMiLCJsb2dnZXIuanMiLCJvdXRsaW5lci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwWkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKlxuICogX21haW4uanNcbiAqXG4gKiBUaGUgaWRlYSBvZiB0aGlzIGNvZGUgaXMgdG8gYWxsb3cgdGhlIHVzZXIgdG8gbW92ZSBhbnkgYmxvY2sgb3IgaW5saW5lXG4gKiBlbGVtZW50IGZyb20gb25lIHBvc2l0aW9uIHRvIGFub3RoZXIgd2l0aGluIGl0cyBwYXJlbnQgYm94J3MgTm9kZUxpc3QuXG4gKiBXZSB3YW50IHRvIGdpdmUgaXQgYSBkaXJlY3QtbWFuaXB1bGF0aW9uIGZlZWwsXG4gKiBzbyB3ZSBcImdyYWJcIiBhbiBlbGVtZW50IGJ5IHRlbXBvcmFyaWx5IGNvbnZlcnRpbmcgaXRzIHBvc2l0aW9uIHZhbHVlIHRvXG4gKiBcInJlbGF0aXZlXCIgYW5kIHR5aW5nIGl0cyB2ZXJ0aWNhbCBwb3NpdGlvbiB0byB0aGUgcmVsYXRpdmUgbW90aW9uXG4gKiAgb2YgdGhlIG1vdXNlLlxuICpcbiAqIFRoZSBjcml0aWNhbCBwb3NpdGlvbiBmb3IgYW55IGJsb2NrIGJveCBCIGlzLCBmb3IgdGhlIHNha2Ugb2YgYSBnb29kIEdVSSBlZmZlY3QsXG4gKiBoYWxmd2F5IGJldHdlZW4gdGhlIHRvcCBhbmQgYm90dG9tIG9mIHRoZSBib3guIElmIHRoZSB0b3Agb2YgdGhlXG4gKiBib3ggaW4gbW90aW9uIGlzIGRyb3BwZWQgZmFydGhlciBkb3duIHRoZSB3ZWIgcGFnZSB0aGFuIHRoaXMgcG9zaXRpb24sIHRoZVxuICogYm94IGluIG1vdGlvbiB3aWxsIGJlIG1vdmVkIHNvbWV3aGVyZSAqYWZ0ZXIqIGJveCBCIGluIHRoZSBwYXJlbnQncyBOb2RlTGlzdC5cbiAqIElmIHRoZSBib3R0b20gb2YgdGhlIGJveCBpbiBtb3Rpb24gaXMgdXAgdGhlIHBhZ2UgZnJvbSB0aGUgY3JpdGljYWwgcG9zaXRpb25cbiAqIGZvciBib3ggQiwgdGhlIGJveCBpbiBtb3Rpb24gd2lsbCBiZSBtb3ZlZCBzb21ld2hlcmUgKmJlZm9yZSogYm94IEJcbiAqIHVubGVzcyB0aGUgYmxvY2sgaW4gbW90aW9uIHdvdWxkIGJlIG1vdmVkIGFmdGVyIGl0c2VsZiwgaW4gd2hpY2ggY2FzZSB0aGVcbiAqIG9wZXJhdGlvbiBpcyBjb25zaWRlcmVkIGEgbnVsbCBvcGVyYXRpb24gYW5kIGlnbm9yZWQuXG4gKlxuICogVGFrZSBhbiBleGFtcGxlLlxuICogSWYgdGhlIGZvbGxvd2luZyBkaWFncmFtIHJlcHJlc2VudHMgdGhlIHdlYiBwYWdlLCBib3ggMCBpcyB0aGUgYm94IGluIG1vdGlvbixcbiAqIGFuZCB0aGUgdG9wIG9mIGJveCAwIGlzIGRyb3BwZWQgYXQgdmVydGljYWwgcG9zaXRpb24gWT00LCBib3ggMCB3aWxsIG5vdCBiZSBtb3ZlZFxuICogaW4gdGhlIE5vZGVMaXN0LiBGb3IgZHJvcCBwb3NpdGlvbiBZPTEwNSwgYm94IDAgd2lsbCBiZSBtb3ZlZCBqdXN0IGFmdGVyXG4gKiBib3ggMSBpbiB0aGUgTm9kZUxpc3QuIFRoZSBvbmx5IHNwZWNpYWwgY2FzZSBpcyB3aGVuIGJveCAwIGlzIHRoZSBib3ggaW4gbW90aW9uXG4gKiBhbmQgaXRzIHRvcCBnZXRzIGRyb3BwZWQgYmV0d2VlbiBwb3N0aW9uIFk9MSBhbmQgcG9zaXRpb24gWT0xMDQ7IGluIHRoaXMgY2FzZVxuICogdGhlIGJveCBpbiBtb3Rpb24gd291bGQgbW92ZSBqdXN0IGFmdGVyIGl0c2VsZiBpbiB0aGUgTm9kZUxpc3QuIFRoaXMgaXMgYVxuICogbnVsbCBvcGVyYXRpb24uXG4gKlxuICogICAgICArLS0tLS0rIDBcbiAqICAgICAgfCAgMCAgfCA8LSBjcml0Y2FsIHBvc2l0aW9uIGZvciBibG9jayAwXG4gKiAgICAgIHwgICAgIHxcbiAqICAgICAgfCAgICAgfFxuICogICAgICArLS0tLS0rIDEwMFxuICogICAgICB8ICAxICB8IDwtIGNyaXRjYWwgcG9zaXRpb24gZm9yIGJsb2NrIDFcbiAqICAgICAgfCAgICAgfFxuICogICAgICB8ICAgICB8XG4gKiAgICAgICstLS0tLSsgMjAwXG4gKiAgICAgIHwgIDIgIHwgPC0gY3JpdGljYWwgcG9zaXRpb24gZm9yIGJvY2sgMlxuICogICAgICB8ICAgICB8XG4gKiAgICAgIHwgICAgIHxcbiAqICAgICAgfCAgICAgfFxuICogICAgICB8ICAgICB8XG4gKiAgICAgIHwgICAgIHxcbiAqICAgICAgfCAgICAgfFxuICogICAgICArLS0tLS0rIDQwMFxuICogICAgICB8ICAzICB8IDwtIGNyaXRjYWwgcG9zaXRpb24gZm9yIGJsb2NrIDNcbiAqICAgICAgfCAgICAgfFxuICogICAgICB8ICAgICB8XG4gKiAgICAgICstLS0tLSsgNTAwXG4gKlxuICogRklYTUU6IENlcnRhaW4gcGFnZSBzdHJ1Y3R1cmVzIGFuZCB3aWR0aHMgb2YgdGhlIHdlYiBwYWdlIG1ha2UgaXQgZGlmZmljdWx0XG4gKiB0byBoaWdobGlnaHQgaG9yaXpvbnRhbCBsaW5lcyAod2l0aCB0aGUgcmVkIGJvcmRlcikgYnkgcGFzc2luZyB0aGUgbW91c2Ugb3ZlclxuICogdGhlbSwgYmVjYXVzZSB0aGUgZWxlbWVudCdzIGV4dHJhIHNpemUgd2hlbiBoaWdobGlnaHRlZCBtYWtlcyBhbGwgdGhlXG4gKiBjb250YWluZXJzJyBjb250ZW50IHNoaWZ0IGFyb3VuZCwgYWZmZWN0aW5nIHRoZSBjb21wdXRlZCBwb3NpdGlvbiBvZiBlbGVtZW50cy5cbiAqXG4gKiBGSVhNRTogQWxsb3cgYW55IHN0YXRpY2FsbHkgcG9zaXRpb25lZCBibG9jayB0byBiZSBtb3ZlZCB0byBhbnkgcG9zaXRpb25cbiAqIGluIHRoZSBOb2RlTGlzdC5cbiAqXG4gKiBGSVhNRTogTWFrZSBpdCBwb3NzaWJsZSB0byByZWFycmFuZ2UgdGhlIE5vZGVMaXN0IHBvc2l0aW9ucyBvZiBjb25zZXF1dGl2ZVxuICogaW5saW5lcyBhbmQgaW5saW5lLWJsb2NrcyBieSBkcmFnZ2luZyB0aGVtIGhvcml6b250YWxseS5cbiAqXG4gKiBGSVhNRTogTWFrZSB0aGUgbW91c2UgcG9pbnRlciBhbHdheXMgYmUgb3ZlciB0aGUgdXBwZXIgbGVmdGhhbmQgY29ybmVyIG9mIHRoZVxuICogYm94LWluLW1vdGlvbi4gVGhlcmUgaXMgc29tZSBidWcgdGhhdCBwcmV2ZW50cyB0aGlzIGZyb20gYmVpbmcgc28uXG4gKlxuICogRklYTUU6IFVzZSBhc3NlcnRpb25zIHRvIGhlbHAgaW1wcm92ZSBwcm9ncmFtIGNvcnJlY3RuZXNzLlxuICovXG5cbi8vIERPTSBlbGVtZW50c1xudmFyIGNvbnRhaW5lciwgYm94LCBib3hJbk1vdGlvbiwgdGFyZ2V0Qm94LCBwcmV2aW91c1RhcmdldEJveCA9IG51bGwsIGJveGVzID0gW107XG5cbi8vIENTUyBzdHVmZlxudmFyIGJveENsYXNzLCBib3hUb3AsIGJveExlZnQsIGJveERpc3BsYXksIGJveEJhY2tncm91bmRDb2xvcjtcbnZhciBzdGFydGluZ1lEaXNwbGFjZW1lbnQsIGN1cnJlbnRZRGlzcGxhY2VtZW50LCBzdGFydGluZ1hEaXNwbGFjZW1lbnQsIGN1cnJlbnRYRGlzcGxhY2VtZW50O1xuXG4vLyBPbmx5IGFmdGVyIGEgbW91c2Vkb3duIGV2ZW50IGlzIHRoZSBtb3ZlIHByb2Nlc3MgYmVndW4sXG4vLyBidXQgdGhlIG1vdXNlbW92ZSBoYW5kbGVyIGNhbiBiZSBjYWxsZWQgbWFueSB0aW1lcyBiZWZvcmUgdGhlbi4gSGVuY2UgdGhpcy5cbnZhciBpbkRyYWdQcm9jZXNzID0gZmFsc2U7XG5cbi8vIERvIG5vdCBoaWdobGlnaHQgYSBwb3RlbnRpYWwgdGFyZ2V0IGJveCBtb3JlIHRoYW4gb25jZSB3aGVuIHRoZSBib3gtaW4tbW90aW9uIHBhc3NlcyBvdmVyIGl0LlxudmFyIHRhcmdldEJveElzSGlnaGxpZ2h0ZWQgPSBmYWxzZTtcblxuLy8gTW92ZXMgc21hbGxlciB0aGFuIG1pbkdlc3R1cmUgcGl4ZWxzIGRvbid0IG1vdmUgYW4gZWxlbWVudCBpbiB0aGUgTm9kZUxpc3QuXG52YXIgbWluR2VzdHVyZSA9IDEwO1xuXG4vLyBSZXR1cm4gdmFsdWUgb2YgdGhlIG1ldGhvZCBnZXRCb3VuZGluZ0NsaWVudFJlY3QgKHBhcnQgb2YgdGhlIHByb3RvdHlwZSBvZiBhbiBlbGVtZW50KS5cbi8vIFRoaXMgYWxsb3dzIHVzIHRvIGdldCB0aGUgYWJzb2x1dGUgcG9zaXRpb25zIG9mIGEgYmxvY2suXG52YXIgYm91bmRpbmdSZWN0O1xuXG4vLyBiaW1JbmRleCBpcyB0aGUgTm9kZUxpc3QgaW5kZXggb2YgdGhlIGJveCBpbiBtb3Rpb24gYmVmb3JlIHJlbW92YWwgZnJvbSB0aGUgTm9kZUxpc3QuXG52YXIgYmltSW5kZXg7XG5cbi8vIHRhcmdldEJveEluZGV4IGdldHMgc2V0IHRvIHRoZSBOb2RlTGlzdCBpbmRleCBvZiB0aGUgYmxvY2sgKmFmdGVyKiB3aGljaCB0aGUgbW92aW5nIGJveCBzaG91bGQgYmUgcHV0LlxudmFyIHRhcmdldEJveEluZGV4O1xuXG4vLyBFYWNoIFwiY3JpdGljYWwgcG9zaXRpb25cIiBpcyB0aGUgbG93ZXN0IGFic29sdXRlIHZlcnRpY2FsIHBvc2l0aW9uIHdoZXJlLCBpZiB0aGUgdG9wIG9mIHRoZSBib3ggaW4gbW90aW9uXG4vLyBpcyBkcm9wcGVkIHRoZXJlLCB0aGUgYm94IGluIG1vdGlvbiB3aWxsIGJlIGluc2VydGVkIGludG8gdGhlIERPTSBiZWZvcmUgdGhlIGJveCB1bmRlcm5lYXRoLCBpbiB0aGUgTm9kZUxpc3QuXG4vLyBJZiB0aGUgYm94IGluIG1vdGlvbiBpcyBkcm9wcGVkIGF0IGEgcG9zaXRpb24gbG93ZXIgdGhhbiB0aGF0LCBpdCB3aWxsIGJlIGluc2VydGVkIHNvbWV3aGVyZSBsYXRlclxuLy8gaW4gdGhlIE5vZGVMaXN0LiBUaGUgYm91bmRpbmcgcmVjdGFuZ2xlcyBhcmUgb2J0YWluZWQgZm9yIHRoZSBuZWNlc3NhcnkgY2FsY3VsYXRpb25zLlxudmFyIGRyb3BSZWdpb25zWUNvb3JkcyA9IFtdLCBkcm9wUmVnaW9uc1hDb29yZHMgPSBbXSwgYm91bmRpbmdSZWN0YW5nbGVzID0gW107XG5cbi8vIFBlcmZvcm0gYWxsIHRoZSBwYWdlIGluaXRpYWxpemF0aW9uLlxuaW5pdCA9IGZ1bmN0aW9uKCApIHtcbiAgICBjb25zb2xlLmluZm8oIFwiSW5pdGlhbGl6aW5nXCIgKTtcbiAgICBoaWdobGlnaHRlciA9IHJlcXVpcmUoIFwiLi9oaWdobGlnaHRlci5qc1wiICkoKTtcbiAgICBsb2dnZXIgPSByZXF1aXJlKCBcIi4vbG9nZ2VyLmpzXCIgKSgpO1xuICAgIG91dGxpbmVyID0gcmVxdWlyZSggXCIuL291dGxpbmVyLmpzXCIgKSgpO1xuICAgIC8vIEFkZCBhbGwgdGhlIGV2ZW50IGxpc3RlbmVycy5cbiAgICB2YXIgYm9keSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlUYWdOYW1lKCBcImJvZHlcIiApWzBdO1xuICAgIGhpZ2hsaWdodGVyLmluaXRIaWdobGlnaHRlciggYm9keSApOyAvLyBJbml0aWFsaXplIHRoZSBtb3VzZW92ZXIgZXZlbnQgbGlzdGVuZXIgaW4gdGhlIGhpZ2hsaWdodGVyLmpzIG1vZHVsZS5cbiAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoIFwibW91c2Vkb3duXCIsIGhhbmRsZU1vdXNlZG93biApO1xuICAgIGJvZHkuYWRkRXZlbnRMaXN0ZW5lciggXCJtb3VzZXVwXCIsIGhhbmRsZU1vdXNldXAgKTtcbiAgICBib2R5LmFkZEV2ZW50TGlzdGVuZXIoIFwibW91c2Vtb3ZlXCIsIGhhbmRsZU1vdXNlbW92ZSApO1xuICAgIGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlDbGFzc05hbWUoIFwiY29udGFpbmVyLWJveFwiIClbMF0gfHwgZG9jdW1lbnQuYm9keTtcbiAgICBjb25zb2xlLmRlYnVnKCBcIlwiICk7XG59O1xuXG5nZXRDU3R5bGUgPSBmdW5jdGlvbiggZWxlbWVudCApIHtcbiAgICB2YXIgY29tcHV0ZWRTdHlsZTtcbiAgICB0cnkge1xuXHRjb21wdXRlZFN0eWxlID0gd2luZG93LmdldENvbXB1dGVkU3R5bGUoIGVsZW1lbnQgKTtcbiAgICB9XG4gICAgY2F0Y2ggKCBlcnJvciApIHtcblx0Y29uc29sZS5lcnJvciggXCJ3aW5kb3cuZ2V0Q29tcHV0ZWRTdHlsZSggZWxlbWVudCApIGNhbGxlZCB3aXRoIGVsZW1lbnQgXCIgKyBlbGVtZW50ICk7XG5cdGFsZXJ0KCBlcnJvciApO1xuICAgIH1cbiAgICByZXR1cm4gY29tcHV0ZWRTdHlsZTtcbn07XG5cbmZpbmRCb3hJbmRleCA9IGZ1bmN0aW9uKCBib3ggKSB7XG4gICAgLy9jb25zb2xlLmdyb3VwKCBcImZpbmRCb3hJbmRleDogY29udGFpbmVyXCIgKTsgY29uc29sZS5kaXIoIGNvbnRhaW5lciApOyBjb25zb2xlLmdyb3VwRW5kKCApO1xuICAgIC8vIGNvbnRhaW5lci5jaGlsZHJlbiBpcyBhIE5vZGVMaXN0LCBub3QgYW4gQXJyYXksIGJ1dCBpdCBpcyBBcnJheS1saWtlLCBzbyB3ZSBjYW4gYXBwbHkgdGhlIGluZGV4T2YoKSBsaWtlIHRoaXMuXG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwoIGNvbnRhaW5lci5jaGlsZHJlbiwgYm94ICk7XG59O1xuXG4vLyBGb3IgdGhlIGN1cnJlbnQgcGFnZSBzdHJ1Y3R1cmUsIGRldGVybWluZSB0aGUgcmVnaW9ucyB3aGVyZSBkcm9wcGluZyBhIG1vdmluZyBib3ggd2lsbCBoYXZlIGRpZmZlcmVudCByZXN1bHRzLlxuLy8gZHJvcFJlZ2lvbnNZQ29vcmRzU3RyaW5nIGlzIGEgZGVidWcgc3RyaW5nIHRvIGJlIGNvbnN0cnVjdGVkIHRoYXQgcmVwcmVzZW50cyBhbGwgdGhlIGNyaXRpY2FsIFktcG9zaXRpb25zLFxuLy8gcHJlcGVuZGVkIHdpdGggYSBoZWFkZXIuXG5jYWxjQ3JpdGljYWxQb3NpdGlvbnMgPSBmdW5jdGlvbiggaGVhZGVyICkge1xuICAgIHZhciBib3hJbmRleCwgZHJvcFJlZ2lvbnNZQ29vcmRzU3RyaW5nLCB4UG9zaXRpb25zLCBib3hCb3VuZHMsIGNvbXB1dGVkU3R5bGU7XG4gICAgY29uc29sZS5ncm91cCggXCJjYWxjQ3JpdGljYWxQb3NpdGlvbnMgW1wiK2hlYWRlcitcIl06IGNvbnRhaW5lclwiICk7IGNvbnNvbGUuZGlyKCBjb250YWluZXIgKTsgY29uc29sZS5ncm91cEVuZCggKTtcbiAgICBkcm9wUmVnaW9uc1lDb29yZHNTdHJpbmcgPSBoZWFkZXIgKyBcImNyaXRpY2FsIFkgcG9zaXRpb25zID0+IFwiO1xuICAgIHhQb3NpdGlvbnMgPSBoZWFkZXIgKyBcImNyaXRpY2FsIFggcG9zaXRpb25zID0+IFwiO1xuICAgIGJveEJvdW5kcyA9IFwiYm94IGJvdW5kcyAodG9wLCBsZWZ0KSA9PiBcIjtcbiAgICBmb3IgKCBib3hJbmRleCA9IDA7IGJveEluZGV4IDwgYm94ZXMubGVuZ3RoOyBib3hJbmRleCsrICkge1xuXHRib3VuZGluZ1JlY3QgPSBib3hlc1tib3hJbmRleF0uZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCApO1xuXHQvL2NvbnNvbGUuZGVidWcoIFwiaWQgPT4gXCIgKyBib3hlc1tib3hJbmRleF0uaWQgKyBcIiwgdG9wID0+IFwiICsgYm91bmRpbmdSZWN0LnRvcCArXG5cdC8vXHQgICAgICAgXCIsIGJvdHRvbSA9PiBcIiArIGJvdW5kaW5nUmVjdC5ib3R0b20gKTtcblx0ZHJvcFJlZ2lvbnNZQ29vcmRzW2JveEluZGV4XSA9XG5cdCAgICBNYXRoLnJvdW5kKCgoIGJvdW5kaW5nUmVjdC5ib3R0b20gLSBib3VuZGluZ1JlY3QudG9wICkgKiAwLjA1ICkgKyBib3VuZGluZ1JlY3QudG9wICk7XG5cdGRyb3BSZWdpb25zWUNvb3Jkc1N0cmluZyArPSBkcm9wUmVnaW9uc1lDb29yZHNbYm94SW5kZXhdICsgXCIsIFwiO1xuICAgIH1cbiAgICBjb25zb2xlLmdyb3VwKCBcImNhbGNDcml0aWNhbFBvc2l0aW9uczogYm94ZXNcIiApOyBjb25zb2xlLmRpciggYm94ZXMgKTsgY29uc29sZS5ncm91cEVuZCggKTtcbiAgICBmb3IgKCBib3hJbmRleCA9IDA7IGJveEluZGV4IDwgYm94ZXMubGVuZ3RoOyBib3hJbmRleCsrICkge1xuXHRjb21wdXRlZFN0eWxlID0gd2luZG93LmdldENTdHlsZSggYm94ZXNbYm94SW5kZXhdLCBudWxsICk7XG5cdGJvdW5kaW5nUmVjdCA9IGJveGVzW2JveEluZGV4XS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoICk7XG5cdGJvdW5kaW5nUmVjdGFuZ2xlc1tib3hJbmRleF0gPSBib3VuZGluZ1JlY3Q7XG5cdGlmICggY29tcHV0ZWRTdHlsZS5kaXNwbGF5ID09IFwiaW5saW5lXCIgfHwgY29tcHV0ZWRTdHlsZS5kaXNwbGF5ID09IFwiaW5saW5lLWJsb2NrXCIgKSB7XG5cdCAgICAvL2NvbnNvbGUuZGVidWcoIFwiaWQgPT4gXCIgKyBib3hlc1tib3hJbmRleF0uaWQgKyBcIiwgdG9wID0+IFwiICsgYm91bmRpbmdSZWN0LnRvcCArXG5cdCAgICAvL1x0XHQgICBcIiwgYm90dG9tID0+IFwiICsgYm91bmRpbmdSZWN0LmJvdHRvbSApO1xuXHQgICAgZHJvcFJlZ2lvbnNYQ29vcmRzW2JveEluZGV4XSA9XG5cdFx0TWF0aC5yb3VuZCgoKCBib3VuZGluZ1JlY3QucmlnaHQgLSBib3VuZGluZ1JlY3QubGVmdCApICogMC4wNSApICsgYm91bmRpbmdSZWN0LmxlZnQgKTtcblx0fSBlbHNlIHtcblx0ICAgIGRyb3BSZWdpb25zWENvb3Jkc1tib3hJbmRleF0gPSAtMTsgLy8gRmxhZyBhIGJsb2NrIGJveCwgYmVjYXVzZSBpdCB0YWtlcyB1cCB0aGUgd2hvbGUgbGluZS5cblx0fVxuXHR4UG9zaXRpb25zICs9IGRyb3BSZWdpb25zWENvb3Jkc1tib3hJbmRleF0gKyBcIiwgXCI7XG5cdGJveEJvdW5kcyArPSBib3VuZGluZ1JlY3QudG9wICsgXCIsIFwiICsgYm91bmRpbmdSZWN0LmxlZnQgKyBcIjsgXCI7XG4gICAgfVxuICAgIC8vY29uc29sZS5kZWJ1ZyggZHJvcFJlZ2lvbnNZQ29vcmRzU3RyaW5nICk7XG4gICAgLy9jb25zb2xlLmRlYnVnKCB4UG9zaXRpb25zICk7XG4gICAgY29uc29sZS5kZWJ1ZyggYm94Qm91bmRzICk7XG59O1xuXG4vLyBOb2RlTGlzdHMgaGF2ZSBhbiBpbnNlcnRCZWZvcmUgbWV0aG9kLCBidXQgbm8gaW5zZXJ0QWZ0ZXIgbWV0aG9kLCBzbyB3ZSBjcmVhdGUgdGhpcyB1c2VmdWwgaW5zZXJ0QWZ0ZXIgZnVuY3Rpb24uXG5pbnNlcnRBZnRlciA9IGZ1bmN0aW9uKCBuZXdFbGVtZW50LCB0YXJnZXRFbGVtZW50ICkge1xuICAgIGlmICggY29udGFpbmVyLmxhc3RjaGlsZCA9PSB0YXJnZXRFbGVtZW50ICkge1xuXHRjb25zb2xlLmluZm8oIFwidGFyZ2V0RWxlbWVudCBpcyBjb250YWluZXIncyBsYXN0Y2hpbGRcIiApO1xuXHRjb250YWluZXIuYXBwZW5kQ2hpbGQoIG5ld0VsZW1lbnQgKTtcbiAgICB9IGVsc2Uge1xuXHRjb250YWluZXIuaW5zZXJ0QmVmb3JlKCBuZXdFbGVtZW50LCB0YXJnZXRFbGVtZW50Lm5leHRTaWJsaW5nICk7XG4gICAgfVxufTtcblxuLy8gV2hlbiB0aGUgcHJpbWFyeSBtb3VzZSBidXR0b24gaXMgY2xpY2tlZCwgd2UgcHJldmVudCB0aGUgZGVmYXVsdCBtb3VzZS1kb3duIGV2ZW50IGZyb20gb2NjdXJpbmcsIHJlbWVtYmVyIHRoZSBjbGlja1xuLy8gdGFyZ2V0IGFuZCBmaW5kIGl0cyBpbmRleCBpbiBpdHMgcGFyZW50J3MgTm9kZUxpc3QsIHJlbWVtYmVyIHRoZSBzdGF0ZSBvZiB0aGUgYm94LCB0ZW1wb3JhcmlseSBjaGFuZ2UgaXRzIHBvc2l0aW9uXG4vLyB0eXBlIHRvIHJlbGF0aXZlLCBhbmQgc3RhcnQgdGhlIGJveC1kcmFnZ2luZyBwcm9jZXNzLlxuaGFuZGxlTW91c2Vkb3duID0gZnVuY3Rpb24oIGV2ZW50ICkge1xuICAgIHZhciBjb21wdXRlZFN0eWxlO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCApO1xuICAgIC8vY29uc29sZS5kZWJ1ZyggXCJtb3VzZWRvd246IGV2ZW50LmNsaWVudFkgPT4gXCIgKyBldmVudC5jbGllbnRZICsgXCIsIGV2ZW50LmNsaWVudFggPT4gXCIgKyBldmVudC5jbGllbnRYICk7XG4gICAgYm94SW5Nb3Rpb24gPSBldmVudC50YXJnZXQ7XG4gICAgY29udGFpbmVyID0gYm94SW5Nb3Rpb24ucGFyZW50RWxlbWVudDtcbiAgICBjb25zb2xlLmdyb3VwKCBcIm1vdXNlZG93bjogYm94SW5Nb3Rpb24sIGNvbnRhaW5lciwgY29udGFpbmVyLmNoaWxkcmVuXCIgKTtcbiAgICBjb25zb2xlLmRpciggYm94SW5Nb3Rpb24gKTsgY29uc29sZS5kaXIoIGNvbnRhaW5lciApOyBjb25zb2xlLmRpciAoY29udGFpbmVyLmNoaWxkcmVuICk7XG4gICAgY29uc29sZS5ncm91cEVuZCggKTtcbiAgICAvL0ZJWE1FOiBTaG91bGQgYm94ZXMgaGF2ZSB0byBnZXQgc2V0IG9uIGV2ZXJ5IG1vdXNlZG93biwgb3RoZXIgdGhhbiBmb3IgdGhlIGZpcnN0IG1vdXNlZG93bj9cbiAgICBib3hlcyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKCBjb250YWluZXIuY2hpbGRyZW4gKTsgLy8gTWFrZSBhIHJlYWwgQXJyYXkgZnJvbSBhbiBIVE1MQ29sbGVjdGlvbi5cbiAgICBjb25zb2xlLmRlYnVnKCBcIm1vdXNlZG93bjogY2FsbGluZyBmaW5kQm94SW5kZXgoIGJveEluTW90aW9uIClcIiApO1xuICAgIGJpbUluZGV4ID0gZmluZEJveEluZGV4KCBib3hJbk1vdGlvbiApO1xuICAgIGlmICggYmltSW5kZXggPT0gLTEgKSB7XG5cdGNvbnNvbGUuaW5mbyggXCJUaGUgc2VsZWN0ZWQgZWxlbWVudCBjYW5ub3QgYmUgaGFuZGxlZCBpbiB0aGlzIHByb3RvdHlwZSBHVUkuXCIgKTtcbiAgICB9IGVsc2Uge1xuXHRvdXRsaW5lci5vdXRsaW5lT25lRWxlbWVudCggYm94SW5Nb3Rpb24sIFwicmVkXCIgKTtcblx0Y2FsY0NyaXRpY2FsUG9zaXRpb25zKCBcIm1vdXNlZG93blwiICk7XG5cdGNvbnNvbGUuZ3JvdXAoIFwibW91c2Vkb3duOiBiaW1JbmRleCwgYm91bmRpbmdSZWN0YW5nbGVzXCIgKTtcblx0Y29uc29sZS5kZWJ1ZyggYmltSW5kZXggKTsgY29uc29sZS5kaXIoIGJvdW5kaW5nUmVjdGFuZ2xlcyApO1xuXHRjb25zb2xlLmdyb3VwRW5kKCApO1xuXHRzdGFydGluZ1lEaXNwbGFjZW1lbnQgPSBldmVudC5jbGllbnRZIC0gYm91bmRpbmdSZWN0YW5nbGVzW2JpbUluZGV4XS50b3A7XG5cdHN0YXJ0aW5nWERpc3BsYWNlbWVudCA9IGV2ZW50LmNsaWVudFggLSBib3VuZGluZ1JlY3RhbmdsZXNbYmltSW5kZXhdLmxlZnQ7XG5cdC8vY29uc29sZS5kZWJ1ZyggXCJtb3VzZWRvd246IHN0YXJ0WURpc3BsYWNlbWVudCA9PiBcIiArIHN0YXJ0aW5nWURpc3BsYWNlbWVudCArXG5cdC8vXHQgICAgICAgXCIsIHN0YXJ0aW5nWERpc3BsYWNlbWVudCA9PiBcIiArIHN0YXJ0aW5nWERpc3BsYWNlbWVudCApO1xuXHRib3hDbGFzcyA9IGJveEluTW90aW9uLmNsYXNzTmFtZTtcblx0Ym94VG9wID0gYm94SW5Nb3Rpb24uc3R5bGUudG9wO1xuXHRib3hMZWZ0ID0gYm94SW5Nb3Rpb24uc3R5bGUubGVmdDtcblx0Ym94RGlzcGxheSA9IGJveEluTW90aW9uLnN0eWxlLmRpc3BsYXk7XG5cdGxvZ2dlci5sb2coIFwiaGFuZGxlTW91c2Vkb3duOiBvdXRsaW5pbmcgYm94ZXNcIiApO1xuXHQvL0ZJWE1FOiBUaGUgbWFyZ2lucyB0aGF0IHRoZSBmb2xsb3dpbmcgbGluZSBhZGQgdG8gYm94ZXMgc3BvaWxzIHRoZSBib3hJbk1vdGlvbiBwb3NpdGlvbiBjYWxjdWxhdGlvbnMuXG5cdGJveGVzLmZvckVhY2goXG5cdCAgICBmdW5jdGlvbiggZWxlbWVudCApIHtcblx0XHRpZiAoIGVsZW1lbnQgIT0gYm94SW5Nb3Rpb24gKSB7IG91dGxpbmVyLm91dGxpbmVPbmVFbGVtZW50KCBlbGVtZW50LCBcImJsdWVcIiApOyB9IH0gKTtcblx0Ym94ZXMuZm9yRWFjaChcblx0ICAgIGZ1bmN0aW9uKCBlbGVtZW50ICkge1xuXHRcdGlmICggZWxlbWVudCAhPSBib3hJbk1vdGlvbiApIHtcblx0XHQgICAgbG9nZ2VyLmxvZyggWyBcIm1vdXNlZG93bjogZWxlbWVudCBcIixlbGVtZW50LFwicHJlb3V0bGluZVN0eWxlLmJvcmRlciBcIitcblx0XHRcdFx0ICBlbGVtZW50Lnplbi5wcmVvdXRsaW5lU3R5bGUuYm9yZGVyIF0gKTtcblx0XHR9XG5cdCAgICB9XG5cdCk7XG5cdGJveEluTW90aW9uLnN0eWxlLnBvc2l0aW9uID0gXCJyZWxhdGl2ZVwiO1xuXHQvL2NvbnNvbGUuZGlyKCBib3hJbk1vdGlvbiApO1xuXHQvL2NvbnNvbGUuZGVidWcoIFwibW91c2Vkb3duOiBib3hJbk1vdGlvbi5zdHlsZS5kaXNwbGF5ID0+IFwiICsgYm94SW5Nb3Rpb24uc3R5bGUuZGlzcGxheSApO1xuXHRjb21wdXRlZFN0eWxlID0gd2luZG93LmdldENTdHlsZSggYm94SW5Nb3Rpb24sIG51bGwgKTtcblx0aWYgKCBjb21wdXRlZFN0eWxlLmRpc3BsYXkgPT0gXCJpbmxpbmVcIiB8fCBjb21wdXRlZFN0eWxlLmRpc3BsYXkgPT0gXCJpbmxpbmUtYmxvY2tcIiApIHtcblx0ICAgIGNvbnNvbGUuZGVidWcoIFwibW91c2Vkb3duOiBhZGRpbmcgJ2RyYWdnYWJsZS1uc2V3LWlubGluZScgY2xhc3MgdG8gYm94SW5Nb3Rpb25cIiApO1xuXHQgICAgYm94SW5Nb3Rpb24uY2xhc3NOYW1lICs9IFwiIGRyYWdnYWJsZS1uc2V3LWlubGluZVwiO1xuXHQgICAgYm94SW5Nb3Rpb24uc3R5bGUubGVmdCA9IHN0YXJ0aW5nWERpc3BsYWNlbWVudDtcblx0fSBlbHNlIHtcblx0ICAgIGNvbnNvbGUuZGVidWcoIFwibW91c2Vkb3duOiBhZGRpbmcgJ2RyYWdnYWJsZS1ibG9jaycgY2xhc3MgdG8gYm94SW5Nb3Rpb25cIiApO1xuXHQgICAgYm94SW5Nb3Rpb24uY2xhc3NOYW1lICs9IFwiIGRyYWdnYWJsZS1ibG9ja1wiO1xuXHR9XG5cdC8vRklYTUU6IEZpZ3VyZSBvdXQgd2h5IDEwIG5lZWRzIHRvIGJlIHN1YnRyYWN0ZWQgZnJvbSB0aGUgWCBhbmQgWSBwb3NpdGlvbnMgdG8ga2VlcCB0aGUgY3Vyc29yIG92ZXIgdGhlIGJveC5cblx0Ym94SW5Nb3Rpb24uc3R5bGUudG9wID0gc3RhcnRpbmdZRGlzcGxhY2VtZW50IC0gMzU7XG5cdGJveEluTW90aW9uLnN0eWxlLmxlZnQgPSBzdGFydGluZ1hEaXNwbGFjZW1lbnQgLSAxNTtcblx0Ly9jb25zb2xlLmRlYnVnKCBcIm1vdXNlZG93bjogYm94SW5Nb3Rpb24gdG9wID0+IFwiICsgc3RhcnRpbmdZRGlzcGxhY2VtZW50ICtcblx0Ly9cdCAgICAgICBcIiwgbGVmdCA9PiBcIiArIHN0YXJ0aW5nWERpc3BsYWNlbWVudCApO1xuXHRsb2dnZXIubG9nKCBcImhhbmRsZU1vdXNlZG93bjogb3V0bGluaW5nIGNvbnRhaW5lciBib3ggaW4gbWFnZW50YVwiICk7XG5cdG91dGxpbmVyLm91dGxpbmVPbmVFbGVtZW50KCBjb250YWluZXIsIFwibWFnZW50YVwiICk7XG5cdGluRHJhZ1Byb2Nlc3MgPSB0cnVlO1xuICAgIH1cbiAgICBjb25zb2xlLmRlYnVnKCBcIlwiICk7XG59O1xuXG4vLyBJZiBhIGJsb2NrIGJveCdzIGlzIGNvbnN0cmFpbmVkIHRvIG1vdmUgb25seSB2ZXJ0aWNhbGx5IGFuZCBub3QgaG9yaXpvbnRhbGx5LCBpdCBtYWtlcyBpdCBvYnZpb3VzIHRvIHRoZSB1c2VyXG4vLyB0aGF0IHRoZSBibG9jayBjYW4gb25seSBiZSBtb3ZlZCB2ZXJ0aWNhbGx5LiBIb3dldmVyLCB3ZSBkb24ndCBjb25zdHJhaW4gaXQgdG8gbW92ZSBvbmx5IHZlcnRpY2FsbHkgYmVjYXVzZVxuLy8gaWYgd2UgZGlkIHRoYXQsIHRoZSBtb3VzZSBwb2ludGVyIGNvdWxkIG1vdmUgaG9yaXpvbnRhbGx5IGF3YXkgZnJvbSB0aGUgYmxvY2sgd2hpbGUgdGhlIGJsb2NrIHdhcyBzdGlsbFxuLy8gaW4gbW90aW9uLlxuaGFuZGxlTW91c2Vtb3ZlID0gZnVuY3Rpb24oIGV2ZW50ICkge1xuICAgIHZhciBib3hJbmRleCwgY29tcHV0ZWRTdHlsZTtcbiAgICAvL2NvbnNvbGUuZGVidWcoIFwibW91c2Vtb3ZlXCIgKTtcbiAgICBpZiAoIGluRHJhZ1Byb2Nlc3MgKSB7XG5cdGN1cnJlbnRZRGlzcGxhY2VtZW50ID0gZXZlbnQuY2xpZW50WSAtIGJvdW5kaW5nUmVjdGFuZ2xlc1tiaW1JbmRleF0udG9wO1xuXHRjdXJyZW50WERpc3BsYWNlbWVudCA9IGV2ZW50LmNsaWVudFggLSBib3VuZGluZ1JlY3RhbmdsZXNbYmltSW5kZXhdLmxlZnQ7XG5cdC8vRklYTUU6IEZpZ3VyZSBvdXQgd2h5IDEwIG5lZWRzIHRvIGJlIHN1YnRyYWN0ZWQgZnJvbSB0aGUgWCBhbmQgWSBwb3NpdGlvbnMgdG8ga2VlcCB0aGUgY3Vyc29yIG92ZXIgdGhlIGJveC5cblx0Ym94SW5Nb3Rpb24uc3R5bGUudG9wID0gY3VycmVudFlEaXNwbGFjZW1lbnQgLSAzNTtcblx0Ym94SW5Nb3Rpb24uc3R5bGUubGVmdCA9IGN1cnJlbnRYRGlzcGxhY2VtZW50IC0gMTU7XG5cdC8vY29uc29sZS5ncm91cCggXCJib3hJbk1vdGlvblwiICk7IGNvbnNvbGUuZGlyKCBib3hJbk1vdGlvbiApOyBjb25zb2xlLmdyb3VwRW5kKCApO1xuXHRib3VuZGluZ1JlY3QgPSBib3hJbk1vdGlvbi5nZXRCb3VuZGluZ0NsaWVudFJlY3QoICk7XG5cdHRhcmdldEJveEluZGV4ID0gYm94ZXMubGVuZ3RoIC0gMTtcblx0Zm9yICggYm94SW5kZXggPSBib3hlcy5sZW5ndGggLSAxOyBib3hJbmRleCA+PSAwOyBib3hJbmRleC0tICkge1xuXHQgICAgaWYgKCBib3VuZGluZ1JlY3QudG9wID4gZHJvcFJlZ2lvbnNZQ29vcmRzW2JveEluZGV4XSApIHtcblx0XHRicmVhaztcblx0ICAgIH1cblx0ICAgIHRhcmdldEJveEluZGV4ID0gYm94SW5kZXggLSAxO1xuXHR9XG5cdGlmICggdGFyZ2V0Qm94SW5kZXggPT0gLTEgKSB7XG5cdCAgICBjb25zb2xlLmluZm8oIFwiVGhlIHNlbGVjdGVkIHRhcmdldCBlbGVtZW50IGNhbm5vdCBiZSBoYW5kbGVkIGluIHRoaXMgcHJvdG90eXBlIEdVSS5cIiApO1xuXHR9IGVsc2Uge1xuXHQgICAgXG5cdCAgICB0YXJnZXRCb3ggPSBib3hlc1t0YXJnZXRCb3hJbmRleF07IC8vIFRoaXMgaXMgdGhlIHRhcmdldCBib3ggaWYgdGhlcmUgYXJlIG5vIG90aGVyIGJveGVzIGlubGluZSB3aXRoIGl0LlxuXHQgICAgaWYgKCBwcmV2aW91c1RhcmdldEJveCAhPT0gdGFyZ2V0Qm94ICYmIHRhcmdldEJveCAhPT0gYm94SW5Nb3Rpb24gKSB7XG5cdFx0Y29uc29sZS5kZWJ1ZyggXCJtb3VzZW1vdmU6IGNoYW5nZSBvZiBwb3RlbnRpYWwgdGFyZ2V0LCBuZXcgcG90ZW50aWFsID0+IFwiICsgdGFyZ2V0Qm94SW5kZXggKTtcblx0XHRpZiAoIHByZXZpb3VzVGFyZ2V0Qm94ICE9PSBudWxsICkge1xuXHRcdCAgICBwcmV2aW91c1RhcmdldEJveC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3IgPSBib3hCYWNrZ3JvdW5kQ29sb3I7XG5cdFx0fVxuXHRcdGJveEJhY2tncm91bmRDb2xvciA9IHRhcmdldEJveC5zdHlsZS5iYWNrZ3JvdW5kQ29sb3I7XG5cdFx0dGFyZ2V0Qm94LnN0eWxlLmJhY2tncm91bmRDb2xvciA9IFwiZ29sZFwiO1xuXHRcdHByZXZpb3VzVGFyZ2V0Qm94ID0gdGFyZ2V0Qm94O1xuXHQgICAgfVxuXHQgICAgXG5cdCAgICAvL2NvbnNvbGUuZGVidWcoIFwibW91c2Vtb3ZlOiBib3hJbk1vdGlvbiBib3R0b20gPT4gXCIgKyBib3VuZGluZ1JlY3QuYm90dG9tICtcblx0ICAgIC8vXHQgICAgICAgXCIsIG1vdXNlbW92ZTogYm94SW5Nb3Rpb24gcmlnaHQgPT4gXCIgKyBib3VuZGluZ1JlY3QucmlnaHQgK1xuXHQgICAgLy9cdCAgICAgICBcIiwgZHJvcFJlZ2lvbnNZQ29vcmRzW3RhcmdldEJveEluZGV4XSA9PiBcIiArIGRyb3BSZWdpb25zWUNvb3Jkc1t0YXJnZXRCb3hJbmRleF0gKTtcblx0ICAgIGNvbXB1dGVkU3R5bGUgPSB3aW5kb3cuZ2V0Q1N0eWxlKCB0YXJnZXRCb3gsIG51bGwgKTtcblx0ICAgIGNvbnNvbGUuZGVidWcoIFwibW91c2Vtb3ZlOiBib3hJbk1vdGlvbiBpcyBwYXNzaW5nIG92ZXIgYShuKSBcIiArIGNvbXB1dGVkU3R5bGUuZGlzcGxheSApO1xuXHQgICAgaWYgKCBjb21wdXRlZFN0eWxlLmRpc3BsYXkgPT0gXCJpbmxpbmUtYmxvY2tcIiB8fCBjb21wdXRlZFN0eWxlLmRpc3BsYXkgPT0gXCJpbmxpbmVcIiApIHtcblx0XHRpZiAoIHR5cGVvZiBib3hJbk1vdGlvbi56ZW4uaXNUZW1wQmxvY2sgIT09IFwidW5kZWZpbmVkXCIgKSB7XG5cdFx0ICAgIGNvbnNvbGUuZGVidWcoIFwibW91c2Vtb3ZlOiByZXN0b3Jpbmcgb3JpZ25hbCBjbGFzcyBuYW1lIGFuZCBkaXNwbGF5IHR5cGUgb2YgYm94SW5Nb3Rpb25cIiApO1xuXHRcdCAgICBkZWxldGUgYm94SW5Nb3Rpb24uemVuLmlzVGVtcEJsb2NrO1xuXHRcdCAgICBib3hJbk1vdGlvbi5jbGFzc05hbWUgPSBib3hDbGFzcztcblx0XHQgICAgYm94SW5Nb3Rpb24uZGlzcGxheSA9IGJveERpc3BsYXk7XG5cdFx0fVxuXHRcdGlmICggdHlwZW9mIGJveEluTW90aW9uLnplbi5pc1RlbXBJbmxpbmUgPT0gXCJ1bmRlZmluZWRcIiApIHsgLy8gUHJldmVudCBtdWx0aXBsZSBhZGRpdGlvbnMgb2YgY2xhc3MgbmFtZS5cblx0XHQgICAgY29uc29sZS5kZWJ1ZyggXCJtb3VzZW1vdmU6IGFkZGluZyAnZHJhZ2dhYmxlLW5zZXctaW5saW5lJyBjbGFzcyB0byBib3hJbk1vdGlvblwiICk7XG5cdFx0ICAgIGJveEluTW90aW9uLmNsYXNzTmFtZSA9IGJveENsYXNzICsgXCIgZHJhZ2dhYmxlLW5zZXctaW5saW5lXCI7IC8vIEFkZCBjbGFzcyBuYW1lLlxuXHRcdCAgICBib3hJbk1vdGlvbi56ZW4uaXNUZW1wSW5saW5lID0gdHJ1ZTtcblx0XHR9XG5cdFx0Ym94SW5Nb3Rpb24uc3R5bGUuZGlzcGxheSA9IFwiaW5saW5lLWJsb2NrXCI7XG5cdCAgICB9IGVsc2Uge1xuXHRcdGlmICggdHlwZW9mIGJveEluTW90aW9uLnplbi5pc1RlbXBJbmxpbmUgIT09IFwidW5kZWZpbmVkXCIgKSB7XG5cdFx0ICAgIGNvbnNvbGUuZGVidWcoIFwibW91c2Vtb3ZlOiByZXN0b3Jpbmcgb3JpZ25hbCBjbGFzcyBuYW1lIGFuZCBkaXNwbGF5IHR5cGUgb2YgYm94SW5Nb3Rpb25cIiApO1xuXHRcdCAgICBkZWxldGUgYm94SW5Nb3Rpb24uemVuLmlzVGVtcElubGluZTtcblx0XHQgICAgYm94SW5Nb3Rpb24uY2xhc3NOYW1lID0gYm94Q2xhc3M7XG5cdFx0ICAgIGJveEluTW90aW9uLmRpc3BsYXkgPSBib3hEaXNwbGF5O1xuXHRcdH1cblx0XHRpZiAoIHR5cGVvZiBib3hJbk1vdGlvbi56ZW4uaXNUZW1wQmxvY2sgPT0gXCJ1bmRlZmluZWRcIiApIHsgLy8gUHJldmVudCBtdWx0aXBsZSBhZGRpdGlvbnMgb2YgY2xhc3MgbmFtZS5cblx0XHQgICAgY29uc29sZS5kZWJ1ZyggXCJtb3VzZW1vdmU6IGFkZGluZyAnZHJhZ2dhYmxlLWJsb2NrJyBjbGFzcyB0byBib3hJbk1vdGlvblwiICk7XG5cdFx0ICAgIGJveEluTW90aW9uLmNsYXNzTmFtZSA9IGJveENsYXNzICsgXCIgZHJhZ2dhYmxlLWJsb2NrXCI7IC8vIEFkZCBjbGFzcyBuYW1lLlxuXHRcdCAgICBib3hJbk1vdGlvbi56ZW4uaXNUZW1wQmxvY2sgPSB0cnVlO1xuXHRcdH1cblx0XHRib3hJbk1vdGlvbi5zdHlsZS5kaXNwbGF5ID0gXCJibG9ja1wiO1xuXHQgICAgfVxuXHR9XG4gICAgfVxufTtcblxuaGFuZGxlTW91c2V1cCA9IGZ1bmN0aW9uKCBldmVudCApIHtcbiAgICB2YXIgZGVsdGFZO1xuICAgIGlmICggaW5EcmFnUHJvY2VzcyApIHtcblx0Y29uc29sZS5kZWJ1ZyggXCJcIiApO1xuXHR0YXJnZXRCb3guc3R5bGUuYmFja2dyb3VuZENvbG9yID0gYm94QmFja2dyb3VuZENvbG9yO1xuXHRsb2dnZXIubG9nKCBcImhhbmRsZU1vdXNldXA6IHVub3V0bGluaW5nIGJveEluTW90aW9uXCIgKTtcblx0aWYgKCBmaW5kQm94SW5kZXgoIGJveEluTW90aW9uICkgIT09IC0xICkge1xuXHQgICAgdHJ5IHtcblx0XHRvdXRsaW5lci51bm91dGxpbmVPbmVFbGVtZW50KCBib3hJbk1vdGlvbiApO1xuXHQgICAgfVxuXHQgICAgY2F0Y2ggKCBlcnJvciApIHtcblx0XHRjb25zb2xlLmVycm9yKCBcIm1vdXNldXA6IFwiICsgZXJyb3IgKTtcblx0ICAgIH1cblx0fVxuXHRkZWx0YVkgPSBldmVudC5jbGllbnRZIC0gc3RhcnRpbmdZRGlzcGxhY2VtZW50O1xuXHRkZWx0YVggPSBldmVudC5jbGllbnRYIC0gc3RhcnRpbmdYRGlzcGxhY2VtZW50O1xuXHQvL2NvbnNvbGUuZGVidWcoIFwibW91c2V1cDogZGVsdGFZID0+IFwiICsgZGVsdGFZICk7XG5cdC8vY29uc29sZS5kZWJ1ZyggXCJtb3VzZXVwOiBib3hJbk1vdGlvbiBib3R0b20gPT4gXCIgKyBib3VuZGluZ1JlY3QuYm90dG9tICtcblx0Ly9cdCAgICAgICBcIiwgdG9wID0+IFwiICsgYm91bmRpbmdSZWN0LnRvcCArXG5cdC8vXHQgICAgICAgXCIsIHRhcmdldEJveEluZGV4ID0+IFwiICsgdGFyZ2V0Qm94SW5kZXggK1xuXHQvL1x0ICAgICAgIFwiLCBkcm9wUmVnaW9uc1lDb29yZHNbdGFyZ2V0Qm94SW5kZXhdID0+IFwiICsgZHJvcFJlZ2lvbnNZQ29vcmRzW3RhcmdldEJveEluZGV4XSArXG5cdC8vXHQgICAgICAgXCIsIGRyb3BSZWdpb25zWENvb3Jkc1t0YXJnZXRCb3hJbmRleF0gPT4gXCIgKyBkcm9wUmVnaW9uc1hDb29yZHNbdGFyZ2V0Qm94SW5kZXhdXG5cdC8vXHQgICAgICk7XG5cdGlmICggTWF0aC5hYnMoIGRlbHRhWSApID4gbWluR2VzdHVyZSApIHtcblx0ICAgIGlmICggYmltSW5kZXggPT0gdGFyZ2V0Qm94SW5kZXggKSB7XG5cdFx0Y29uc29sZS53YXJuKCBcIkJveCBpbiBtb3Rpb24gaXMgaXRzIG93biB0YXJnZXQ7IHRoaXMgaXMgYSBudWxsIG9wZXJhdGlvbi5cIiApO1xuXHQgICAgfSBlbHNlIHtcblx0XHQvL2NvbnNvbGUuZGVidWcoIFwidGFyZ2V0Qm94SW5kZXggPT4gXCIgKyB0YXJnZXRCb3hJbmRleCApO1xuXHRcdC8vIENoZWNrIHRvIHNlZSBpZiB0aGUgYm94IGluIG1vdGlvbiBpcyBhbHJlYWR5IGZpcnN0IGluIHRoZSBjb250YWluZXIgYW5kIGlzIHRhcmdldHRlZCB0byBiZSBtb3ZlZFxuXHRcdC8vIHRvIGJlIHRoZSBmaXJzdCBpbiB0aGUgY29udGFpbmVyICgtMSwgdGhlIHZpcnR1YWwgdGFyZ2V0IGJlZm9yZSBhbGwgb3RoZXIgYm94ZXMpLiBJZiBib3RoIG9mIHRob3NlXG5cdFx0Ly8gY29uZGl0aW9ucyBhcmUgbWV0LCBubyBib3ggbmVlZHMgdG8gYmUgbW92ZWQuXG5cdFx0aWYgKCBiaW1JbmRleCAhPT0gMCB8fCB0YXJnZXRCb3hJbmRleCAhPT0gLTEgKSB7XG5cdFx0ICAgIGNvbnRhaW5lci5yZW1vdmVDaGlsZCggYm94SW5Nb3Rpb24gKTtcblx0XHQgICAgYm94ZXMuc3BsaWNlKCBiaW1JbmRleCwgMSApOyAvLyBSZW1vdmUgdGhlIGJveCBpbiBtb3Rpb24gZnJvbSB0aGUgYXJyYXkgb2YgZWxlbWVudCByZWZlcmVuY2VzLlxuXHRcdCAgICBpZiAoIHRhcmdldEJveEluZGV4ID09IC0xICkgeyAvLyAtMSByZWZlcnMgdG8gYSB2aXJ0dWFsIHRhcmdldCBiZWZvcmUgYWxsIHRoZSBib3hlcy5cblx0XHRcdGNvbnRhaW5lci5pbnNlcnRCZWZvcmUoIGJveEluTW90aW9uLCBib3hlc1swXSApO1xuXHRcdCAgICB9IGVsc2Uge1xuXHRcdFx0dHJ5IHtcblx0XHRcdCAgICBpbnNlcnRBZnRlciggYm94SW5Nb3Rpb24sIHRhcmdldEJveCApO1xuXHRcdFx0fVxuXHRcdFx0Y2F0Y2ggKCBlcnJvciApIHtcblx0XHRcdCAgICBjb25zb2xlLmdyb3VwKCBcImluc2VydEFmdGVyIGVycm9yOiBib3hJbk1vdGlvbiwgdGFyZ2V0Qm94XCIgKTtcblx0XHRcdCAgICBjb25zb2xlLmRpciggYm94SW5Nb3Rpb24gKTsgY29uc29sZS5kaXIoIHRhcmdldEJveCApO1xuXHRcdFx0ICAgIGNvbnNvbGUuZ3JvdXBFbmQoICk7XG5cdFx0XHR9XG5cdFx0ICAgIH1cblx0XHR9XG5cdCAgICB9XG5cdH0gZWxzZSB7XG5cdCAgICBjb25zb2xlLndhcm4oIFwiQm94IG5vdCBkcmFnZ2VkIG1vcmUgdGhhbiBtaW5HZXN0dXJlIHBpeGVscyB2ZXJ0aWNhbGx5LCBzbyBub3QgbW92ZWQuXCIgKTtcblx0fVxuXHRsb2dnZXIubG9nKCBcImhhbmRsZU1vdXNldXA6IHVub3V0bGluaW5nIGJveGVzXCIgKTtcblx0Ym94ZXMuZm9yRWFjaCggZnVuY3Rpb24oIGVsZW1lbnQgKSB7XG5cdCAgICBpZiAoIGVsZW1lbnQgIT0gYm94SW5Nb3Rpb24gKSB7XG5cdFx0dHJ5IHtcblx0XHQgICAgLy9sb2dnZXIubG9nKCBcImhhbmRsZU1vdXNldXA6IHVub3V0bGluaW5nIGVsZW1lbnQgPT4gXCIgKyBlbGVtZW50ICk7XG5cdFx0ICAgIG91dGxpbmVyLnVub3V0bGluZU9uZUVsZW1lbnQoIGVsZW1lbnQgKTtcblx0XHR9XG5cdFx0Y2F0Y2ggKCBlcnJvciApIHtcblx0XHQgICAgY29uc29sZS5lcnJvciggXCJtb3VzZXVwIGZvckVhY2g6IFwiICsgZXJyb3IgKTtcblx0XHQgICAgY29uc29sZS5ncm91cCggXCJlbGVtZW50XCIgKTsgY29uc29sZS5kaXIoIGVsZW1lbnQgKTsgY29uc29sZS5ncm91cEVuZCggKTtcblx0XHR9XG5cdCAgICB9XG5cdH0gKTtcblx0Ym94SW5Nb3Rpb24uc3R5bGUucG9zaXRpb24gPSBcInN0YXRpY1wiO1xuXHQvL2NvbnNvbGUuZGVidWcoIFwibW91c2V1cDogcmVtb3ZpbmcgJ2RyYWdnYWJsZS1ibG9jaycgY2xhc3MgZnJvbSBib3hJbk1vdGlvblwiICk7XG5cdGNvbnNvbGUuZGVidWcoIFwibW91c2V1cDogYm94Q2xhc3MgPT4gXCIgKyBib3hDbGFzcyArIFwiLCBib3hUb3AgPT4gXCIgKyBib3hUb3AgK1xuXHRcdCAgICAgICBcIiwgYm94RGlzcGxheSA9PiBcIiArIGJveERpc3BsYXkgKTtcblx0Ym94SW5Nb3Rpb24uY2xhc3NOYW1lID0gYm94Q2xhc3M7XG5cdGJveEluTW90aW9uLnN0eWxlLnRvcCA9IGJveFRvcDtcblx0Ym94SW5Nb3Rpb24uc3R5bGUubGVmdCA9IGJveExlZnQ7XG5cdGJveEluTW90aW9uLnN0eWxlLmRpc3BsYXkgPSBib3hEaXNwbGF5O1xuXHRsb2dnZXIubG9nKCBcImhhbmRsZU1vdXNldXA6IHVub3V0bGluaW5nIGNvbnRhaW5lciBib3hcIiApO1xuXHRvdXRsaW5lci51bm91dGxpbmVPbmVFbGVtZW50KCBjb250YWluZXIgKTtcblx0Y2FsY0NyaXRpY2FsUG9zaXRpb25zKCBcIm1vdXNldXA6IGV4aXRcIiApO1xuXHRpbkRyYWdQcm9jZXNzID0gZmFsc2U7XG4gICAgfVxufVxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCBcIkRPTUNvbnRlbnRMb2FkZWRcIiwgaW5pdCApO1xuIiwiLypcbiAqIGhpZ2hsaWdodGVyLmpzXG4gKlxuICogQXMgdGhlIG1vdXNlIHBvaW50ZXIgbW92ZXMgb3ZlciBhIHRhcmdldGFibGUgZWxlbWVudCwgaGlnaGxpZ2h0IHRoYXQgZWxlbWVudCB3aXRoIGFuIGFxdWEgYm9yZGVyIGFuZCBhIG1hcmdpbi5cbiAqIEFzIHRoZSBtb3VzZSBwb2ludGVyIG1vdmVzIGF3YXkgZnJvbSB0aGUgZWxlbWVudCwgcmVzZXQgdGhlIGVsZW1lbnQncyBib3JkZXJzIGFuZCBtYXJnaW5zLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oICkge1xuXG5sb2dnZXIgPSByZXF1aXJlKCBcIi4vbG9nZ2VyLmpzXCIgKSgpO1xub3V0bGluZXIgPSByZXF1aXJlKCBcIi4vb3V0bGluZXIuanNcIiApKCk7XG5cbnZhciBlbGVtZW50ID0gbnVsbCwgcHJldmlvdXNFbGVtZW50ID0gbnVsbDtcblxuaW5pdEhpZ2hsaWdodGVyID0gZnVuY3Rpb24oIGVsZW1lbnQgKSB7XG4gICAgZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKCBcIm1vdXNlbW92ZVwiLCBoYW5kbGVNb3VzZW1vdmVYICk7XG4gICAgLy8gU2F2ZSB0aGUgb3JpZ2luYWwsIHN0YXRpY2FsbHkgc2V0IGJvcmRlcnMgb2YgdGhlIGVsZW1lbnQgdGhlIG1vdXNlIGlzIG92ZXIuXG4gICAgbG9nZ2VyLmxvZyggXCJpbml0SGlnaGxpZ2h0ZXI6IGNhbGxpbmcgc2F2ZVN0eWxlXCIgKTtcbiAgICBvdXRsaW5lci5zYXZlU3R5bGUoIGVsZW1lbnQgKTtcbn07XG5cbi8vIFRPRE86IE1heWJlIGRvbid0IGhpZ2h0bGlnaHQgdGhlIGRvY3VtZW50IGJvZHkgZWxlbWVudC5cbmhhbmRsZU1vdXNlbW92ZVggPSBmdW5jdGlvbiggZXZlbnQgKSB7XG4gICAgZWxlbWVudCA9IGV2ZW50LnRhcmdldDtcbiAgICAvL2NvbnNvbGUuZ3JvdXAoIFwiaGFuZGxlTW91c2VvdmVyWFwiICk7IGNvbnNvbGUuZGlyKCBlbGVtZW50ICk7IGNvbnNvbGUuZGlyKCBwcmV2aW91c0VsZW1lbnQgKTsgY29uc29sZS5ncm91cEVuZCggKTtcbiAgICBpZiAoIHByZXZpb3VzRWxlbWVudCAhPT0gZWxlbWVudCApIHtcblx0Ly9sb2dnZXIubG9nKFtcInByZXZpb3VzIGVsZW1lbnRcIiwgZWxlbWVudCwgXCJ4XCJdKTtcblx0bG9nZ2VyLmxvZyhcIioqb3V0bGluZSBjdXJyZW50IGhvdmVyIHBvc2l0aW9uXCIpO1xuXHRpZiAoIHByZXZpb3VzRWxlbWVudCAhPT0gbnVsbCApIHtcblx0ICAgIG91dGxpbmVyLnVub3V0bGluZU9uZUVsZW1lbnQoIHByZXZpb3VzRWxlbWVudCApO1xuXHR9XG5cdGlmICggZWxlbWVudCAhPT0gZG9jdW1lbnQuYm9keSApIHtcblx0ICAgIC8vY29uc29sZS5pbmZvKCBcImhpZ2hsaWdodGVyOiBlbGVtZW50IGlzIGJvZHk7IGRvIG5vdCBoaWdobGlnaHQgaXRcIiApO1xuXHQgICAgb3V0bGluZXIub3V0bGluZU9uZUVsZW1lbnQoIGVsZW1lbnQsIFwiYXF1YVwiICk7XG5cdH1cblx0Ly8gTm93IHRoZSBlbGVtZW50IGlzIHRoZSBcInByZXZpb3VzXCIgZWxlbWVudC5cblx0cHJldmlvdXNFbGVtZW50ID0gZWxlbWVudDtcbiAgICB9XG59O1xuXG5yZXR1cm4geyBpbml0SGlnaGxpZ2h0ZXI6IGluaXRIaWdobGlnaHRlciB9O1xufTtcbiIsIi8vIFNhdmUgaGlzdG9yeSBhbmQgZHVtcCBzb21lIG9mIGl0IHdoZW4gY2FsbGVkLlxuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCApIHtcblxuZnVuY3Rpb24gZHVtcExvZyggaW5kZXggPSAtNSApIHtcbiAgICBmb3IgKCBpeCA9IGxvZy5oaXN0b3J5LmNvdW50ICsgaW5kZXg7IGl4IDw9IGxvZy5oaXN0b3J5LmNvdW50OyBpeCsrICkge1xuXHRjb25zb2xlLmRlYnVnKGxvZy5oaXN0b3J5W2l4XSk7XG4gICAgfVxuICAgIHJldHVybiBcIkRvbmUuXCI7XG59XG5cbmZ1bmN0aW9uIGxvZyggb2JqICkge1xuICAgIGxvZy5oaXN0b3J5ID0gbG9nLmhpc3RvcnkgfHwgW107XG4gICAgbG9nLmhpc3RvcnkucHVzaChvYmopO1xuICAgIGxvZy5oaXN0b3J5LmNvdW50ID0gbG9nLmhpc3RvcnkuY291bnQgKyAxIHx8IDA7XG59XG5cbmZ1bmN0aW9uIGNsZWFyTG9nKCApIHtcbiAgICBsb2cuaGlzdG9yeSA9IFtdO1xuICAgIGxvZy5oaXN0b3J5LmNvdW50ID0gMDtcbn1cblxucmV0dXJuIHsgbG9nOiBsb2csIGR1bXBMb2c6IGR1bXBMb2csIGNsZWFyTG9nOiBjbGVhckxvZyB9O1xufTtcbiIsIi8qXG4gKiBvdXRsaW5lci5qc1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oICkge1xuXG5sb2dnZXIgPSByZXF1aXJlKCBcIi4vbG9nZ2VyLmpzXCIgKSgpO1xuXG52YXIgY29tcHV0ZWRQcm9wcyA9IFtdO1xuXG5mdW5jdGlvbiBzYXZlU3R5bGUoIGNvbnRhaW5lciApIHtcbiAgICAvL2NvbnNvbGUuZGVidWcoXCJzYXZlU3R5bGVcIik7XG4gICAgdmFyIGVsZW1lbnRzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoIGNvbnRhaW5lci5jaGlsZHJlbiApOyAvLyBNYWtlIHJlYWwgQXJyYXkgZnJvbSBIVE1MQ29sbGVjdGlvbi5cbiAgICBsb2dnZXIubG9nKCBcInNhdmVTdHlsZTogZW50ZXJcIiApO1xuICAgIGVsZW1lbnRzLmZvckVhY2goIGZ1bmN0aW9uKCBlbGVtZW50ICkge1xuXHRpZiAoIHR5cGVvZiBlbGVtZW50LnplbiA9PSBcInVuZGVmaW5lZFwiIHx8IHR5cGVvZiBlbGVtZW50Lnplbi5wcmVvdXRsaW5lU3R5bGUgPT0gXCJ1bmRlZmluZWRcIiApIHtcblx0ICAgIGVsZW1lbnQuemVuID0ge307XG5cdCAgICBlbGVtZW50Lnplbi5wcmVvdXRsaW5lU3R5bGUgPSB7fTtcblx0fVxuXHRlbGVtZW50Lnplbi5wcmVvdXRsaW5lU3R5bGUuYm9yZGVyID0gZWxlbWVudC5zdHlsZS5ib3JkZXI7XG5cdGVsZW1lbnQuemVuLnByZW91dGxpbmVTdHlsZS5tYXJnaW4gPSBlbGVtZW50LnN0eWxlLm1hcmdpbjtcbiAgICB9ICk7XG4gICAgaWYgKCB0eXBlb2YgY29udGFpbmVyLnplbiA9PSBcInVuZGVmaW5lZFwiIHx8IHR5cGVvZiBjb250YWluZXIuemVuLnByZW91dGxpbmVTdHlsZSA9PSBcInVuZGVmaW5lZFwiICkge1xuXHRjb250YWluZXIuemVuID0geyB9O1xuXHRjb250YWluZXIuemVuLnByZW91dGxpbmVTdHlsZSA9IHsgfTtcbiAgICB9XG4gICAgY29udGFpbmVyLnplbi5wcmVvdXRsaW5lU3R5bGUuYm9yZGVyID0gY29udGFpbmVyLnN0eWxlLmJvcmRlcjtcbiAgICBjb250YWluZXIuemVuLnByZW91dGxpbmVTdHlsZS5tYXJnaW4gPSBjb250YWluZXIuc3R5bGUubWFyZ2luO1xufVxuXG5mdW5jdGlvbiBvdXRsaW5lT25lRWxlbWVudCggZWxlbWVudCwgY29sb3IgKSB7XG4gICAgdmFyIGNvbXB1dGVkU3R5bGU7XG4gICAgdmFyIHByb3BUYWIgICAgICAgICA9IFsgXCJtYXJnaW5Ub3BcIiwgICAgIFwibWFyZ2luUmlnaHRcIiwgICAgIFwibWFyZ2luQm90dG9tXCIsICAgICBcIm1hcmdpbkxlZnRcIiAgICAgXTtcbiAgICB2YXIgY29tcHV0ZWRQcm9wVGFiID0gWyBcIm1hcmdpbi10b3BcIiwgICAgXCJtYXJnaW4tcmlnaHRcIiwgICAgXCJtYXJnaW4tYm90dG9tXCIsICAgIFwibWFyZ2luLWxlZnRcIiAgICBdO1xuICAgIHZhciBpZDtcblxuICAgIC8vY29uc29sZS5kZWJ1ZyhcIm91dGxpbmVPbmVFbGVtZW50XCIpO1xuICAgIGlmICh0eXBlb2YgYm94SW5Nb3Rpb24gPT0gXCJ1bmRlZmluZWRcIikgeyBpZCA9IFwiYm94SW5Nb3Rpb24gbm90IGZvdW5kXCI7IH0gZWxzZSB7IGlkID0gYm94SW5Nb3Rpb24uaWQ7IH1cbiAgICBpZiAodHlwZW9mIGVsZW1lbnQuemVuID09IFwidW5kZWZpbmVkXCIpIHtcblx0YnJkciA9IFwiYm9yZGVyIG5vdCBzYXZlZFwiO1xuICAgIH0gZWxzZSB7XG5cdGJyZHIgPSBlbGVtZW50Lnplbi5wcmVvdXRsaW5lU3R5bGUuYm9yZGVyO1xuICAgIH1cbiAgICBsb2dnZXIubG9nKCBbIFwib3V0bGluZU9uZUVsZW1lbnQoXCIrZWxlbWVudC5pZCtcIixcIitjb2xvcitcIik6XCIsXCJub3cgXCIrZWxlbWVudC5zdHlsZS5ib3JkZXIsXCJwcmV2IFwiK2JyZHIsXCJiaW0gXCIraWQgXSApO1xuICAgIC8qXG4gICAgaWYgKGVsZW1lbnQgPT0gZG9jdW1lbnQuYm9keSkgeyAvLyBEb24ndCBvdXRsaW5lIHRoZSBkb2N1bWVudCBib2R5IGVsZW1lbnQuXG5cdGxvZ2dlci5sb2coXCJvdXRsaW5lT25lRWxlbWVudDogZW50ZXI6IGNhbGxlZCBmb3IgYm9keSB3aXRoIGNvbG9yID0+IFwiICsgY29sb3IpO1xuXHRyZXR1cm47XG4gICAgfVxuICAgICovXG4gICAgaWYgKCB0eXBlb2YgZWxlbWVudC56ZW4gPT0gXCJ1bmRlZmluZWRcIiB8fCB0eXBlb2YgZWxlbWVudC56ZW4ucHJlb3V0bGluZVN0eWxlID09IFwidW5kZWZpbmVkXCIgKSB7XG5cdGxvZ2dlci5sb2coIFwib3V0bGluZU9uZUVsZW1lbnRcIiApO1xuXHRlbGVtZW50LnplbiA9IHt9O1xuXHRlbGVtZW50Lnplbi5wcmVvdXRsaW5lU3R5bGUgPSB7fTtcblx0ZWxlbWVudC56ZW4ucHJlb3V0bGluZVN0eWxlLmJvcmRlciA9IGVsZW1lbnQuc3R5bGUuYm9yZGVyO1xuXHRlbGVtZW50Lnplbi5wcmVvdXRsaW5lU3R5bGUubWFyZ2luID0gZWxlbWVudC5zdHlsZS5tYXJnaW47XG4gICAgfVxuICAgIGlmICggdHlwZW9mIGVsZW1lbnQuc3R5bGUgPT0gXCJ1bmRlZmluZWRcIiApIHtcblx0Y29uc29sZS5lcnJvcihcIm91dGxpbmVPbmVFbGVtZW50OiBlbGVtZW50LnN0eWxlIGlzIHVuZGVmaW5lZFwiKTtcbiAgICB9IGVsc2Uge1xuXHQvLyBGSVhNRTogVGhpcyBpc24ndCBvcHRpbWFsLiBJdCBzaG91bGQgZG8gc29tZXRoaW5nIGxpa2Ugd2hhdCB0aGUgZW5zdXJlTWFyZ2luIGZ1bmN0aW9uIGRvZXMsIGJ1dCBmb3IgYm9yZGVycy5cblx0ZWxlbWVudC5zdHlsZS5ib3JkZXIgPSBcIjNweCBzb2xpZCBcIiArIGNvbG9yO1xuXHQvLyBnZXRDb21wdXRlZFN0eWxlIGlzIG5lY2Vzc2FyeSBoZXJlIHRvIGFjY29tb2RhdGUgYW55IG1hcmdpbi1yZWxhdGVkIHByb3BlcnR5IGluIHRoZSB1c2VyLWFnZW50IHN0eWxlc2hlZXRcblx0Ly8gc3VjaCBhcyAtd2Via2l0LW1hcmdpbi1iZWZvcmUgaW4gQ2hyb21lLiBJZiBzdWNoIGV4dHJhIG1hcmdpbiBhcHBsaWVkIHRvIDxoMT4gZWxlbWVudHMgd2VyZSBub3Rcblx0Ly8gYWNjb21vZGF0ZWQsIHBhc3NpbmcgdGhlIG1vdXNlIHBvaW50ZXIgb3ZlciBhbiA8aDE+IGVsZW1lbnQgd291bGQgY2F1c2UgdGhlIG1hcmdpbiB0byBzaHJpbmsgc3VkZGVubHlcblx0Ly8gdG8ganVzdCBvbmUgcGl4ZWwtLWEgZHJhc3RpYyBhbmQgcG9zc2libHkgZGlzY29uY2VydGluZyBjaGFuZ2Ugb2YgYXBwZWFyYW5jZS5cblx0Y29tcHV0ZWRTdHlsZSA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKGVsZW1lbnQsIG51bGwpO1xuXHRmb3IgKCBwcm9wSW5kZXggPSAwOyBwcm9wSW5kZXggPCA0OyBwcm9wSW5kZXgrKyApIHtcblx0ICAgIGNvbXB1dGVkUHJvcHNbcHJvcEluZGV4XSA9IGNvbXB1dGVkU3R5bGUuZ2V0UHJvcGVydHlWYWx1ZSggY29tcHV0ZWRQcm9wVGFiW3Byb3BJbmRleF0gKTtcblx0ICAgIGVuc3VyZUVub3VnaE1hcmdpbiggZWxlbWVudCwgcHJvcFRhYltwcm9wSW5kZXhdLCBjb21wdXRlZFByb3BzW3Byb3BJbmRleF0gKTtcblx0fVxuICAgIH1cbiAgICAvL2lmICh0eXBlb2YgYm94SW5Nb3Rpb24gPT0gXCJ1bmRlZmluZWRcIikgeyBpZCA9IFwiYm94SW5Nb3Rpb24gbm90IGZvdW5kXCI7IH0gZWxzZSB7IGlkID0gYm94SW5Nb3Rpb24uaWQ7IH1cbn1cblxuZnVuY3Rpb24gdW5vdXRsaW5lT25lRWxlbWVudCAoIGVsZW1lbnQgKSB7XG4gICAgLy9jb25zb2xlLmRlYnVnKFwidW5vdXRsaW5lT25lRWxlbWVudFwiKTtcbiAgICB0cnkge1xuXHRpZiAodHlwZW9mIGVsZW1lbnQuemVuID09IFwidW5kZWZpbmVkXCIpIHtcblx0ICAgIGJyZHIgPSBcImJvcmRlciBub3Qgc2F2ZWRcIjtcblx0fSBlbHNlIHtcblx0ICAgIGJyZHIgPSBlbGVtZW50Lnplbi5wcmVvdXRsaW5lU3R5bGUuYm9yZGVyO1xuXHR9XG5cdGJveEluTW90aW9uID0gZWxlbWVudDtcblx0aWYgKHR5cGVvZiBib3hJbk1vdGlvbiA9PSBcInVuZGVmaW5lZFwiKSB7IGlkID0gXCJib3hJbk1vdGlvbiBub3QgZm91bmRcIjsgfSBlbHNlIHsgaWQgPSBib3hJbk1vdGlvbi5pZDsgfVxuXHRpZCA9IGJveEluTW90aW9uLmlkO1xuXHRpZiAodHlwZW9mIGJveEluTW90aW9uLmlkID09IFwidW5kZWZpbmVkXCIpIHtcblx0ICAgIGNvbnNvbGUuZ3JvdXAoXCJ1bm91dGxpbmVPbmVFbGVtZW50OiBpZFwiKTsgY29uc29sZS5kaXIoZWxlbWVudCk7IGNvbnNvbGUuZ3JvdXBFbmQoKTtcblx0ICAgIGRlYnVnZ2VyO1xuXHR9XG5cdGxvZ2dlci5sb2coIFsgXCJ1bm91dGxpbmVPbmVFbGVtZW50KFwiK2VsZW1lbnQrXCIpOlwiLFwibm93IFwiK2VsZW1lbnQuc3R5bGUuYm9yZGVyLFwicHJldiBcIiticmRyLFwiYmltIFwiK2lkIF0gKTtcbiAgICB9XG4gICAgY2F0Y2ggKCBlcnJvciApIHtcblx0Y29uc29sZS5lcnJvciggZXJyb3IgKyBcInVub3V0bGluZU9uZUVsZW1lbnQ6IGVsZW1lbnQgPT4gXCIgKyBlbGVtZW50ICk7XG5cdGxvZ2dlci5sb2coIFsgXCJ1bm91dGxpbmVPbmVFbGVtZW50KFwiK2VsZW1lbnQrXCIpOlwiLFwibm93IFwiK2VsZW1lbnQuc3R5bGUuYm9yZGVyLFwicHJldiBcIiticmRyIF0gKTtcbiAgICB9XG4gICAgaWYgKGVsZW1lbnQgIT09IGRvY3VtZW50LmJvZHkpIHtcblx0ZWxlbWVudC5zdHlsZS5ib3JkZXIgPSBlbGVtZW50Lnplbi5wcmVvdXRsaW5lU3R5bGUuYm9yZGVyO1xuXHRlbGVtZW50LnN0eWxlLm1hcmdpbiA9IGVsZW1lbnQuemVuLnByZW91dGxpbmVTdHlsZS5tYXJnaW47XG4gICAgfVxuICAgIC8vaWYgKHR5cGVvZiBib3hJbk1vdGlvbiA9PSBcInVuZGVmaW5lZFwiKSB7IGlkID0gXCJib3hJbk1vdGlvbiBub3QgZm91bmRcIjsgfSBlbHNlIHsgaWQgPSBib3hJbk1vdGlvbi5pZDsgfVxufVxuXG4vLyBUaGlzIGZ1bmN0aW9uIHNldHMgdGhlIHRvcCwgcmlnaHQsIGJvdHRvbSwgb3IgbGVmdCBtYXJnaW4gb2YgYSBlbGVtZW50IHRvIDIgcGl4ZWxzXG4vLyB1bmxlc3MgdGhlIGNvbXB1dGVkIG1hcmdpbiBzdHlsZSBpcyAyIG9yIG1vcmUgcGl4ZWxzLlxuLy8gVGhlIHByb3AgYXJndW1lbnQgc2hvdWxkIGJlIHRoZSBwcm9wZXJ0eSBzdHJpbmcgZm9yIGp1c3Qgb25lIG1hcmdpbixcbi8vIGkuZS4gb2YgdGhlIGZvcm1hdCBcIjNweFwiLCBub3QgXCIwcHggM3B4XCIgb3IgdGhlIGxpa2UuXG4vLyBUaGUgY29tcHV0ZWRQcm9wIGFyZ3VtZW50IHNob3VsZCBiZSB0aGUgY29tcHV0ZWQgc3R5bGUgZm9yIGp1c3Qgb25lIG1hcmdpbi5cbmZ1bmN0aW9uIGVuc3VyZUVub3VnaE1hcmdpbiggZWxlbWVudCwgcHJvcCwgY29tcHV0ZWRQcm9wICkge1xuICAgIC8vY29uc29sZS5kZWJ1ZyhcImVuc3VyZU1hcmdpbjogcHJvcCA9PiBcIiArIHByb3AgKyBcIiwgY29tcHV0ZWRQcm9wID0+IFwiICsgY29tcHV0ZWRQcm9wKTtcbiAgICBpZiAoIGNvbXB1dGVkUHJvcC5zbGljZSggMCwgY29tcHV0ZWRQcm9wLmxlbmd0aCAtIDIgKSA8IDIgKSB7XG5cdC8vY29uc29sZS5kZWJ1ZyggXCJTZXR0aW5nIG1hcmdpblwiICk7XG5cdGVsZW1lbnQuc3R5bGVbcHJvcF0gPSBcIjJweFwiO1xuICAgIH1cbn1cblxuLy8gVW51c2VkLlxuLy8gVGhpcyB3aWxsIGZhaWwgaWYgaXQgZW5jb3VudGVycyBhIHRleHQgZWxlbWVudCBhbmQgdGhlIGxpa2UsIGJlY2F1c2UgdGV4dCBlbGVtZW50cyBoYXZlIG5vIHN0eWxlIHByb3BlcnR5LlxuLy8gRm9yIHRoYXQgcmVhc29uLCB1c2UgdGhlIG91dGxpbmVBbGxFbGVtZW50cyBmdW5jdGlvbiBpbnN0ZWFkLlxuZnVuY3Rpb24gb3V0bGluZUFsbEVsZW1lbnRzKCBjb2xvciApIHtcbiAgICB3YWxrRE9NKCBkb2N1bWVudC5ib2R5LFxuXHQgICAgIGZ1bmN0aW9uKCBlbGVtZW50ICkge1xuXHRcdCBjb25zb2xlLmRlYnVnKCBcIm91dGxpbmVBbGxFbGVtZW50czogZWxlbWVudCA9PiBcIiArIGVsZW1lbnQgKTtcblx0XHQgb3V0bGluZU9uZUVsZW1lbnQoIGVsZW1lbnQsIGNvbG9yICk7XG5cdCAgICAgfSk7XG59XG5cbmZ1bmN0aW9uIG91dGxpbmVBbGxFbGVtZW50cyggY29sb3IgKSB7XG4gICAgd2Fsa0VsZW1lbnRUcmVlKCBkb2N1bWVudC5ib2R5LFxuXHRcdCAgZnVuY3Rpb24oIGVsZW1lbnQgKSB7XG5cdFx0ICAgICAgY29uc29sZS5kaXIoIGVsZW1lbnQgKTtcblx0XHQgICAgICBvdXRsaW5lT25lRWxlbWVudCggZWxlbWVudCwgY29sb3IgKTtcblx0XHQgIH0pO1xufVxuXG4vLyBVbnVzZWQuXG5mdW5jdGlvbiB3YWxrRE9NKCBlbGVtZW50LCBmdW5jICkge1xuICAgIGZ1bmMoIGVsZW1lbnQgKTtcbiAgICBlbGVtZW50ID0gZWxlbWVudC5maXJzdENoaWxkO1xuICAgIHdoaWxlKCBlbGVtZW50ICkge1xuICAgICAgICB3YWxrRE9NKCBlbGVtZW50LCBmdW5jICk7XG4gICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm5leHRTaWJsaW5nO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gd2Fsa0VsZW1lbnRUcmVlKCBlbGVtZW50LCBmdW5jICkge1xuICAgIGZ1bmMoIGVsZW1lbnQgKTtcbiAgICBlbGVtZW50ID0gZWxlbWVudC5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICB3aGlsZSggZWxlbWVudCApIHtcbiAgICAgICAgd2Fsa0VsZW1lbnRUcmVlKCBlbGVtZW50LCBmdW5jICk7XG4gICAgICAgIGVsZW1lbnQgPSBlbGVtZW50Lm5leHRFbGVtZW50U2libGluZztcbiAgICB9XG59XG5cbnJldHVybiB7IHNhdmVTdHlsZTogc2F2ZVN0eWxlLCBvdXRsaW5lT25lRWxlbWVudDogb3V0bGluZU9uZUVsZW1lbnQsIHVub3V0bGluZU9uZUVsZW1lbnQ6IHVub3V0bGluZU9uZUVsZW1lbnQgfTtcbn07XG4iXX0=
