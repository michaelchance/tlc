# Tag Line Commands

tlc is:

* A Verbose, Robust Templating Language
* Valid HTML5
	* designed to fit in attributes- commits to using single-quotes to keep your syntax clean.
* Shell script-y, readable, obvious
* Extensible
* Packaged for use with ExpressJS
* Will be useable with jQuery

An example of usage with Express
	
	var express = require('express');
	var app = express();

	var http = require('http');

	var fs = require('fs');

	var tlc = require('tlc');

	app.engine('html',tlc.express);
	app.set('views', './path/to/views/'); // specify the views directory
	app.set('view engine', 'html'); // register the template engine

	app.get('/',function(req,res){
		res.render('index',{
			message : "Hello World",
			});
		});

	http.createServer(app).listen(3000);
	
the contents of ./path/to/views/index.html:
	
	<!DOCTYPE html>
	<html>
	<head>
	<meta charset="utf-8">
	<title>test</title>
	</head>
	<body>
	<h1 *data-tlc="bind $msg '.message'; apply --append;"*></h1>
	</body>

	</html>

Go to localhost:3000 and you should see
> # Hello World