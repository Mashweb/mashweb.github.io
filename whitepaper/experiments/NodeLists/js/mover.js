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

var boxes, box, body, boxClass, startY, endX, boxTop, parent;
var inDragProcess = false;
var minGesture = 10; // Moves less than this many pixels don't move in the NodeList.

init = function() {
    boxes = document.getElementsByClassName("box");
    box = boxes[0];
    boxTop = box.style.top;
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
    startY = event.clientY;
    box.style.position = "relative";
    box.className += " draggable-block";
    event.preventDefault();
    inDragProcess = true;
}

handleMouseup = function(event) {
    console.debug("mouseup, clientX=" + event.clientX + ", clientY=" +
		  event.clientY);
    endY = event.clientY;
    if (endY > startY + 10) {
	console.debug("Removing box and reinserting after the next box.");
	parent.removeChild(box);
	insertAfter(box, boxes[0]);
	box.className = boxClass;
    }
    box.style.position = "static";
    box.style.top = boxTop;
    inDragProcess = false;
}

handleMousemove = function(event) {
    if (inDragProcess) {
	box.style.top = Math.max(event.clientY - startY, 0);
    }
}
    
