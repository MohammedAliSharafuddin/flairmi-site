# FlairMI Public Site

Public deployment repository for Flair Marketing Intelligence, FlairMI.

Live site:
<https://flairmi.com/>

## Purpose

This repository contains the published static site for FlairMI, including:

- home and about pages
- textbooks, templates, products, and services sections
- blog posts, downloads, and static assets

## Source and Deployment Model

- Private source repository: `MohammedAliSharafuddin/flairmi`
- Public deployment repository: `MohammedAliSharafuddin/flairmi-site`

The public repository exists only for deployment. Edit content in `flairmi`,
render there, and sync the generated output into this repo.

## Deployment Notes

- GitHub Pages serves this site from the `main` branch
- Custom domain: `flairmi.com`
- `.nojekyll` is included so static assets are served without Jekyll processing
- Contact form handling lives in `assets/js/contact-form.js`
- Public contact email: `mohammedali.page@gmail.com`
