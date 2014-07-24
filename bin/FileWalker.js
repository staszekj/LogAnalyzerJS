/**
 * Created by Staszek on 07/03/14.
 */

var walker = require('walker'),
    fs = require('fs'),
    lineReader = require('line-reader'),
    _ = require('underscore'),
    moment = require('moment')


var logAnalyzer = {

    that: this,

    walk: function (dirs, onFile, onEnd) {

        dirs.forEach(function (dir) {
                walker(dir)
                    .on('file', function (entry, stat) {
                        entry = entry.replace(/\\/g, '/');
                        onFile(dir, entry.substr(dir.length));
                    })
                    .on('end', function () {
                        onEnd();
                    })
            }
        )

    },

    readFile: function (file, onLine, onEnd) {

        lineReader.eachLine(file, function (line, last) {

            onLine(line.trim());

            if (last) {
                onEnd();
            }
        });
    },

    makeStatisticForFile: function (file, onEnd) {

        var parsingState = {
            xxx: "yyy",
            result: []
        }

        var parseFunction = function (parsingState, line) {
            var result = line.match(/([\d]{4}-[\d]{2}-[\d]{2} [\d]{2}:[\d]{2}:[\d]{2}\.[\d]{3}) .*\*+ (.*)/);
            if (result) {

                var date = new Date(result[1]);
                var dateStr = "" + date.getFullYear() + "-" + ('0' + (date.getMonth() + 1)).slice(-2) + "-" + ('0' + date.getDate()).slice(-2) + " "
                    + ('0' + date.getHours()).slice(-2) + ':' + ('0' + date.getMinutes()).slice(-2)
                var objective = result[2];
                var responseTime = 0;

                var agregateSingleAResult = _.find(parsingState.result, function (elem) {
                    return (elem.objective === objective && elem.dateStr === dateStr)
                })
                if (!agregateSingleAResult) {
                    parsingState.result.push({objective: objective, dateStr: dateStr, amount: 1, responseTime: responseTime})
                } else {
                    agregateSingleAResult.amount++;
                    agregateSingleAResult.responseTime = Math.max(agregateSingleAResult.responseTime, responseTime);
                }

            }

            return parsingState;

        }

        logAnalyzer.readFile(file,
            function (line) {
                parsingState = parseFunction(parsingState, line);
            },
            function () {
                onEnd(parsingState.result);
            }
        );
    },

    writeStat: function (file, stat) {

        var objectives = _.chain(stat).pluck('objective').sortBy(function (a) {
            return a
        }).uniq(true).value();
        var datesStr = _.chain(stat).pluck('dateStr').sortBy(function (a) {
            return a
        }).uniq(true).value();

        var data = [];

        var firstDate = moment(_.first(datesStr));
        var lastDate = moment(_.last(datesStr));

        for (var m = moment(firstDate); m.isBefore(lastDate) || m.isSame(lastDate); m.add('minutes', 1)) {
            _.each(objectives, function (objective) {
                data[m.format('YYYY-MM-DD HH:mm') + " " + objective] = {amount: 0};
            })
        }

        _.each(stat, function (ele) {
            data[ele.dateStr + ' ' + ele.objective] = {amount: ele.amount}
        })


        var stream = fs.createWriteStream("test/resources/output/test1.txt");
        stream.once('open', function (fd) {

            var firstDate = moment(_.first(datesStr));
            var lastDate = moment(_.last(datesStr));

            for (var prop in data) {
                if (data.hasOwnProperty(prop)) {
                    stream.write(prop + ' ' + data[prop].amount + '\n');
                }
            }

            stream.end();
        });

    }

}


module.exports = logAnalyzer;


