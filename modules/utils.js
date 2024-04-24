import path from 'path';
import fs from 'fs/promises';
import chk from 'chalk';
import os from 'os';
import { execSync } from 'child_process';

const exists = (value) => typeof value !== 'undefined' && value !== null;

const fetchJson = async (path) => {
	const file = await fs.readFile(path, 'utf8');

	const data = JSON.parse(file);

	return data;
};

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

const readFile = async (path) => {
	const file = await fs.readFile(path, 'utf8');

	return file;
};

const writeFile = async (path, content) => {
	await fs.writeFile(path, content, 'utf8');
};

const writeToEnv = async ({ key, value, type, shouldExit = true }) => {
	const envPath = path.resolve(appRoot, '.env');
	const showSetMessage = () => console.log(chk.greenBright(`${type} set!`));

	const envFileExists = await fileExists(envPath);

	if (envFileExists !== true) {
		const envContent = `${key}="${value}"`;

		await writeFile(envPath, envContent);

		showSetMessage();

		if (shouldExit === true) {
			process.exit(0);
		}

		return;
	}

	const envFile = await readFile(envPath);

	const envLines = envFile.split('\n');

	const keyIndex = envLines.findIndex((line) => line.startsWith(key));

	if (keyIndex === -1) {
		const firstEmptyLine = envLines.findIndex((line) => line === '');

		const newEnvLines = envLines.map((line, index) => {
			if (index === firstEmptyLine) {
				return `${key}="${value}"`;
			}
			return line;
		});

		// if first empty line is -1, write to the end of the file
		if (firstEmptyLine === -1) {
			newEnvLines.push(`${key}="${value}"`);
		}

		await writeFile(envPath, newEnvLines.join('\n'));

		showSetMessage();

		if (shouldExit === true) {
			process.exit(0);
		}

		return;
	}

	const newEnvLines = envLines.map((line) => {
		if (line.startsWith(key)) {
			return `${key}="${value}"`;
		}
		return line;
	});

	await writeFile(envPath, newEnvLines.join('\n'));

	showSetMessage();

	if (shouldExit === true) {
		process.exit(0);
	}

	return;
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
	writeToEnv,
	sleep,
	getSystemInfo,
	replaceText
};
