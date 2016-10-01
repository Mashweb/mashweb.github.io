var computedProps   = [];

function outlineOneNode(node) {
    var computedStyle;
    var propTab         = [ "marginTop",     "marginRight",     "marginBottom",     "marginLeft"     ];
    var computedPropTab = [ "margin-top",    "margin-right",    "margin-bottom",    "margin-left"    ];
    node.zen = {};
    node.zen.saveStyles = {};
    if (node.style !== undefined) {
	node.zen.saveStyles.border = node.style.border;
	if (node.style.border == "") {
	    node.style.border = "2px solid red";
	}
	node.zen.saveStyles.display = node.style.display;
	//node.style.display = "block";
	node.zen.saveStyles.margin = node.style.margin;
	// getComputedStyle is necessary here to accomodate any margin-related property in the user-agent stylesheet
	// such as -webkit-margin-before in Chrome. If such extra margin applied to <h1> elements were not
	// accomodated, passing the mouse pointer over an <h1> element would cause the margin to shrink suddenly
	// to just one pixel--a drastic and possibly disconcerting change of appearance.
	computedStyle = window.getComputedStyle(node, null);
	for (propIndex = 0; propIndex < 4; propIndex++) {
	    computedProps[propIndex] = computedStyle.getPropertyValue( computedPropTab[propIndex] );
	    ensureMargin(node, propTab[propIndex], computedProps[propIndex]);
	}
	marginRightProperty = window.getComputedStyle(node, null).getPropertyValue("margin-right");
	marginBottomProperty = window.getComputedStyle(node, null).getPropertyValue("margin-bottom");
	marginLeftProperty = window.getComputedStyle(node, null).getPropertyValue("margin-left");
    }
}

// This function sets the top, right, bottom, or left of a node to 2 pixels
// unless the computed margin style is 2 or more pixels.
// The property argument should be the property string for just one margin,
// i.e. of the format "3px", not "0px 3px" or the like.
function ensureMargin(node, prop, computedProp) {
    //console.debug("ensureMargin: prop => " + prop + ", computedProp => " + computedProp);
    if (computedProp.slice(0, computedProp.length - 2) < 2) {
	//console.debug("Setting margin");
	node.style[prop] = "2px";
    }
}
