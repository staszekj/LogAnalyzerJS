var logAnalyzer = require('../bin/FileWalker'),
    _ = require('../node_modules/underscore'),
    fs = require('fs'),
    moment = require('../node_modules/moment')


exports['testFileWalker'] = function (test) {

    logAnalyzer.walk('test/resources',
        function (files) {
            test.equal(_.intersection(files, [ 'test/resources/b/bb2.txt', 'test/resources/cc.txt', 'test/resources/a/aa.txt', 'test/resources/b/bb1.txt']).length, 4);
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

    logAnalyzer.convertFileToStatFile('test/resources/testSingleFile/test1.txt',

        function (err, stat) {

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
            test.equal(stat.length, 5)
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


            logAnalyzer.printDataHours(logAnalyzer.convertStatMinutesToStatHours(_.values(logAnalyzer.convertStatFilesToStatMinutes(stat))), 'test/resources/output/test1.txt');

            test.done();
        }
    )

};

exports['testMinutesToHours'] = function (test) {

    var stat = [
        {
            objective: 'A',
            dateStr: '2014-07-07 00:13',
            amount: 7,
            responseTime: 15,
            totalResponseTime: 10
        },
        {
            objective: 'A',
            dateStr: '2014-07-07 00:14',
            amount: 13,
            responseTime: 20,
            totalResponseTime: 11
        }
    ]

    var statHours = logAnalyzer.convertStatMinutesToStatHours(stat);

    test.equal(statHours['2014-07-07 00#A'].amount, 13);
    test.equal(statHours['2014-07-07 00#A'].totalAmount, 20);
    test.equal(statHours['2014-07-07 00#A'].totalResponseTime, 21);
    test.equal(statHours['2014-07-07 00#A'].responseTime, 20);


    test.done();

}

exports['testObjectives'] = function (test) {

    var stat = [
        {
            objective: 'A',
            dateStr: '2014-07-07 00:13',
            amount: 7,
            responseTime: 15
        },
        {
            objective: 'A',
            dateStr: '2014-07-07 00:14',
            amount: 13,
            responseTime: 20
        }
    ]

    var objectives = logAnalyzer.getObjectives(stat);

    test.equal(objectives.length, 1)
    test.equal(objectives[0], 'A');


    test.done();

}

exports['testDateHours'] = function (test) {

    var stat = [
        {
            objective: 'A',
            dateStr: '2014-07-07 00',
            amount: 7,
            responseTime: 15
        },
        {
            objective: 'A',
            dateStr: '2014-07-07 00',
            amount: 13,
            responseTime: 20
        }
    ]

    var firstDateHours = logAnalyzer.getFirstDateHours(stat);
    var lastDateHours = logAnalyzer.getLastDateHours(stat);

    test.equal(firstDateHours.format("YYYY-MM-DD HH"), '2014-07-07 00');
    test.equal(lastDateHours.format("YYYY-MM-DD HH"), '2014-07-07 00');


    test.done();

}

exports['testDateMinutes'] = function (test) {

    var stat = [
        {
            objective: 'A',
            dateStr: '2014-07-07 01:12',
            amount: 7,
            responseTime: 15
        },
        {
            objective: 'A',
            dateStr: '2014-07-07 00:12',
            amount: 13,
            responseTime: 20
        },
        {
            objective: 'A',
            dateStr: '2014-07-07 00:13',
            amount: 13,
            responseTime: 20
        }
    ]

    var firstDateMinutes = logAnalyzer.getFirstDateMinutes(stat);
    var lastDateMinutes = logAnalyzer.getLastDateMinutes(stat);

    test.equal(firstDateMinutes.format("YYYY-MM-DD HH:mm"), '2014-07-07 00:12');
    test.equal(lastDateMinutes.format("YYYY-MM-DD HH:mm"), '2014-07-07 01:12');


    test.done();

}

exports['testMinutesToHours2'] = function (test) {

    var stat = [
        {
            objective: 'A',
            dateStr: '2014-07-07 00:13',
            amount: 7,
            responseTime: 15
        },
        {
            objective: 'A',
            dateStr: '2014-07-07 00:14',
            amount: 13,
            responseTime: 20
        },
        {
            objective: 'A',
            dateStr: '2014-07-07 23:14',
            amount: 7,
            responseTime: 15
        }
    ]

    var dataToPrint = logAnalyzer.convertStatMinutesToStatHours(stat);

    test.equal(dataToPrint['2014-07-07 00#A'].amount, 13);
    test.equal(dataToPrint['2014-07-07 00#A'].responseTime, 20);
    test.equal(dataToPrint['2014-07-07 23#A'].amount, 7);
    test.equal(dataToPrint['2014-07-07 23#A'].responseTime, 15);


    test.done();

}

exports['testMinutesToHours3'] = function (test) {

    var stat = [
        {
            objective: 'A',
            dateStr: '2014-07-07 00',
            amount: 7,
            responseTime: 15
        },
        {
            objective: 'A',
            dateStr: '2014-07-07 00',
            amount: 13,
            responseTime: 20
        },
        {
            objective: 'A',
            dateStr: '2014-07-07 23',
            amount: 7,
            responseTime: 15
        }
    ]

    var firstDateHours = logAnalyzer.getFirstDateHours(stat);
    var lastDateHours = logAnalyzer.getLastDateHours(stat);

    test.equal(firstDateHours.format("YYYY-MM-DD HH"), "2014-07-07 00")
    test.equal(lastDateHours.format("YYYY-MM-DD HH"), "2014-07-07 23")


    test.done();

}

exports['testMinutesToHours4'] = function (test) {

    var stat = [
        {
            objective: 'B',
            dateStr: '2014-07-07 00:13',
            amount: 7,
            responseTime: 15
        },
        {
            objective: 'A',
            dateStr: '2014-07-07 22:14',
            amount: 13,
            responseTime: 20
        }
    ]

    var dataToPrint = logAnalyzer.convertStatMinutesToStatHours(stat);
    var objectives = logAnalyzer.getObjectives(stat);
    var firstDateHours = logAnalyzer.getFirstDateHours(stat);
    var lastDateHours = logAnalyzer.getLastDateHours(stat);

    test.equal(firstDateHours.format("YYYY-MM-DD HH"), "2014-07-07 00")
    test.equal(lastDateHours.format("YYYY-MM-DD HH"), "2014-07-07 22")
    test.equal(objectives.length, 2)
    test.equal(objectives[0], 'A');
    test.equal(objectives[1], 'B');
    test.equal(dataToPrint['2014-07-07 22#A'].amount, 13);
    test.equal(dataToPrint['2014-07-07 22#A'].responseTime, 20);
    test.equal(dataToPrint['2014-07-07 00#B'].amount, 7);
    test.equal(dataToPrint['2014-07-07 00#B'].responseTime, 15);


    test.done();

}


exports['testMinutesToHours5'] = function (test) {

    var stat = [
        {
            objective: 'A',
            dateStr: '2014-07-07 00:13',
            amount: 7,
            responseTime: 15,
            totalResponseTime: 150
        },
        {
            objective: 'A',
            dateStr: '2014-07-07 00:14',
            amount: 13,
            responseTime: 20,
            totalResponseTime: 100
        },
        {
            objective: 'A',
            dateStr: '2014-07-07 23:14',
            amount: 7,
            responseTime: 15,
            totalResponseTime: 20
        }
    ]

    var data = logAnalyzer.convertStatMinutesToStatHours(stat);
    var objectives = logAnalyzer.getObjectives(stat);
    var firstDateHours = logAnalyzer.getFirstDateHours(stat);
    var lastDateHours = logAnalyzer.getLastDateHours(stat);

    test.equal(firstDateHours.format("YYYY-MM-DD HH"), "2014-07-07 00")
    test.equal(lastDateHours.format("YYYY-MM-DD HH"), "2014-07-07 23")
    test.equal(objectives.length, 1)
    test.equal(objectives[0], 'A');
    test.equal(data['2014-07-07 00#A'].amount, 13);
    test.equal(data['2014-07-07 00#A'].responseTime, 20);
    test.equal(data['2014-07-07 23#A'].amount, 7);
    test.equal(data['2014-07-07 23#A'].responseTime, 15);
    test.equal(data['2014-07-07 00#A'].totalResponseTime, 250);
    test.equal(data['2014-07-07 00#A'].totalAmount, 20);


    test.done();

}

exports['testStatFilesToMinutes'] = function (test) {

    var statOfFiles =
        [
            {
                objective: 'B',
                dateStr: '2014-07-07 00:13',
                amount: 7,
                responseTime: 15,
                totalResponseTime: 10
            },
            {
                objective: 'A',
                dateStr: '2014-07-07 22:14',
                amount: 13,
                responseTime: 20,
                totalResponseTime: 20
            },
            {
                objective: 'B',
                dateStr: '2014-07-07 00:13',
                amount: 7,
                responseTime: 15,
                totalResponseTime: 11
            },
            {
                objective: 'A',
                dateStr: '2014-07-07 22:14',
                amount: 1,
                responseTime: 21,
                totalResponseTime: 20
            },
            {
                objective: 'A',
                dateStr: '2014-07-07 22:15',
                amount: 1,
                responseTime: 21,
                totalResponseTime: 10
            }

        ]

    var result = logAnalyzer.convertStatFilesToStatMinutes(statOfFiles)

    test.equal(result['2014-07-07 00:13#B'].amount, 14);
    test.equal(result['2014-07-07 00:13#B'].responseTime, 15);
    test.equal(result['2014-07-07 00:13#B'].totalResponseTime, 21);

    test.equal(result['2014-07-07 22:14#A'].amount, 14);
    test.equal(result['2014-07-07 22:14#A'].responseTime, 21);

    test.equal(result['2014-07-07 22:15#A'].amount, 1);
    test.equal(result['2014-07-07 22:15#A'].responseTime, 21);


    test.equal(_.keys(result).length, 3);

    test.done();
}

exports['testcalculateStatForPrintingFromDir'] = function (test) {
    logAnalyzer.parseFiles('test/resources/testDirectory', function (statMinutes, statHours) {
        test.equal(statHours['2014-07-07 00#com.abb.nps.server.HTMLServingServlet#doGet'].amount, 2);
        test.equal(statHours['2014-07-07 00#com.abb.nps.server.HTMLServingServlet#doGet'].responseTime, 1);
        test.equal(statHours['2014-07-07 01#com.abb.nps.server.HTMLServingServlet#doGet'].amount, 1);
        test.equal(statHours['2014-07-07 01#com.abb.nps.server.HTMLServingServlet#doGet'].responseTime, 2);
        test.done();
    })
}

