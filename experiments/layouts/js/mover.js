/*
 * Move any block element contained by an element of CSS class "parent-box"
 * from one position to another within the parent box's NodeList.
 * We want to give it a direct-manipulation feel,
 * so we "grab" the DIV by temporarily converting its position value to
 * relative.
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

calcCriticalPositions = function() {
    boxes = parent.children;
    totalHeight = 0;
    str = "critical positions => ";
    for (boxi = 0; boxi < boxes.length; boxi++) {
	boundingRect = boxes[boxi].getBoundingClientRect();
	console.debug("boundingRect.top => " + boundingRect.top +
		      ", boundingRect.bottom => " + boundingRect.bottom);
	criticalPositions[boxi] =
	    Math.round(((boundingRect.bottom - boundingRect.top) * 0.5) + boundingRect.top);
	str += criticalPositions[boxi] + ", ";
    }
    console.debug(str);
}    

insertAfter = function(newElement, targetElement) {
    var parent = targetElement.parentElement; //CHANGED. WAS parentNode.
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
	    parent.removeChild(boxInMotion);
	    console.debug("targetBoxIndex => " + targetBoxIndex);
	    insertAfter(boxInMotion, boxes[targetBoxIndex - 1]); // Subtract 1 because we removed boxInMotion.
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
    
