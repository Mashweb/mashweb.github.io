module.exports = function( ) {

logger = require( "./logger.js" )();

var computedProps = [];

function saveStyle( container ) {
    //console.debug("saveStyle");
    var elements = Array.prototype.slice.call( container.children ); // Make real Array from HTMLCollection.
    logger.log( "saveStyle: enter" );
    elements.forEach( function( element ) {
	if ( typeof element.zen == "undefined" || typeof element.zen.preoutlineStyle == "undefined" ) {
	    element.zen = {};
	    element.zen.preoutlineStyle = {};
	}
	element.zen.preoutlineStyle.border = element.style.border;
	element.zen.preoutlineStyle.margin = element.style.margin;
    } );
    if ( typeof container.zen == "undefined" || typeof container.zen.preoutlineStyle == "undefined" ) {
	container.zen = { };
	container.zen.preoutlineStyle = { };
    }
    container.zen.preoutlineStyle.border = container.style.border;
    container.zen.preoutlineStyle.margin = container.style.margin;
}

function outlineOneElement( element, color ) {
    var computedStyle;
    var propTab         = [ "marginTop",     "marginRight",     "marginBottom",     "marginLeft"     ];
    var computedPropTab = [ "margin-top",    "margin-right",    "margin-bottom",    "margin-left"    ];
    var id;

    //console.debug("outlineOneElement");
    //if (typeof boxInMotion == "undefined") { id = "boxInMotion not found"; } else { id = boxInMotion.id; }
    if (typeof element.zen == "undefined") { brdr = "border not saved"; } else { brdr = element.zen.preoutlineStyle.border; }
    logger.log( [ "outlineOneElement("+element.id+","+color+"):","now "+element.style.border,"prev "+brdr,"bim "+id ] );
    /*
    if (element == document.body) { // Don't outline the document body element.
	logger.log("outlineOneElement: enter: called for body with color => " + color);
	return;
    }
    */
    if ( typeof element.zen == "undefined" || typeof element.zen.preoutlineStyle == "undefined" ) {
	logger.log( "outlineOneElement" );
	element.zen = {};
	element.zen.preoutlineStyle = {};
	element.zen.preoutlineStyle.border = element.style.border;
	element.zen.preoutlineStyle.margin = element.style.margin;
    }
    if ( typeof element.style == "undefined" ) {
	console.error("outlineOneElement: element.style is undefined");
    } else {
	// FIXME: This isn't optimal. It should do something like what the ensureMargin function does, but for borders.
	element.style.border = "3px solid " + color;
	// getComputedStyle is necessary here to accomodate any margin-related property in the user-agent stylesheet
	// such as -webkit-margin-before in Chrome. If such extra margin applied to <h1> elements were not
	// accomodated, passing the mouse pointer over an <h1> element would cause the margin to shrink suddenly
	// to just one pixel--a drastic and possibly disconcerting change of appearance.
	computedStyle = window.getComputedStyle(element, null);
	for ( propIndex = 0; propIndex < 4; propIndex++ ) {
	    computedProps[propIndex] = computedStyle.getPropertyValue( computedPropTab[propIndex] );
	    ensureEnoughMargin( element, propTab[propIndex], computedProps[propIndex] );
	}
    }
    //if (typeof boxInMotion == "undefined") { id = "boxInMotion not found"; } else { id = boxInMotion.id; }
}

function unoutlineOneElement ( element ) {
    //console.debug("unoutlineOneElement");
    try {
	if (typeof element.zen == "undefined") {
	    brdr = "border not saved";
	} else {
	    brdr = element.zen.preoutlineStyle.border;
	}
	boxInMotion = element;
	if (typeof boxInMotion == "undefined") { id = "boxInMotion not found"; } else { id = boxInMotion.id; }
	id = boxInMotion.id;
	if (typeof boxInMotion.id == "undefined") {
	    console.group("unoutlineOneElement: id"); console.dir(element); console.groupEnd();
	    debugger;
	}
	logger.log( [ "unoutlineOneElement("+element+"):","now "+element.style.border,"prev "+brdr,"bim "+id ] );
    }
    catch ( error ) {
	console.error( error + "unoutlineOneElement: element => " + element );
	logger.log( [ "unoutlineOneElement("+element+"):","now "+element.style.border,"prev "+brdr ] );
    }
    if (element !== document.body) {
	element.style.border = element.zen.preoutlineStyle.border;
	element.style.margin = element.zen.preoutlineStyle.margin;
    }
    //if (typeof boxInMotion == "undefined") { id = "boxInMotion not found"; } else { id = boxInMotion.id; }
}

// This function sets the top, right, bottom, or left margin of a element to 2 pixels
// unless the computed margin style is 2 or more pixels.
// The prop argument should be the property string for just one margin,
// i.e. of the format "3px", not "0px 3px" or the like.
// The computedProp argument should be the computed style for just one margin.
function ensureEnoughMargin( element, prop, computedProp ) {
    //console.debug("ensureMargin: prop => " + prop + ", computedProp => " + computedProp);
    if ( computedProp.slice( 0, computedProp.length - 2 ) < 2 ) {
	//console.debug( "Setting margin" );
	element.style[prop] = "2px";
    }
}

// Unused.
// This will fail if it encounters a text element and the like, because text elements have no style property.
// For that reason, use the outlineAllElements function instead.
function outlineAllElements( color ) {
    walkDOM( document.body,
	     function( element ) {
		 console.debug( "outlineAllElements: element => " + element );
		 outlineOneElement( element, color );
	     });
}

function outlineAllElements( color ) {
    walkElementTree( document.body,
		  function( element ) {
		      console.dir( element );
		      outlineOneElement( element, color );
		  });
}

// Unused.
function walkDOM( element, func ) {
    func( element );
    element = element.firstChild;
    while( element ) {
        walkDOM( element, func );
        element = element.nextSibling;
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

return { saveStyle: saveStyle, outlineOneElement: outlineOneElement, unoutlineOneElement: unoutlineOneElement };
};
