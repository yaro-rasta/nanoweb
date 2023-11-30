# Create a javascript server for nanoweb

I want to build a static site generator on the Javascript with Bootstrap 5.3.2 and all the data stored in the data files such as YAML, JSON, CSV, and so on.
I need to create a server.js with the abilities:
1. Handle different routes of request URI and render templates with the same path. For instance home page URI `/` must render file located in `./views/index.ejs`, for news page URI `/news` must render file `./views/news.ejs` or `./views/news/index.ejs`, for ukrainian news page URI `/новини` must render file `./views/новини.ejs` or `./views/новини/index.ejs`. It must handle any deep of the URI and folders.
2. All the data for the rendered page is stored in the `./data/news.yaml` for the URI `/news`, `./data/index.yaml` for the URI `/`.
3. When parsing URI get rid of all the params after `?` including `?`.
4. Use `http` standard node library for the server. Do not use `express` or other servers besides `http`.
5. I need to server static files located in `./css/**`, `./js/**`, `./img/**`.
6. Do not use private/public keys for the server, it is needed only for the localhost usage.
7. For detecting mimetype create a simple function with the most standard mime types used for web by the file extensions.