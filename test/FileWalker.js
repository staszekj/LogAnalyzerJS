var logAnalyzer = require ('../FileWalker');
var _ = require('underscore');


exports.testFileWalker = function(test){
    var files = [];
    logAnalyzer.walk(['/Users/Staszek/dev/projects/LogAnalyzerJS/test/resources'],
        function(basedir, entry){files.push(entry)},
        function(){test.equal(_.intersection(files, [ '/b/bb2.txt', '/cc.txt', '/a/aa.txt', '/b/bb1.txt']).length, 4); test.done()}
    );
};

exports.testReadFile = function(test){
    var files = [];
    logAnalyzer.readFile('/Users/Staszek/dev/projects/LogAnalyzerJS/test/resources/cc.txt',
        function(line){console.log(line)},
        function(){console.log('KONIEC')}
    );
};