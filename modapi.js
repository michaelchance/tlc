
function ModApi(context){
	
	}
	
ModApi.prototype.focus = function(value){
	if(typeof value == 'undefined'){
		//all good
		}
	else{
		//this.globals.binds[this.globals.focusBind] = value;
		}
	//return this.globals.binds[this.globals.focusBind];
	}

ModApi.prototype.$focus = function($tag){
	if(typeof $tag == 'undefined'){
		//all good
		}
	else{
		//this.globals.tags[this.globals.focusTag] = $tag;
		}
	//return this.globals.tags[this.globals.focusTag];
	};

ModApi.prototype.args = function(){
	if(typeof arguments[0] === 'string'){
		var arg = '';
		//get from hash of names
		return arg;
		}
	else if(typeof arguments[0] === 'number'){
		var arg = '';
		//get by index in array
		return arg;
		}
	else if (typeof arguments[0] === 'function'){
		//run function for each argument
		for(var i in args){
			arguments[0](args[i]);
			}
		}
	return null;
	}


module.exports = ModApi;