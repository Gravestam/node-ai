#!/usr/bin/env node
import {
	getPackageInfo,
	fileExists,
	exists,
	readFile,
	writeFile,
	fetchJson
} from './modules/utils.js';
import { Command } from 'commander';
import chk from 'chalk';
import path from 'path';
import 'dotenv/config';
import inquirer from 'inquirer';

global.appRoot = new URL('.', import.meta.url).pathname;

const packageInfo = await getPackageInfo();
const envPath = path.resolve(appRoot, '.env');

const apiKeyName = 'OPENAI_KEY';
const apiModelName = 'OPENAI_MODEL';

const wrongCommandText = `Run ${chk.greenBright(`${packageInfo.bin[0]} --help`)} to see available commands`;

const main = async () => {
	const program = new Command();

	program
		.name(packageInfo.name)
		.description(packageInfo.description)
		.version(packageInfo.version);

	program
		.command('apikey')
		.option('--set <value>', 'Set the API key')
		.option('--get', 'Get the API key')
		.description('Set or get the API key')
		.action(async (options) => {
			const { set: newApiKey, get } = options;

			if (exists(newApiKey) !== true && exists(get) !== true) {
				console.log(wrongCommandText);
				process.exit(1);
			}

			if (get === true) {
				const apiKey = process.env[apiKeyName];

				if (exists(apiKey) !== true) {
					console.log(chk.redBright('API key not found'));
					process.exit(1);
				}

				console.log(`${chk.greenBright('API key:')} ${apiKey}`);
				process.exit(0);
			}

			const envFileExists = await fileExists(envPath);

			if (envFileExists !== true) {
				const envContent = `${apiKeyName}="${newApiKey}"`;

				await writeFile(envPath, envContent);

				console.log(chk.greenBright('API key set'));

				process.exit(0);
			}

			const envFile = await readFile(envPath);

			const envLines = envFile.split('\n');

			// check if a line contains the API key, it it doesent, write it to the first empty line
			const hasApiKey = envLines.some((line) =>
				line.startsWith(apiKeyName)
			);

			if (!hasApiKey) {
				const firstEmptyLine = envLines.findIndex(
					(line) => line === ''
				);

				const newEnvLines = envLines.map((line, index) => {
					if (index === firstEmptyLine) {
						return `${apiKeyName}="${newApiKey}"`;
					}
					return line;
				});

				await writeFile(envPath, newEnvLines.join('\n'));

				console.log(chk.greenBright('API key set'));

				process.exit(0);
			}

			const newEnvLines = envLines.map((line) => {
				if (line.startsWith(apiKeyName)) {
					return `${apiKeyName}="${newApiKey}"`;
				}
				return line;
			});

			await writeFile(envPath, newEnvLines.join('\n'));

			console.log(chk.greenBright('API key set'));

			process.exit(0);
		});

	program
		.command('model')
		.option('--set', 'Set the API model')
		.option('--get', 'Get the API model')
		.option('--list', 'List available API models')
		.description('Set or get the API model')
		.action(async (options) => {
			const { set, get, list } = options;

			if (
				exists(set) !== true &&
				exists(get) !== true &&
				exists(list) !== true
			) {
				console.log(wrongCommandText);
				process.exit(1);
			}

			if (get === true) {
				const apiModel = process.env[apiModelName];

				if (exists(apiModel) !== true) {
					console.log(chk.redBright('API model not found'));
					process.exit(1);
				}

				console.log(`${chk.greenBright('API model:')} ${apiModel}`);
				process.exit(0);
			}

			if (list === true) {
				const modelsData = await fetchJson(
					path.resolve(appRoot, 'settings/models.json')
				);
				const list = modelsData.list || [];

				console.log(chk.greenBright('Available API models:'));
				console.log(list.join('\n'));
				process.exit(0);
			}

			const envFileExists = await fileExists(envPath);

			// If --set option is not provided, prompt the user to select a model
			const modelsData = await fetchJson(
				path.resolve(appRoot, 'settings/models.json')
			);
			const modelsList = modelsData.list || [];

			const { selectedModel } = await inquirer.prompt([
				{
					type: 'list',
					name: 'selectedModel',
					message: 'Select the API model:',
					choices: modelsList
				}
			]);

			const newApiModel = selectedModel;

			const envContent = `${apiModelName}="${newApiModel}"`;

			if (envFileExists !== true) {
				await writeFile(envPath, envContent);

				console.log(chk.greenBright('API model set'));

				process.exit(0);
			}

			const envFile = await readFile(envPath);

			const envLines = envFile.split('\n');

			const hasApiModel = envLines.some((line) =>
				line.startsWith(apiModelName)
			);

			if (!hasApiModel) {
				const firstEmptyLine = envLines.findIndex(
					(line) => line === ''
				);
				const newEnvLines = envLines.map((line, index) => {
					if (index === firstEmptyLine) {
						return `${apiModelName}="${newApiModel}"`;
					}

					return line;
				});
				await writeFile(envPath, newEnvLines.join('\n'));
				console.log(chk.greenBright('API model set'));
				process.exit(0);
			}

			const newEnvLines = envLines.map((line) => {
				if (line.startsWith(apiModelName)) {
					return `${apiModelName}="${newApiModel}"`;
				}
				return line;
			});

			await writeFile(envPath, newEnvLines.join('\n'));

			console.log(chk.greenBright('API model set'));

			process.exit(0);
		});
	program.parse(process.argv);
};

try {
	await main();
} catch (error) {
	console.log(chk.redBright(error.message));
	process.exit(1);
}
