var logAnalyzer = require ('../FileWalker');
var _ = require('underscore');
var fs = require('fs');


exports.testFileWalker = function(test){
    var files = [];
    logAnalyzer.walk(['/Users/Staszek/dev/projects/LogAnalyzerJS/test/resources'],
        function(basedir, entry){files.push(entry)},
        function(){test.equal(_.intersection(files, [ '/b/bb2.txt', '/cc.txt', '/a/aa.txt', '/b/bb1.txt']).length, 4); test.done()}
    );
};


exports.testReadFile = function(test){
    var lines = [];
    logAnalyzer.readFile('/Users/Staszek/dev/projects/LogAnalyzerJS/test/resources/cc.txt',
        function(line){
            lines.push(line);
        },
        function(){
            test.equal(_.contains(lines,'abc 123'),true);
            test.equal(_.contains(lines,'cde !@#'),true);
            test.equal(_.contains(lines,'321 !@#'),true);
            test.equal(_.filter(lines,function(a){return a==='321 !@#'}).length,2);
            test.done();
        }
    );
};




exports.writeToFile = function(test){
   var fileToAppend = 'test/resources/output/aaa.txt';
    fs.writeFile(fileToAppend,'');
    for (i=1; i<=10; i++){
        var now = new Date();
        fs.appendFile(fileToAppend,now.getFullYear() + '-' + ('0'+(now.getMonth()+1)).slice(-2) + '-' + ('0'+now.getDate()).slice(-2)
            + ' ' + ('0'+now.getHours()).slice(-2) + ':' + ('0'+now.getMinutes()).slice(-2) + ':' + ('0'+now.getSeconds()).slice(-2) + '.' + ('00' + now.getMilliseconds()).slice(-3) + " * abc 123 \n");


        fs.appendFile(fileToAppend,now.getFullYear() + '-' + ('0'+(now.getMonth()+1)).slice(-2) + '-' + ('0'+now.getDate()).slice(-2)
            + ' ' + ('0'+now.getHours()).slice(-2) + ':' + ('0'+now.getMinutes()).slice(-2) + ':' + ('0'+now.getSeconds()).slice(-2) + '.' + ('00' + now.getMilliseconds()).slice(-3) + " ** cde !@# \n")


        fs.appendFile(fileToAppend,now.getFullYear() + '-' + ('0'+(now.getMonth()+1)).slice(-2) + '-' + ('0'+now.getDate()).slice(-2)
            + ' ' + ('0'+now.getHours()).slice(-2) + ':' + ('0'+now.getMinutes()).slice(-2) + ':' + ('0'+now.getSeconds()).slice(-2) + '.' + ('00' + now.getMilliseconds()).slice(-3) + " *** 321 !@# \n")

    }
   test.done();
};


exports.testReadParsedFile = function(test){
    var pattern = /([\d]{4}-[\d]{2}-[\d]{2} [\d]{2}:[\d]{2}:[\d]{2}\.[\d]{3}) .*\*+ (.*)/
    var struct = {};
    logAnalyzer.readFile('/Users/Staszek/dev/projects/LogAnalyzerJS/test/resources/output/aaa.txt',
        function(line){
            var result = line.match(pattern);
            if (result){
                var date = new Date(result[1]);
                var dateStr = "" + date.getFullYear() + "-" + ('0'+(date.getMonth()+1)).slice(-2)  + "-" + ('0'+date.getDate()).slice(-2) + " "
                    + ('0'+date.getHours()).slice(-2) + ':' + ('0'+date.getMinutes()).slice(-2) + ':' + ('0'+date.getSeconds()).slice(-2)
                var what = result[2];
                if (struct[what] && struct[what][dateStr]){
                    struct[what][dateStr]['amount']++;
                } else {
                    struct[what]={};
                    struct[what][dateStr]={};
                    struct[what][dateStr]['amount'] = 1;
                    struct[what][dateStr]['responseTime'] = 0;
                }
            }
        },
        function(){
            console.log("Koniec !!!")
            console.log(struct)
            test.done();
        }
    );
};


exports.quebeck = function(test){



};