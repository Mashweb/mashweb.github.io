/*
 * Move the first DIV with class "box" from one position to another within
 * its containing NodeList. We want to give it a direct-manipulation feel,
 * so we "grab" the DIV by temporarily converting its position value to
 * relative.
 *
 * FIXME: Allow any static block to be moved to any position in the NodeList.
 * Make the setting of the body's margin property to 0, which is being done
 * here in block.html, unnecessary.
 */

var boxes, box, body, boxClass, startX, endX, boxLeft, parent;
var inDragProcess = false;
var minGesture = 10; // Moves less than this many pixels don't move in the NodeList.

init = function() {
    boxes = document.getElementsByClassName("box");
    box = boxes[0];
    boxLeft = box.style.left;
    boxClass = box.className;
    box.addEventListener("mousedown", handleMousedown);
    parent = box.parentElement;
    body = document.getElementsByTagName("body")[0];
    body.addEventListener("mouseup", handleMouseup);
    body.addEventListener("mousemove", handleMousemove);
}

insertAfter = function(newElement, targetElement) {
    var parent = targetElement.parentNode;
    if (parent.lastchild == targetElement) {
	parent.appendChild(newElement);
    } else {
	parent.insertBefore(newElement, targetElement.nextSibling);
    }
}

handleMousedown = function(event) {
    console.debug("mousedown, clientX=" + event.clientX + ", clientY=" +
		  event.clientY);
    startX = event.clientX;
    box.style.position = "relative";
    box.className += " draggable-inline";
    // Without the call to the preventDefault method, the mouseup event won't
    // work for images. The rationale for this is that browsers might have
    // native image drag-and-drop to targets outside the browser.
    // See http://stackoverflow.com/a/13236751 .
    event.preventDefault();
    inDragProcess = true;
}

handleMouseup = function(event) {
    console.debug("mouseup, clientX=" + event.clientX + ", clientY=" +
		  event.clientY);
    endX = event.clientX;
    if (endX > startX + 10) {
	console.debug("Removing box and reinserting after the next box.");
	parent.removeChild(box);
	insertAfter(box, boxes[0]);
	box.className = boxClass;
    }
    box.style.position = "static";
    box.style.left = boxLeft;
    inDragProcess = false;
}

handleMousemove = function(event) {
    if (inDragProcess) {
	box.style.left = Math.max(event.clientX - startX, 0);
    }
}
