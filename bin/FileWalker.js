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

        calculateStatForFile: function (file, onEnd) {

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

                        var agregateSingleAResult = parsingState.result[dateStr + '^' + objective]
                        if (!agregateSingleAResult) {
                            parsingState.result[dateStr + '^' + objective] = {objective: objective, dateStr: dateStr, amount: 1, responseTime: responseTime, totalResponseTime: responseTime}
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
                    onEnd(null,_.values(parsingState.result));
                }
            );
        },

        convertStatToStatForPrinting: function (statForPrinting, stat) {

            var currentObjectives = _.pluck(stat, 'objective');
            var datesStr = _.chain(stat).pluck('dateStr').sortBy(function (a) {
                return a
            }).uniq(true).value();

            if (_.isNull(statForPrinting)) {
                statForPrinting = {
                    firstDate: moment(_.first(datesStr)).startOf('hour'),
                    lastDate: moment(_.last(datesStr)).startOf('hour'),
                    data: [],
                    objectives: currentObjectives
                }
            } else {
                statForPrinting.firstDate = moment.min(statForPrinting.firstDate, moment(_.first(datesStr)).startOf('hour'));
                statForPrinting.lastDate = moment.max(statForPrinting.lastDate, moment(_.last(datesStr)).startOf('hour'));
                statForPrinting.objectives = _.union(statForPrinting.objectives, currentObjectives)
            }

            statForPrinting.objectives = _.chain(statForPrinting.objectives).sortBy(function (a) {
                return a
            }).uniq(true).value();

            _.each(stat, function (ele) {
                //key is in format '2000-01-01 15^objective', so hours only without minutes
                var key = ele.dateStr.substr(0, 13) + '^' + ele.objective;
                var currentMax = statForPrinting.data[key];
                if (_.isUndefined(currentMax)) {
                    currentMax = statForPrinting.data[key] = {amount: 0, responseTime: 0, avgResponseTime: 0};
                }
                currentMax.amount = Math.max(currentMax.amount, ele.amount);
                currentMax.responseTime = Math.max(currentMax.responseTime, ele.responseTime);
                currentMax.avgResponseTime = Math.max(currentMax.avgResponseTime, Math.round(ele.totalResponseTime / ele.amount))
            })


            return statForPrinting;


        },

        mergeStatOfFiles: function (statOfFiles) {

            var stat = {}

            for (var i = 0; i < statOfFiles.length; i++) {
                _.each(statOfFiles[i], function (ele) {
                    var key = ele.dateStr + '^' + ele.objective;
                    var current = stat[key];
                    if (_.isUndefined(current)) {
                        current = stat[key] = ele;
                    } else {
                        current.amount = current.amount + ele.amount;
                        current.responseTime = Math.max(current.responseTime, ele.responseTime);
                        current.totalResponseTime = current.totalResponseTime + ele.totalResponseTime;
                    }
                })
            }

            return _.values(stat);

        },

        calculateStatForPrinting: function (dirFrom, onReady) {

            var self = this;

            logAnalyzer.walk(dirFrom,
                function(files){
                    async.map(files, self.calculateStatForFile, function(err,statOfFiles){
                        var mergedStats = self.mergeStatOfFiles(statOfFiles);
                        var statForPrinting = self.convertStatToStatForPrinting(null, mergedStats);
                        onReady(statForPrinting)
                    })
                })

        },

        printData: function (dataForPrinting, file) {

            var stream = fs.createWriteStream(file);
            stream.once('open', function (fd) {

                for (var m = dataForPrinting.firstDate; m.isBefore(dataForPrinting.lastDate) || m.isSame(dataForPrinting.lastDate); m.add('hours', 1)) {
                    _.each(dataForPrinting.objectives, function (objective) {
                        elem = dataForPrinting.data[m.format('YYYY-MM-DD HH') + "^" + objective];
                        if (elem) {
                            stream.write(m.format('YYYY-MM-DD HH:mm:ss') + '\t' + objective + '\t' + elem.amount + '\t' + elem.responseTime + '\t' + elem.avgResponseTime + '\n');
                        } else {
                            stream.write(m.format('YYYY-MM-DD HH:mm:ss') + '\t' + objective + '\t' + '0' + '\t' + '0' + '\t' + '0' + '\n');
                        }
                    })
                }

                stream.end();
            });

        },

        runApplicationForDirectory: function (dirFrom, fileTo) {

            var self = this;

            this.calculateStatForPrinting(dirFrom, function (statForPrinting) {
                self.printData(statForPrinting, fileTo)
            })

        }


    }


    module.exports = logAnalyzer;

})
()


