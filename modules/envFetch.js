import 'dotenv/config';
import { exists } from './utils.js';

const fetchValue = (key) => {
	const value = process.env[key];

	return exists(value) ? value : null;
};

export default fetchValue;
