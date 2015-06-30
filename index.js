var tlc = require('./tlc.js');
var cheerio = require('cheerio');
var fs = require('fs');
var grammar =
"dataTLC\n"+
" = grammar+\n"+

"grammar\n"+
" = _ cmd:(IfStatement) _ lb* { return cmd; }\n"+
" / _ cmd:(WhileLoopStatement) _ lb* { return cmd; }\n"+
" / _ cmd:(ForeachLoopStatement) _ lb* { return cmd; }\n"+
" / _ cmd:(BindStatement) _ lb* { return cmd; } \n"+
" / _ cmd:(SetStatement) _ lb* { return cmd; } \n"+
" / _ cmd:(ExportStatement) _ lb* { return cmd; } \n"+
" / _ cmd:(command) _ lb* { return cmd; }\n"+

"command\n"+
" = _ module:([a-z_]+ \"#\")? cmd:[a-z?]+ args:((ws+ value)+)? _ lb* {\n"+
"     return {\n"+
"       type: \"command\",\n"+
"       module: module ? module[0].join(\"\") : \"core\",\n"+
"       name: cmd.join(\"\").toLowerCase(),\n"+
"       args: args ? args.map(function(a) { return a[1] }) : null\n"+
"     }\n"+
"   }\n"+


"// ** BIND **\n"+
"// bind $var 'something'; (jsonpath lookup)\n"+
"// bind $var $someothervar; (jsonpath lookup)\n"+
"// bind $var ~tag; (returns tag id/path)\n"+
"// bind ~tag '#tagid'; jQuery('#tagid')\n"+
"// bind ~tag $tagid jQuery($tagid)\n"+
"BindStatement\n"+
" = \"bind\" _ set:(variable / tag) _ src:(variable / scalar / tag) _ lb+ {\n"+
"  return { type:\"BIND\", Set:set, Src:src }\n"+
"  }\n"+


"// ** EXPORT **\n"+
"// export 'key' --dataset=$var\n"+
"// export '%key' --dataset=$var\n"+
"ExportStatement\n"+
"= \"export\" _ set:(scalar / variable) args:(ws+ value)+ _ lb+ {\n"+
"  return { type:\"EXPORT\", Set:set, args: args ? args.map(function(a) { return a[1] }) : null } \n"+
"  }\n"+

"// ** SET ** \n"+
"// set $dst $src --path='.xyz';\n"+
"SetStatement\n"+
" = \"set\" _ set:(variable / tag) _ src:(variable / scalar / tag / boolean / integer) args:((ws+ value)+)? _ lb+ {\n"+
"  return { type:\"SET\", Set:set, Src:src, args: args ? args.map(function(a) { return a[1] }) : null }\n"+
"  }\n"+

"// if (command) {{ }} else {{ }};\n"+
"IfStatement\n"+
"  = \"if\" _ \"(\" _ condition:command _ \")\" _ ifStatement:Block elseStatement:(_ \"else\" _ Block)? _ lb+ {\n"+
"      return ({\n"+
"        type: \"IF\",\n"+
"        When: condition,\n"+
"        IsTrue: ifStatement,\n"+
"        IsFalse: elseStatement !== null ? elseStatement[3] : null\n"+
"      });\n"+
"   }\n"+

"// while (something) {{ inner loop }};\n"+
"WhileLoopStatement\n"+
"  = \"while\" _ \"(\" _ condition:command _ \")\" _ whileStatement:Block lb+ {\n"+
"      return ({\n"+
"        type: \"WHILE\",\n"+
"        While: condition,\n"+
"        Loop: whileStatement\n"+
"      });\n"+
"   }\n"+


"// foreach $item in $items {{ inner loop }};\n"+
"ForeachLoopStatement\n"+
"  = \"foreach\" _ set:(variable) _ \"in\" _ members:(variable) _ loop:Block lb+ {\n"+
"      return ({\n"+
"        type: \"FOREACH\",\n"+
"        Set: set,\n"+
"        Members: members,\n"+
"        Loop: loop\n"+
"      });\n"+
"   }\n"+


"Block\n"+
"  = \"{{\" _ statements:(StatementList _)? \"}}\" {\n"+
"      return {\n"+
"        type: \"Block\",\n"+
"        statements: statements !== null ? statements[0][0] : []\n"+
"      };\n"+
"    }\n"+

"StatementList\n"+
"  = head:Statement tail:(_ Statement)* {\n"+
"      var result = [head];\n"+
"      for (var i = 0; i < tail.length; i++) {\n"+
"        result.push(tail[i][1]);\n"+
"      }\n"+
"      return result;\n"+
"    }\n"+

