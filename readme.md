# Spec

![Pack](https://github.com/Jerry-licious/spec/actions/workflows/pack.yml/badge.svg)


Spec is a limited latex to website compiler heavily, heavily by [Gerby](https://gerby-project.github.io/), 
offering an online tag-based view for a LaTeX document. Each part/chapter/section/theorem is assigned a unique _tag_ 
associated to its label, and each tag gets its own webpage. 


## Acknowledgements

- [Gerby](https://gerby-project.github.io/) and the [Stacks Project](https://stacks.math.columbia.edu/): I took the idea of 
organising a large document under tags and presenting it as a website from this system. Originally, I intended on using
Gerby directly to compile my own notes, and adjusted Gerby slightly for my own purposes. Eventually, the desire for some
additional features, faster compile times, and a lack of understanding of Gerby prompted me to
start this project. The layout of pages and styling of certain elements are copied from the Gerby project. So needless 
to say, this project would not be possible without Gerby.
- [Unified JS](https://unifiedjs.com/), [Unified LaTeX](https://github.com/siefkenj/unified-latex), and 
[hast](https://github.com/siefkenj/unified-latex): The compiler uses Unified LaTeX to parse LaTeX source code, runs 
multiple passes through the syntax tree to gather and create metadata, and output HTML.
- [MathJax](https://www.mathjax.org/) and [XyJax](https://github.com/sonoisa/XyJax-v3): All math on the website are 
rendered using MathJax. XyJax provides support for commutative diagrams. 
- [TikZJax](https://tikzjax.com/) and [Node TikZJax](https://github.com/prinsss/node-tikzjax): TikzJax provides support
for commutative diagrams.


# Setup

The project depends on [NodeJS](https://nodejs.org/en/download) v22 or above and `npm` v10 or above. 

Visit the [Releases](https://github.com/Jerry-licious/spec/releases) page to download the newest version of the package,
which should be named something like `spec-<version>.tgz`. Once the project has been downloaded, run
```
npm install -g ./spec-<version>.tgz
```


# Usage

### Compile

To compile your project, run
```
npx spec compile
```
in your project directory. To ensure that all tags are recompiled, use
```
npx spec compile --all
```

### Server

To start the server, run
```
npx spec serve
```
which will start a server on `localhost:3000`. To specify a port, use
```
npx spec serve -p <port>
```


### Watch

When writing up a document, it may be convenient to have the server on your computer, and compile the document whenever
a change occurs. Using
```
npx spec watch
```
will start the server and recompile the document automatically when something is changed. 

Using
```
npx spec watch --conservative
```

will start the compiler in conservative mode, which causes the following:
- When a change is detected, **only** render the changed file. This will dramatically speed up compile times. 
- Render whenever a Tex file is detected to change regardless whether it belongs to a project or not.
- Cause links leaving and entering the file to be broken.
- Break all counters in edited files. 

As conservative mode breaks many things, it is best to recompile the project after using it. 

#### Exit Codes

The following error codes are emitted by the program:

- `41`: Failed to access database.
- `42`: Failed to write to database.
- `43`: Failed to read from database.


## Config File

When compiling a project, the software will look for `spec.toml` in the current directory.
A default config file will be created when the project is first ran, which should look something like this:

```toml
database = "spec.db"
document = "document.tex"
siteTitle = "Unnamed Website"

[compiler]
compileAll = false
redoTags = false
indirectReferences = true

[website]
font = "cmu-serif"
fontSize = 16
lineHeight = 1.3
textAlign = "left"
lineWidth = 45

primaryColour = "blue"
neutralColour = "grey"

searchLimit = 16
maxSearchPages = 48

recentChanges = 10
tableOfContentsDepth = 2

hoverPreview = true

advertiseSpec = true
```

### Shared Config Fields

- `database`: Location of the sqlite database file used by the project.
- `document`: Entry point of the LaTeX document.
- `siteTitle`: Title of the website, used for page titles and as a header for the main page.


### Compiler Config Fields

- `compileAll`: Whether to compile every tag whenever the compiler is ran. If set to `false`, the compiler will
recognise existing labelled tags that have not been changed, and avoid rendering them again. Currently, setting 
`compileAll` to `true` should not significantly slow down the  However, more features in the future may change 
this. 
- `redoTags`: If set to `true`, will **delete all existing tags** and assign new tags to every 
part/chapter/section/theorem/etc. This will break all existing links going into the website. Please consider taking a
backup of the database file before doing this. 
- `indirectReferences`: If set to `true`, will compute for each page the list of all pages it indirectly refers
to. May slow down the compiler significantly when there is a large number of tags. 


### Website Configs

- `font`: The main font used on the website. Must be one of `roboto` 
([Roboto](https://fontsource.org/fonts/roboto)), `open-sans` ([Open Sans](https://fontsource.org/fonts/open-sans)),
  `cmu-serif` ([CMU Serif](https://fontlibrary.org/en/font/cmu-serif), default serif font in LaTeX), and 
`cmu-sans-serif` ([CMU Sans Serif](https://fontlibrary.org/en/font/cmu-sans-serif)).
- `fontSize`: Size of text in content blocks, in `px`. 
- `lineHeight`: Height of each line.
- `textAlign`: Alignment of context texts. Must be one of `left`, `center`, `right`, `justify`. 
- `lineWidth`: Width of the main content block, in `rem` (which scales with font size).


- `primaryColour`: Used to colour links and buttons. Must be one of `red`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`,
  `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`, and `rose`. 
- `neutralColour`: Used to colour background, lines, and shade elements. Must be one of `slate`, `grey`, `zinc`, 
`stone`. These colours can hardly be distinguished in light mode, but are more different in dark mode.


- `searchLimit`: Maximum amount of search results to display per page. 
- `maxSearchPages`: Maximum number of pages for searches. 

- `recentChanges`: The number of recent changes to show on the sidebar of the main page. If set to `0`, the recent changes section will never show up. 
- `tableOfContentsDepth`: How many additional layers to display in the table of contents. For example, setting it to `1` will display all chapters on the main page, setting it to `2` will display all sections on the main page, and so on.

- `hoverPreview`: When hovering links, preview the target. 
- `copyLabelButton`: Add a button next to theorems to copy their label. 

- `advertiseSpec`: Attribute spec in the sidebar. 

The colour scheme is taken from [Tailwind](https://tailwindcss.com/docs/colors), thanks 
to [HTML Colour Codes](https://htmlcolorcodes.com/color-chart/tailwind-color-chart/). The `grey` here refers to the 
`neutral` in Tailwind. 

To use a favicon, place the icon under `public/favicon.ico`. 



# LaTeX

## Inputs

Files may include the content of other files using the `\input{file_name}` command, which will try to find and load 
`file_name.tex`. The path in `\input` is relative to the file containing it: for example, if `folder/file.tex` contains
`\input{other}`, then the compiler will read `folder/other.tex` as opposed to `other.tex` from the project root. 


## Theorem Environments

By default, the compiler does not recognise any theorem environments. As such, all theorems environments must be 
declared as follows:
- `\newtheorem{envname}{Display Name}[parent-counter]`: Declare a new theorem environment with name `envname` and 
display name `Display Name`, which follows a parent counter `parent-counter`. The default counters available are 
`part`, `chapter`, `section`, `subsection`, and `subsubsection.`
- `\newtheorem{envname}[counter]{Display Name}`: Declare a new theorem environment with name `envname` and display name
`Display Name`, using an existing counter `counter`. 

Unlike LaTeX, the compiler does not support theorems creating counters of their own. 

For example, 
```
\newtheorem{thm}{Theorem}[chapter]
\newtheorem{lem}[thm]{Lemma}
\newtheorem{cor}{Corollary}[thm]
```
will produce theorems numbered as `chapter.1`, `chapter.2`, and so on, which shares the same counter with lemmas. 
However, corollaries are numbered by `chapter.theorem.1`, `chapter.theorem.2`, and so on. 


## Custom Macros

All equations and inline math expressions are rendered using [MathJax](https://www.mathjax.org/). As such, only a
very limited collection of LaTeX commands are available. Macros may be defined using `newcommand` or `renewcommand`. 
The compiler will collect all such commands and package them as a preamble for MathJax. Notably, this means that only
the final `renewcommand` will take effect. For example,

```
\newcommand{\hello}{Hi}

\[
\hello
\]

\renewcommand{\hello}{Hello}
\[
\hello
\]
```
will produce two copies of `Hello` as opposed to one `Hi` and one `Hello`. 


## Commutative Diagrams


### TikZ

TikZ is supported in a very specific way: blocks of the form

```
\[
\begin{tikzcd}
...
\end{tikzcd}
\]
```

Not all TikZ/quiver functions are supported, due to a lack of `spath3` support by TikZJax. 

Using TikZ may dramatically increase the compile time. 

### MathJax/XyPic

Alternatively, commutative diagrams may be defined using [amscd](https://www.jmilne.org/not/Mamscd.pdf) or 
[XY-pic](https://mirror.quantum5.ca/CTAN/macros/generic/diagrams/xypic/doc/xyguide.pdf). 

Thanks to [Manh Tien Nguyen](https://darknmt.github.io/html/index.html), there is a 
[visual editor](https://darknmt.github.io/res/xypic-editor/) for XY-pic, which may come in handy.


## Packages

While specific features of specific packages are occasionally supported by the compiler (which will be stated in this 
document), **absolutely no** LaTeX packages are expected to work with this compiler. The only way to add features is 
to modify the compiler itself. 

Preambles consisting of custom commands may be imported using the `\usepackage{file_name}` command, which will look for
`file_name.sty`. Note that commands such as `NeedsTeXFormat` and `ProvidesPackage` are not recognised at all by the 
compiler. As a result, their arguments will show up on the website. As of now, there is no way to prevent this from
happening, so please comment these commands out.



## Bibliography

Bibliography entries should be given in BibTeX, which must be placed in their dedicated `.bib` files, and then imported
using a `\bibliography` macro. Entries not imported this way will be ignored by the bibliography system, and may 
interfere with other parts of the document. 

Three bibliography styles are supported, which only affect the label of the references (a `\cite[Text]{bibliography}`
will be rendered as [Text, [Label](#)]):
* `plain`: Entries will be numbered alphabetically, and references will be in numbers.
* `alpha`: Entries have the format `Aut78`, where `Aut` is based on the names of the authors, and `78` is the last two digits of the year. 
* `raw`: Entries will have the same format as their labels. This format is not supported by standard TeX distributions, and is purely an invention of this system. 

For each bibliography entry, there is a custom attribute called `label`, which will overwrite the linked part of each 
`\cite` command. For example, under the plain citation style

```bibtex
@book{Book,
    title={Book},
    author={John Book}
}
```

when cited, may be rendered as [Theorem 1, [1](#)]. However, if the reference is declared as
```bibtex
@book{Book,
    title={Book},
    author={John Book},
    label = {Book},
}
```

then it will be rendered as [Theorem 1, [Book](#)].


# Roadmap

The following are features that I am _considering_ to add to the project in the future, which may not be implemented 
due to reasons ranging from being occupied to being incompetent. 

- Server side MathJax rendering option.
- Left side bar as index?
- Comments
- Copy label buttons
- Better parasitic links in MathJax. 

