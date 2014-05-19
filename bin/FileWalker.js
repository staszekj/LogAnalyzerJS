/**
 * Created by Staszek on 07/03/14.
 */

var walker = require('walker'),
    fs = require('fs'),
    lineReader = require('line-reader'),
    _ = require('underscore')


var logAnalyzer = {

    that: this,

    walk: function (dirs, onFile, onEnd) {

        dirs.forEach(function (dir) {
                walker(dir)
                    .on('file', function (entry, stat) {
                        entry = entry.replace(/\\/g,'/');
                        onFile(dir, entry.substr(dir.length));
                    })
                    .on('end', function () {
                        onEnd();
                    })
            }
        )

    },

    readFile: function (file, onLine, onEnd) {   

        lineReader.eachLine(file, function(line, last) {

            onLine(line.trim());

            if(last){
                onEnd();
            }
        });
    },

    makeStatisticForFile: function(file, initialParseFunction, onEnd) {
        var pattern = /([\d]{4}-[\d]{2}-[\d]{2} [\d]{2}:[\d]{2}:[\d]{2}\.[\d]{3}) .*\*+ (.*)/
        var parseFunction = initialParseFunction;
        var result = [];
        logAnalyzer.readFile(file,
            function(line){
                var  parsedLine = parseFunction(line);
                parseFunction = parsedLine.parseFunction;
                var parsedLineData = parsedLine.data;
                if (parsedLineData){
                    var date = new Date(parsedLineData.date);
                    var dateStr = "" + date.getFullYear() + "-" + ('0'+(date.getMonth()+1)).slice(-2)  + "-" + ('0'+date.getDate()).slice(-2) + " "
                        + ('0'+date.getHours()).slice(-2) + ':' + ('0'+date.getMinutes()).slice(-2) + ':' + ('0'+date.getSeconds()).slice(-2)
                    var objective = parsedLineData.objective;
                    var responseTime = parsedLineData.responseTime;

                    var agregateSingleAResult = _.find(result,function(elem){return (elem.objective === objective && elem.dateStr === dateStr)})
                    if (!agregateSingleAResult){
                        result.push({objective: objective, dateStr: dateStr, amount: 1, responseTime:responseTime})
                    } else {
                        agregateSingleAResult.amount++;
                        agregateSingleAResult.responseTime = Math.max(agregateSingleAResult.responseTime, responseTime);
                    }
                }
            },
            function(){
               onEnd(result);
            }
        );
    }

}

module.exports = logAnalyzer;


