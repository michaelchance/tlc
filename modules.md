# Modules

Register a module with tlc:

	var tlc = require('tlc');
	//modulename must be all lowercase, as do the function names inside the moduleObject
	tlc.addModule('modulename',moduleObject);
	
A moduleObject is simply a single-level hash of functions that get called when a corresponding tlc 
command is parsed and run.

	var example = {
		mycommand : function(tlc){
			//Do something interesting
			
			//if we return false, we will halt all execution, UNLESS this command is being run as a conditional.
			return true;
			}
		}
	
	tlc.addModule('examplemodule', example);
	// call from tlc <div data-tlc="examplemodule#mycommand;..."></div>
	
The `tlc` object passed to the command serves as a public API, and has the following form:

### focus
	tlc.focus([value]);
Get or Set the current focus variable's value.  Changing the focus variable can only be done by the core commands `bind`, `set`, and `focus`.
### $focus
	tlc.$focus([value]);
Get or Set the current focus tag's value.  Changing the focus tag can only be done by the core commands `bind`, `set`, and `focus`.
### args
	tlc.args([key]);
Gets the longopt (`--key='value'`) for the key.  In the case of repeat longopts, it returns the final one.
	tlc.args([index]);
Gets the argument (object) for the index (int).
	tlc.args([mapFunction]);
Run a function for each argument in sequence.