/*
 * Move any block element contained by an element of CSS class "parent-box"
 * from one position to another within the parent box's NodeList.
 * We want to give it a direct-manipulation feel,
 * so we "grab" the DIV by temporarily converting its position value to
 * relative.
 *
 * The critical position for any block box B is, for the sake of a good GUI effect,
 * halfway between the top and bottom of the box. If the bottom of the
 * box in motion is dropped farther down the web page than this position, the
 * box in motion will be moved somewhere *after* box B in the parent's NodeList.
 * If the top of the box in motion is up the page from the critical position
 * for any block box B, the box in motion will be moved somewhere *before* box B.
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
 *      |  0  | <- critcal position for block box 0
 *      |     |
 *      +-----+ 100
 *      |     |
 *      |  1  | <- critcal position for block box 1
 *      |     |
 *      +-----+ 200
 *      |     |
 *      |     |
 *      |     |
 *      |  2  | <- critical position for bock box 2
 *      |     |
 *      |     |
 *      |     |
 *      +-----+ 400
 *      |     |
 *      |  3  | <- critcal position for block box 3
 *      |     |
 *      +-----+ 500
 *
 * FIXME: Allow any static block to be moved to any position in the NodeList.
 *
 * FIXME: Allow any parent element to participate. The parent element is the
 * element whose children are the moving element or its siblings.
 * This code is for a prototype GUI, so it is assumed that the parent
 * element will be determined by a different method than the method used here.
 *
 * FIXME: Make the setting of the body's margin property to 0, which is being
 * done here in block.html, unnecessary.
 *
 * FIXME: BUG: If the bottom of block box 0 is dragged to position Y=30,
 * the box is not moved in its parent's NodeList, but boxInMotion is not set
 * to null. Then if the bottom of block box 1 is dragged to position Y=250,
 * the box is not moved in its parent's NodeList, but since boxInMotion
 * is not null but points to the box in motion (box 1), which at the moment
 * has no parent, the box is not returned to the NodeList and is lost.
 */

var boxes, box, body, boxClass, boxTop, startY, endX, boxTop, parent;
var inDragProcess = false;

// Moves smaller than minGesture pixels don't move an element in the NodeList.
var minGesture = 10;

var boundingRect, boxi, boxInMotion, deltaY;
var targetBoxIndex = null;


var criticalPositions = [];

init = function() {
    var str;
    initHighlighter();
    parent = document.getElementsByClassName("parent-box")[0];
    calcCriticalPositions();
    parent.addEventListener("mousedown", handleMousedown);
    body = document.getElementsByTagName("body")[0];
    body.addEventListener("mouseup", handleMouseup);
    body.addEventListener("mousemove", handleMousemove);
}

findBoxIndex = function(box) {
    for (boxi = 0; boxi < boxes.length; boxi++) {
	if (box = boxes[boxi]) {
	    console.debug("findBoxIndex: index is " + boxi);
	    return boxi;
	}
    }
    console.error("findBoxIndex: Could not find index");
    return null;
}

calcCriticalPositions = function() {
    boxes = parent.children;
    totalHeight = 0;
    str = "critical positions => ";
    for (boxi = 0; boxi < boxes.length; boxi++) {
	boundingRect = boxes[boxi].getBoundingClientRect();
	//console.debug("boundingRect.top => " + boundingRect.top +
	//	      ", boundingRect.bottom => " + boundingRect.bottom);
	criticalPositions[boxi] =
	    Math.round(((boundingRect.bottom - boundingRect.top) * 0.5) + boundingRect.top);
	str += criticalPositions[boxi] + ", ";
    }
    console.debug(str);
}    

insertAfter = function(newElement, targetElement) {
    var parent = targetElement.parentElement;
    if (parent.lastchild == targetElement) {
	parent.appendChild(newElement);
    } else {
	//console.debug("newElement => " + newElement + ", targetElement => " + targetElement);
	parent.insertBefore(newElement, targetElement.nextSibling);
    }
    //calcCriticalPositions();
    targetBoxIndex = null;
}

handleMousedown = function(event) {
    console.debug("mousedown, clientY=" + event.clientY);
    boxInMotion = event.target;
    boxTop = boundingRect.top;
    boxClass = boxInMotion.className;
    boxTop = boxInMotion.style.top;
    //console.debug("boxTop => " + boxTop + ", boxBottom => " + boundingRect.bottom + ", boxClass => " + boxClass);
    startY = event.clientY;
    boxInMotion.style.position = "relative";
    boxInMotion.className += " draggable-block";
    event.preventDefault();
    inDragProcess = true;
}

handleMouseup = function(event) {
    console.debug("mouseup, clientY=" + event.clientY);
    endY = event.clientY;
    if (endY > startY + 10) {
	console.debug("endY => " + endY + ", startY => " + startY);
	if (targetBoxIndex !== null) {
	    //if (findBoxIndex(boxInMotion) != targetBoxIndex) {
	    if (parent !== undefined) {
		parent.removeChild(boxInMotion);
		console.debug("targetBoxIndex => " + targetBoxIndex + ", index of box in motion => " +
			      findBoxIndex(boxInMotion));
		// 1 is subtracted from targetBoxIndex here because after the boxes array was filled, the box in motion
		// was removed from the parent's NodeList, so the indexes of boxes will be reduced by 1.
		insertAfter(boxInMotion, boxes[targetBoxIndex - 1]); // Subtract 1 because we removed boxInMotion.
	    } else {
		console.debug("Box in motion is its own target; this is a null operation.");
	    }
	} else {
	    console.debug("targetBoxIndex null");
	}
    }
    boxInMotion.style.position = "static";
    boxInMotion.className = boxClass;
    boxInMotion.style.top = boxTop;
    calcCriticalPositions();
    inDragProcess = false;
}

handleMousemove = function(event) {
    var doMoveBox = false;
    if (inDragProcess) {
	deltaY = event.clientY - startY;
	boxInMotion.style.top = Math.max(deltaY, 0);
	for (boxi = 0; boxi < boxes.length; boxi++) {
	    if (boxes[boxi] != boxInMotion) {
		boundingRect = boxInMotion.getBoundingClientRect();
		//console.debug("boxInMotion top => " + boundingRect.top);
		//console.debug("criticalPositions[boxi] => " +
		//	      criticalPositions[boxi] + ", Target box index => " + boxi);
		if (boundingRect.bottom > criticalPositions[boxi]) {
		    targetBoxIndex = boxi;			
		    //console.debug("boundingRect.top => " + boundingRect.top + ", boxi => " + boxi +
		    //		  ", criticalPositions[boxi] => " + criticalPositions[boxi]);
		}
	    }
	}
    }
}
    
