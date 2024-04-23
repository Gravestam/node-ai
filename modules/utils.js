import path from 'path';
import fs from 'fs/promises';

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

export { exists, fileExists, readFile, writeFile, fetchJson, getPackageInfo };
