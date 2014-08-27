var logAnalyzer = require('./FileWalker');

logAnalyzer.runApplicationForDirectory('test/resources/testRealFiles', 'test/resources/output/resultRealFiles');

//logAnalyzer.runApplicationForDirectory('test/resources/testUserAgentStrings/userAgentStrings.txt', 'test/resources/output/userAgentStrings.txt');