# Web server for nanoweb

## Templates

## Installation

1. Open the terminal.
1. Change directory to repository `./web`.
1. Install all dependencies by running `npm install` (npm and node [must be installed](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) already).
1. Install `sass` globally `npm install -g sass`, more details on [Sass page](https://sass-lang.com/install/).
1. To run a local server use a command `npm run start`.
1. Open a web browser with the url [localhost:3000](http://localhost:3000).
1. When adding changes commit and push to your repository to have a database of the website in your respository.
1. Setting up a server for receiving changes:
    1. Upload to the server (in the web root foder, in most cases `public_html`, `www`, `{domain}`, etc.) files from the `./remote` directive.
    1. Change the server file `./config.php` and set the proper `AUTH_KEY` which is the same, you store in `.env`
1. Setting up a localhost for publishing changes, create the `./env` file and add the data in it:
    ```env
    AUTH_KEY={YOUR_AUTH_KEY}
    API_URL=https://{YOUR_DOMAIN}/deploy.php
    ```
1. To upload changes to your server run the command `npm run publish`.

## Localization

Define a default language in the very beginning, otherwise you need to move a lot of data between folders when changing a default language.

1. Data files in folders with the languages defined in `data/_/langs.yaml` in the format `[ { title, code, url } ]`, the **first language is always default**:
    ```yaml
    - title: Укр
      code: uk
      url: /
    - title: Eng
      code: en
      url: /en/
    - title: Spanish
      code: es
      url: /es/
    ```
1. Connect pages with the default language by the variable `$refer`, for instance English version of the history page refers to Ukrainian історія `data/en/history.yaml`:
    ```yaml
    $refer: /історія.html

    title: History – Heritage Rescue Headquarters
    heading1: History
    ```
1. Merging attributes with the default language page data, for instance English version of the 404 page has, `data/en/404.yaml`:
    ```yaml
    $refer: /404.html

    title: Page Not Found - Heritage Rescue Headquarters
    heading1: Page Not Found
    ```
    but in Ukrainian version `$template` is defined, so it will be used for the English version of 404 page, and so as all other missing properties `{ $template, ogImage }` will be loaded from `data/404.yaml`:
    ```yaml
    $template: /404

    title: Сторінка не знайдена - Штаб порятунку спадщини
    heading1: Сторінка не знайдена
    ogImage: /img/404.jpg
    ```
1. Alternates global property `$alternates` is related to only current page loaded, it contains the language code and url for every available refered/connected page to the original `{ lang: url }`, example of using it in the `head.ejs`
    ```ejs
    <% 'undefined' !== typeof $alternates && Object.entries($alternates).forEach(([l, u]) => { %>
    <link rel="alternate" hreflang="<%= l %>" href="<%= u %>" />
    <% }) %>
    ```
    or as in `nav.ejs`
    ```ejs
    <% global.langs.forEach((l, i) => { %>
        <li class="nav-item">
            <% if (l.code === $lang) { %>
                <span class="nav-link active"><%= l.title %></span>
            <% } else { %>
                <a href="<%= $alternates[l.code] || l.url %>" class="nav-link"><%= l.title %></a>
            <% } %>
        </li>
    <% }) %>
    ```


### Standard
```
Location: ./views/page-standard.ejs
```

Accepts:
- title, heading1, content, contentImg
- articles: [ { title, imgUrl, content, files: [ { src, alt } ] } ]