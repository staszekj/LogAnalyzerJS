(function () {
    var _ = require('underscore'),
        async = require('async'),
        fs = require('fs'),
        lineReader = require('line-reader'),
        Client = require('node-rest-client').Client;

        var client = new Client({
            proxy: {
                host: "proxycrc.pl.abb.com",
                port: 8080
            }
        });



    var logAnalyzer = {

        fillInBrowser: function (userAgent, onEnd){
            userAgent.browser = userAgent.orginalString;
            var args = {
                data: { test: "hello" },
                headers:{"Content-Type": "application/json"}
            };
            client.post("http://remote.site/rest/xml/method", args, function(data,response) {
                onEnd(null,data.coś)

            });

        },

        transformUserAgentStrings: function (fromFile, fileTo) {

            var self = this;
            var userAgentStrings = [];

            lineReader.eachLine(fromFile, function (line, last) {

                var splited = line.split('\t');

                if (splited.length == 2) {
                    userAgentStrings.push({amount: splited[0].trim(), orginalString: splited[1].trim(), browser: undefined});
                }

                if (last) {
                    async.mapLimit(userAgentStrings, 10, self.fillInBrowser, function(err,stat){
                        var merged = self.mergeUserAgentString(stat);
                        var stream = fs.createWriteStream(fileTo);
                        stream.once('open', function (fd) {
                            for (var i = 0; i < merged.length; i++) {
                                stream.write(merged[i].browser + '\t' + merged[i].amount + '\n')
                            }
                            stream.end();
                        })
                    })

                }
            });

        },

        mergeUserAgentString: function (userAgentStrings) {

            var stat = {}

            for (var i = 0; i < userAgentStrings.length; i++) {

                var key = userAgentStrings[i].browser;
                var current = stat[key];
                if (_.isUndefined(current)) {
                    current = stat[key] = userAgentStrings[i];
                } else {
                    current.amount = current.amount + userAgentStrings[i].amount;
                    current.orginalString = current.orginalString + userAgentStrings[i].orginalString;
                }

            }

            return _.values(stat);
        }

    }

    module.exports = logAnalyzer;

})
()