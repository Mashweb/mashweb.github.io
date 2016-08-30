var target, pos, dragging;

init = function() {
    target = $('img');
    pos = 0;
    dragging = false;

    $(document).mousedown(
	function(e) {
	    console.debug("Mouse down");
	    e.preventDefault();
	    pos=e.pageX;
	    dragging = true;
	});

    $(document).mouseup(
	function() {
	    console.debug("Mouse up");
	    dragging = false;
	});
    
    $(document).mousemove(
	function(e) {
	    if (dragging) { 
		console.debug("Mouse move");
		target.css('left', e.pageX-pos);
	    }
	});
}
