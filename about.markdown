---
layout: default
title:  "About"
permalink: /about/
date:   2020-01-09 12:19:36 +0530
categories: jekyll tutorial
---
# About doc.mashweb.club

This repository was previously named "zen". Almost all of the code it
contained was in the "gh-pages" branch. The only other branch,
"master", was a clone of [https://github.com/barryclark/jekyll-now](jekyll-now)
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

## Setup of Jekyll for GitHub Pages

The present setup was created following the instructions at
[https://jekyllrb.com/docs/github-pages/](https://jekyllrb.com/docs/github-pages/).
This involved only minor changes to the very simple Gemfile from the gh-pages
branch and adding the line "jekyll (= 3.8.5)" as the Gemfile itself suggested.
Note the important advice from
[https://help.github.com/en/github/working-with-github-pages/testing-your-github-pages-site-locally-with-jekyll#updating-the-github-pages-gem](https://help.github.com/en/github/working-with-github-pages/testing-your-github-pages-site-locally-with-jekyll#updating-the-github-pages-gem):

	Jekyll is an active open source project that is updated frequently.
	If the github-pages gem on your computer is out of date with the
	github-pages gem on the GitHub Pages server, your site may look
	different when built locally than when published on GitHub.
	To avoid this, regularly update the github-pages gem on your computer.

## Jekyll and GitHub Pages documentation

Be cognizant of the following help pages:

* [https://help.github.com/en/github/working-with-github-pages/about-github-pages](https://help.github.com/en/github/working-with-github-pages/about-github-pages)

* [https://help.github.com/en/github/working-with-github-pages/about-custom-domains-and-github-pages](https://help.github.com/en/github/working-with-github-pages/about-custom-domains-and-github-pages)

* [https://help.github.com/en/github/working-with-github-pages/configuring-a-custom-domain-for-your-github-pages-site](https://help.github.com/en/github/working-with-github-pages/configuring-a-custom-domain-for-your-github-pages-site)

* [https://help.github.com/en/github/working-with-github-pages/troubleshooting-custom-domains-and-github-pages](https://help.github.com/en/github/working-with-github-pages/troubleshooting-custom-domains-and-github-pages)

* [https://help.github.com/en/github/working-with-github-pages/securing-your-github-pages-site-with-https](https://help.github.com/en/github/working-with-github-pages/securing-your-github-pages-site-with-https)

* [https://help.github.com/en/github/working-with-github-pages/managing-a-custom-domain-for-your-github-pages-site](https://help.github.com/en/github/working-with-github-pages/managing-a-custom-domain-for-your-github-pages-site)

* [https://help.github.com/en/github/working-with-github-pages/testing-your-github-pages-site-locally-with-jekyll#updating-the-github-pages-gem](https://help.github.com/en/github/working-with-github-pages/testing-your-github-pages-site-locally-with-jekyll#updating-the-github-pages-gem)

* [https://help.github.com/en/github/working-with-github-pages/setting-up-a-github-pages-site-with-jekyll](https://help.github.com/en/github/working-with-github-pages/setting-up-a-github-pages-site-with-jekyll)

* [https://help.github.com/en/github/working-with-github-pages/creating-a-github-pages-site-with-jekyll](https://help.github.com/en/github/working-with-github-pages/creating-a-github-pages-site-with-jekyll)

* [https://help.github.com/en/github/working-with-github-pages/about-jekyll-build-errors-for-github-pages-sites](https://help.github.com/en/github/working-with-github-pages/troubleshooting-jekyll-build-errors-for-github-pages-sites)

* [https://help.github.com/en/github/working-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site](https://help.github.com/en/github/working-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

* [https://help.github.com/en/enterprise/2.14/user/articles/setting-up-your-github-pages-site-locally-with-jekyll](https://help.github.com/en/enterprise/2.14/user/articles/setting-up-your-github-pages-site-locally-with-jekyll)

* [https://help.github.com/en/enterprise/2.14/user/articles/configuring-jekyll](https://help.github.com/en/enterprise/2.14/user/articles/configuring-jekyll)

* [https://jekyllrb.com/docs/front-matter/](https://jekyllrb.com/docs/front-matter/)

* [https://help.github.com/en/enterprise/2.14/user/articles/configuring-jekyll-plugins](https://help.github.com/en/enterprise/2.14/user/articles/configuring-jekyll-plugins)

* [https://nerdsplyground.in/docs/troubleshooting/](https://nerdsplyground.in/docs/troubleshooting/)

* [https://gorails.com/setup/osx/10.15-catalina](https://gorails.com/setup/osx/10.15-catalina)


## Ruby development headers

Supposedly, to enable previewing a Jekyll site locally,
the development headers for Ruby must
be installed. (See https://jekyllrb.com/docs/installation .)
I tried to install these via rbenv:

	% rbenv install --list
	% rbenv install 2.6.0-dev

But that didn't work. I googled '"ruby-build" "development headers"'
and found this probable clue:
[https://stackoverflow.com/questions/46377667/docker-for-mac-mkmf-rb-cant-find-header-files-for-ruby/58226876#58226876](https://stackoverflow.com/questions/46377667/docker-for-mac-mkmf-rb-cant-find-header-files-for-ruby/58226876#58226876).
I found MacOSX10.15.sdk in /Library/Developer/CommandLineTools/SDKs/
on my system and
System/Library/Frameworks/Ruby.framework/Headers/ruby/*.h underneath that
(22 header files).

## Using a Gemfile to enable local previewing

I got tired of pursuing the Ruby development header problem, so I am not going
to continue with it for now. Instead, I will use a Gemfile to ensure that
I can preview my site locally. ***The Gemfile should comment out the jekyll gem
line and should include the line `gem "github-pages", group: :jekyll_plugins'.***

## gem install bundler jekyll

In a separate directory, as closely as I could without abandoning
my use of rbenv, .ruby-version, and .ruby-gemset, I tried the instructions at
[https://journal.highlandsolutions.com/developing-with-jekyll-for-beginners-f29f3f3f93e3](https://journal.highlandsolutions.com/developing-with-jekyll-for-beginners-f29f3f3f93e3)
but kept crashing Jekyll, no matter whether I used 'gem install bundler jekyll'
first or even set .ruby-version and .ruby-gemset (for rbenv) for 2.6.5 or
2.6.3. If I set them for 2.4.9 I get the error "jekyll requires RubyGems
version >= 2.7.0". Thus apparently I should use a later version of Ruby for
Jekyll 4. I don't want to try what gem suggested: "Try 'gem update --system'
to update RubyGems itself." I did, however, install ruby-build using homebrew.

## ruby-2.5.7

When I installed ruby-2.5.7 it seems it was built from scratch due to that.
The instructions work perfectly. Now I've got these files from following them:
	404.html
	Gemfile
	Gemfile.lock
	_config.yml
	_posts
	_site
	about.markdown
	index.markdown

## Summary of Jekyll installation

In summary, the procedure is:
	Create an empty directory and "cd" into it.
	Edit .ruby-version and .ruby-gemset .
	Run the command "gem install bundler jekyll" to create & use a Gemfile.
	Run the command "jekyll new .".
	Run the command `bundle exec jekyll serve'.
I copied all the Jekyll-specific files from this clean installation here,
then changed the theme and rolled back Jekyll to be compatible with it.

## Ruby Sass end of life

Now I get this warning:
```
Post-install message from sass:

Ruby Sass has reached end-of-life and should no longer be used.

* If you use Sass as a command-line tool, we recommend using Dart Sass, the new
  primary implementation: https://sass-lang.com/install

* If you use Sass as a plug-in for a Ruby web framework, we recommend using the
  sassc gem: https://github.com/sass/sassc-ruby#readme

* For more details, please refer to the Sass blog:
  https://sass-lang.com/blog/posts/7828841
```

## Notes for this particular Jekyll site

Use an https URL to clone this repository if Github Pages requires that
so it can include the seq_webapp_biwascheme submodule.

The rest of the README.md in the old gh-pages branch was:

	# zen
	A mostly-JavaScript toolkit to enable profoundly easy, personalized evolution of websites and web applications

	The styles and setup for these GitHub Pages were copied from
	[Ratchet's GitHub Pages](https://github.com/twbs/ratchet/tree/gh-pages).
