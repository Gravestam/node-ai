import path from 'path';
import fs from 'fs/promises';
import chk from 'chalk';
import os from 'os';
import { execSync } from 'child_process';

const exists = (value) => typeof value !== 'undefined' && value !== null;

const getPackageInfo = async () => {
	const packageJsonPath = path.resolve(appRoot, 'package.json');

	const packageJsonData = await fetchJson(packageJsonPath);

	const out = {
		version: packageJsonData.version,
		description: packageJsonData.description,
		author: packageJsonData.author,
		license: packageJsonData.license,
		name: packageJsonData.name,
		bin: Object.keys(packageJsonData.bin)
	};

	return out;
};

const fileExists = async (path) => {
	return fs
		.access(path)
		.then(() => true)
		.catch(() => false);
};

const fetchJson = async (path) => {
	const ex = await fileExists(path);

	if (ex !== true) {
		return {};
	}

	const file = await fs.readFile(path, 'utf8');

	const data = JSON.parse(file);

	return data;
};

const readFile = async (path) => {
	const file = await fs.readFile(path, 'utf8');

	return file;
};

const writeFile = async (path, content) => {
	await fs.writeFile(path, content, 'utf8');
};

const writeToUserSettings = async ({ key, value, type, shouldExit = true }) => {
	const showSetMessage = () => console.log(chk.greenBright(`${type} set!`));
	const userSettingsPath = path.resolve(appRoot, 'settings/user_settings.json');

	const e = await fileExists(userSettingsPath);

	const userSettings = e === true ? await fetchJson(userSettingsPath) : {};

	userSettings[key] = value;

	await writeFile(userSettingsPath, JSON.stringify(userSettings, null, 4));

	showSetMessage();

	if (shouldExit === true) {
		process.exit(0);
	}
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getSystemInfo = async () => {
	const operatingSystem = os.platform();
	const shell = execSync('echo $SHELL').toString().trim().split('/').pop();

	return { operatingSystem, shell };
};

const replaceText = (text, replaceRules) => {
	const formatedReplaceRules = replaceRules.map(({ from, to }) => {
		return { from: new RegExp(from, 'g'), to };
	});

	return formatedReplaceRules.reduce((acc, { from, to }) => {
		return acc.replace(from, to);
	}, text);
};

export {
	exists,
	fileExists,
	readFile,
	writeFile,
	fetchJson,
	getPackageInfo,
	writeToUserSettings,
	sleep,
	getSystemInfo,
	replaceText
};
