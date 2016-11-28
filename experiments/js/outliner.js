module.exports = function( ) {

logger = require( "./logger.js" )();

var computedProps = [];

function saveBorders( container ) {
    //console.debug("saveBorders");
    var elements = Array.prototype.slice.call( container.children ); // Make real Array from HTMLCollection.
    elements.forEach( function( node ) {
	if ( typeof node.zen == "undefined" || typeof node.zen.preoutlineStyle == "undefined" ) {
	    node.zen = {};
	    node.zen.preoutlineStyle = {};
	}
	node.zen.preoutlineStyle.border = node.style.border;
	node.zen.preoutlineStyle.margin = node.style.margin;
    } );
    if ( typeof container.zen == "undefined" || typeof container.zen.preoutlineStyle == "undefined" ) {
	container.zen = { };
	container.zen.preoutlineStyle = { };
    }
    container.zen.preoutlineStyle.border = container.style.border;
    container.zen.preoutlineStyle.margin = container.style.margin;
}

function outlineOneNode( node, color ) {
    var computedStyle;
    var propTab         = [ "marginTop",     "marginRight",     "marginBottom",     "marginLeft"     ];
    var computedPropTab = [ "margin-top",    "margin-right",    "margin-bottom",    "margin-left"    ];
    var id;

    //console.debug("outlineOneNode");
    //if (typeof boxInMotion == "undefined") { id = "boxInMotion not found"; } else { id = boxInMotion.id; }
    if (typeof node.zen == "undefined") { brdr = "border not saved"; } else { brdr = node.zen.preoutlineStyle.border; }
    logger.log( [ node.id+","+color+")","now "+node.style.border,"prev "+brdr,"bim "+id ] );
    /*
    if (node == document.body) { // Don't outline the document body element.
	logger.log("outlineOneNode: enter: called for body with color => " + color);
	return;
    }
    */
    if ( typeof node.zen == "undefined" || typeof node.zen.preoutlineStyle == "undefined" ) {
	node.zen = {};
	node.zen.preoutlineStyle = {};
	node.zen.preoutlineStyle.border = node.style.border;
	node.zen.preoutlineStyle.margin = node.style.margin;
    }
    if ( typeof node.style == "undefined" ) {
	console.error("outlineOneNode: node.style is undefined");
    } else {
	// FIXME: This isn't optimal. It should do something like what the ensureMargin function does, but for borders.
	node.style.border = "3px solid " + color;
	// getComputedStyle is necessary here to accomodate any margin-related property in the user-agent stylesheet
	// such as -webkit-margin-before in Chrome. If such extra margin applied to <h1> elements were not
	// accomodated, passing the mouse pointer over an <h1> element would cause the margin to shrink suddenly
	// to just one pixel--a drastic and possibly disconcerting change of appearance.
	computedStyle = window.getComputedStyle(node, null);
	for ( propIndex = 0; propIndex < 4; propIndex++ ) {
	    computedProps[propIndex] = computedStyle.getPropertyValue( computedPropTab[propIndex] );
	    ensureEnoughMargin( node, propTab[propIndex], computedProps[propIndex] );
	}
    }
    //if (typeof boxInMotion == "undefined") { id = "boxInMotion not found"; } else { id = boxInMotion.id; }
}

function unoutlineOneNode ( node ) {
    //console.debug("unoutlineOneNode");
    //if (typeof boxInMotion == "undefined") { id = "boxInMotion not found"; } else { id = boxInMotion.id; }
    //logger.log( [ node.id, "now " + node.style.border, "prev " + brdr, "bim " + id ] );
    if (node !== document.body) {
	node.style.border = node.zen.preoutlineStyle.border;
	node.style.margin = node.zen.preoutlineStyle.margin;
    }
    //if (typeof boxInMotion == "undefined") { id = "boxInMotion not found"; } else { id = boxInMotion.id; }
}

// This function sets the top, right, bottom, or left of a node to 2 pixels
// unless the computed margin style is 2 or more pixels.
// The prop argument should be the property string for just one margin,
// i.e. of the format "3px", not "0px 3px" or the like.
// The computedProp argument should be the computed style for just one margin.
function ensureEnoughMargin( node, prop, computedProp ) {
    //console.debug("ensureMargin: prop => " + prop + ", computedProp => " + computedProp);
    if ( computedProp.slice( 0, computedProp.length - 2 ) < 2 ) {
	//console.debug( "Setting margin" );
	node.style[prop] = "2px";
    }
}

// Unused.
// This will fail if it encounters a text node and the like, because text nodes have no style property.
// For that reason, use the outlineAllElements function instead.
function outlineAllNodes( color ) {
    walkDOM( document.body,
	     function( node ) {
		 console.debug( "outlineAllNodes: node => " + node );
		 outlineOneNode( node, color );
	     });
}

function outlineAllElements( color ) {
    walkElementTree( document.body,
		  function( element ) {
		      console.dir( element );
		      outlineOneNode( element, color );
		  });
}

// Unused.
function walkDOM( node, func ) {
    func( node );
    node = node.firstChild;
    while( node ) {
        walkDOM( node, func );
        node = node.nextSibling;
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

return { saveBorders: saveBorders, outlineOneNode: outlineOneNode, unoutlineOneNode: unoutlineOneNode };
};
