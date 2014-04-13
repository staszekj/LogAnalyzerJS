/**
 * Created by Staszek on 07/03/14.
 */

var walker = require('walker'),
    fs = require('fs'),
    lineReader = require('line-reader');


var logAnalyzer = {

    walk: function (dirs, onFile, onEnd) {

        dirs.forEach(function (dir) {
                walker(dir)
                    .on('file', function (entry, stat) {
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

    }
}

module.exports = logAnalyzer;