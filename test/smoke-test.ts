/// <reference path='../typings/tsd.d.ts' />

import {IModel, domainmodels} from 'mendixmodelsdk';

import sdk = require('../mendix-platform-sdk');
import when = require('when');
import chai = require('chai');
var expect = chai.expect;
var assert = chai.assert;
var should = chai.should();
chai.use(require('chai-string'));
var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const username = 'richard.ford51@example.com';
const apikey = '364fbe6d-c34d-4568-bb7c-1baa5ecdf9d1';

const client = new sdk.MendixSdkClient(username, apikey, null, null, 'https://sprintr.home.mendix.dev', 'https://model-api.mendix.dev');

var integrationTest = process.env.INTEGRATION === "1";

if (integrationTest) {
    describe(`Teamserver - Modelserver Integration`, function() {
        this.timeout(50000);
        it(`Smoke test`, () => {
            return client.platform().createNewApp(`NewApp-${Date.now() }`)
                .then(project => project.createWorkingCopy())
                .then(workingCopy => {
                    const dm = pickDomainModel(workingCopy, `MyFirstModule`);
                    return sdk.loadAsPromise(dm)
                        .then(domainModel => {
                            let entity = domainmodels.Entity.create(workingCopy.model());
                            entity.name = `NewEntity-${Date.now() }`;
                            entity.location = { x: 100, y: 100 };
                            domainModel.entities.push(entity);
                            return workingCopy;
                        });
                })
                .then(workingCopy => workingCopy.commit())
                .should.eventually.be.fulfilled;
        });
    });
}

function pickDomainModel(workingCopy: sdk.OnlineWorkingCopy, domainModelName: string): domainmodels.IDomainModel {
    return workingCopy.model().allDomainModels()
        .filter(dm => dm.qualifiedName === domainModelName)[0];
}
