# FlairMI Public Site

Public deployment repository for Flair Marketing Intelligence, FlairMI.

Live site:
<https://flairmi.com/>

## Purpose

This repository contains the published static site for FlairMI, including:

- homepage and about page
- blog posts
- survey, stats, and writer sections
- site assets and Quarto-generated files

## Source and Deployment Model

- Private source repository: `MohammedAliSharafuddin/flairmi`
- Public deployment repository: `MohammedAliSharafuddin/flairmi-site`

The public repository exists to keep deployment and domain serving separate from
the private authoring source.

## Deployment Notes

- GitHub Pages serves this site from the `main` branch
- Custom domain: `flairmi.com`
- `.nojekyll` is included so static assets are served without Jekyll processing
