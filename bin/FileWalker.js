/**
 * Created by Staszek on 07/03/14.
 */
(function () {
    var walker = require('walker'),
        fs = require('fs'),
        lineReader = require('line-reader'),
        _ = require('underscore'),
        moment = require('moment')


    var logAnalyzer = {

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
                            parsingState.result[dateStr + '^' + objective] = {objective: objective, dateStr: dateStr, amount: 1, responseTime: responseTime}
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
                    onEnd(_.values(parsingState.result));
                }
            );
        },

        calculateForPrinting: function (stat, dataForPrinting) {

            var currentObjectives = _.pluck(stat, 'objective');
            var datesStr = _.chain(stat).pluck('dateStr').sortBy(function (a) {
                return a
            }).uniq(true).value();

            if (_.isUndefined(dataForPrinting)){
                dataForPrinting = {
                    firstDate : moment(_.first(datesStr)).startOf('hour'),
                    lastDate : moment(_.last(datesStr)).startOf('hour'),
                    data: [],
                    objectives: currentObjectives
                }
            } else {
                dataForPrinting.firstDate = moment.min(dataForPrinting.firstDate, moment(_.first(datesStr)).startOf('hour'));
                dataForPrinting.lastDate = moment.max(dataForPrinting.lastDate, moment(_.last(datesStr)).startOf('hour'));
                dataForPrinting.objectives = _.union(dataForPrinting.objectives, currentObjectives)
            }

            dataForPrinting.objectives = _.chain(dataForPrinting.objectives).sortBy(function (a) {
                return a
            }).uniq(true).value();

            _.each(stat, function (ele) {
                var key = ele.dateStr.substr(0, 13) + '^' + ele.objective;
                var currentMax = dataForPrinting.data[key];
                if (_.isUndefined(currentMax)){
                    currentMax = dataForPrinting.data[key] = {amount: 0, responseTime: 0};
                }
                currentMax.amount = Math.max(currentMax.amount, ele.amount);
                currentMax.responseTime = Math.max(currentMax.responseTime, ele.responseTime);
            })


            return dataForPrinting;


        },

        saveData: function (dataForPrinting, file) {

            var stream = fs.createWriteStream(file);
            stream.once('open', function (fd) {

                for (var m = dataForPrinting.firstDate; m.isBefore(dataForPrinting.lastDate) || m.isSame(dataForPrinting.lastDate); m.add('hours', 1)) {
                    _.each(dataForPrinting.objectives, function (objective) {
                        elem = dataForPrinting.data[m.format('YYYY-MM-DD HH') + "^" + objective];
                        if (elem) {
                            stream.write(m.format('YYYY-MM-DD HH:mm:ss') + '\t' + objective + '\t' + elem.amount + '\t' + elem.responseTime + '\n');
                        } else {
                            stream.write(m.format('YYYY-MM-DD HH:mm:ss') + '\t' + objective + '\t' + '0' + '\t' + '0' + '\n');
                        }
                    })
                }

                stream.end();
            });

        },

        runApplicationForOneFile: function (fileFrom, fileTo) {
            var self = this;
            this.makeStatisticForFile(fileFrom, function (stat) {
                self.saveData(self.calculateForPrinting(stat), fileTo)
            })
        }



    }


    module.exports = logAnalyzer;

})()


