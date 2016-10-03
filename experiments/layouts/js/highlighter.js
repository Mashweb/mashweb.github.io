/*
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
