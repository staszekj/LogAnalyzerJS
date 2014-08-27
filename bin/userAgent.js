(function () {
    var _ = require('underscore'),
        async = require('async'),
        fs = require('fs'),
        lineReader = require('line-reader'),
        Client = require('node-rest-client').Client;

    var client = new Client({
        proxy: {
            host: "proxycrc.pl.abb.com",
            port: 8080,
            tunnel: false
        }
    });
    client.registerMethod("uasToBrowser", "http://www.useragentstring.com/", "GET");
    client.calls = 0;


    var logAnalyzer = {

        fillInBrowser: function (userAgent, onEnd) {

            client.methods.uasToBrowser({parameters: {uas: userAgent.userAgentString, getJSON: 'all'}},
                function (data, response) {
                    console.log(++client.calls)
                    userAgent.browser = data.agent_type + '\t' + data.agent_name + '\t' +data.agent_version + '\t' +data.os_type + '\t' +data.os_name + '\t' +data.os_versionName + '\t' +data.os_versionNumber + '\t' +data.linux_distibution;
                    onEnd(null, userAgent);
                }).on('error',function(err){
                    console.log('ERROR: ', err);
                });

        },

        transformUserAgentStrings: function (fromFile, fileTo) {

            var self = this;
            var userAgentStrings = [];

            lineReader.eachLine(fromFile, function (line, last) {

                var splited = line.split('\t');

                if (splited.length == 2) {
                    userAgentStrings.push({amount: parseInt(splited[0].trim()), userAgentString: splited[1].trim(), browser: undefined});
                }

                if (last) {
                    async.mapLimit(userAgentStrings, 1, self.fillInBrowser, function (err, stat) {
                        var merged = self.mergeUserAgentString(stat);
                        merged = _.sortBy(merged, function (a) {
                            return -a.amount;
                        });
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

        mergeUserAgentString: function (elems) {

            var stat = {}

            for (var i = 0; i < elems.length; i++) {

                var key = elems[i].browser;
                var current = stat[key];
                if (_.isUndefined(current)) {
                    current = stat[key] = elems[i];
                } else {
                    current.amount = current.amount + elems[i].amount;
                }

            }

            return _.values(stat);
        }

    }

    module.exports = logAnalyzer;

})
()