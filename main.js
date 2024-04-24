#!/usr/bin/env node
import {
	getPackageInfo,
	exists,
	fetchJson,
	getSystemInfo,
	replaceText,
	readFile,
	writeToUserSettings
} from './modules/utils.js';
import fetchEnv from './modules/envFetch.js';
import { Command } from 'commander';
import chk from 'chalk';
import path from 'path';
import 'dotenv/config';
import inquirer from 'inquirer';
import { createSpinner } from 'nanospinner';
import OpenAI from 'openai';
import { execSync } from 'child_process';

global.appRoot = new URL('.', import.meta.url).pathname;

const packageInfo = await getPackageInfo();

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
				const apiKey = await fetchEnv(apiKeyName);

				if (exists(apiKey) !== true) {
					console.log(chk.redBright('API key not found'));
					process.exit(1);
				}

				console.log(`${chk.greenBright('API key:')} ${apiKey}`);
				process.exit(0);
			}

			await writeToUserSettings({ key: apiKeyName, value: newApiKey, type: 'API key'})
		});

	program
		.command('model')
		.option('--set', 'Set the model')
		.option('--get', 'Get the model')
		.option('--list', 'List available models')
		.description('Set or get the model')
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
				const apiModel = await fetchEnv(apiModelName);

				if (exists(apiModel) !== true) {
					console.log(
						chk.redBright(
							'Model not found, set it with --set option'
						)
					);
					process.exit(1);
				}

				console.log(`${apiModel}`);
				process.exit(0);
			}

			if (list === true) {
				const modelsData = await fetchJson(
					path.resolve(appRoot, 'settings/models.json')
				);

				const list = modelsData.list || [];

				console.log(chk.greenBright('Available models:'));
				console.log(list.join('\n'));

				process.exit(0);
			}

			const modelsData = await fetchJson(
				path.resolve(appRoot, 'settings/models.json')
			);

			const modelsList = modelsData.list || [];

			const { selectedModel } = await inquirer.prompt([
				{
					type: 'list',
					name: 'selectedModel',
					message: 'Select a model:',
					choices: modelsList
				}
			]);

			await writeToUserSettings({ key: apiModelName, value: selectedModel, type : 'Model' });
		});

	program
		.command('shell')
		.argument('<prompt...>', 'Prompt message')
		.option('--unsafe', 'Disable safe mode')
		.option('--debug', 'Enable debug mode')
		.description('Prompt for a shell command and run it')
		.action(async (prompt, options) => {
			const { unsafe, debug } = options;

			const systemInfo = await getSystemInfo();

			const fullPrompt = prompt.join(' ');

			const getPrefixPrompt = await readFile(
				path.resolve(appRoot, 'settings/prompt.txt')
			);

			const formatedPrefixPrompt = replaceText(getPrefixPrompt, [
				{ from: '{SHELL}', to: systemInfo.shell },
				{ from: '{OS}', to: systemInfo.operatingSystem },
				{ from: '{PROMPT}', to: fullPrompt }
			]);

			const apiKey = await fetchEnv(apiKeyName);
			const model = await fetchEnv(apiModelName);

			if (exists(apiKey) !== true) {
				console.log(
					chk.redBright('API key not found'),
					'\n',
					'Set it with:',
					'\n',
					chk.greenBright(
						`${packageInfo.bin[0]} apikey --set <value>`
					)
				);
				process.exit(1);
			}

			if (exists(model) !== true) {
				console.log(
					chk.redBright('Model not found'),
					'\n',
					'Set it with:',
					'\n',
					chk.greenBright(`${packageInfo.bin[0]} model --set`)
				);
				process.exit(1);
			}

			const openai = new OpenAI({ apiKey });

			const spinner = createSpinner('Fetching shell command').start();

			const response = await openai.chat.completions
				.create({
					messages: [{ role: 'user', content: formatedPrefixPrompt }],
					model
				})
				.catch((error) => {
					spinner.error();

					console.log(chk.redBright(error.message));

					process.exit(1);
				});

			spinner.success();

			const {
				id: rId,
				object: rObject,
				created: rCreated,
				model: rModel,
				usage: rUsage,
				system_fingerprint: rFingerprint,
				choices: rChoices
			} = response;

			if (debug === true) {
				console.log(`${chk.yellow('--- DEBUG START ---')}`);
				console.log(`${chk.green('ID:')} ${rId}`);
				console.log(`${chk.green('Object:')} ${rObject}`);
				console.log(`${chk.green('Created:')} ${rCreated}`);
				console.log(`${chk.green('Model:')} ${rModel}`);
				console.log(
					`${chk.green('Usage:')} ${JSON.stringify(rUsage, null, 2)}`
				);
				console.log(`${chk.green('Fingerprint:')} ${rFingerprint}`);
				console.log(
					`${chk.green('Choises:')} ${JSON.stringify(rChoices, null, 2)}`
				);
				console.log(`${chk.green('Prompt:')} ${formatedPrefixPrompt}`);
				console.log(
					`${chk.green('System info:')} ${JSON.stringify(systemInfo, null, 2)}`
				);
				console.log(`${chk.yellow('--- DEBUG END ---')}`);
			}

			const commandRaw = rChoices[0].message.content;

			if (unsafe === true) {
				execSync(commandRaw, { stdio: 'inherit', shell: true });
				process.exit(0);
			}

			const { selectAction } = await inquirer.prompt([
				{
					type: 'list',
					name: 'selectAction',
					message: `${chk.greenBright(commandRaw)} ${chk.blueBright('What do you want to do with the command?')}`,
					choices: ['Run', 'Cancel']
				}
			]);

			switch (selectAction) {
				case 'Run':
					try {
						execSync(commandRaw, { stdio: 'inherit', shell: true });
					} catch (error) {
						console.log(chk.redBright(error.message));
					}
					break;
				default:
					console.log(chk.redBright('Command canceled'));
					break;
			}

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
