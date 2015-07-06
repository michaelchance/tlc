var tlc = require('./tlc.js');
var cheerio = require('cheerio');
var fs = require('fs');




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