import 'dotenv/config';
import { exists, fetchJson } from './utils.js';
import path from 'path';

const fetchValue = async (key) => {
	const envValue = process.env[key];

	const userSettingsPath = path.resolve(appRoot, 'settings/user_settings.json');

	if (exists(envValue) === true) {

		return envValue;
	}

	const userSettings = await fetchJson(userSettingsPath);

	return userSettings[key];
};

export default fetchValue;
