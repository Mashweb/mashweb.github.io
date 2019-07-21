// Save history and dump some of it when called.
// Edit: Now all the history is dumped when dumpLog is called.

// function dumpLog( index = -5 ) { // What was this for?

function dumpLog( ) {
    var ix, count = log.history.count;
    for ( ix = log.history.count - 1; ix < log.history.count; ix++ ) {
	console.log(log.history[ix]);
    }
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

export { dumpLog, log, clearLog };
