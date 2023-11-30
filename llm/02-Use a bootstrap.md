# Use a framework bootstrap.

I need to use a bootstrap 5.3.2 framework in my project.
I have a directory with SCSS files `./scss/`, `index.scss` includes `node_modules/bootstrap/**.scss`, and local `variables.scss`.
I need to run a script to convert `./scss/index.scss` to `./public/css/index.css`.
I need to run watcher for scss and changes in `./views/` to restart server and re-compile assets, I need to run as a one command for both `server.js` and `scss`.
I need to use `sass` to compile and watch for `scss` changes.
I need to watch for the file changes in `./views/**` and `./data/**`.