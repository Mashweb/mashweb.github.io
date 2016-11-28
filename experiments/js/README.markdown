## The browserify.html demo

The "finding Superman" example in the "Getting Started with Browserify"
tutorial <a href="https://www.sitepoint.com/getting-started-browserify/">here
</a> on SitePoint was followed to create findsuperman_main.js then findem.js.
The only change was that "main.js" was named findsuperman_main.js.

As part of the preparation, 'npm install underscore' was run in this
directory. Of course, it was previously installed (using brew).

## The NodeListDMI.html demo

The demo entitled "NodeList Manipulation with Display Property Set to Block,
Inline-Block, or Inline" (NodeListDMI.html) uses the same techniques as the
browserify.html demo. Broserify was run on block+inline-mover.js to create
zen.js, like so: 'browserify main.js -o NodListDMI.js -d'.

Now since zen.js contains all the functionality of the files that
browserify concatenated into it, it can be pasted into Tampermonkey
as a userscript to work in any web page. See the movie
"../movies/NodeListDMI_installed_in_Facebook.mov"
