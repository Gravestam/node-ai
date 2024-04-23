import fs from 'fs/promises';
import path from 'path';
import { fileExists, getCurrentFilePath } from './utils.js';

const modelsPath = path.resolve(
	getCurrentFilePath(),
	'../settings/models.json'
);

const listModels = async () => {
	const modelsFileExist = await fileExists(modelsPath);

	if (modelsFileExist !== true) {
		throw new Error('Models file not found!');
	}

	const models = await fs.readFile(modelsPath, 'utf-8');

	const parsedModels = JSON.parse(models);

	return parsedModels.list || [];
};

export { listModels };
