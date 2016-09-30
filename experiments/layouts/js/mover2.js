/*
 * Move the first DIV with class "box" from one position to another within
 * its containing NodeList. We want to give it a direct-manipulation feel,
 * so we "grab" the DIV by temporarily converting its position value to
 * relative.
 *
 * See http://stackoverflow.com/a/13236751 .
 *
 * FIXME: Allow any static block to be moved to any position in the NodeList.
 * Make the setting of the body's margin property to 0, which is being done
 * here in block.html, unnecessary.
 */

var lastTarget;

init = function() {
    var body = document.getElementsByTagName("body")[0];
    body.addEventListener("mousemove", handleMousemove);
    
}

handleMousemove = function(event) {
    var target = event.target;
    if (lastTarget != target) {
	if (lastTarget !== undefined) {
	    // Restore the original style of the node over which the mouse pointer passed.
	    lastTarget.style.border = lastTarget.zen.saveStyles.border;
	    lastTarget.style.margin = lastTarget.zen.saveStyles.margin;
	}
	if (target.zen == undefined) {
	    target.zen = {};
	    target.zen.saveStyles = {};
	}
	target.zen.saveStyles.border = target.style.border;
	target.zen.saveStyles.margin = target.style.margin;
	outlineOneNode(target);
	lastTarget = target;
    }
}
