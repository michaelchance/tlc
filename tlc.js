var _ = require('lodash');

var jsonPath = require('JSONPath');
var PEG = require('pegjs');

var modules = {};
var templatePackages = {};
var cmdParser = {};

var $ = {};

var tlc = {
	init : function(script){
		cmdParser = PEG.buildParser(script);
		},
	run : function($element, data, template){
		if(typeof $element === 'function'){
			$ = $element;
			}
		else{
			//Now we're in a tlc core call
			//don't need to do anything special
			}
		if(template){
			var templatePointerArray = template.split('#');
			if(templatePointerArray.length == 2 && 
				templatePackages[templatePointerArray[0]] && 
				templatePackages[templatePointerArray[0]][templatePointerArray[1]]){
				$element.append(templatePackages[templatePointerArray[0]][templatePointerArray[1]].html())
				}
			else {
				console.error('could not process template string: '+template);
				return false;
				}
			}
		else if(typeof template !== 'undefined') {
			//template was not a jQuery object, throw a tantrum
			console.error("TLC error: template provided was not a jQuery object");
			}
		else{/*no template specified, meh*/}
		
		data = data || {};
		return translate($element,data);	
		},
	addModule : function(namespace, module){
		modules[namespace] = module;
		},
	addTemplates : function(namespace, templates){
		templatePackages[namespace] = templates;
		}
	}
	
function TlcContext($tag,globals,commands,data){
	this.$tag = $tag;
	this.commands = commands;
	this.globals = globals;
	this.data = data;
	}
TlcContext.prototype.focus = function(value){
	if(typeof value == 'undefined'){
		//all good
		}
	else{
		this.globals.binds[this.globals.focusBind] = value;
		}
	return this.globals.binds[this.globals.focusBind];
	}
TlcContext.prototype.arguments = function(){
	
	}
