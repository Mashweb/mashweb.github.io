/*
 * As the mouse pointer moves over a targetable element, highlight that element with a red border and a margin.
 * As the mouse pointer moves away from the element, reset the element's borders and margins.
 */

var lastTarget;

initHighlighter = function() {
    var body = document.getElementsByTagName("body")[0];
    body.addEventListener("mousemove", handleMousemoveHighlighter);
    
}

handleMousemoveHighlighter = function(event) {
    var target = event.target;
    if (lastTarget != target) {
	if (lastTarget !== undefined) {
	    // Restore the original style of the node over which the mouse pointer passed.
	    lastTarget.style.border = lastTarget.zen.saveStyles.border;
	    //lastTarget.style.display = lastTarget.zen.saveStyles.display;
	    lastTarget.style.margin = lastTarget.zen.saveStyles.margin;
	}
	if (target.zen == undefined) {
	    target.zen = {};
	    target.zen.saveStyles = {};
	}
	target.zen.saveStyles.border = target.style.border;
	//target.zen.saveStyles.display = target.style.display;
	target.zen.saveStyles.margin = target.style.margin;
	outlineOneNode(target);
	lastTarget = target;
    }
}