"Statement\n"+
"  = Block\n"+
"  / grammar+\n"+


"/* value types */\n"+

"// ~tag is a reference to a jquery object\n"+
"tag\n"+
" = \"~\" tag:([a-zA-Z]+) {\n"+
"   // tag table should maintain reference to tags on DOM\n"+
"   return { type:\"tag\", tag:tag.join(\"\"), jq:null }\n"+
"   }\n"+

"boolean\n"+
" = \"true\" {return{ \"type\":\"boolean\", \"value\": true }}\n"+
" / \"false\" {return{ \"type\":\"boolean\", \"value\": false }}\n"+

"// longopt start with a --\n"+
"longopt\n"+
" = \"--\" k:([a-zA-Z]+) \"=\" v:( value ) {\n"+
"    return {\n"+
"       type: \"longopt\",\n"+
"       key: k.join(\"\"),\n"+
"       value: v\n"+
"       }\n"+
"    }\n"+
" / \"--\" k:([a-zA-Z]+) {\n"+
"    return {\n"+
"      type: \"longopt\",\n"+
"      key: k.join(\"\"),\n"+
"      value: null\n"+
"      }\n"+
"    }\n"+


"// scalar (string)\n"+
"// NOTE: at this point there is no way to escape a ' in a string.\n"+
"//\n"+
"scalar\n"+
" = \"'\" v:([^']*) \"'\" {\n"+
"     return {\n"+
"       type: \"scalar\",\n"+
"       value: v.join(\"\")\n"+
"     }\n"+
"   }\n"+

"// Variables can't start with a number\n"+
"variable\n"+
" = \"$\" v:([a-zA-Z0-9_]*) {\n"+
"     return {\n"+
"       type: \"variable\",\n"+
"       value: v.join(\"\")\n"+
"     }\n"+
"   }\n"+

"integer\n"+
"  = digits:[0-9]+ {\n"+
"      return {\n"+
"        type: \"integer\",\n"+
"        value: parseInt(digits.join(\"\"), 10)\n"+
"      }\n"+
"    }\n"+

"hexcolor\n"+
"  = \"#\" v:([A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9][A-Fa-f0-9]) {\n"+
"     return { type:\"hexcolor\", value: v.join(\"\") }\n"+
"     }\n"+

"additive\n"+
"  = left:muldiv _ sign:[+-] _ right:additive {\n"+
"      return {\n"+
"        type: \"command\",\n"+
"        name:sign,\n"+
"        args:[left,right]\n"+
"      }\n"+
"    }\n"+
"  / muldiv\n"+

"muldiv\n"+
"  = left:primary _ sign:[*/] _ right:muldiv {\n"+
"      return {\n"+
"        type: \"command\",\n"+
"        name: sign,\n"+
"        args:[left, right]\n"+
"      }\n"+
"    }\n"+
"  / primary\n"+

"primary\n"+
"  = (variable / integer)\n"+
"  / \"(\" _ additive:additive _ \")\" { return additive; }\n"+

"value\n"+
" = longopt / variable / integer / scalar / boolean / tag / hexcolor / additive\n"+

"// /* i am a comment (i can only appear before a command) */\n"+
"comment\n"+
"  = \"/*\" (!\"*/\" SourceCharacter)* \"*/\" { return{}; }\n"+

"SourceCharacter\n"+
"  = .\n"+

"ws\n"+
" = [ \\t\\n\\r]\n"+

"_\n"+
" = (ws / comment)*\n"+

"lb\n"+
" = \";\"\n";



tlc.init(grammar);

module.exports = {
	addModule : function(namespace,module){
		tlc.addModule(namespace,module);
		},
	addTemplates : function(filePath){
		fs.readFile(filePath,function(err,text){
			var templates = {};
			var $ = cheerio.load(text);
			$('[id]').each(function(i,e){
				templates[$(this).attr('id')] = $(this).removeAttr('id');
				});
			tlc.addTemplates(filePath, templates);
			});
		},
	express : function(filePath,data,callback){
		fs.readFile(filePath,function(err,text){
			if(err){
				
				}
			else{
				// var rendered = $(text).tlc(data).html();
				var $obj = cheerio.load(text);
				
				tlc.run($obj, data);
				
				var rendered = '<!DOCTYPE html>'+$obj.html();
				return callback(null, rendered);
				}
			});
		},
	run : function($obj,data,options){
		return tlc.run($obj,data,options);
		},
	modules : function(){
		return tlc.modules();
		}
	}