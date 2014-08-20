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

    logAnalyzer.calculateStatForFile('test/resources/testSingleFile/test1.txt',
        //logAnalyzer.calculateStatForFile('test/resources/testSingleFile/remote-service.log.txt',

        function (err,stat) {

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


            logAnalyzer.printData(logAnalyzer.convertStatToStatForPrinting(null, stat), 'test/resources/output/test1.txt');

            test.done();
        }
    )

};

exports['testcalculateForPrinting'] = function (test) {

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

    var dataToPrint = logAnalyzer.convertStatToStatForPrinting(null, stat);

    test.equal(dataToPrint.firstDate.format("YYYY-MM-DD HH:mm:ss"), "2014-07-07 00:00:00")
    test.equal(dataToPrint.lastDate.format("YYYY-MM-DD HH:mm:ss"), "2014-07-07 00:00:00")
    test.equal(dataToPrint.objectives.length, 1)
    test.equal(dataToPrint.objectives[0], 'A');
    test.equal(dataToPrint.data['2014-07-07 00^A'].amount, 13);
    test.equal(dataToPrint.data['2014-07-07 00^A'].responseTime, 20);


    test.done();

}


exports['testcalculateForPrintingWith2Hours'] = function (test) {

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

    var dataToPrint = logAnalyzer.convertStatToStatForPrinting(null, stat);

    test.equal(dataToPrint.firstDate.format("YYYY-MM-DD HH:mm:ss"), "2014-07-07 00:00:00")
    test.equal(dataToPrint.lastDate.format("YYYY-MM-DD HH:mm:ss"), "2014-07-07 23:00:00")
    test.equal(dataToPrint.objectives.length, 1)
    test.equal(dataToPrint.objectives[0], 'A');
    test.equal(dataToPrint.data['2014-07-07 00^A'].amount, 13);
    test.equal(dataToPrint.data['2014-07-07 00^A'].responseTime, 20);
    test.equal(dataToPrint.data['2014-07-07 23^A'].amount, 7);
    test.equal(dataToPrint.data['2014-07-07 23^A'].responseTime, 15);


    test.done();

}

exports['testcalculateForPrintingWith2Objective'] = function (test) {

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

    var dataToPrint = logAnalyzer.convertStatToStatForPrinting(null, stat);

    test.equal(dataToPrint.firstDate.format("YYYY-MM-DD HH:mm:ss"), "2014-07-07 00:00:00")
    test.equal(dataToPrint.lastDate.format("YYYY-MM-DD HH:mm:ss"), "2014-07-07 22:00:00")
    test.equal(dataToPrint.objectives.length, 2)
    test.equal(dataToPrint.objectives[0], 'A');
    test.equal(dataToPrint.objectives[1], 'B');
    test.equal(dataToPrint.data['2014-07-07 22^A'].amount, 13);
    test.equal(dataToPrint.data['2014-07-07 22^A'].responseTime, 20);
    test.equal(dataToPrint.data['2014-07-07 00^B'].amount, 7);
    test.equal(dataToPrint.data['2014-07-07 00^B'].responseTime, 15);


    test.done();

}


exports['testcalculateForPrintingWithTotalTime'] = function (test) {

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

    var dataToPrint = logAnalyzer.convertStatToStatForPrinting(null, stat);

    test.equal(dataToPrint.firstDate.format("YYYY-MM-DD HH:mm:ss"), "2014-07-07 00:00:00")
    test.equal(dataToPrint.lastDate.format("YYYY-MM-DD HH:mm:ss"), "2014-07-07 23:00:00")
    test.equal(dataToPrint.objectives.length, 1)
    test.equal(dataToPrint.objectives[0], 'A');
    test.equal(dataToPrint.data['2014-07-07 00^A'].amount, 13);
    test.equal(dataToPrint.data['2014-07-07 00^A'].responseTime, 20);
    test.equal(dataToPrint.data['2014-07-07 23^A'].amount, 7);
    test.equal(dataToPrint.data['2014-07-07 23^A'].responseTime, 15);
    test.equal(dataToPrint.data['2014-07-07 00^A'].totalResponseTime, 250);
    test.equal(dataToPrint.data['2014-07-07 00^A'].totalAmount, 20);


    test.done();

}

