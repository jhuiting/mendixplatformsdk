Run the build script:

	npm run build

Run all the tests:

	mocha

Run specific tests:

	mocha --grep "{filter criteria}"

If you prefer to build and immediately run the test script (all tests will be executed):

	npm test

Note:
- grep will look into the name given in the `describe` and `it`. We can also combine them and do something like `mocha --grep 'commit to teamserver should succeed'`
- set environment variable INTEGRATION to 1 if you prefer to run the tests against the real server instead of using mock which will also execute tests that involve Mendix Model SDK. (In Windows console: `set INTEGRATION=1`)
- validRevisionOnMainLineOnRoundTrip must be set to a revision which contains a project of which the model version is supported by the Model API. At the time of writing the lower bound is 6.0.0.
