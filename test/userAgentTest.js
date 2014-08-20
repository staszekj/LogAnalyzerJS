var userAgents = require('../bin/userAgent'),
    _ = require('../node_modules/underscore')

exports['testUserAgentStrings'] = function (test) {
    userAgents.transformUserAgentStrings('test/resources/testUserAgentStrings/userAgentStrings.txt', 'test/resources/output/userAgentStrings.txt');
    test.done();
}