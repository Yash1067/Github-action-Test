import * as core from '@actions/core';
import { createFile, createArtifact, getTotalRunItems, getRun, getScheduleId, LeapworkConfig, runSchedule, waitForScheduleToBeFinished } from "./helpers.js";

/*
 GitHub Action to run Leapwork Schedule.
 */

// Get inputs from workflow.
const config: LeapworkConfig = {
    GITHUB_TOKEN: core.getInput('GITHUB_TOKEN'),
    leapworkApiUrl: core.getInput('leapworkApiUrl', { required: true }),
    leapworkApiKey: core.getInput("leapworkApiKey", { required: true }),
    leapworkSchedule: core.getInput('leapworkSchedule', { required: true })
}

// Get schedule id from name in config.
const scheduleId = await getScheduleId(config);
console.log("Found schedule '" + config.leapworkSchedule + "'.");


// Wait for schedule to become ready for running.
console.log("Waiting for schedule to become ready for running.");
await waitForScheduleToBeFinished(config, scheduleId);

// Run schedule.
console.log("Running schedule.");
const runId = await runSchedule(config, scheduleId);

// Wait for schedule to complete.
console.log("Waiting for run to complete.")
await waitForScheduleToBeFinished(config, scheduleId);

// Lookup run items and check if any are failed.
const [ failedCount, totalCount ] = await getRun(config, runId);
console.log("Result:", failedCount, "failed run out of", totalCount);

// Get Total Run Item Details
const totalFlows = await getTotalRunItems(config, runId);

// Create Result.json File
const fileName = await createFile(JSON.stringify(totalFlows));

core.setOutput('FileName',fileName);

// Create leapwork artifact
await createArtifact(fileName);   
