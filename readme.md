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
		//The second parameter to render should be a JSON object that the view will be translated over.
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
		<!-- 
		note here '.message' is the JSONPath string to 
		a member of the JSON object being translated 
		-->
		<h1 data-tlc="bind $msg '.message'; apply --append=$msg;"></h1>
	</body>

	</html>

When running the app, localhost:3000 will serve
> # Hello World

## Commands

The above example introduces 2 of the core commands in tlc, `bind` and `apply`.  Commands are functions, executed with arguments, within a context.
Each tag creates a new context, and before any commands are executed, it consists solely of the JSON data object being translated.

`bind` is one of the most important commands in tlc- it allows you to bind (and even create) a variable within the tlc's context to a component of
JSON data object.  For example: `bind $msg '.message';` from above create's the variable `msg`, and writes "Hello World" to it from the JSON object.
This command takes 2 arguments- first, a variable reference to bind into, and second, a JSONPath formatted string to reference the binding.  

Our second command, `apply --append=$msg;`, de-reference to our variable reference, `msg`.  The `apply` command is used for applying 
changes to the tag we are executing commands on, in this case, appending to it.

Note that we can shorten our tlc statement to `bind $msg '.message'; apply --append;` and it will still apply the contents of the `msg` variable.
This is because by `bind`ing it, `msg` has become the *focus* variable.  All core commands will use the focus variable if none is provided.  This
is both for syntactic convenience, and also to allow simple chaining on the focus variable, for example:
	
	var productData = {
		"name" : "cat food"
		"price" : "3.14"
		}

	<div class="price" data-tlc="
		bind $cents '.price';
		math --mult='100' --mod='100';
		bind $dollars '.price';
		math --precision='0';
		format --prepend='$' --append='.';
		focus $cents;
		format --prepend='<span class=\"cents\">' --append='</span>';
		apply --append=$dollars;
		apply --append=$cents;
		"</div>
		
Holy new commands, batman!  A few things to note here:
* `math --mult='100' --mod='100';` - The `math` command parses its arguments sequentially, meaning that you can daisy chain a bunch of arithmetic together for convenience.  Note, a few lines down, `format` does the same thing.
* `format --prepend='$' --append='.';` - The `format` command allows you to format the focus variable before you append it to the tag.  Note a few lines down- you can use format to add HTML content.
* `focus $cents;` - The `focus` command shifts the current focus variable, just like `bind` (and `set`), however it doesn't change the contents of the variable like `bind` (and `set`).
* `apply --append=$dollars; apply --append=$cents;` - The `apply` command only takes one 'verb' at a time, currently.  This may change in future versions of the core API, but for now, we can't daisy chain like math.

The full list of core commands:
* `bind` : bind (and create) a variable to the JSON data object
* `set` : set  (and create) a variable to a scalar value;
* `apply` : apply a change to the tag
* `format` : format the focus variable
* `tlc` : recursively call tlc for the contents of the tag.  This is useful for when you have added tlc from within your tlc commands (yo dawg)
* `stringify` : set the focus variable to a stringified version of its current value;
* `focus` : set the focus to a different variable.
* `math` : perform arithmetic on the focus variable
* `datetime` : set the focus variable to the current date.  `--out='pretty'` or `--out='mdy'` formats are supported.

## Modules

Modules allow developers to extend the command set usable in tlc:

	var tlc = require('tlc');
	var template = require('tlc-template');

	tlc.addModule('template',template);
	
This module can be referenced in templates:

	<div data-tlc="template#append --templateid='sideBarTemplate'; bind $var '.sidebar[2]'; tlc;"></div>