# Tag Line Commands

tlc is:

* A Verbose, Robust Templating Language
* Valid HTML5
	* designed to fit in attributes- commits to using single-quotes to keep your syntax clean.
* Shell script-y, readable, obvious
* Extensible

Take tlc template that looks like this:

	<h1 data-tlc="
		bind $mood '.mood';
		bind $msg '.message';
		if(is $mood --eq='excited'){{
			format --append='!';
			}};
		if(is $mood --eq='glum'){{
			format --append='...';
			}};
		apply --append;
		apply --add --class=$mood;"
		class=""></h1>
	
Translate with a JSON object, like this:
	{
		"message":"Hello World",
		"mood":"excited"
	}
	
Here's what comes out:

	<h1 data-tlc="..." class="excited">Hello World!</h1>