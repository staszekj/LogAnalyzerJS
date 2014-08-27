/**
 * Created by Staszek on 07/03/14.
 */
(function () {
    var walker = require('walker'),
        fs = require('fs'),
        lineReader = require('line-reader'),
        _ = require('underscore'),
        moment = require('moment'),
        async = require('async')


    var logAnalyzer = {

        runApplicationForDirectory: function (dirFrom, fileTo) {

            var self = this;

            this.parseFiles(dirFrom, function (statMinutes, statHours) {
                self.printDataMinutes(statMinutes, fileTo + '_Minutes.txt');
                self.printDataHours(statHours, fileTo + '_Hours.txt');
            })

        },

        parseFiles: function (dirFrom, onReady) {

            var self = this;

            logAnalyzer.walk(dirFrom,
                function (files) {
                    async.map(files, self.convertFileToStatFile, function (err, statOfFiles) {
                        var statMinutes = self.convertStatFilesToStatMinutes(_.flatten(statOfFiles));
                        var statHours = self.convertStatMinutesToStatHours(_.values(statMinutes));
                        onReady(statMinutes, statHours)
                    })
                })

        },

        walk: function (dir, onEnd) {

            var files = [];

            walker(dir)
                .on('file', function (entry, stat) {
                    entry = entry.replace(/\\/g, '/');
                    files.push(entry);
                })
                .on('end', function () {
                    onEnd(files);
                })

        },

        readFile: function (file, onLine, onEnd) {

            lineReader.eachLine(file, function (line, last) {

                onLine(line.trim());

                if (last) {
                    onEnd();
                }
            });
        },

        convertFileToStatFile: function (file, onEnd) {

            var parsingState = {
                threadData: {},
                result: {}
            }

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

                        var agregateSingleAResult = parsingState.result[dateStr + '#' + objective]
                        if (!agregateSingleAResult) {
                            parsingState.result[dateStr + '#' + objective] = {objective: objective, dateStr: dateStr, amount: 1, responseTime: responseTime, totalResponseTime: responseTime}
                        } else {
                            agregateSingleAResult.amount++;
                            agregateSingleAResult.responseTime = Math.max(agregateSingleAResult.responseTime, responseTime);
                            agregateSingleAResult.totalResponseTime = agregateSingleAResult.totalResponseTime + responseTime;
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
                    onEnd(null, _.values(parsingState.result));
                }
            );
        },

        /**
         * Convert array of information about single minutes to map where key is '2014-02-02 12:23#abc' -> minute structure
         */
        convertStatFilesToStatMinutes: function (statFiles) {

            var statMiniutes = {}

            _.each(statFiles, function (ele) {
                var key = ele.dateStr + '#' + ele.objective;
                var current = statMiniutes[key];
                if (_.isUndefined(current)) {
                    current = statMiniutes[key] = ele;
                } else {
                    current.amount = current.amount + ele.amount;
                    current.responseTime = Math.max(current.responseTime, ele.responseTime);
                    current.totalResponseTime = current.totalResponseTime + ele.totalResponseTime;
                }
            })

            return statMiniutes;

        },

        /**
         * Convert array of information about single minutes to map where key is '2014-02-02 12#abc' -> hour structure
         */
        convertStatMinutesToStatHours: function (statMinutes) {

            var statHours = {};


            _.each(statMinutes, function (ele) {
                //key is in format '2000-01-01 15#objective', so hours only without minutes
                var aDateStr = ele.dateStr.substr(0, 13)
                var aObjective = ele.objective;
                var key = aDateStr + '#' + aObjective;
                var currentMax = statHours[key];
                if (_.isUndefined(currentMax)) {
                    currentMax = statHours[key] = {dateStr: aDateStr, objective: aObjective, amount: 0, totalAmount: 0, responseTime: 0, totalResponseTime: 0};
                }
                currentMax.amount = Math.max(currentMax.amount, ele.amount);
                currentMax.totalAmount = currentMax.totalAmount + ele.amount;
                currentMax.responseTime = Math.max(currentMax.responseTime, ele.responseTime);
                currentMax.totalResponseTime = currentMax.totalResponseTime + ele.totalResponseTime
            })


            return statHours;


        },

        getObjectives: function (stat) {

            return _.chain(stat).pluck('objective').sortBy(function (a) {
                return a
            }).uniq(true).value();

        },

        getFirstDateHours: function (stat) {

            var firstDateHourStr = _.chain(stat).pluck('dateStr').sortBy(function (a) {
                return a
            }).uniq(true).first().value();

            return moment(firstDateHourStr, "YYYY-MM-DD HH").startOf('hour');
        },

        getLastDateHours: function (stat) {
            var lastDateHourStr = _.chain(stat).pluck('dateStr').sortBy(function (a) {
                return a
            }).uniq(true).last().value();

            return moment(lastDateHourStr, "YYYY-MM-DD HH").startOf('hour');
        },

        getFirstDateMinutes: function (stat) {

            var firstDateHourStr = _.chain(stat).pluck('dateStr').sortBy(function (a) {
                return a
            }).uniq(true).first().value();

            return moment(firstDateHourStr, "YYYY-MM-DD HH:mm").startOf('minute');
        },

        getLastDateMinutes: function (stat) {
            var lastDateHourStr = _.chain(stat).pluck('dateStr').sortBy(function (a) {
                return a
            }).uniq(true).last().value();

            return moment(lastDateHourStr, "YYYY-MM-DD HH:mm").startOf('minute');
        },

        printDataHours: function (statHours, file) {

            var self = this;

            var stream = fs.createWriteStream(file);
            stream.once('open', function (fd) {

                var firstDate = self.getFirstDateHours(_.values(statHours));
                var lastDate = self.getLastDateHours(_.values(statHours));
                var objectives = self.getObjectives(_.values(statHours));

                for (var m = firstDate; m.isBefore(lastDate) || m.isSame(lastDate); m.add('hours', 1)) {
                    _.each(objectives, function (objective) {
                        var classMethod = objective.split('#');
                        elem = statHours[m.format('YYYY-MM-DD HH') + "#" + objective];
                        if (elem) {
                            stream.write(m.format('YYYY-MM-DD HH:mm:ss') + '\t' + classMethod[0] + '\t' + classMethod[1] + '\t' + elem.totalAmount + '\t' + elem.amount + '\t' + elem.responseTime + '\t' + Math.round(elem.totalResponseTime / elem.totalAmount) + '\n');
                        } else {
                            stream.write(m.format('YYYY-MM-DD HH:mm:ss') + '\t' + classMethod[0] + '\t' + classMethod[1] + '\t' + '0' + '\t' + '0' + '\t' + '0' + '\t' + '0' + '\n');
                        }
                    })
                }

                stream.end();
            });

        },

        printDataMinutes: function (statMinutes, file) {

            var self = this;

            var stream = fs.createWriteStream(file);
            stream.once('open', function (fd) {

                var firstDate = self.getFirstDateHours(_.values(statMinutes));
                var lastDate = self.getLastDateHours(_.values(statMinutes));
                var objectives = self.getObjectives(_.values(statMinutes));

                for (var m = firstDate; m.isBefore(lastDate) || m.isSame(lastDate); m.add('minutes', 1)) {
                    _.each(objectives, function (objective) {
                        var classMethod = objective.split('#');
                        elem = statMinutes[m.format('YYYY-MM-DD HH:mm') + "#" + objective];
                        if (elem) {
                            stream.write(m.format('YYYY-MM-DD HH:mm:ss') + '\t' + classMethod[0] + '\t' + classMethod[1] + '\t' + elem.totalAmount + '\t' + elem.amount + '\t' + elem.responseTime + '\t' + Math.round(elem.totalResponseTime / elem.totalAmount) + '\n');
                        } else {
                            stream.write(m.format('YYYY-MM-DD HH:mm:ss') + '\t' + classMethod[0] + '\t' + classMethod[1] + '\t' + '0' + '\t' + '0' + '\t' + '0' + '\t' + '0' + '\n');
                        }
                    })
                }

                stream.end();
            });


        }

    }


    module.exports = logAnalyzer;

})
()


