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


        //var pattern1 = new RegExp('.*\\[com.abb.nps.server.NpsService\\] \\(([^\\|]+)\\) BEFORE REQUEST DESERIALIZED: [0-9]+\\|[0-9]+\\|[0-9]+\\|http[^\\|]+\\|[A-Z0-9]{32}\\|([^\\|]+)\\|([^\\|]+)\\|.+/');
        //var pattern1 = /.*\[com.abb.nps.server.NpsService\] \(([^\|]+)\).+/


        // .*\[com.abb.nps.server.NpsService\] \(([^\|]+)\) BEFORE REQUEST DESERIALIZED: [0-9]+\|[0-9]+\|[0-9]+\|http[^\|]+\|[A-Z0-9]{32}\|([^\|]+)\|([^\|]+)\|.+/
        var parsingState = {
            threadData: {},
            result: []
        }
        /*
         /.*\[com.abb.nps.server.NpsService\] \(([^\|]+)\) BEFORE REQUEST DESERIALIZED: [0-9]+\|[0-9]+\|[0-9]+\|http[^\|]+\|[A-Z0-9]{32}\|([^\|]+)\|([^\|]+)\|.+ • – — . / [.*\[com.abb.nps.server.NpsService\] \(([^\|]+)\) AFTER RESPONSE SERIALIZED: ([0-9]+) //OK.*
         */
        var parseFunction = function (parsingState, line) {

            var words = line.split('|');

            var m = moment(line.substr(0, 23), "YYYY-MM-DD HH:mm:ss,SSS");
            if (!m.isValid()) {
                return parsingState;
            }

            var init = words[0].indexOf('(');
            var fin = words[0].indexOf(')');
            var thread = words[0].substr(init + 1, fin - init - 1)

            if (line.indexOf('BEFORE REQUEST DESERIALIZED') > -1) {

                var dateStr = m.format('YYYY-MM-DD HH:mm');
                var objective = words[5] + "#" + words[6];

                parsingState.threadData[thread] = {dateStr: dateStr, date: m, objective: objective}

            }

            if (line.indexOf('AFTER RESPONSE SERIALIZED') > -1) {

                var threadData = parsingState.threadData[thread];
                if (threadData) {

                    delete parsingState.threadData[thread];
                    var dateStr = threadData.dateStr;
                    var objective = threadData.objective;
                    var responseTime = m.diff(threadData.date);

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


