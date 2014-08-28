var logAnalyzer = require('./fileWalker');

/**
 * Params:
 * 1. Directory with log files
 * 2. Output
 *
 */
logAnalyzer.runApplicationForDirectory('test/resources/testRealFiles', 'test/resources/output/resultRealFiles');

//logAnalyzer.runApplicationForDirectory('test/resources/testUserAgentStrings/userAgentStrings.txt', 'test/resources/output/userAgentStrings.txt');