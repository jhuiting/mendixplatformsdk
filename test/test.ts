import {projects} from "mendixmodelsdk";

import sdk = require("../mendix-platform-sdk");
import {expect} from "chai";
import chaiAsPromised = require("chai-as-promised");

const chai = require("chai");
// tslint:disable-next-line:no-unused-variable
const should = chai.should();
chai.use(require("chai-string"));
chai.use(chaiAsPromised);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const defaultTemplateId = "c00d0363-23d2-4ebe-ab63-76c9efe565c0";
const projectId = `99aabaaa-ddc5-46fe-81fc-b9cd8d371544`;
const unsupportedVersionProjectId = `d100ad23-c547-40d6-a5f4-1925a626f79c`;
const projectName = `Roundtrip Integration`;

describe(`MendixSdkClient credentials`, function() {
	it(`should throw for null username`, () => {
		expect(() => new sdk.MendixSdkClient(null)).to.throw(`Incomplete credentials`);
	});
	it(`should throw for null apikey`, () => {
		expect(() => new sdk.MendixSdkClient(`some username`, null)).to.throw(`Incomplete credentials`);
	});
	it(`should throw for null password if apikey is also null`, () => {
		expect(() => new sdk.MendixSdkClient(`some username`, null, null)).to.throw(`Incomplete credentials`);
	});
	it(`should throw for null openid if apikey is also null`, () => {
		expect(() => new sdk.MendixSdkClient(`some username`, null, `some password`, null)).to.throw(`Incomplete credentials`);
	});
});

interface MendixSdkClientConfig {
	username?: string;
	apiKey?: string;
	password?: string;
	openId?: string;
	projectsApiEndpoint?: string;
	modelApiEndpoint?: string;
	options?: sdk.SdkOptions;
}

function createMendixSdkClient(config: MendixSdkClientConfig): sdk.MendixSdkClient {
	const defaultConfig: MendixSdkClientConfig = {
		username: "jos.huiting@mendix.com",
		apiKey: "cdf89bd1-4fcf-409a-b70e-ec5a26a19f7f",
		password: null,
		openId: null,
		projectsApiEndpoint: "https://sprintr.home-accp.mendix.com",
		modelApiEndpoint: "https://model-accp.api.mendix.com",
		options: { pollDelay: 3000 }
	};
	return new sdk.MendixSdkClient(
		config.username ? config.username : defaultConfig.username,
		config.apiKey ? config.apiKey : defaultConfig.apiKey,
		config.password ? config.password : defaultConfig.password,
		config.openId ? config.openId : defaultConfig.openId,
		config.projectsApiEndpoint ? config.projectsApiEndpoint : defaultConfig.projectsApiEndpoint,
		config.modelApiEndpoint ? config.modelApiEndpoint : defaultConfig.modelApiEndpoint,
		config.options ? config.options : defaultConfig.options
	);
}

// Create a 'client' object to interact with Platform APIs.
let client = createMendixSdkClient({});
let clientWithInvalidApiKey = createMendixSdkClient({
	apiKey: `Undoubtedly wrong API Key`
});
let clientWithInvalidEndPoint = createMendixSdkClient({
	projectsApiEndpoint: `https://sprintr.home-accp.mendix.com/invalid`
});