module.exports = tlc;

	function argsToObject(args,globals){
		var r = {};
		if(!_.isEmpty(args))	{
			for(var i = 0, L = args.length; i < L; i += 1)	{
				var type = (args[i].type == 'longopt' && args[i].value) ? args[i].value.type : args[i].type;
				if(type == 'tag')	{
					r.tag = args[i].value.tag;
					r[args[i].value.tag] = globals.tags[args[i].value.tag];
					}
				else if(args[i].value == null)	{r[args[i].key] = true} //some keys, like append or media, have no value and will be set to null.
				else if(type == 'variable')	{
					//this handles how most variables are passed in.
					if(args[i].key)	{
						r[args[i].key] = globals.binds[args[i].value.value];
						r.variable = (args[i].type == 'longopt' && args[i].value) ? args[i].value.value : args[i].value;
						}
					//this handles some special cases, like:  transmogrify $var --templateid='chkoutAddressBillTemplate';
					else if(typeof args[i].value == 'string')	{
						r.variable = args[i].value;
						r[args[i].value] = globals.binds[args[i].value];
						}
					else	{
						console.error("in argsToObject, type is set to variable, but no key is set AND the value is not a string.");
						//something unexpected happened.  no key. value is an object.
						}
					}
				
				else	{
					r[args[i].key] = args[i].value.value;
					}
//				r[args[i].key+"_type"] = (args[i].type == 'longopt') ? args[i].value.type : args[i].type;
				}
			}
		return r;
		}

	function errorMessage(e){
		return e.line !== undefined && e.column !== undefined ? "Line " + e.line + ", column " + e.column + ": " + e.message : e.message;
		}
	
	function translate($ele, data){
	
		// console.log('translating');
		// console.dir(data);
		var r = true;
		var $elist;
		if(typeof $ele == 'function'){
			$elist = $('[data-tlc]');
			}
		else if (typeof $ele == 'object'){
			$elist = $('[data-tlc]',$ele);
			}
		// console.log($ele.html());
		// console.log($('[data-tlc]',$('body')).length);
		$elist.each(function(index,value){ //addBack ensures the container element of the template parsed if it has a tlc.
			var $tag = $(this), tlc = $tag.attr('data-tlc');
			try{
				//IE8 doesn't like .parse, wants 'parse'.
				var commands = cmdParser['parse'](tlc);
				if(!_.isEmpty(commands)){
					var globals = {};
					var context = new TlcContext($tag,globals,commands,data);
					executeCommands($tag,globals,commands,data,context);
					}
				}
			catch(e)	{
				console.error("TLC error: "+errorMessage(e)+" for: "+tlc);
				r = false;
				}
			});
		return r;
		}
	
	function executeCommands($tag,globals,commands,data,context){
		var r = true;
		//make sure all the globals are defined. whatever is passed in will overwrite the defaults. that happens w/ transmogrify
		// NOTE -> if this extend is set to deep copy, any if statements w/ bind in them will stop working. that deep extend should be moved into translate, where execute is called.
		globals = _.extend({
			binds : {}, //an object of all the binds set in args.
			tags : {
				'$tag' : $tag
				}, //an object of tags.
			focusBind : '', //the pointer to binds of the var currently in focus.
			focusTag : '$tag' //the pointer to the tag that is currently in focus.
			},globals);
		for(var i = 0, L = commands.length; i < L; i += 1)	{
			var cmd = commands[i];
			if(handlers[cmd.type]){
				if(handlers[cmd.type]($tag,cmd,globals,data)){}
				else{
					console.error("The following command has returned false in execution:");
					console.dir(cmd);
					console.dir(globals);
					console.dir(data);
					r = false; 
					break;
					}
				}
			else {
				console.error("Unsupported command type: "+cmd.type);
				r = false;
				break;
				}
			}
		return r;
		}
	var handlers = {
		command : function($tag,cmd,globals,data){
			var module;
			if(cmd.module == 'core'){
				module = core;
				}
			else if (modules[cmd.module]){
				module = modules[cmd.module];
				}
			else {
				console.error("Unknown module "+cmd.module);
				return false;
				}
			
			if(module[cmd.name] && typeof module[cmd.name] === 'function'){
				cmd.args = cmd.args || [];
				if(cmd.module == 'core'){
					return module[cmd.name](cmd, globals);
					}
				else{
					var args = argsToObject(cmd.args,globals);
					return module[cmd.name]({
						focus : function(value){
							if(typeof value == 'undefined'){
								//all good
								}
							else{
								globals.binds[globals.focusBind] = value;
								}
							return globals.binds[globals.focusBind];
							},

						$focus : function($tag){
							if(typeof $tag == 'undefined'){
								//all good
								}
							else{
								globals.tags[globals.focusTag] = $tag;
								}
							globals.tags[globals.focusTag];
							},

						args : function(){
							if(typeof arguments[0] === 'string'){
								var arg = args[arguments[0]];
								//get from hash of names
								return arg;
								}
							else if(typeof arguments[0] === 'number'){
								var arg = cmd.args[arguments[0]];
								return arg;
								}
							else if (typeof arguments[0] === 'function'){
								//run function for each argument
								var r = true;
								for(var i in cmd.args){
									if(arguments[0](cmd.args[i])){
										//all good
										}
									else{
										r = false;
										};
									}
								return r;
								}
							return null;
							}
						});					
					}
				}
			else{
				console.error("Command "+cmd.name+" does not exist in module "+cmd.module);
				return false;
				}
			},
		BIND : function($tag,cmd,globals,data){
			// bind $var '#someSelector' returns Set.type == tag
			if(cmd.Set.type == 'tag')	{
				globals.tags[cmd.Set.tag] = $($._app.u.jqSelector(cmd.Src.value.charAt(0),cmd.Src.value.substr(1)),$tag);
				globals.focusTag = cmd.Set.tag;
				}
			else	{
				// bind $var ~tag; returns Src.type == tag.
				if(cmd.Src.type == 'tag')	{
					globals.binds[cmd.Set.value] = globals.tags[cmd.Src.tag];
					}
				else if(cmd.Src.value == '.')	{
					globals.binds[cmd.Set.value] = data; //this is effectively the old 'useParentData'
					}
				else	{
					//jsonpath nests returned values in an array.
					globals.binds[cmd.Set.value] = jsonPath.eval(data, '$'+cmd.Src.value)[0];
					}
				globals.focusBind = cmd.Set.value; // dump(" -> globals.focusBind: "+globals.focusBind);
				}
			return cmd.Set.value;
			},
		IF : function($tag,cmd,globals,data){
			console.log('IF');
			var p1; //first param for comparison.
			var ifCmd = cmd.When;
			if(handlers.command($tag,ifCmd,globals,data)){
				//do the isTrue
				console.log('in the isTrue');
				if(cmd.IsTrue){
					return executeCommands($tag,globals,cmd.IsTrue.statements,data);
					}
				}
			else{
				//do the isfalse
				console.log('in the isFalse');
				if(cmd.IsFalse){
					return executeCommands($tag,globals,cmd.IsFalse.statements,data);
					}
				}
				
			return true;
			},
		WHILE : function($tag,cmd,globals,data){/*unfinished*/},
		FOREACH : function($tag,cmd,globals,data){
			//USAGE: 
			//		bind $items '.@DOMAINS'; 
			//		foreach $item in $items {{
			//			transmogrify --templateid='tlclisttest' --dataset=$item;
			//			apply --append;
			//			}};
			var r = true;
			for(var index in globals.binds[cmd.Members.value])	{
				globals.binds[cmd.Set.value] = globals.binds[cmd.Members.value][index];
				globals.focusBind = cmd.Set.value;
				if(!executeCommands($tag,globals,cmd.Loop.statements,globals.binds[cmd.Members.value][index])){
					r = false;
					break;
					}
				}
			return r;
			},
		SET : function($tag,cmd,globals,data){
			// a set is essentially a copy.  so we set the new bind to the value.  Then, the args are processed which may impact the final value. 
			//USAGE:
			//		// set $dst $src --path='.xyz';
			var r = true;
			globals.binds[cmd.Set.value] = (cmd.Src.type == 'scalar') ? cmd.Src.value : globals.binds[cmd.Src.value]; //have to set this here so that the set_ functions have something to reference.
			globals.focusBind = cmd.Set.value;
			if(cmd.args)	{
				var argObj = argsToObject(cmd.args,globals);
				argObj.bind = cmd.Set.value;
				for(var i = 0, L = cmd.args.length; i < L; i += 1)	{
					if(cmd.args[i].key && typeof set[cmd.args[i].key] == 'function')	{
						try	{
							globals.binds[cmd.Set.value] = set[cmd.args[i].key](argObj,globals,data);
							}
						catch(e)	{
							r = false;
							}
						}
					}
				}
			return r;
			},
		EXPORT : function($tag,cmd,globals,data){
			//USAGE:
			//		bind $someVar '.path.to.var';
			//		module#command --transform=$someVar;
			//		export --data=$someVar;
			var argObj = argsToObject(cmd.args,globals);
			data[cmd.Set.value] = argObj.data;
			return true;
			},
		}
	var set = {
		split : function(argObj,globals)	{
			var r;
			if(globals.binds[argObj.bind] && argObj['split'])	{
				r = globals.binds[argObj.bind].split(argObj['split']);
				}
			else	{
				r = globals.binds[argObj.bind];
				}
			return r;
			},

		path : function(argObj,globals,data)	{
			globals.binds[argObj.bind] = data[argObj.path];
			return globals.binds[argObj.bind]; //no manipulation of the data occured so return unmolested var. 
			}
		}
	var core = {
		tlc : function(cmd,globals){
			var argObj = argsToObject(cmd.args, globals);
			var $tag = globals.tags[globals.focusTag];
			var data = argObj.data || {};
			var template = argObj.template || null;
			return tlc.run($tag, data, template);
			},
		format : function(cmd,globals)	{
			var r = true;
			var argObj = argsToObject(cmd.args,globals);
			argObj.bind = (argObj.type) ? argObj.value : globals.focusBind; //what variable is being affected by the format.
			//sequence is important here, so args MUST be processed in order. can't loop thru argObj for this.
			for(var i = 0, L = cmd.args.length; i < L; i += 1)	{
				//key will be set for the args that are a format. there may be non 'key' args, such as putting a variable into scope.
				if(cmd.args[i].key && typeof formats[cmd.args[i].key] == 'function')	{
					try	{
//						dump(" -> cmd.args[i].key: "+cmd.args[i].key); dump(cmd.args[i]);
						globals.binds[argObj.bind] = formats[cmd.args[i].key](argObj,globals,cmd.args[i]);
						}
					catch(e)	{
						dump(e);
						}
					}
				}
			return r;
			},

	//passing the command into this will verify that the apply exists (whether it be core or not)
	//may be able to merge this with the handleCommand_format. We'll see after the two are done and if the params passed into the functions are the same or no.
	// NOTE -> stopped on 'apply' for now. B is going to change the way the grammer hands back the response. Once he does that, I'll need to flatten the array into a hash to easily test if 'empty' or some other verb is set.
		apply : function(cmd,globals)	{
	//		dump(" -> BEGIN handleCommand_apply"); dump(cmd);
			var r = true;
			var
				verbs = new Array('empty','hide','show','add','remove','prepend','append','replace','inputvalue','select','state','attrib','data'),
				formatters = new Array('img','imageurl'),
				argObj = argsToObject(cmd.args,globals), //an object is used to easily check if specific apply commands are present
				$tag = globals.tags[(argObj.tag || globals.focusTag)],
				numVerbs = 0, numFormatters = 0, theVerb = null, theFormatter = null;

			//count the number of verbs.  Only 1 is allowed.
			for(var index in argObj)	{
				if(_.indexOf(verbs,index) >= 0)	{
					theVerb = index;
					numVerbs++;
					}
				else if(_.indexOf(formatters,index) >= 0)	{
					theFormatter = index;
					numFormatters++;
					}
				else	{
					//okay to get here. likely just some argument for the verb or formatter
					}
				}
			
//			dump("numVerbs: "+numVerbs+" theVerb: "+theVerb+" theFormat: "+theFormatter+" numFormats: "+numFormatters);
			//formatter is optional, but only 1 can be specified.
			if(numVerbs === 1 && numFormatters <= 1)	{

				if(theFormatter)	{
					switch(theFormatter)	{
						case 'img':
							globals.binds[globals.focusBind] = this.apply_formatter_img(formatter,$tag,argObj,globals);
							break;
						case 'imageurl':
							globals.binds[globals.focusBind] = this.apply_formatter_img(formatter,$tag,argObj,globals); //function returns an image url
							break;
						}
					}
				
				// this.handle_apply_verb(theVerb,argObj,globals,cmd);
		// ### TODO -> need to update the verbs to support apply ~someothertag --dataset=$var --someVerb
				var $tag = globals.tags[globals.focusTag];
				var data = argObj.variable ? globals.binds[argObj.variable] : globals.binds[globals.focusBind];
				//if the booleans are not stringified, append/prepend won't output them.
				if(data === true || data === false)	{data = data.toString()}
				switch(theVerb)	{
		//new Array('empty','hide','show','add','remove','prepend','append','replace','inputvalue','select','state','attrib'),
					case 'empty': $tag.empty(); break;
					case 'hide': $tag.hide(); break;
					case 'show': $tag.show(); break;

					//add and remove work w/ either 'tag' or 'class'.
					case 'add' : 
						console.log('adding');
					//IE8 wants 'class' instead of .class.
						if(argObj['class'])	{$tag.addClass(argObj['class'])}
						else if(argObj.tag)	{
							// ### TODO -> not done yet. what to do? add a tag? what tag? where does it come from?
							}
						break; 
					case 'remove':
						console.log('removing');
						if(argObj['class'])	{$tag.removeClass(argObj['class'])}
						else if(argObj.tag)	{
							$tag.remove();
		//					globals.tags[argObj.tag].remove();
							}
						else	{
							console.error("For apply, the verb was set to remove, but neither a tag or class were defined. argObj follows:",'warn'); 
							console.error(argObj);
							}
						break; 
					
					case 'prepend': $tag.prepend(data); break;
					case 'append': console.log('append'); $tag.append(data); break;
					case 'replace': 
						var $n = $(data); //the contents of what will replace tag may or may not be a tag.
						if($n.length)	{
							globals.tags[globals.focusTag] = $n; $tag.replaceWith(globals.tags[globals.focusTag]);
							}
						else	{
							$tag.replaceWith(data);
							}
						break; //the object in memory must also be updated so that the rest of the tlc statement can modify it.
					case 'inputvalue':
						$tag.val(data);
						break;
					case 'select' :
						this.apply_verb_select($tag,argObj,globals); //will modify $tag.
						var dataValue = argObj['select']; //shortcut.
				//		dump(" -> value for --select: "+dataValue); dump(globals);
						if($tag.is(':checkbox'))	{
							if(dataValue == "" || Number(dataValue) === 0)	{
								$tag.prop({'checked':false,'defaultChecked':false}); //have to handle unchecking in case checked=checked when template created.
								}
							else	{
				//the value here could be checked, on, 1 or some other string. if the value is set (and we won't get this far if it isn't), check the box.
								$tag.prop({'checked':true,'defaultChecked':true});
								}
							}
						else if($tag.is(':radio'))	{
				//with radio's the value passed will only match one of the radios in that group, so compare the two and if a match, check it.
							if($tag.val() == dataValue)	{$tag.prop({'checked':true,'defaultChecked':true})}
							}
						else if($tag.is('select') && $tag.attr('multiple') == 'multiple')	{
							if(typeof dataValue === 'object')	{
								var L = dataValue.length;
								for(var i = 0; i < L; i += 1)	{
									$('option[value="' + dataValue[i] + '"]',$tag).prop({'selected':'selected','defaultSelected':true});
									}
								}
							}
						else	{
							$tag.val(dataValue);
							$tag.prop('defaultValue',dataValue); //allows for tracking the difference onblur.
							}
						break;
					case 'state' :
						// ### TODO -> not done yet.
						break;  
					case 'attrib':
						$tag.attr(argObj.attrib,data);
						break;
					case 'data' :
						$tag.data(argObj.data, data);
						break;
					}
				}
			else if(numVerbs === 0)	{
				console.error("For the following command no verb was specified on the apply. Exactly 1 verb must be specified.",'warn'); 
				console.error(cmd);
				console.error(argObj);
				}
			else	{
				console.error("For command (below) either more than 1 verb or more than 1 formatter was specified on the apply. Exactly 1 of each is allowed per command.",'warn');
				console.error(cmd);
				}

			return r;
			},


		stringify : function(cmd,globals)	{
			globals.binds[globals.focusBind] = JSON.stringify(globals.binds[globals.focusBind])
			return globals.binds[globals.focusBind];
			},

	// the proper syntax is as follows:   bind $var '.'; transmogrify --templateid='someTemplate' --dataset=$var;
		// transmogrify : function(cmd,globals)	{
			// var argObj = this.args2obj(cmd.args,globals);
			// var tmp = new tlc();
			// globals.tags[globals.focusTag].append(tmp.runTLC({templateid:argObj.templateid,dataset:argObj.dataset}));
			// //this will backically instantate a new tlc (or whatever it's called)
			// },

		is : function(cmd,globals)	{
			var value = globals.binds[globals.focusBind];
			var r = false;
			for(var i = 0, L = cmd.args.length; i < L; i += 1)	{
				
				if(cmd.args[i].type == 'variable'){
					value = globals.binds[cmd.args[i].value];
					}
				else if(cmd.args[i].key){
					function isBlank(v)	{
						var isBlank = false;
						//not set and undefined are blank.  null or false is NOT blank.
						if(typeof v == 'undefined')	{isBlank = true;}
						else if(v == 'false' || v === false || v == null)	{isBlank = false}
						else if(v == '')	{isBlank = true;}
						else	{}
						return  isBlank;
						}
					var val2 = argsToObject([cmd.args[i]],globals)[cmd.args[i].key];
					switch(cmd.args[i].key)	{
						case "eq":
							if(value == val2){ r = true;} break;
						case "ne":
							if(value != val2){ r = true;} break;
						case "inteq":
							if(Number(value) === Number(val2)){ r = true;} break;
						case "intne":
							if(Number(value) != Number(val2)){ r = true;} break;
			// for gt, gte, lt and lte, undefined == 0.
						case "gt":
							if(Number(value || 0) > Number(val2)){r = true;} break;
						case "gte":
							if(Number(value || 0) >= Number(val2)){r = true;} break;
						case "lt":
							if(Number(value || 0) < Number(val2)){r = true;} break;
						case "lte":
							if(Number(value || 0) <= Number(val2)){r = true;} break;
						case "true":
							if(value){r = true}; break;
						case "false":
							if(value == false)	{r = true;} //non 'type' comparison in case the value 'false' is a string.
							else if(!value){r = true}; break;
						case "blank":
							r = isBlank(value);
							break;
						case "notblank":
							r = isBlank(value) ? false : true; //return the opposite of blank.
							break;
						case "null":
							if(value == null){r = true;}; break;
						case "notnull":
							if(value != null){r = true;}; break;
						case "regex":
							var regex = new RegExp(val2);
							if(regex.exec(value))	{r = true;}
							break;
						case "notregex":
							var regex = new RegExp(val2);
							if(!regex.exec(value))	{r = true;}
							break;
						}
					}
				}
			return r;
			},
		focus : function(cmd,globals) {
			if(cmd.args[0] && cmd.args[0].type == 'variable'){
				globals.focusBind = cmd.args[0].value;
				return true;
				}
			else{
				return false;
				}
			},
		math : function(cmd,globals)	{
			var bind = Number(globals.binds[globals.focusBind]);
			if(!isNaN(bind))	{
				for(var i = 0, L = cmd.args.length; i < L; i += 1)	{
					//var value = Number((cmd.args[i].type == 'longopt' && cmd.args[i].value) ? cmd.args[i].value.value : cmd.args[i].value);
					var value = Number(argsToObject([cmd.args[i]],globals)[cmd.args[i].key]);
					if(!isNaN(value))	{
						switch(cmd.args[i].key)	{
							case "add":
								bind += value; break;
							case "sub":
								bind -= value; break;
							case "mult":
								bind *= value; break;
							case "mod":
								bind %= value; break;
							case "div":
								bind /= value; break;
							case "precision":
								bind = bind.toFixed(value); break;
							}
						}
					else	{
						}
					}
				globals.binds[globals.focusBind] = bind;
				}
			else	{
				}
			return bind;
			},

		datetime : function(cmd,globals)	{

			var value = globals.binds[globals.focusBind];
			if(value)	{
				var argObj = argsToObject(cmd.args,globals), d = new Date(value*1000);
				if(isNaN(d.getMonth()+1))	{
					console.error("In tlc core#datetime, value ["+value+"] is not a valid time format for Date()",'warn');
					}
		//### FUTURE
		//		else if(argObj.out-strftime)	{}
				else if (argObj.out == 'pretty')	{
					var shortMon = new Array('Jan','Feb','Mar','Apr','May','June','July','Aug','Sep','Oct','Nov','Dec');
					value = (shortMon[d.getMonth()])+" "+d.getDate()+" "+d.getFullYear()+ " "+d.getHours()+":"+((d.getMinutes()<10?'0':'') + d.getMinutes());
					}
				else if(argObj.out == 'mdy')	{
					value = (d.getMonth()+1)+"/"+d.getDate()+"/"+d.getFullYear();
					}
				else	{
					//invalid or no 'out' specified.
					}
				globals.binds[globals.focusBind] = value;
				}
			return value;
			}
		}
	var formats = {
		currency : function(argObj,globals)	{
			var
				decimalPlace = 2,
				a = argObj.bind ? globals.binds[argObj.bind] : globals.binds[globals.focusBind];

			if(!isNaN(a))	{
				var isNegative = (a < 0) ? true : false;
				a = Number(a);
				a = isNegative ? (a * -1) : a;
				var 
					b = a.toFixed(decimalPlace),  //get 12345678.90
					r;
				a = parseInt(a); // get 12345678
				b = (b-a).toPrecision(decimalPlace); //get 0.90
				b = parseFloat(b).toFixed(decimalPlace); //in case we get 0.0, we pad it out to 0.00
				a = a.toLocaleString();//put in commas - IE also puts in .00, so we'll get 12,345,678.00
				//if IE (our number ends in .00)
				if(a.indexOf('.00') > 0)	{
					a=a.substr(0, a.length-3); //delete the .00
					}
				r = a+b.substr(1);//remove the 0 from b, then return a + b = 12,345,678.90
		
			//if the character before the decimal is just a zero, remove it.
				if(r.split('.')[0] == 0){
					r = '.'+r.split('.')[1]
					}
				r = (isNegative ? '-' : '')+'$'+r;
				}
			else	{
				dump(" -> a ("+a+") is not a number!!!!!");
				r = a;
				}
			return r;
			}, //currency

		prepend : function(argObj,globals,arg)	{
			var r = (arg.type == 'longopt' ? arg.value.value : arg.value)+globals.binds[argObj.bind];
			return r;
			}, //prepend

		append : function(argObj,globals,arg)	{
			var r = globals.binds[argObj.bind]+(arg.type == 'longopt' ? arg.value.value : arg.value);
			return r;
			}, //append

		lowercase : function(argObj,globals,arg)	{
			globals.binds[argObj.bind] = globals.binds[argObj.bind].toLowerCase();
			return globals.binds[argObj.bind];
			}, //lowercase

		uppercase : function(argObj,globals,arg)	{
			globals.binds[argObj.bind] = globals.binds[argObj.bind].toUpperCase();
			return globals.binds[argObj.bind];
			}, //uppercase

		"default" : function(argObj,globals,arg)	{
			var r = (arg.type == 'longopt' ? arg.value.value : arg.value);
			globals.binds[argObj.bind] = r;
			return r;
			}, //default

		length : function(argObj,globals)	{
			var r;
			if(globals.binds[argObj.bind])	{r = globals.binds[argObj.bind].length;}
			else	{r = 0;}
			return r;
			}, //length

		chop : function(argObj,globals)	{
			//will return the first X characters of a string where X = value passed in --chop
			var r = globals.binds[argObj.bind];
			if(globals.binds[argObj.bind] && Number(argObj.chop) && globals.binds[argObj.bind].length > argObj.chop)	{
				r = globals.binds[argObj.bind].toString();
				r = r.substr(Number(argObj.chop),r.length);
				}
			return r;
			},//chop
	
		truncate : function(argObj,globals)	{
			var
				r = globals.binds[argObj.bind].toString(), //what is returned. Either original value passed in or a truncated version of it.
				len = argObj.truncate;
			if(!len || isNaN(len)){}
			else if(r.length <= len){}
			else	{
				len = Number(len);
				if (r.length > len) {
					r = r.substring(0, len); //Truncate the content of the string
					var tr = $.trim(r.replace(/\w+$/, '')); //go back to the end of the previous word to ensure that we don't truncate in the middle of a word. trim trailing whitespace.
					//make sure that the trimmed response is not zero length. If it is, tr is ignored and the response 'may' be chopped in the middle of a word. better than a blank trim.
					if(tr.length)	{
						r = tr;
						}
					}
				}
			return r;
			}, //truncate

		uriencode : function(argObj,globals)	{
			var r = encodeURIComponent(globals.binds[argObj.bind]);
			return r;
			} //uriencode
		}
