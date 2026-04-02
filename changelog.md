# v0.2.1, 2026-04-02

- Fixed MathJax paragraph rendering problem. 
- Added support for hover preview for units. 
- Fixed a bug where large documents crash on upsert. 
- Added a button next to theorems to copy their label.
- Conservative mode no longer overwrites the main page.
- Conservative mode no longer collects the preamble. 
- Added footnote support. 
- Enabled support for tikz pictures. 
- Allowed referencing inside math environments. 


# v0.2.0, 2026-03-25

- Added support for equation referencing. 
- Added automatic reloading on changes in watch mode. 
- Adjusted spacing of `\item` content. 
- Added font size, line height, and alignment config options.
- Units now get an automatically generated label based on its numbering if none is given. 
- Added the conservative mode to the `watch` command.
- Added config option to adjust the depth of the table of contents. 
- Added basic image inclusion.

# v0.1.6, 2026-03-19

- Fixed a bug where the QED square is placed improperly in some situations.
- Included additional metadata when loading.


# v0.1.5, 2026-03-13

- Slightly nudged some element spacing.
- Fixed a bug where the primary colour config does not apply. 
- Fixed a bug where unknown refs crash the compiler. 
- Updated light theme link colouring.


# v0.1.4, 2026-03-12

- Added a limit on searches. 
- Added support for TikZ figures.
- Fixed an inconsistency in search bar styling.
- Added self-promotion. 
- Added version self-reporting.
- Slightly adjusted block rendering. 


# v0.1.3, 2026-03-11

- Removed warnings for missing equation labels.
- Added support for tex commands in link texts.


# v0.1.2, 2026-02-28

- Fixed a bug where theorem counters are not accounted for properly.
- Fixed a bug where `document` environments are not expanded correctly.
- Adjusted page width and text spacing.
- XyJax diagrams now render somewhat properly in dark mode. 
- Block environment titles and their content now start in the same paragraph.
- Added a bit of documentation on commutative diagrams. 
- Added the `watch` command.

# v0.1.1, 2026-02-27

- Fixed a bug where the website is not initialised properly. 
- Adjusted the rendering of `\enumerate` labels. 
- Added documentation on custom packages and file imports.

# v0.1.0, 2026-02-27

Initial release. 