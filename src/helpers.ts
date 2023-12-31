import fetch from "node-fetch";
import * as artifact from '@actions/artifact';


export interface LeapworkConfig {
    GITHUB_TOKEN: string,
    leapworkApiUrl: string,
    leapworkApiKey: string,
    leapworkSchedule: string
}

export interface TotalFlow {
    runId: string,
    flowInfo: FlowInfo[]
}


export interface FlowInfo {
    flowId: string,
    flowTitle: string,
    flowStatus: string,
    flowElapsed: string,
    runItemId: string
}


const sleep = (ms: number): Promise<any> => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

const callLeapworkApi = async (config: any, url: string, method: string = "GET"): Promise<any> => {
    const response = await fetch(config.leapworkApiUrl + url, {
        method,
        headers: { "AccessKey": config.leapworkApiKey }
    });
    return await response.json();
}

export const getScheduleId = async (config: any): Promise<string> => {
    const schedules = (await callLeapworkApi(config, "/v4/schedules")) as any[];
    const schedule = schedules.find(s => s.Title == config.leapworkSchedule);
    if (!schedule) throw "Could not find schedule '" + config.leapworkSchedule + "'";
    return schedule.Id;
}

export const getScheduleStatus = async (config: any, scheduleId: string): Promise<string> => {
    const result = await callLeapworkApi(config, "/v4/schedules/" + scheduleId + "/status");
    return result.Status;
}

export const waitForScheduleToBeFinished = async (config: any, scheduleId: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const start = Date.now();
        while (true) {
            const scheduleStatus = await getScheduleStatus(config, scheduleId);
            const elapsed = Date.now() - start;
            console.log("Status:", scheduleStatus, "- elapsed", elapsed / 1000, "sec");
            if (scheduleStatus == "Finished") break;
            await sleep(10000);
        }
        resolve();
    });
}

export const runSchedule = async (config: any, scheduleId: string): Promise<string> => {
    const result = await callLeapworkApi(config, "/v4/schedules/" + scheduleId + "/runNow", "PUT");
    return result.RunId;
}

export const getRun = async (config: any, runId: string): Promise<[ number, number ]> => {
    const run = (await callLeapworkApi(config, "/v4/run/" + runId)) as any;
    return [ run.Failed, run.Total ];
}

export const getTotalRunItems = async (config: any, runId: string): Promise<Array<TotalFlow>> => {
    const result1 = (await callLeapworkApi(config, "/v4/run/" + runId + "/runItemIds")) as any;
    const runItemIds = result1.RunItemIds as any[];
    const flowInfoDetails: FlowInfo[] = [];
    const totalFlows: TotalFlow[] = [];
    for (const runItemId of runItemIds) {
        const result2 = (await callLeapworkApi(config, "/v4/runItems/" + runItemId)) as any;
         
        const flowId = result2.FlowInfo.FlowId;
        const flowTitle = result2.FlowInfo.FlowTitle;
        const flowStatus = result2.FlowInfo.Status;
        const flowElapsed = result2.Elapsed;
        console.log(flowTitle, "was", flowStatus);
        flowInfoDetails.push({flowId, flowTitle, flowStatus, flowElapsed, runItemId })              
    }
    totalFlows.push({runId,flowInfo: flowInfoDetails});
    console.log("Total Flows:", JSON.stringify(totalFlows));
    return totalFlows;
}
export const createFile = async (totalFlows: string): Promise<string> => {
    const fs = require('fs');
    const fileName = 'result.json';
    
    fs.writeFileSync(fileName, totalFlows);
    return fileName;
}

export const createArtifact = async(fileName: string)  => {
    const client = artifact.create();
    const name = 'leapwork-artifact';
    const path = fileName; //'./';
    const artifactName = `${name}-${Date.now()}`;

    const uploadResponse = await client.uploadArtifact(artifactName, [path], '.');
    console.log(`Artifact ${name} uploaded successfully with ID: ${uploadResponse.artifactName}`);   
}