describe(`sdk`, () => {
		describe(`create new app`, function() {
			this.timeout(100000);

			const projectName = `mySdkProject`;
			const longProjectName = `This is a really long name that no one will actually do this at all 123456`;
			const nonEmptyProjectSummary = `non-empty summary`;

			it(`should just work`, () => {
				return client.platform().createNewApp(projectName, nonEmptyProjectSummary, defaultTemplateId)
					.should.eventually.have.property(`_name`, projectName);
			});
			it(`should succeed with empty summary`, () => {
				return client.platform().createNewApp(projectName, "", defaultTemplateId)
					.should.eventually.have.property(`_name`, projectName);
			});
			it(`should succeed with long project name and summary`, () => {
				return client.platform().createNewApp(longProjectName, "", defaultTemplateId)
					.should.eventually.have.property(`_name`, longProjectName);
			});
			it(`should fail because project name is empty`, () => {
				return client.platform().createNewApp(null)
					.should.eventually.be.rejectedWith("Failed to create new app: App name is required.");
			});
			it(`should fail because it contains invalid characters`, () => {
				return client.platform().createNewApp(`/?mySdkProject`, nonEmptyProjectSummary)
					.should.eventually.be.rejectedWith("Failed to create new app: Only use letters, digits, dashes, underscores and spaces");
			});
			it(`should fail because of invalid API key`, () => {
				const createNewApp = clientWithInvalidApiKey.platform().createNewApp(projectName, nonEmptyProjectSummary);
				return createNewApp.should.eventually.be.rejectedWith(`Invalid username and/or API key`);
			});
			it(`should fail because of invalid endpoint`, () => {
				return clientWithInvalidEndPoint.platform().createNewApp(projectName, nonEmptyProjectSummary).should.eventually.be.rejectedWith(`405`);
			});
		});

		const roundTripProject = new sdk.Project(client, projectId, projectName);
		const unsupportedProject = new sdk.Project(client, unsupportedVersionProjectId, `unsupported`);

		const mainLineOnRoundTrip = new sdk.Branch(roundTripProject, null);

		// including a space in the branch name will cause issue in the assertion due to encoding
		const nonExistentBranchOnRoundTrip = new sdk.Branch(roundTripProject, "Non-existentBranch");

		const validRevisionOnMainLineOnRoundTrip = new sdk.Revision(2, mainLineOnRoundTrip);
		const validRevisionOnMainLineOnUnsupportedProject = new sdk.Revision(-1, new sdk.Branch(unsupportedProject, null));

		const invalidRevisionOnMainLineOnRoundTrip = new sdk.Revision(999, mainLineOnRoundTrip);
		const revisionOnNonExistentBranch = new sdk.Revision(-1, nonExistentBranchOnRoundTrip);

		const nonExistentProject = new sdk.Project(client, `Random non-existent id`, `empty`);
		const mainLineOnNonExistentProject = new sdk.Branch(nonExistentProject, null);
		const revisionOnNonExistentProject = new sdk.Revision(3, mainLineOnNonExistentProject);

		describe(`expose working copy`, function() {

			this.timeout(100000);

			it(`should succeed with an existing app`, () => {
				return client.platform().createOnlineWorkingCopy(roundTripProject, validRevisionOnMainLineOnRoundTrip)
					.should.eventually.be.fulfilled;
			});
			it(`should fail because of unsupported model version`, () => {
				return client.platform().createOnlineWorkingCopy(unsupportedProject, validRevisionOnMainLineOnUnsupportedProject)
					.should.eventually.be.rejectedWith(`The Model Server supports Mendix Modeler 6.0.0`);
			});
			it(`should fail because app does not exist`, () => {
				return client.platform().createOnlineWorkingCopy(nonExistentProject, revisionOnNonExistentProject)
					.should.eventually.be.rejectedWith("App does not exist");
			});
			it(`should fail because revision does not exist`, () => {
				return client.platform().createOnlineWorkingCopy(roundTripProject, invalidRevisionOnMainLineOnRoundTrip)
					.should.eventually.be.rejectedWith("No such revision");
			});
			it(`should fail because branch does not exist`, () => {
				return client.platform().createOnlineWorkingCopy(roundTripProject, revisionOnNonExistentBranch)
					.should.eventually.be.rejectedWith(`${nonExistentBranchOnRoundTrip.name() }' non-existent in revision 2`); // yes, the quote is asymmetric, it's deliberate
			});
			it(`should fail because API Keys is invalid`, () => {
				return clientWithInvalidApiKey.platform().createOnlineWorkingCopy(roundTripProject, validRevisionOnMainLineOnRoundTrip)
					.should.eventually.be.rejectedWith(`Invalid username and/or API key`);
			});
			it(`should fail because of invalid endpoint`, () => {
				return clientWithInvalidEndPoint.platform().createOnlineWorkingCopy(roundTripProject, validRevisionOnMainLineOnRoundTrip)
					.should.eventually.be.rejectedWith(`405`);
			});
		});

		describe(`commit to teamserver`, function() {

			this.timeout(100000);
			const invalidProject = new sdk.Project(client, `WhateverId`, `WhateverName`);
			const revisionOnInvalidProject = new sdk.Revision(-1, new sdk.Branch(invalidProject, null));
			const nonExistentWorkingCopy = new sdk.OnlineWorkingCopy(client, `Obviously does not exist`, revisionOnInvalidProject, null);
			const nonExistentBranchName = `Non-existentBranch`;

			describe(`with a newly created project and working copy`, () => {
				let sharedProject: sdk.Project;
				let workingCopy: sdk.OnlineWorkingCopy;
				before((mochaDone) => {
					client.platform().createNewApp(`TestApp`, "", defaultTemplateId).then(
						(project) => {
							sharedProject = project;
							mochaDone();
						},
						(reason) => mochaDone(`Unable to create project. Cannot execute any tests in this suite: ${reason}`));
				});
				beforeEach((mochaDone) => {
					sharedProject.createWorkingCopy().then(
						(wc) => {
							workingCopy = wc;
							mochaDone();
						},
						(reason) => mochaDone(`Unable to create working copy. Cannot execute any tests in this suite: ${reason}`));
				});
				it(`should succeed with default commit parameters`, () => {
					return workingCopy.commit().should.eventually.be.fulfilled;
				});
				it(`should succeed with branch commit parameter retrieved from workingCopy`, () => {
					return workingCopy.commit(workingCopy.sourceRevision().branch().name()).should.eventually.be.fulfilled;
				});
				it(`should succeed with branch and revision commit parameters from workingCopy`, () => {
					let branchName = workingCopy.sourceRevision().branch().name();
					let revisionNr = workingCopy.sourceRevision().num();
					return workingCopy.commit(branchName, revisionNr).should.eventually.be.fulfilled;
				});
				it(`should fail because branch does not exist`, () => {
					return workingCopy.commit(nonExistentBranchName).should.eventually.be.rejectedWith(`${nonExistentBranchName}' doesn't exist`);
				});
				it(`should fail because revision is invalid`, () => {
					const commitToServer = client.platform().commitToTeamServer(workingCopy, workingCopy.sourceRevision().branch().name(), -2);
					return commitToServer.should.eventually.be.rejectedWith(`Invalid base revision`);
				});
				it(`should fail because API Keys is invalid`, () => {
					return clientWithInvalidApiKey.platform().commitToTeamServer(workingCopy).should.eventually.be.rejectedWith(`Invalid username and/or API key`);
				});
				it(`should fail because of invalid endpoint`, () => {
					clientWithInvalidEndPoint.platform().commitToTeamServer(workingCopy).should.eventually.be.rejectedWith(`404 Not Found`);
				});
			});

			it(`should fail because working copy does not exist`, () => {
				return client.platform().commitToTeamServer(nonExistentWorkingCopy).should.eventually.be.rejectedWith(`App does not exist`);
			});

			it(`should succeed with some changes in the model`, () => {
				return client.platform().createNewApp(`TestModelChange`, "", defaultTemplateId)
					.then(project => project.createWorkingCopy())
					.then((updateModel))
					.then((wc) => {
						return wc.commit();
					}).then((revision) => {
						return revision.num();
					}).should.eventually.equal(3);
			});
			it(`should succeed with two commits`, () => {
				return client.platform().createNewApp(`TestDoubleCommit`, "", defaultTemplateId)
					.then(project => project.createWorkingCopy())
					.then((updateModel))
					.then((workingCopy) => workingCopy.commit())
					.then(revision => revision.createWorkingCopy())
					.then((updateModel))
					.then((workingCopy) => {
						return workingCopy.commit();
					}).then((revision) => {
						return revision.num();
					}).should.eventually.equal(4);
			});
			it(`should fail because revision is outdated`, () => {
				return client.platform().createNewApp(`TestOutdatedCommit`, `nothing`)
					.then(project => project.createWorkingCopy())
					.then((updateModel))
					.then((workingCopy) => workingCopy.commit())
					.then(revision => revision.createWorkingCopy())
					.then((updateModel))
					.then((workingCopy) => {
						return workingCopy.commit(null, 2);
					}).should.eventually.be.rejectedWith(`Working copy is not up-to-date`);
			});
		});

		function updateModel(wc: sdk.OnlineWorkingCopy): sdk.OnlineWorkingCopy {
			const project = wc.model().root;
			const mod = projects.Module.createIn(project);
			mod.name = `NewModule_${Date.now() }`;
			return wc;
		}
});