exports['testcalculateForPrintingWithAlreadyExistedValue'] = function (test) {

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

    var dataToPrint = logAnalyzer.convertStatToStatForPrinting({
        firstDate: moment("2014-07-06 23", "YYYY-MM-DD HH"),
        lastDate: moment("2014-07-07 15", "YYYY-MM-DD HH"),
        objectives: ['C', 'A'],
        data: {
            "2014-07-07 22^A": {
                amount: 15,
                responseTime: 10
            },
            "2014-07-06 23^C": {
                amount: 5,
                responseTime: 1
            }
        }

    }, stat);

    test.equal(dataToPrint.firstDate.format("YYYY-MM-DD HH:mm:ss"), "2014-07-06 23:00:00")
    test.equal(dataToPrint.lastDate.format("YYYY-MM-DD HH:mm:ss"), "2014-07-07 22:00:00")
    test.equal(dataToPrint.objectives.length, 3)
    test.equal(dataToPrint.objectives[0], 'A');
    test.equal(dataToPrint.objectives[1], 'B');
    test.equal(dataToPrint.objectives[2], 'C');
    test.equal(dataToPrint.data['2014-07-07 22^A'].amount, 15);
    test.equal(dataToPrint.data['2014-07-07 22^A'].responseTime, 20);
    test.equal(dataToPrint.data['2014-07-07 00^B'].amount, 7);
    test.equal(dataToPrint.data['2014-07-07 00^B'].responseTime, 15);
    test.equal(dataToPrint.data['2014-07-06 23^C'].amount, 5);
    test.equal(dataToPrint.data['2014-07-06 23^C'].responseTime, 1);

    test.done();

}

exports['testMergeStatOfFiles'] = function (test) {

    var statOfFiles = [
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
            }
        ],
        [
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
    ]

    var result = logAnalyzer.mergeStatOfFiles(statOfFiles)
    test.equal(result.length,3);
    test.equal(_.find(result, function (elem) {
        return (elem.objective === 'B' && elem.dateStr === '2014-07-07 00:13' && elem.amount === 14 && elem.responseTime === 15 && elem.totalResponseTime === 21)
    }) != undefined, true)
    test.equal(_.find(result, function (elem) {
        return (elem.objective === 'A' && elem.dateStr === '2014-07-07 22:14' && elem.amount === 14 && elem.responseTime === 21)
    }) != undefined, true)

    test.equal(_.find(result, function (elem) {
        return (elem.objective === 'A' && elem.dateStr === '2014-07-07 22:15' && elem.amount === 1 && elem.responseTime === 21)
    }) != undefined, true)

    test.done();
}

exports['testcalculateStatForPrintingFromDir'] = function (test) {
    logAnalyzer.calculateStatForPrinting('test/resources/testDirectory', function (statForPrinting) {
        test.equal(statForPrinting.data['2014-07-07 00^com.abb.nps.server.HTMLServingServlet#doGet'].amount,2);
        test.equal(statForPrinting.data['2014-07-07 00^com.abb.nps.server.HTMLServingServlet#doGet'].responseTime,1);
        test.equal(statForPrinting.data['2014-07-07 01^com.abb.nps.server.HTMLServingServlet#doGet'].amount,1);
        test.equal(statForPrinting.data['2014-07-07 01^com.abb.nps.server.HTMLServingServlet#doGet'].responseTime,2);
        test.equal(statForPrinting.firstDate.format("YYYY-MM-DD HH"), "2014-07-07 00");
        test.equal(statForPrinting.lastDate.format("YYYY-MM-DD HH"), "2014-07-07 01");
        test.done();
    })
}

