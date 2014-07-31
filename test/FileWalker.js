var logAnalyzer = require('../bin/FileWalker'),
    _ = require('../node_modules/underscore'),
    fs = require('fs'),
    moment = require('../node_modules/moment')


exports['testFileWalker'] = function (test) {
    var files = [];
    logAnalyzer.walk(['test/resources'],
        function (basedir, entry) {
            files.push(entry)
        },
        function () {
            test.equal(_.intersection(files, [ '/b/bb2.txt', '/cc.txt', '/a/aa.txt', '/b/bb1.txt']).length, 4);
            test.done()
        }
    );
};


exports['testReadFile'] = function (test) {
    var lines = [];
    logAnalyzer.readFile('test/resources/cc.txt',
        function (line) {
            lines.push(line);
        },
        function () {
            test.equal(_.contains(lines, 'abc 123'), true);
            test.equal(_.contains(lines, 'cde !@#'), true);
            test.equal(_.contains(lines, '321 !@#'), true);
            test.equal(_.filter(lines, function (a) {
                return a === '321 !@#'
            }).length, 2);
            test.done();
        }
    );
};


exports['testReadParsedFile'] = function (test) {

    logAnalyzer.makeStatisticForFile('test/resources/testSingleFile/test1.txt',
        //logAnalyzer.makeStatisticForFile('test/resources/testSingleFile/remote-service.log.txt',

        function (stat) {

            var objectives = _.chain(stat).pluck('objective').sortBy(function (a) {
                return a
            }).uniq(true).value();
            var datesStr = _.chain(stat).pluck('dateStr').sortBy(function (a) {
                return a
            }).uniq(true).value();

            test.equal(_.all(_.zip(objectives, ['com.abb.nps.client.AnalysisReportService#getManagersData', 'com.abb.nps.client.DashboardService#getDashboardOverviewPageInternalSurvey', 'com.abb.nps.client.DashboardService#getSurveyForDashboard', 'com.abb.nps.server.HTMLServingServlet#doGet']), function (x) {
                return x[0] === x[1]
            }), true)
            test.equal(_.all(_.zip(datesStr, ['2014-07-07 00:12', '2014-07-07 00:13']), function (x) {
                return x[0] === x[1]
            }), true)
            test.equal(stat.length,5)
            test.equal(_.find(stat, function (elem) {
                return (elem.objective === 'com.abb.nps.client.DashboardService#getSurveyForDashboard' && elem.dateStr === '2014-07-07 00:12' && elem.amount === 1 && elem.responseTime === 47)
            }) != undefined, true)
            test.equal(_.find(stat, function (elem) {
                return (elem.objective === 'com.abb.nps.server.HTMLServingServlet#doGet' && elem.dateStr === '2014-07-07 00:12' && elem.amount === 1 && elem.responseTime === 3)
            }) != undefined, true)
            test.equal(_.find(stat, function (elem) {
                return (elem.objective === 'com.abb.nps.server.HTMLServingServlet#doGet' && elem.dateStr === '2014-07-07 00:13' && elem.amount === 2 && elem.responseTime === 1)
            }) != undefined, true)
            test.equal(_.find(stat, function (elem) {
                return (elem.objective === 'com.abb.nps.client.AnalysisReportService#getManagersData' && elem.dateStr === '2014-07-07 00:13' && elem.amount === 1 && elem.responseTime === 3002)
            }) != undefined, true)
            test.equal(_.find(stat, function (elem) {
                return (elem.objective === 'com.abb.nps.client.DashboardService#getDashboardOverviewPageInternalSurvey' && elem.dateStr === '2014-07-07 00:13' && elem.amount === 2 && elem.responseTime === 62516)
            }) != undefined, true)



            logAnalyzer.writeStat('test/resources/output/test1.txt', stat);

            test.done();
        }
    )

};


exports.quebeck = function (test) {

    test.done();

};