// Save history and dump some of it when called.

function dumpLog( index = -5 ) {
    for ( ix = log.history.count + index; ix <= log.history.count; ix++ ) {
	console.debug(log.history[ix]);
    }
    return "Done."
}

function log( obj ) {
    log.history = log.history || [];
    log.history.push(obj);
    log.history.count = log.history.count + 1 || 0;
}

function clearLog( ) {
    log.history = [];
    log.history.count = 0;
}
