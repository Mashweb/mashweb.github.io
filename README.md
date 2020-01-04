# README

This repository was previously named "zen". Almost all of the code it
contained was in the "gh-pages" branch. The only other branch,
"master", was a clone of https://github.com/barryclark/jekyll-now
with a single post (introduction.md) added.
The master branch had a README.md, which contained only the words:

	Zen is a project to create a mostly-JavaScript toolkit to enable
	profoundly easy, personalized, adaptive evolution of websites and
	web applications. The source code for various prototypes of Zen
	is being migrated into this repository.

	Currently, the best documentation on Zen can be found in its
	[white paper](https://tomelam.github.io/zen/whitepaper).

The two branches of this repository have been merged.
The README.md has been updated to help document the conversion of the
Jekyll Now website into a Jekyll website with the theme "Leap Day".
The "experiments" and "whitepaper" here came from the gh-pages branch.

The present setup was created following the instructions at
https://jekyllrb.com/docs/github-pages/ .
This involved only minor changes to the very simple Gemfile from the gh-pages
branch and adding the line "jekyll (= 3.8.5)" as the Gemfile itself suggested.
Note the important advice from
https://help.github.com/en/github/working-with-github-pages/testing-your-github-pages-site-locally-with-jekyll#updating-the-github-pages-gem :
	Jekyll is an active open source project that is updated frequently.
	If the github-pages gem on your computer is out of date with the
	github-pages gem on the GitHub Pages server, your site may look
	different when built locally than when published on GitHub.
	To avoid this, regularly update the github-pages gem on your computer.

Be cognizant of the following help pages:
* https://help.github.com/en/github/working-with-github-pages/about-github-pages
* https://help.github.com/en/github/working-with-github-pages/about-custom-domains-and-github-pages
* https://help.github.com/en/github/working-with-github-pages/configuring-a-custom-domain-for-your-github-pages-site
* https://help.github.com/en/github/working-with-github-pages/troubleshooting-custom-domains-and-github-pages
* https://help.github.com/en/github/working-with-github-pages/securing-your-github-pages-site-with-https
* https://help.github.com/en/github/working-with-github-pages/managing-a-custom-domain-for-your-github-pages-site

Use an https URL to clone this repository if Github Pages requires that
so it can include the seq_webapp_biwascheme submodule.

The rest of this README.md originated in the old gh-pages branch.

# zen
A mostly-JavaScript toolkit to enable profoundly easy, personalized evolution of websites and web applications

The styles and setup for these GitHub Pages were copied from [Ratchet's GitHub Pages](https://github.com/twbs/ratchet/tree/gh-pages).
